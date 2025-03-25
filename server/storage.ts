import { DeploymentSlot, InsertDeploymentSlot, Release, InsertRelease, SlotWithRelease, EmailTemplate, InsertEmailTemplate } from "@shared/schema";
import { addDays, startOfWeek, format, setHours, setMinutes, parseISO } from "date-fns";

export interface IStorage {
  // Deployment Slots
  getSlot(id: number): Promise<DeploymentSlot | undefined>;
  getSlots(): Promise<DeploymentSlot[]>;
  getSlotsByWeek(date: Date): Promise<SlotWithRelease[]>;
  createSlot(slot: InsertDeploymentSlot): Promise<DeploymentSlot>;
  updateSlot(id: number, slot: Partial<DeploymentSlot>): Promise<DeploymentSlot | undefined>;
  
  // Releases
  getRelease(id: number): Promise<Release | undefined>;
  getReleases(): Promise<Release[]>;
  getUpcomingReleases(): Promise<(Release & { slot?: DeploymentSlot })[]>;
  createRelease(release: InsertRelease): Promise<Release>;
  deleteRelease(id: number): Promise<boolean>;
  updateReleaseStatus(id: number, status: string, comments: string | null): Promise<Release | undefined>;
  
  // Email Templates
  getEmailTemplate(id: number): Promise<EmailTemplate | undefined>;
  getEmailTemplates(): Promise<EmailTemplate[]>;
  getEmailTemplatesByCategory(category: string): Promise<EmailTemplate[]>;
  createEmailTemplate(template: InsertEmailTemplate): Promise<EmailTemplate>;
  updateEmailTemplate(id: number, template: Partial<EmailTemplate>): Promise<EmailTemplate | undefined>;
  deleteEmailTemplate(id: number): Promise<boolean>;
}

export class MemStorage implements IStorage {
  private slots: Map<number, DeploymentSlot>;
  private releases: Map<number, Release>;
  private emailTemplates: Map<number, EmailTemplate>;
  private slotCurrentId: number;
  private releaseCurrentId: number;
  private emailTemplateCurrentId: number;

  constructor() {
    this.slots = new Map();
    this.releases = new Map();
    this.emailTemplates = new Map();
    this.slotCurrentId = 1;
    this.releaseCurrentId = 1;
    this.emailTemplateCurrentId = 1;

    // Initialize with 10 slots per day for the current week and next week
    this.initializeSlots();
    // Initialize default email templates
    this.initializeDefaultEmailTemplates();
  }

  // Initialize deployment slots for the next two weeks
  private initializeSlots() {
    const now = new Date();
    
    // Create slots for current week
    this.createWeekSlots(now);
    
    // Create slots for next week
    const nextWeek = addDays(now, 7);
    this.createWeekSlots(nextWeek);
  }

  private createWeekSlots(date: Date) {
    // Start of week (Monday)
    const weekStart = startOfWeek(date, { weekStartsOn: 1 });
    
    // Create slots for Monday to Friday
    for (let dayOffset = 0; dayOffset < 5; dayOffset++) {
      const day = addDays(weekStart, dayOffset);
      const isFriday = dayOffset === 4; // Friday is the 5th day (index 4)
      
      // Morning slot (9:00 AM - 11:00 AM)
      this.createSlot({
        date: setHours(setMinutes(day, 0), 9),
        time: "Slot 1", 
        timeDetail: "09:00 AM - 11:00 AM IST",
        booked: 0,
        releaseId: null
      });
      
      // Afternoon slot (2:00 PM - 4:00 PM)
      this.createSlot({
        date: setHours(setMinutes(day, 0), 14),
        time: "Slot 2",
        timeDetail: "02:00 PM - 04:00 PM IST",
        booked: 0,
        releaseId: null
      });
      
      // Evening slot (7:00 PM - 9:00 PM) - Monday to Thursday only
      if (!isFriday) {
        this.createSlot({
          date: setHours(setMinutes(day, 0), 19),
          time: "Slot 3",
          timeDetail: "07:00 PM - 09:00 PM IST",
          booked: 0,
          releaseId: null
        });
      }
    }
  }

  async getSlot(id: number): Promise<DeploymentSlot | undefined> {
    return this.slots.get(id);
  }

  async getSlots(): Promise<DeploymentSlot[]> {
    return Array.from(this.slots.values());
  }

  async getSlotsByWeek(date: Date): Promise<SlotWithRelease[]> {
    const weekStart = startOfWeek(date, { weekStartsOn: 1 });
    const weekEnd = addDays(weekStart, 6);
    
    const weekSlots = Array.from(this.slots.values())
      .filter(slot => {
        const slotDate = new Date(slot.date);
        return slotDate >= weekStart && slotDate <= weekEnd;
      })
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    
    // Attach release data to slots
    return weekSlots.map(slot => {
      const slotWithRelease: SlotWithRelease = { ...slot };
      if (slot.releaseId) {
        const release = this.releases.get(slot.releaseId);
        if (release) {
          slotWithRelease.release = release;
        }
      }
      return slotWithRelease;
    });
  }

  async createSlot(slot: InsertDeploymentSlot): Promise<DeploymentSlot> {
    const id = this.slotCurrentId++;
    let dateValue: Date;
    
    if (typeof slot.date === 'string') {
      dateValue = parseISO(slot.date);
    } else if (slot.date instanceof Date) {
      dateValue = slot.date;
    } else {
      throw new Error('Invalid date format');
    }
    
    const newSlot: DeploymentSlot = {
      id,
      date: dateValue,
      time: slot.time,
      timeDetail: slot.timeDetail || null,
      booked: slot.booked || 0,
      releaseId: slot.releaseId || null
    };
    
    this.slots.set(id, newSlot);
    return newSlot;
  }

  async updateSlot(id: number, updates: Partial<DeploymentSlot>): Promise<DeploymentSlot | undefined> {
    const slot = this.slots.get(id);
    if (!slot) return undefined;
    
    const updatedSlot = { ...slot, ...updates };
    this.slots.set(id, updatedSlot);
    return updatedSlot;
  }

  async getRelease(id: number): Promise<Release | undefined> {
    return this.releases.get(id);
  }

  async getReleases(): Promise<Release[]> {
    return Array.from(this.releases.values());
  }

  async getUpcomingReleases(): Promise<(Release & { slot?: DeploymentSlot })[]> {
    const releases = Array.from(this.releases.values());
    return releases.map(release => {
      const slotId = release.slotId;
      const slot = this.slots.get(slotId);
      return { ...release, slot };
    });
  }

  async createRelease(release: InsertRelease): Promise<Release> {
    const id = this.releaseCurrentId++;
    const newRelease: Release = {
      id,
      name: release.name,
      version: release.version || null,
      team: release.team,
      releaseType: release.releaseType,
      description: release.description || null,
      status: release.status || 'pending',
      comments: release.comments || null,
      slotId: release.slotId
    };
    
    this.releases.set(id, newRelease);
    
    // Update the corresponding slot to booked status
    const slot = this.slots.get(release.slotId);
    if (slot) {
      await this.updateSlot(release.slotId, { booked: 1, releaseId: id });
    }
    
    return newRelease;
  }

  async deleteRelease(id: number): Promise<boolean> {
    const release = this.releases.get(id);
    if (!release) return false;
    
    // Free up the slot
    const slot = this.slots.get(release.slotId);
    if (slot) {
      await this.updateSlot(release.slotId, { booked: 0, releaseId: null });
    }
    
    return this.releases.delete(id);
  }
  
  // Update release status
  async updateReleaseStatus(id: number, status: string, comments: string | null): Promise<Release | undefined> {
    const release = this.releases.get(id);
    if (!release) return undefined;
    
    const updatedRelease = { 
      ...release, 
      status,
      comments
    };
    
    this.releases.set(id, updatedRelease);
    return updatedRelease;
  }

  // Initialize default email templates
  private initializeDefaultEmailTemplates() {
    // Booking confirmation template
    this.createEmailTemplate({
      name: "Deployment Booking Confirmation",
      subject: "Deployment Slot Confirmation: {{releaseName}}",
      body: "Dear Team Member,\n\nThis is to confirm that your deployment slot has been booked.\n\nDetails:\n- Release: {{releaseName}}{{version}}\n- Team: {{team}}\n- Type: {{releaseType}}\n- Date: {{date}}\n- Time: {{time}}\n\nPlease prepare your deployment package according to the release guidelines and contact the release team if you have any questions.\n\nBest regards,\nDeployment Management System",
      category: "booking",
      variables: {
        "releaseName": "Name of the release",
        "version": "Release version (optional)",
        "team": "Team name",
        "releaseType": "Type of the release",
        "date": "Deployment date",
        "time": "Deployment time"
      },
      isDefault: 1
    });

    // Status update template
    this.createEmailTemplate({
      name: "Deployment Status Update",
      subject: "Deployment Status Update: {{releaseName}} - {{status}}",
      body: "Dear Team Member,\n\nThe status of your deployment has been updated.\n\nDetails:\n- Release: {{releaseName}}{{version}}\n- Team: {{team}}\n- Status: {{status}}\n- Date: {{date}}\n- Time: {{time}}\n{{comments}}\n\nIf you have any questions, please contact the release team.\n\nBest regards,\nDeployment Management System",
      category: "status-update",
      variables: {
        "releaseName": "Name of the release",
        "version": "Release version (optional)",
        "team": "Team name",
        "status": "Status of the deployment",
        "date": "Deployment date",
        "time": "Deployment time",
        "comments": "Additional comments (optional)"
      },
      isDefault: 1
    });

    // Reminder template
    this.createEmailTemplate({
      name: "Deployment Reminder",
      subject: "Reminder: Upcoming Deployment - {{releaseName}}",
      body: "Dear Team Member,\n\nThis is a reminder about your upcoming deployment.\n\nDetails:\n- Release: {{releaseName}}{{version}}\n- Team: {{team}}\n- Type: {{releaseType}}\n- Date: {{date}}\n- Time: {{time}}\n\nPlease ensure all pre-deployment checks are completed and your deployment package is ready.\n\nBest regards,\nDeployment Management System",
      category: "reminder",
      variables: {
        "releaseName": "Name of the release",
        "version": "Release version (optional)",
        "team": "Team name",
        "releaseType": "Type of the release",
        "date": "Deployment date",
        "time": "Deployment time"
      },
      isDefault: 1
    });
  }

  // Email Template methods
  async getEmailTemplate(id: number): Promise<EmailTemplate | undefined> {
    return this.emailTemplates.get(id);
  }

  async getEmailTemplates(): Promise<EmailTemplate[]> {
    return Array.from(this.emailTemplates.values());
  }

  async getEmailTemplatesByCategory(category: string): Promise<EmailTemplate[]> {
    return Array.from(this.emailTemplates.values())
      .filter(template => template.category === category);
  }

  async createEmailTemplate(template: InsertEmailTemplate): Promise<EmailTemplate> {
    const id = this.emailTemplateCurrentId++;
    
    const newTemplate: EmailTemplate = {
      id,
      name: template.name,
      subject: template.subject,
      body: template.body,
      category: template.category,
      variables: template.variables,
      isDefault: template.isDefault || 0,
      createdAt: new Date()
    };
    
    this.emailTemplates.set(id, newTemplate);
    return newTemplate;
  }

  async updateEmailTemplate(id: number, updates: Partial<EmailTemplate>): Promise<EmailTemplate | undefined> {
    const template = this.emailTemplates.get(id);
    if (!template) return undefined;
    
    const updatedTemplate = { ...template, ...updates };
    this.emailTemplates.set(id, updatedTemplate);
    return updatedTemplate;
  }

  async deleteEmailTemplate(id: number): Promise<boolean> {
    const template = this.emailTemplates.get(id);
    if (!template || template.isDefault === 1) return false; // Don't allow deleting default templates
    
    return this.emailTemplates.delete(id);
  }
}

export const storage = new MemStorage();
