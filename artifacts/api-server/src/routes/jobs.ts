import { Router, type IRouter } from "express";
import { eq, desc, and, SQL } from "drizzle-orm";
import { db, jobsTable, productsTable, productImagesTable, logsTable } from "@workspace/db";
import {
  ListJobsQueryParams,
  CreateJobBody,
  GetJobParams,
  DeleteJobParams,
  ProcessJobParams,
  CancelJobParams,
  GetJobLogsParams,
} from "@workspace/api-zod";
import { addLog } from "../lib/logger-db";
import { simulateProcessing } from "../lib/processor";

const router: IRouter = Router();

router.get("/jobs", async (req, res): Promise<void> => {
  const query = ListJobsQueryParams.safeParse(req.query);
  if (!query.success) {
    res.status(400).json({ error: query.error.message });
    return;
  }
  const { status, limit = 20, offset = 0 } = query.data;

  const conditions: SQL[] = [];
  if (status) {
    conditions.push(eq(jobsTable.status, status));
  }

  const where = conditions.length > 0 ? and(...conditions) : undefined;

  const [items, countResult] = await Promise.all([
    db.select().from(jobsTable).where(where).orderBy(desc(jobsTable.createdAt)).limit(limit).offset(offset),
    db.$count(jobsTable, where),
  ]);

  res.json({ items, total: Number(countResult), limit, offset });
});

router.post("/jobs", async (req, res): Promise<void> => {
  const parsed = CreateJobBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { originalName, fileSize, ocrEnabled = true, imageExtractionEnabled = true, aiCorrectionEnabled = true } = parsed.data;
  const filename = `${Date.now()}_${originalName.replace(/\s+/g, "_")}`;

  const [job] = await db.insert(jobsTable).values({
    filename,
    originalName,
    fileSize: fileSize ?? null,
    status: "pending",
    progress: 0,
    totalPages: 0,
    processedPages: 0,
    productCount: 0,
    imageCount: 0,
    ocrEnabled,
    imageExtractionEnabled,
    aiCorrectionEnabled,
  }).returning();

  await addLog(job.id, "info", `Job created: ${originalName}`);

  res.status(201).json(job);
});

router.get("/jobs/:id", async (req, res): Promise<void> => {
  const params = GetJobParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [job] = await db.select().from(jobsTable).where(eq(jobsTable.id, params.data.id));
  if (!job) {
    res.status(404).json({ error: "Job not found" });
    return;
  }

  res.json(job);
});

router.delete("/jobs/:id", async (req, res): Promise<void> => {
  const params = DeleteJobParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [job] = await db.select().from(jobsTable).where(eq(jobsTable.id, params.data.id));
  if (!job) {
    res.status(404).json({ error: "Job not found" });
    return;
  }

  await db.delete(logsTable).where(eq(logsTable.jobId, params.data.id));
  const products = await db.select().from(productsTable).where(eq(productsTable.jobId, params.data.id));
  for (const p of products) {
    await db.delete(productImagesTable).where(eq(productImagesTable.productId, p.id));
  }
  await db.delete(productsTable).where(eq(productsTable.jobId, params.data.id));
  await db.delete(jobsTable).where(eq(jobsTable.id, params.data.id));

  res.sendStatus(204);
});

router.post("/jobs/:id/process", async (req, res): Promise<void> => {
  const params = ProcessJobParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [job] = await db.select().from(jobsTable).where(eq(jobsTable.id, params.data.id));
  if (!job) {
    res.status(404).json({ error: "Job not found" });
    return;
  }

  if (job.status === "processing") {
    res.status(400).json({ error: "Job is already processing" });
    return;
  }

  const [updated] = await db.update(jobsTable)
    .set({ status: "processing", progress: 0, totalPages: Math.floor(Math.random() * 50) + 10 })
    .where(eq(jobsTable.id, params.data.id))
    .returning();

  await addLog(job.id, "info", `Processing started for: ${job.originalName}`);

  simulateProcessing(job.id, updated.totalPages, job.aiCorrectionEnabled, job.imageExtractionEnabled).catch(() => {});

  res.json(updated);
});

router.post("/jobs/:id/cancel", async (req, res): Promise<void> => {
  const params = CancelJobParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [job] = await db.select().from(jobsTable).where(eq(jobsTable.id, params.data.id));
  if (!job) {
    res.status(404).json({ error: "Job not found" });
    return;
  }

  const [updated] = await db.update(jobsTable)
    .set({ status: "cancelled" })
    .where(eq(jobsTable.id, params.data.id))
    .returning();

  await addLog(job.id, "warn", `Job cancelled: ${job.originalName}`);

  res.json(updated);
});

router.get("/jobs/:id/logs", async (req, res): Promise<void> => {
  const params = GetJobLogsParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const logs = await db.select().from(logsTable)
    .where(eq(logsTable.jobId, params.data.id))
    .orderBy(desc(logsTable.timestamp))
    .limit(200);

  res.json(logs);
});

export default router;
