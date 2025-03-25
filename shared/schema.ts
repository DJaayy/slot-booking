import { pgTable, text, serial, integer, timestamp } from "drizzle-orm/pg-core";
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

// Types
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

export type InsertDeploymentSlot = z.infer<typeof insertDeploymentSlotSchema>;
export type DeploymentSlot = typeof deploymentSlots.$inferSelect;

export type InsertRelease = z.infer<typeof insertReleaseSchema>;
export type Release = typeof releases.$inferSelect;

export type BookSlot = z.infer<typeof bookSlotSchema>;
export type UpdateReleaseStatus = z.infer<typeof updateReleaseStatusSchema>;

// Combined Slot with Release Info
export type SlotWithRelease = DeploymentSlot & {
  release?: Release;
};
