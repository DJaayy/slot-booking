import pg from "pg";
const { Pool } = pg;
import { drizzle } from "drizzle-orm/node-postgres";
import { eq } from "drizzle-orm";
import { 
  DeploymentSlot, 
  InsertDeploymentSlot, 
  Release, 
  InsertRelease, 
  SlotWithRelease, 
  EmailTemplate, 
  InsertEmailTemplate,
  User,
  InsertUser,
  deploymentSlots,
  releases,
  emailTemplates,
  users
} from "@shared/schema";
import { addDays, startOfWeek, parseISO } from "date-fns";

// Let's create an in-memory storage as a fallback for now
const SLOTS_BY_DAY: Record<string, SlotWithRelease[]> = {};
const RELEASES: Release[] = [];
const EMAIL_TEMPLATES: EmailTemplate[] = [];
const USERS: User[] = [];
const NEXT_ID = { slot: 1, release: 1, template: 1, user: 1 };

// Setup default slots (Mon-Thu: 3 slots, Fri: 2 slots)
function setupDefaultSlots() {
  // Starting date (use current date as reference)
  const now = new Date();
  now.setHours(0, 0, 0, 0); // Set to midnight for date comparison
  
  // Generate slots for the next 4 weeks
  for (let weekOffset = 0; weekOffset < 4; weekOffset++) {
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() + (weekOffset * 7));
    const monday = startOfWeek(weekStart, { weekStartsOn: 1 });
    
    // For each day of the week (Monday = 1, Sunday = 7)
    for (let day = 1; day <= 5; day++) { // Monday to Friday
      const date = new Date(monday);
      date.setDate(monday.getDate() + day - 1);
      
      // Skip days in the past
      if (date < now) continue;
      
      const dateStr = date.toISOString().split('T')[0];
      
      // Skip weekends
      if (day > 5) continue;
      
      // Define slots for this day
      const slots: SlotWithRelease[] = [];
      
      // Monday to Thursday: 3 slots
      if (day <= 4) {
        slots.push({
          id: NEXT_ID.slot++,
          date: date,
          time: "09:00 - 11:00",
          timeDetail: "Slot 1 (Morning)",
          booked: 0,
          releaseId: null,
        });
        slots.push({
          id: NEXT_ID.slot++,
          date: date,
          time: "14:00 - 16:00",
          timeDetail: "Slot 2 (Afternoon)",
          booked: 0,
          releaseId: null,
        });
        slots.push({
          id: NEXT_ID.slot++,
          date: date,
          time: "19:00 - 21:00",
          timeDetail: "Slot 3 (Evening)",
          booked: 0,
          releaseId: null,
        });
      } 
      // Friday: 2 slots
      else if (day === 5) {
        slots.push({
          id: NEXT_ID.slot++,
          date: date,
          time: "09:00 - 11:00",
          timeDetail: "Slot 1 (Morning)",
          booked: 0,
          releaseId: null,
        });
        slots.push({
          id: NEXT_ID.slot++,
          date: date,
          time: "14:00 - 16:00",
          timeDetail: "Slot 2 (Afternoon)",
          booked: 0,
          releaseId: null,
        });
      }
      
      SLOTS_BY_DAY[dateStr] = slots;
    }
  }
}

// Setup default email templates
function setupDefaultEmailTemplates() {
  // Booking confirmation template
  EMAIL_TEMPLATES.push({
    id: NEXT_ID.template++,
    name: "Default Booking Confirmation",
    subject: "Your Deployment Slot Has Been Booked",
    body: "Hello Team,\n\nYour deployment slot has been successfully booked.\n\nRelease: {{releaseName}}\nDate: {{date}}\nTime: {{time}}\n\nThank you for using our deployment system.\n\nBest regards,\nThe Release Team",
    category: "booking",
    variables: { 
      releaseName: "Release name",
      date: "Deployment date",
      time: "Deployment time slot"
    },
    isDefault: 1,
    createdAt: new Date(),
  });
  
  // Status update template
  EMAIL_TEMPLATES.push({
    id: NEXT_ID.template++,
    name: "Default Status Update",
    subject: "Deployment Status Update: {{status}}",
    body: "Hello Team,\n\nYour deployment status has been updated.\n\nRelease: {{releaseName}}\nStatus: {{status}}\nDate: {{date}}\nTime: {{time}}\nComments: {{comments}}\n\nThank you for using our deployment system.\n\nBest regards,\nThe Release Team",
    category: "status-update",
    variables: {
      releaseName: "Release name",
      status: "Deployment status (released, reverted, etc.)",
      date: "Deployment date",
      time: "Deployment time slot",
      comments: "Status update comments"
    },
    isDefault: 1,
    createdAt: new Date(),
  });
  
  // Reminder template
  EMAIL_TEMPLATES.push({
    id: NEXT_ID.template++,
    name: "Default Deployment Reminder",
    subject: "Reminder: Upcoming Deployment",
    body: "Hello Team,\n\nThis is a reminder about your upcoming deployment.\n\nRelease: {{releaseName}}\nDate: {{date}}\nTime: {{time}}\n\nPlease ensure you have prepared everything needed for the deployment.\n\nBest regards,\nThe Release Team",
    category: "reminder",
    variables: {
      releaseName: "Release name",
      date: "Deployment date",
      time: "Deployment time slot"
    },
    isDefault: 1,
    createdAt: new Date(),
  });
}

// Setup default users
function setupDefaultUsers() {
  // Admin user
  USERS.push({
    id: NEXT_ID.user++,
    username: "admin",
    password: "admin123", // In a real app, this would be hashed
    role: "admin"
  });
  
  // Developer user
  USERS.push({
    id: NEXT_ID.user++,
    username: "developer",
    password: "dev123", // In a real app, this would be hashed
    role: "developer"
  });
}

// Initialize our default data
setupDefaultSlots();
setupDefaultEmailTemplates();
setupDefaultUsers();

export interface IStorage {
  // User methods
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUsers(): Promise<User[]>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: number, user: Partial<User>): Promise<User | undefined>;
  deleteUser(id: number): Promise<boolean>;
  validateUser(username: string, password: string): Promise<User | null>;
  
  // Slot methods
  getSlot(id: number): Promise<DeploymentSlot | undefined>;
  getSlots(): Promise<DeploymentSlot[]>;
  getSlotsByWeek(date: Date): Promise<SlotWithRelease[]>;
  createSlot(slot: InsertDeploymentSlot): Promise<DeploymentSlot>;
  updateSlot(id: number, slot: Partial<DeploymentSlot>): Promise<DeploymentSlot | undefined>;
  
  // Release methods
  getRelease(id: number): Promise<Release | undefined>;
  getReleases(): Promise<Release[]>;
  getUpcomingReleases(): Promise<(Release & { slot?: DeploymentSlot })[]>;
  createRelease(release: InsertRelease): Promise<Release>;
  deleteRelease(id: number): Promise<boolean>;
  updateReleaseStatus(id: number, status: string, comments: string | null): Promise<Release | undefined>;
  
  // Email template methods
  getEmailTemplate(id: number): Promise<EmailTemplate | undefined>;
  getEmailTemplates(): Promise<EmailTemplate[]>;
  getEmailTemplatesByCategory(category: string): Promise<EmailTemplate[]>;
  createEmailTemplate(template: InsertEmailTemplate): Promise<EmailTemplate>;
  updateEmailTemplate(id: number, template: Partial<EmailTemplate>): Promise<EmailTemplate | undefined>;
  deleteEmailTemplate(id: number): Promise<boolean>;
}

export class MemoryStorage implements IStorage {
  // User methods
  async getUser(id: number): Promise<User | undefined> {
    return USERS.find(user => user.id === id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return USERS.find(user => user.username === username);
  }

  async getUsers(): Promise<User[]> {
    return [...USERS];
  }

  async createUser(user: InsertUser): Promise<User> {
    // Check if username already exists
    const existingUser = await this.getUserByUsername(user.username);
    if (existingUser) {
      throw new Error("Username already exists");
    }
    
    const newUser: User = {
      id: NEXT_ID.user++,
      username: user.username,
      password: user.password, // In a real app, this would be hashed
      role: user.role || "developer" // Default to developer role
    };
    
    USERS.push(newUser);
    return newUser;
  }

  async updateUser(id: number, updates: Partial<User>): Promise<User | undefined> {
    const index = USERS.findIndex(user => user.id === id);
    if (index === -1) return undefined;
    
    // If updating username, check if new username already exists
    if (updates.username && updates.username !== USERS[index].username) {
      const existingUser = await this.getUserByUsername(updates.username);
      if (existingUser) {
        throw new Error("Username already exists");
      }
    }
    
    USERS[index] = { 
      ...USERS[index], 
      ...updates 
    };
    
    return USERS[index];
  }

  async deleteUser(id: number): Promise<boolean> {
    const index = USERS.findIndex(user => user.id === id);
    if (index === -1) return false;
    
    USERS.splice(index, 1);
    return true;
  }

  async validateUser(username: string, password: string): Promise<User | null> {
    const user = await this.getUserByUsername(username);
    
    if (!user || user.password !== password) {
      return null;
    }
    
    return user;
  }

  // Slot methods
  async getSlot(id: number): Promise<DeploymentSlot | undefined> {
    // Find slot in all days
    for (const dateKey in SLOTS_BY_DAY) {
      const slotFound = SLOTS_BY_DAY[dateKey].find(slot => slot.id === id);
      if (slotFound) return slotFound;
    }
    return undefined;
  }

  async getSlots(): Promise<DeploymentSlot[]> {
    // Combine all slots from all days
    return Object.values(SLOTS_BY_DAY).flat();
  }

  async getSlotsByWeek(date: Date): Promise<SlotWithRelease[]> {
    const weekStart = startOfWeek(date, { weekStartsOn: 1 });
    const weekEnd = addDays(weekStart, 6);
    const now = new Date();
    now.setHours(0, 0, 0, 0); // Set to midnight to compare dates properly
    
    // Filter slots within the week range
    const result: SlotWithRelease[] = [];
    
    for (const dateKey in SLOTS_BY_DAY) {
      const dateObj = new Date(dateKey);
      if (dateObj >= weekStart && dateObj <= weekEnd && dateObj >= now) {
        const slotsForDay = SLOTS_BY_DAY[dateKey].map(slot => {
          // If this slot has a release assigned, look it up
          if (slot.releaseId) {
            const release = RELEASES.find(r => r.id === slot.releaseId);
            return { ...slot, release };
          }
          return slot;
        });
        result.push(...slotsForDay);
      }
    }
    
    return result;
  }

  async createSlot(slot: InsertDeploymentSlot): Promise<DeploymentSlot> {
    const dateStr = new Date(slot.date).toISOString().split('T')[0];
    const newSlot: DeploymentSlot = {
      id: NEXT_ID.slot++,
      date: new Date(slot.date),
      time: slot.time,
      timeDetail: slot.timeDetail || null,
      booked: slot.booked || 0,
      releaseId: slot.releaseId || null
    };
    
    // Initialize the day if it doesn't exist
    if (!SLOTS_BY_DAY[dateStr]) SLOTS_BY_DAY[dateStr] = [];
    
    SLOTS_BY_DAY[dateStr].push(newSlot as SlotWithRelease);
    return newSlot;
  }

  async updateSlot(id: number, updates: Partial<DeploymentSlot>): Promise<DeploymentSlot | undefined> {
    // Find and update the slot
    for (const dateKey in SLOTS_BY_DAY) {
      const slotIndex = SLOTS_BY_DAY[dateKey].findIndex(slot => slot.id === id);
      if (slotIndex !== -1) {
        const updatedSlot = { ...SLOTS_BY_DAY[dateKey][slotIndex], ...updates };
        SLOTS_BY_DAY[dateKey][slotIndex] = updatedSlot;
        return updatedSlot;
      }
    }
    return undefined;
  }

  async getRelease(id: number): Promise<Release | undefined> {
    return RELEASES.find(release => release.id === id);
  }

  async getReleases(): Promise<Release[]> {
    return [...RELEASES];
  }

  async getUpcomingReleases(): Promise<(Release & { slot?: DeploymentSlot })[]> {
    const now = new Date();
    now.setHours(0, 0, 0, 0); // Set to midnight to compare dates properly

    // Return releases with their associated slots
    return RELEASES.map(release => {
      // Find the slot with this release
      let slot: DeploymentSlot | undefined = undefined;
      
      for (const dateKey in SLOTS_BY_DAY) {
        const slotFound = SLOTS_BY_DAY[dateKey].find(s => s.releaseId === release.id);
        if (slotFound) {
          slot = slotFound;
          break;
        }
      }
      
      return { ...release, slot };
    }).filter(releaseWithSlot => {
      // Filter only releases with slots in the future
      if (!releaseWithSlot.slot) return false;
      const slotDate = new Date(releaseWithSlot.slot.date);
      return slotDate >= now;
    });
  }

  async createRelease(release: InsertRelease): Promise<Release> {
    const newRelease: Release = {
      id: NEXT_ID.release++,
      name: release.name,
      version: release.version || null,
      team: release.team,
      releaseType: release.releaseType,
      description: release.description || null,
      status: release.status || "pending",
      comments: release.comments || null,
      slotId: release.slotId
    };
    
    RELEASES.push(newRelease);
    
    // If slot ID is provided, update the slot with this release
    if (release.slotId) {
      await this.updateSlot(release.slotId, { releaseId: newRelease.id });
    }
    
    return newRelease;
  }

  async deleteRelease(id: number): Promise<boolean> {
    const index = RELEASES.findIndex(release => release.id === id);
    if (index === -1) return false;
    
    // Get the release to be deleted
    const releaseToDelete = RELEASES[index];
    
    // Find and update any slots that reference this release
    for (const dateKey in SLOTS_BY_DAY) {
      const slotIndex = SLOTS_BY_DAY[dateKey].findIndex(slot => slot.releaseId === id);
      if (slotIndex !== -1) {
        // Update both releaseId and booked status
        SLOTS_BY_DAY[dateKey][slotIndex].releaseId = null;
        SLOTS_BY_DAY[dateKey][slotIndex].booked = 0;
      }
    }
    
    // Remove the release
    RELEASES.splice(index, 1);
    return true;
  }

  async updateReleaseStatus(id: number, status: string, comments: string | null): Promise<Release | undefined> {
    const index = RELEASES.findIndex(release => release.id === id);
    if (index === -1) return undefined;
    
    RELEASES[index] = { 
      ...RELEASES[index], 
      status, 
      comments 
    };
    
    return RELEASES[index];
  }

  async getEmailTemplate(id: number): Promise<EmailTemplate | undefined> {
    return EMAIL_TEMPLATES.find(template => template.id === id);
  }

  async getEmailTemplates(): Promise<EmailTemplate[]> {
    return [...EMAIL_TEMPLATES];
  }

  async getEmailTemplatesByCategory(category: string): Promise<EmailTemplate[]> {
    return EMAIL_TEMPLATES.filter(template => template.category === category);
  }

  async createEmailTemplate(template: InsertEmailTemplate): Promise<EmailTemplate> {
    const newTemplate: EmailTemplate = {
      id: NEXT_ID.template++,
      name: template.name,
      subject: template.subject,
      body: template.body,
      category: template.category,
      variables: template.variables || {},
      isDefault: template.isDefault || 0,
      createdAt: new Date()
    };
    
    EMAIL_TEMPLATES.push(newTemplate);
    return newTemplate;
  }

  async updateEmailTemplate(id: number, updates: Partial<EmailTemplate>): Promise<EmailTemplate | undefined> {
    const index = EMAIL_TEMPLATES.findIndex(template => template.id === id);
    if (index === -1) return undefined;
    
    EMAIL_TEMPLATES[index] = { 
      ...EMAIL_TEMPLATES[index], 
      ...updates 
    };
    
    return EMAIL_TEMPLATES[index];
  }

  async deleteEmailTemplate(id: number): Promise<boolean> {
    const index = EMAIL_TEMPLATES.findIndex(template => template.id === id);
    if (index === -1) return false;
    
    // Don't delete default templates
    if (EMAIL_TEMPLATES[index].isDefault === 1) {
      return false;
    }
    
    EMAIL_TEMPLATES.splice(index, 1);
    return true;
  }
}

export const storage = new MemoryStorage();