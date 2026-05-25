import { pgTable, text, serial, timestamp, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const logsTable = pgTable("logs", {
  id: serial("id").primaryKey(),
  jobId: integer("job_id"),
  level: text("level").notNull().default("info"),
  message: text("message").notNull(),
  meta: text("meta"),
  timestamp: timestamp("timestamp", { withTimezone: true }).notNull().defaultNow(),
});

export const insertLogSchema = createInsertSchema(logsTable).omit({ id: true });
export type InsertLog = z.infer<typeof insertLogSchema>;
export type Log = typeof logsTable.$inferSelect;
