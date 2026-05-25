import { Router, type IRouter } from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import { db, jobsTable } from "@workspace/db";
import { addLog } from "../lib/logger-db";

function countPdfPages(buffer: Buffer): number {
  const str = buffer.toString("latin1");
  const matches = str.match(/\/Type\s*\/Page[^s]/g);
  return matches?.length ?? 0;
}

const UPLOADS_DIR = path.join(process.cwd(), "uploads");
if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOADS_DIR),
  filename: (_req, file, cb) => {
    const safe = file.originalname.replace(/[^a-zA-Z0-9._-]/g, "_");
    cb(null, `${Date.now()}_${safe}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 100 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype === "application/pdf" || file.originalname.toLowerCase().endsWith(".pdf")) {
      cb(null, true);
    } else {
      cb(new Error("Only PDF files are allowed"));
    }
  },
});

const router: IRouter = Router();

router.post("/upload", upload.single("file"), async (req, res): Promise<void> => {
  if (!req.file) {
    res.status(400).json({ error: "No PDF file provided" });
    return;
  }

  const ocrEnabled = req.body.ocrEnabled !== "false";
  const imageExtractionEnabled = req.body.imageExtractionEnabled !== "false";
  const aiCorrectionEnabled = req.body.aiCorrectionEnabled !== "false";

  let totalPages = 0;
  try {
    const buffer = fs.readFileSync(req.file.path);
    totalPages = countPdfPages(buffer);
  } catch {
    totalPages = 0;
  }

  const [job] = await db.insert(jobsTable).values({
    filename: req.file.filename,
    originalName: req.file.originalname,
    fileSize: req.file.size,
    status: "pending",
    progress: 0,
    totalPages,
    processedPages: 0,
    productCount: 0,
    imageCount: 0,
    ocrEnabled,
    imageExtractionEnabled,
    aiCorrectionEnabled,
  }).returning();

  await addLog(job.id, "info", `PDF uploaded: ${req.file.originalname} — ${totalPages} pages, ${(req.file.size / 1024).toFixed(1)} KB`);

  res.status(201).json(job);
});

export default router;
