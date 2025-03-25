import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { bookSlotSchema, updateReleaseStatusSchema } from "@shared/schema";
import { startOfWeek, endOfWeek, format, parseISO } from "date-fns";

export async function registerRoutes(app: Express): Promise<Server> {
  // Get slots for a specific week
  app.get("/api/slots", async (req: Request, res: Response) => {
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
  app.get("/api/releases", async (_req: Request, res: Response) => {
    try {
      const releases = await storage.getUpcomingReleases();
      res.json(releases);
    } catch (error: any) {
      res.status(500).json({ message: `Failed to get releases: ${error.message}` });
    }
  });

  // Book a slot
  app.post("/api/slots/book", async (req: Request, res: Response) => {
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
      
      res.status(201).json({ message: "Slot booked successfully", release });
    } catch (error: any) {
      res.status(500).json({ message: `Failed to book slot: ${error.message}` });
    }
  });

  // Cancel a booking
  app.delete("/api/releases/:id", async (req: Request, res: Response) => {
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

  // Update release status
  app.patch("/api/releases/:id/status", async (req: Request, res: Response) => {
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

  // Get deployment statistics
  app.get("/api/stats", async (_req: Request, res: Response) => {
    try {
      const allSlots = await storage.getSlots();
      const allReleases = await storage.getReleases();
      
      const now = new Date();
      const currentWeekStart = startOfWeek(now, { weekStartsOn: 1 });
      const currentWeekEnd = endOfWeek(now, { weekStartsOn: 1 });
      const nextWeekStart = new Date(currentWeekStart);
      nextWeekStart.setDate(nextWeekStart.getDate() + 7);
      const nextWeekEnd = new Date(currentWeekEnd);
      nextWeekEnd.setDate(nextWeekEnd.getDate() + 7);
      
      // Slot counts
      const availableSlots = allSlots.filter(slot => slot.booked === 0).length;
      const totalUpcoming = allReleases.length;
      
      // Releases this week and next week
      const thisWeek = allReleases.filter(release => {
        const slot = allSlots.find(s => s.id === release.slotId);
        if (!slot) return false;
        const slotDate = new Date(slot.date);
        return slotDate >= currentWeekStart && slotDate <= currentWeekEnd;
      }).length;
      
      const nextWeek = allReleases.filter(release => {
        const slot = allSlots.find(s => s.id === release.slotId);
        if (!slot) return false;
        const slotDate = new Date(slot.date);
        return slotDate >= nextWeekStart && slotDate <= nextWeekEnd;
      }).length;
      
      // Count by release type
      const byType = allReleases.reduce((acc, release) => {
        const type = release.releaseType;
        acc[type] = (acc[type] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);
      
      // Count by team
      const byTeam = allReleases.reduce((acc, release) => {
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
