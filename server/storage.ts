import { DeploymentSlot, InsertDeploymentSlot, Release, InsertRelease, SlotWithRelease } from "@shared/schema";
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
}

export class MemStorage implements IStorage {
  private slots: Map<number, DeploymentSlot>;
  private releases: Map<number, Release>;
  private slotCurrentId: number;
  private releaseCurrentId: number;

  constructor() {
    this.slots = new Map();
    this.releases = new Map();
    this.slotCurrentId = 1;
    this.releaseCurrentId = 1;

    // Initialize with 10 slots per day for the current week and next week
    this.initializeSlots();
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
}

export const storage = new MemStorage();
