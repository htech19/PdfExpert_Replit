import { pgTable, text, serial, timestamp, integer, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const jobsTable = pgTable("jobs", {
  id: serial("id").primaryKey(),
  filename: text("filename").notNull(),
  originalName: text("original_name").notNull(),
  fileSize: integer("file_size"),
  status: text("status").notNull().default("pending"),
  progress: integer("progress").notNull().default(0),
  totalPages: integer("total_pages").notNull().default(0),
  processedPages: integer("processed_pages").notNull().default(0),
  productCount: integer("product_count").notNull().default(0),
  imageCount: integer("image_count").notNull().default(0),
  error: text("error"),
  ocrEnabled: boolean("ocr_enabled").notNull().default(true),
  imageExtractionEnabled: boolean("image_extraction_enabled").notNull().default(true),
  aiCorrectionEnabled: boolean("ai_correction_enabled").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertJobSchema = createInsertSchema(jobsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertJob = z.infer<typeof insertJobSchema>;
export type Job = typeof jobsTable.$inferSelect;
