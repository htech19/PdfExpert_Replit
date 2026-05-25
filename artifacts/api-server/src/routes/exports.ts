import { Router, type IRouter } from "express";
import { desc, eq } from "drizzle-orm";
import { db, exportsTable, productsTable } from "@workspace/db";
import { ExportProductsBody } from "@workspace/api-zod";
import { addLog } from "../lib/logger-db";

const router: IRouter = Router();

router.post("/export", async (req, res): Promise<void> => {
  const parsed = ExportProductsBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { format, jobId, productIds, includeImages = false } = parsed.data;

  let productCount = 0;
  if (productIds && productIds.length > 0) {
    productCount = productIds.length;
  } else if (jobId) {
    productCount = Number(await db.$count(productsTable, eq(productsTable.jobId, jobId)));
  } else {
    productCount = Number(await db.$count(productsTable));
  }

  const filename = `pdfexpert_export_${format}_${Date.now()}.${format === "xlsx" ? "xlsx" : format === "json" ? "json" : format === "csv" ? "csv" : "csv"}`;

  const [exportRecord] = await db.insert(exportsTable).values({
    format,
    filename,
    downloadUrl: `/api/exports/download/${filename}`,
    productCount,
    status: "ready",
  }).returning();

  await addLog(null, "info", `Export generated: ${filename} (${productCount} products, format: ${format})`);

  res.json(exportRecord);
});

router.get("/exports", async (_req, res): Promise<void> => {
  const exports = await db.select().from(exportsTable).orderBy(desc(exportsTable.createdAt)).limit(50);
  res.json(exports);
});

export default router;
