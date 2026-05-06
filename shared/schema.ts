import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, date, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export * from "./models/auth";

export const applications = pgTable("applications", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  userId: varchar("user_id").notNull(),
  company: text("company").notNull(),
  position: text("position").notNull(),
  status: text("status").notNull().default("applied"),
  appliedDate: date("applied_date").notNull(),
  interviewDate: date("interview_date"),
  interviewTime: text("interview_time"),
  interviewRound: integer("interview_round").default(1),
  notes: text("notes"),
});

export const dailyStats = pgTable("daily_stats", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  userId: varchar("user_id").notNull(),
  date: date("date").notNull(),
  totalApplied: integer("total_applied").notNull().default(0),
  totalRejected: integer("total_rejected").notNull().default(0),
});

export const insertApplicationSchema = createInsertSchema(applications).omit({
  id: true,
});
export const insertDailyStatsSchema = createInsertSchema(dailyStats).omit({
  id: true,
});

export type InsertApplication = z.infer<typeof insertApplicationSchema>;
export type Application = typeof applications.$inferSelect;
export type DailyStats = typeof dailyStats.$inferSelect;
export type InsertDailyStats = z.infer<typeof insertDailyStatsSchema>;
