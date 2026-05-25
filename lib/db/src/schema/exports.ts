import { pgTable, text, serial, timestamp, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const exportsTable = pgTable("exports", {
  id: serial("id").primaryKey(),
  format: text("format").notNull(),
  filename: text("filename").notNull(),
  downloadUrl: text("download_url"),
  productCount: integer("product_count").notNull().default(0),
  status: text("status").notNull().default("generating"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertExportSchema = createInsertSchema(exportsTable).omit({ id: true, createdAt: true });
export type InsertExport = z.infer<typeof insertExportSchema>;
export type Export = typeof exportsTable.$inferSelect;
