import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import session from "express-session";
import { storage } from "./storage";
import { 
  bookSlotSchema, 
  updateReleaseStatusSchema, 
  customizeEmailTemplateSchema, 
  insertEmailTemplateSchema,
  loginSchema,
  registerSchema
} from "@shared/schema";
import { startOfWeek, endOfWeek, format, parseISO } from "date-fns";

// Type augmentation for express-session
declare module "express-session" {
  interface SessionData {
    user?: {
      id: number;
      username: string;
      role: string;
    };
  }
}

// Auth middleware
const isAuthenticated = (req: Request & { session: { user?: { id: number, username: string, role: string } } }, res: Response, next: NextFunction) => {
  if (req.session.user) {
    next();
  } else {
    res.status(401).json({ message: "Unauthorized: Please login" });
  }
};

// Role-based middleware
const hasRole = (role: string) => {
  return (req: Request & { session: { user?: { id: number, username: string, role: string } } }, res: Response, next: NextFunction) => {
    if (!req.session.user) {
      return res.status(401).json({ message: "Unauthorized: Please login" });
    }
    
    if (req.session.user.role === role || req.session.user.role === "admin") {
      next();
    } else {
      res.status(403).json({ message: `Forbidden: Requires ${role} role` });
    }
  };
};

export async function registerRoutes(app: Express): Promise<Server> {
  // Setup session middleware
  app.use(session({
    secret: "deployment-slot-booking-secret",
    resave: false,
    saveUninitialized: false,
    cookie: { 
      secure: process.env.NODE_ENV === "production",
      maxAge: 24 * 60 * 60 * 1000 // 24 hours
    }
  }));

  // Session setup complete

  // Auth routes
  app.post("/api/login", async (req: Request & { session: { user?: { id: number, username: string, role: string } } }, res: Response) => {
    try {
      const result = loginSchema.safeParse(req.body);
      
      if (!result.success) {
        return res.status(400).json({ 
          message: "Invalid login data", 
          errors: result.error.errors 
        });
      }
      
      const { username, password } = result.data;
      
      const user = await storage.validateUser(username, password);
      
      if (!user) {
        return res.status(401).json({ message: "Invalid username or password" });
      }
      
      // Store user info in session
      req.session.user = {
        id: user.id,
        username: user.username,
        role: user.role
      };
      
      res.json({ 
        message: "Login successful",
        user: {
          id: user.id,
          username: user.username,
          role: user.role
        }
      });
    } catch (error: any) {
      res.status(500).json({ message: `Login failed: ${error.message}` });
    }
  });
  
  app.post("/api/register", async (req: Request & { session: { user?: { id: number, username: string, role: string } } }, res: Response) => {
    try {
      const result = registerSchema.safeParse(req.body);
      
      if (!result.success) {
        return res.status(400).json({ 
          message: "Invalid registration data", 
          errors: result.error.errors 
        });
      }
      
      const { username, password, role } = result.data;
      
      // Check if username already exists
      const existingUser = await storage.getUserByUsername(username);
      if (existingUser) {
        return res.status(409).json({ message: "Username already exists" });
      }
      
      const newUser = await storage.createUser({
        username,
        password,
        role: role || "developer"
      });
      
      // Store user info in session (auto-login)
      req.session.user = {
        id: newUser.id,
        username: newUser.username,
        role: newUser.role
      };
      
      res.status(201).json({ 
        message: "Registration successful",
        user: {
          id: newUser.id,
          username: newUser.username,
          role: newUser.role
        }
      });
    } catch (error: any) {
      res.status(500).json({ message: `Registration failed: ${error.message}` });
    }
  });
  
  app.post("/api/logout", (req: Request & { session: any }, res: Response) => {
    req.session.destroy((err: Error) => {
      if (err) {
        return res.status(500).json({ message: `Logout failed: ${err.message}` });
      }
      res.json({ message: "Logout successful" });
    });
  });
  
  app.get("/api/me", (req: Request & { session: { user?: { id: number, username: string, role: string } } }, res: Response) => {
    if (req.session.user) {
      res.json({ 
        authenticated: true,
        user: req.session.user
      });
    } else {
      res.json({ 
        authenticated: false 
      });
    }
  });
  
  // Get slots for a specific week
  app.get("/api/slots", isAuthenticated, async (req: Request & { session: { user?: { id: number, username: string, role: string } } }, res: Response) => {
    try {
      let date: Date;
      if (req.query.date) {
        date = parseISO(req.query.date as string);
      } else {
        date = new Date();
      }
      
      const slots = await storage.getSlotsByWeek(date);
      
      // Group slots by day
      const slotsByDay = slots.reduce((acc, slot) => {
        const day = format(new Date(slot.date), "yyyy-MM-dd");
        if (!acc[day]) {
          acc[day] = [];
        }
        acc[day].push(slot);
        return acc;
      }, {} as Record<string, typeof slots>);
      
      res.json(slotsByDay);
    } catch (error: any) {
      res.status(500).json({ message: `Failed to get slots: ${error.message}` });
    }
  });

  // Get all upcoming releases
  app.get("/api/releases", isAuthenticated, async (_req: Request & { session: { user?: { id: number, username: string, role: string } } }, res: Response) => {
    try {
      const releases = await storage.getUpcomingReleases();
      res.json(releases);
    } catch (error: any) {
      res.status(500).json({ message: `Failed to get releases: ${error.message}` });
    }
  });

  // Book a slot (only developers or admins)
  app.post("/api/slots/book", isAuthenticated, hasRole("developer"), async (req: Request & { session: { user?: { id: number, username: string, role: string } } }, res: Response) => {
    try {
      const result = bookSlotSchema.safeParse(req.body);
      
      if (!result.success) {
        return res.status(400).json({ 
          message: "Invalid request data", 
          errors: result.error.errors 
        });
      }
      
      const { slotId, releaseName, version, team, releaseType, description } = result.data;
      
      // Check if slot exists and is available
      const slot = await storage.getSlot(slotId);
      
      if (!slot) {
        return res.status(404).json({ message: "Slot not found" });
      }
      
      if (slot.booked === 1) {
        return res.status(409).json({ message: "Slot is already booked" });
      }

      // Check if slot is in the past
      const slotDate = new Date(slot.date);
      const now = new Date();
      now.setHours(0, 0, 0, 0); // Set to midnight for date comparison
      
      if (slotDate < now) {
        return res.status(400).json({ message: "Cannot book slots in the past" });
      }
      
      // Create a release and book the slot
      const release = await storage.createRelease({
        name: releaseName,
        version: version || null,
        team,
        releaseType,
        description: description || null,
        status: "pending",
        slotId
      });
      
      // Update the slot to mark it as booked
      await storage.updateSlot(slotId, { 
        booked: 1,
        releaseId: release.id
      });
      
      res.status(201).json({ message: "Slot booked successfully", release });
    } catch (error: any) {
      res.status(500).json({ message: `Failed to book slot: ${error.message}` });
    }
  });

  // Cancel a booking (developers or admins)
  app.delete("/api/releases/:id", isAuthenticated, hasRole("developer"), async (req: Request & { session: { user?: { id: number, username: string, role: string } } }, res: Response) => {
    try {
      const releaseId = parseInt(req.params.id);
      
      if (isNaN(releaseId)) {
        return res.status(400).json({ message: "Invalid release ID" });
      }
      
      const release = await storage.getRelease(releaseId);
      
      if (!release) {
        return res.status(404).json({ message: "Release not found" });
      }
      
      const deleted = await storage.deleteRelease(releaseId);
      
      if (deleted) {
        res.json({ message: "Booking canceled successfully" });
      } else {
        res.status(500).json({ message: "Failed to cancel booking" });
      }
    } catch (error: any) {
      res.status(500).json({ message: `Failed to cancel booking: ${error.message}` });
    }
  });

  // Update release status (admins only)
  app.patch("/api/releases/:id/status", isAuthenticated, hasRole("admin"), async (req: Request & { session: { user?: { id: number, username: string, role: string } } }, res: Response) => {
    try {
      const releaseId = parseInt(req.params.id);
      
      if (isNaN(releaseId)) {
        return res.status(400).json({ message: "Invalid release ID" });
      }
      
      const result = updateReleaseStatusSchema.safeParse(req.body);
      
      if (!result.success) {
        return res.status(400).json({ 
          message: "Invalid request data", 
          errors: result.error.errors 
        });
      }
      
      const { status, comments } = result.data;
      
      const release = await storage.getRelease(releaseId);
      
      if (!release) {
        return res.status(404).json({ message: "Release not found" });
      }
      
      const updatedRelease = await storage.updateReleaseStatus(releaseId, status, comments || null);
      
      if (updatedRelease) {
        res.json({ 
          message: "Release status updated successfully", 
          release: updatedRelease 
        });
      } else {
        res.status(500).json({ message: "Failed to update release status" });
      }
    } catch (error: any) {
      res.status(500).json({ message: `Failed to update release status: ${error.message}` });
    }
  });

  // Get email templates
  app.get("/api/email-templates", isAuthenticated, async (req: Request & { session: { user?: { id: number, username: string, role: string } } }, res: Response) => {
    try {
      let templates;
      
      if (req.query.category) {
        templates = await storage.getEmailTemplatesByCategory(req.query.category as string);
      } else {
        templates = await storage.getEmailTemplates();
      }
      
      res.json(templates);
    } catch (error: any) {
      res.status(500).json({ message: `Failed to get email templates: ${error.message}` });
    }
  });

  // Get single email template
  app.get("/api/email-templates/:id", isAuthenticated, async (req: Request & { session: { user?: { id: number, username: string, role: string } } }, res: Response) => {
    try {
      const templateId = parseInt(req.params.id);
      
      if (isNaN(templateId)) {
        return res.status(400).json({ message: "Invalid template ID" });
      }
      
      const template = await storage.getEmailTemplate(templateId);
      
      if (!template) {
        return res.status(404).json({ message: "Email template not found" });
      }
      
      res.json(template);
    } catch (error: any) {
      res.status(500).json({ message: `Failed to get email template: ${error.message}` });
    }
  });

  // Create a new email template (admin only)
  app.post("/api/email-templates", isAuthenticated, hasRole("admin"), async (req: Request & { session: { user?: { id: number, username: string, role: string } } }, res: Response) => {
    try {
      const result = insertEmailTemplateSchema.safeParse(req.body);
      
      if (!result.success) {
        return res.status(400).json({ 
          message: "Invalid request data", 
          errors: result.error.errors 
        });
      }
      
      const template = await storage.createEmailTemplate(result.data);
      
      res.status(201).json({ 
        message: "Email template created successfully", 
        template 
      });
    } catch (error: any) {
      res.status(500).json({ message: `Failed to create email template: ${error.message}` });
    }
  });

  // Update an email template (admin only)
  app.patch("/api/email-templates/:id", isAuthenticated, hasRole("admin"), async (req: Request & { session: { user?: { id: number, username: string, role: string } } }, res: Response) => {
    try {
      const templateId = parseInt(req.params.id);
      
      if (isNaN(templateId)) {
        return res.status(400).json({ message: "Invalid template ID" });
      }
      
      const result = customizeEmailTemplateSchema.safeParse(req.body);
      
      if (!result.success) {
        return res.status(400).json({ 
          message: "Invalid request data", 
          errors: result.error.errors 
        });
      }
      
      const template = await storage.getEmailTemplate(templateId);
      
      if (!template) {
        return res.status(404).json({ message: "Email template not found" });
      }
      
      // Update the template
      const updatedTemplate = await storage.updateEmailTemplate(templateId, result.data);
      
      if (updatedTemplate) {
        res.json({ 
          message: "Email template updated successfully", 
          template: updatedTemplate 
        });
      } else {
        res.status(500).json({ message: "Failed to update email template" });
      }
    } catch (error: any) {
      res.status(500).json({ message: `Failed to update email template: ${error.message}` });
    }
  });

  // Delete an email template (admin only)
  app.delete("/api/email-templates/:id", isAuthenticated, hasRole("admin"), async (req: Request & { session: { user?: { id: number, username: string, role: string } } }, res: Response) => {
    try {
      const templateId = parseInt(req.params.id);
      
      if (isNaN(templateId)) {
        return res.status(400).json({ message: "Invalid template ID" });
      }
      
      const template = await storage.getEmailTemplate(templateId);
      
      if (!template) {
        return res.status(404).json({ message: "Email template not found" });
      }
      
      if (template.isDefault === 1) {
        return res.status(403).json({ message: "Cannot delete default email templates" });
      }
      
      const deleted = await storage.deleteEmailTemplate(templateId);
      
      if (deleted) {
        res.json({ message: "Email template deleted successfully" });
      } else {
        res.status(500).json({ message: "Failed to delete email template" });
      }
    } catch (error: any) {
      res.status(500).json({ message: `Failed to delete email template: ${error.message}` });
    }
  });

  // Get deployment statistics (authenticated users only)
  app.get("/api/stats", isAuthenticated, async (_req: Request & { session: { user?: { id: number, username: string, role: string } } }, res: Response) => {
    try {
      const allSlots = await storage.getSlots();
      const allReleases = await storage.getReleases();
      
      const now = new Date();
      now.setHours(0, 0, 0, 0); // Set to midnight for date comparison
      
      const currentWeekStart = startOfWeek(now, { weekStartsOn: 1 });
      const currentWeekEnd = endOfWeek(now, { weekStartsOn: 1 });
      const nextWeekStart = new Date(currentWeekStart);
      nextWeekStart.setDate(nextWeekStart.getDate() + 7);
      const nextWeekEnd = new Date(currentWeekEnd);
      nextWeekEnd.setDate(nextWeekEnd.getDate() + 7);
      
      // Filter only future slots
      const futureSlots = allSlots.filter(slot => {
        const slotDate = new Date(slot.date);
        return slotDate >= now;
      });
      
      // Slot counts (only consider future slots)
      const availableSlots = futureSlots.filter(slot => slot.booked === 0).length;
      
      // Get only future releases by checking their associated slots
      const futureReleases = allReleases.filter(release => {
        const slot = allSlots.find(s => s.id === release.slotId);
        if (!slot) return false;
        const slotDate = new Date(slot.date);
        return slotDate >= now;
      });
      
      const totalUpcoming = futureReleases.length;
      
      // Releases this week and next week (only consider future releases)
      const thisWeek = futureReleases.filter(release => {
        const slot = allSlots.find(s => s.id === release.slotId);
        if (!slot) return false;
        const slotDate = new Date(slot.date);
        return slotDate >= currentWeekStart && slotDate <= currentWeekEnd;
      }).length;
      
      const nextWeek = futureReleases.filter(release => {
        const slot = allSlots.find(s => s.id === release.slotId);
        if (!slot) return false;
        const slotDate = new Date(slot.date);
        return slotDate >= nextWeekStart && slotDate <= nextWeekEnd;
      }).length;
      
      // Count by release type (only future releases)
      const byType = futureReleases.reduce((acc, release) => {
        const type = release.releaseType;
        acc[type] = (acc[type] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);
      
      // Count by team (only future releases)
      const byTeam = futureReleases.reduce((acc, release) => {
        const team = release.team;
        acc[team] = (acc[team] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);
      
      res.json({
        stats: {
          total: totalUpcoming,
          thisWeek,
          nextWeek,
          available: availableSlots
        },
        byType,
        byTeam
      });
    } catch (error: any) {
      res.status(500).json({ message: `Failed to get statistics: ${error.message}` });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
