import { pgTable, text, serial, integer, timestamp, json } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

// Deployment Slots Schema
export const deploymentSlots = pgTable("deployment_slots", {
  id: serial("id").primaryKey(),
  date: timestamp("date").notNull(),
  time: text("time").notNull(),
  timeDetail: text("time_detail"),
  booked: integer("booked").default(0).notNull(), // 0 = available, 1 = booked
  releaseId: integer("release_id"),
});

// Release Schema
export const releases = pgTable("releases", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  version: text("version"),
  team: text("team").notNull(),
  releaseType: text("release_type").notNull(),
  description: text("description"),
  status: text("status").default("pending").notNull(), // pending, released, reverted, skipped, unbooked
  comments: text("comments"), // For status change comments
  slotId: integer("slot_id").notNull(),
});

// Email Templates Schema
export const emailTemplates = pgTable("email_templates", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  subject: text("subject").notNull(),
  body: text("body").notNull(),
  category: text("category").notNull(), // booking, status-update, reminder
  variables: json("variables").notNull(), // Available variables for this template
  isDefault: integer("is_default").default(0).notNull(), // 0 = custom, 1 = default
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Insert Schemas
export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export const insertDeploymentSlotSchema = createInsertSchema(deploymentSlots).pick({
  date: true,
  time: true,
  timeDetail: true,
  booked: true,
  releaseId: true,
});

export const insertReleaseSchema = createInsertSchema(releases).pick({
  name: true,
  version: true,
  team: true,
  releaseType: true,
  description: true,
  status: true,
  comments: true,
  slotId: true,
});

export const insertEmailTemplateSchema = createInsertSchema(emailTemplates).pick({
  name: true,
  subject: true,
  body: true,
  category: true,
  variables: true,
  isDefault: true,
});

export const bookSlotSchema = z.object({
  slotId: z.number(),
  releaseName: z.string().min(1, "Release name is required"),
  version: z.string().optional(),
  team: z.string().min(1, "Team is required"),
  releaseType: z.string().min(1, "Release type is required"),
  description: z.string().optional(),
});

export const updateReleaseStatusSchema = z.object({
  status: z.enum(["pending", "released", "reverted", "skipped", "unbooked"]),
  comments: z.string().nullable(),
});

export const customizeEmailTemplateSchema = z.object({
  id: z.number().optional(),
  name: z.string().min(1, "Template name is required"),
  subject: z.string().min(1, "Subject is required"),
  body: z.string().min(1, "Body is required"),
  category: z.enum(["booking", "status-update", "reminder"]),
  variables: z.record(z.string(), z.string()),
  isDefault: z.number().default(0),
});

// Types
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

export type InsertDeploymentSlot = z.infer<typeof insertDeploymentSlotSchema>;
export type DeploymentSlot = typeof deploymentSlots.$inferSelect;

export type InsertRelease = z.infer<typeof insertReleaseSchema>;
export type Release = typeof releases.$inferSelect;

export type BookSlot = z.infer<typeof bookSlotSchema>;
export type UpdateReleaseStatus = z.infer<typeof updateReleaseStatusSchema>;
export type CustomizeEmailTemplate = z.infer<typeof customizeEmailTemplateSchema>;

export type InsertEmailTemplate = z.infer<typeof insertEmailTemplateSchema>;
export type EmailTemplate = typeof emailTemplates.$inferSelect;

// Combined Slot with Release Info
export type SlotWithRelease = DeploymentSlot & {
  release?: Release;
};
