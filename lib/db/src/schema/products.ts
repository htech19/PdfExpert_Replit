import { pgTable, text, serial, timestamp, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const productsTable = pgTable("products", {
  id: serial("id").primaryKey(),
  jobId: integer("job_id").notNull(),
  rawName: text("raw_name").notNull(),
  cleanName: text("clean_name").notNull(),
  sku: text("sku"),
  brand: text("brand"),
  category: text("category"),
  subcategory: text("subcategory"),
  color: text("color"),
  material: text("material"),
  size: text("size"),
  slug: text("slug"),
  imageCount: integer("image_count").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertProductSchema = createInsertSchema(productsTable).omit({ id: true, createdAt: true });
export type InsertProduct = z.infer<typeof insertProductSchema>;
export type Product = typeof productsTable.$inferSelect;
