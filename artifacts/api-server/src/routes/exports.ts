import { Router, type IRouter } from "express";
import { desc, eq } from "drizzle-orm";
import { db, exportsTable, productsTable } from "@workspace/db";
import { ExportProductsBody } from "@workspace/api-zod";
import { addLog } from "../lib/logger-db";
import { generateExport } from "../lib/exporter";

const router: IRouter = Router();

router.post("/export", async (req, res): Promise<void> => {
  const parsed = ExportProductsBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { format, jobId, productIds, includeImages = false } = parsed.data;

  const ext = format === "xlsx" ? "xlsx" : format === "json" ? "json" : "csv";
  const filename = `pdfexpert_${format}_${Date.now()}.${ext}`;

  let productCount = 0;
  if (productIds && productIds.length > 0) {
    productCount = productIds.length;
  } else if (jobId) {
    productCount = Number(await db.$count(productsTable, eq(productsTable.jobId, jobId)));
  } else {
    productCount = Number(await db.$count(productsTable));
  }

  const [exportRecord] = await db.insert(exportsTable).values({
    format,
    filename,
    downloadUrl: `/api/exports/download/${filename}`,
    productCount,
    status: "generating",
  }).returning();

  setImmediate(async () => {
    try {
      const result = await generateExport({
        format: format as "csv" | "json" | "xlsx" | "shopify" | "woocommerce",
        jobId: jobId ?? undefined,
        productIds: productIds ?? undefined,
        includeImages,
      });

      await db.update(exportsTable)
        .set({ status: "ready", productCount: result.productCount })
        .where(eq(exportsTable.id, exportRecord.id));

      await addLog(null, "info", `Export ready: ${filename} (${result.productCount} products, ${format.toUpperCase()})`);
    } catch (err) {
      await db.update(exportsTable)
        .set({ status: "failed" })
        .where(eq(exportsTable.id, exportRecord.id));
      await addLog(null, "error", `Export failed: ${err instanceof Error ? err.message : String(err)}`);
    }
  });

  res.json(exportRecord);
});

router.get("/exports/download/:filename", async (req, res): Promise<void> => {
  const { filename } = req.params;

  const [record] = await db.select().from(exportsTable).where(eq(exportsTable.filename, filename));
  if (!record || record.status !== "ready") {
    res.status(404).json({ error: "Export not found or not ready" });
    return;
  }

  try {
    const fmt = record.format as "csv" | "json" | "xlsx" | "shopify" | "woocommerce";
    const result = await generateExport({ format: fmt });

    const mimeMap: Record<string, string> = {
      json: "application/json",
      csv: "text/csv",
      xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      shopify: "text/csv",
      woocommerce: "text/csv",
    };

    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    res.setHeader("Content-Type", mimeMap[fmt] ?? "application/octet-stream");
    res.send(result.content);
  } catch (err) {
    res.status(500).json({ error: "Failed to generate export" });
  }
});

router.get("/exports", async (_req, res): Promise<void> => {
  const exports = await db.select().from(exportsTable).orderBy(desc(exportsTable.createdAt)).limit(50);
  res.json(exports);
});

export default router;
