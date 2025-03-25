import pg from "pg";
const { Pool } = pg;
import { drizzle } from "drizzle-orm/node-postgres";
import { DeploymentSlot, InsertDeploymentSlot, Release, InsertRelease, SlotWithRelease, EmailTemplate, InsertEmailTemplate } from "@shared/schema";
import { addDays, startOfWeek, parseISO } from "date-fns";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const db = drizzle(pool);

export interface IStorage {
  getSlot(id: number): Promise<DeploymentSlot | undefined>;
  getSlots(): Promise<DeploymentSlot[]>;
  getSlotsByWeek(date: Date): Promise<SlotWithRelease[]>;
  createSlot(slot: InsertDeploymentSlot): Promise<DeploymentSlot>;
  updateSlot(id: number, slot: Partial<DeploymentSlot>): Promise<DeploymentSlot | undefined>;
  getRelease(id: number): Promise<Release | undefined>;
  getReleases(): Promise<Release[]>;
  getUpcomingReleases(): Promise<(Release & { slot?: DeploymentSlot })[]>;
  createRelease(release: InsertRelease): Promise<Release>;
  deleteRelease(id: number): Promise<boolean>;
  updateReleaseStatus(id: number, status: string, comments: string | null): Promise<Release | undefined>;
  getEmailTemplate(id: number): Promise<EmailTemplate | undefined>;
  getEmailTemplates(): Promise<EmailTemplate[]>;
  getEmailTemplatesByCategory(category: string): Promise<EmailTemplate[]>;
  createEmailTemplate(template: InsertEmailTemplate): Promise<EmailTemplate>;
  updateEmailTemplate(id: number, template: Partial<EmailTemplate>): Promise<EmailTemplate | undefined>;
  deleteEmailTemplate(id: number): Promise<boolean>;
}

export class PostgresStorage implements IStorage {
  async getSlot(id: number): Promise<DeploymentSlot | undefined> {
    const result = await db.query.deploymentSlots.findFirst({
      where: (slots, { eq }) => eq(slots.id, id)
    });
    return result;
  }

  async getSlots(): Promise<DeploymentSlot[]> {
    return db.query.deploymentSlots.findMany();
  }

  async getSlotsByWeek(date: Date): Promise<SlotWithRelease[]> {
    const weekStart = startOfWeek(date, { weekStartsOn: 1 });
    const weekEnd = addDays(weekStart, 6);

    const slots = await db.query.deploymentSlots.findMany({
      where: (slots, { gte, lte }) => ({
        and: [
          gte(slots.date, weekStart),
          lte(slots.date, weekEnd)
        ]
      }),
      with: {
        release: true
      }
    });

    return slots.map(slot => ({
      ...slot,
      date: new Date(slot.date)
    }));
  }

  async createSlot(slot: InsertDeploymentSlot): Promise<DeploymentSlot> {
    const [result] = await db.insert(deploymentSlots).values(slot).returning();
    return result;
  }

  async updateSlot(id: number, updates: Partial<DeploymentSlot>): Promise<DeploymentSlot | undefined> {
    const [result] = await db.update(deploymentSlots)
      .set(updates)
      .where(eq(deploymentSlots.id, id))
      .returning();
    return result;
  }

  async getRelease(id: number): Promise<Release | undefined> {
    return db.query.releases.findFirst({
      where: (releases, { eq }) => eq(releases.id, id)
    });
  }

  async getReleases(): Promise<Release[]> {
    return db.query.releases.findMany();
  }

  async getUpcomingReleases(): Promise<(Release & { slot?: DeploymentSlot })[]> {
    return db.query.releases.findMany({
      with: {
        slot: true
      }
    });
  }

  async createRelease(release: InsertRelease): Promise<Release> {
    const [result] = await db.insert(releases).values(release).returning();
    return result;
  }

  async deleteRelease(id: number): Promise<boolean> {
    const result = await db.delete(releases)
      .where(eq(releases.id, id))
      .returning();
    return result.length > 0;
  }

  async updateReleaseStatus(id: number, status: string, comments: string | null): Promise<Release | undefined> {
    const [result] = await db.update(releases)
      .set({ status, comments })
      .where(eq(releases.id, id))
      .returning();
    return result;
  }

  async getEmailTemplate(id: number): Promise<EmailTemplate | undefined> {
    return db.query.emailTemplates.findFirst({
      where: (templates, { eq }) => eq(templates.id, id)
    });
  }

  async getEmailTemplates(): Promise<EmailTemplate[]> {
    return db.query.emailTemplates.findMany();
  }

  async getEmailTemplatesByCategory(category: string): Promise<EmailTemplate[]> {
    return db.query.emailTemplates.findMany({
      where: (templates, { eq }) => eq(templates.category, category)
    });
  }

  async createEmailTemplate(template: InsertEmailTemplate): Promise<EmailTemplate> {
    const [result] = await db.insert(emailTemplates).values(template).returning();
    return result;
  }

  async updateEmailTemplate(id: number, updates: Partial<EmailTemplate>): Promise<EmailTemplate | undefined> {
    const [result] = await db.update(emailTemplates)
      .set(updates)
      .where(eq(emailTemplates.id, id))
      .returning();
    return result;
  }

  async deleteEmailTemplate(id: number): Promise<boolean> {
    const result = await db.delete(emailTemplates)
      .where(eq(emailTemplates.id, id))
      .returning();
    return result.length > 0;
  }
}

export const storage = new PostgresStorage();