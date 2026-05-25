import { db, logsTable } from "@workspace/db";
import { logger } from "./logger";

export async function addLog(jobId: number | null, level: string, message: string, meta?: string): Promise<void> {
  try {
    await db.insert(logsTable).values({ jobId, level, message, meta: meta ?? null });
  } catch (err) {
    logger.error({ err }, "Failed to write log to DB");
  }
}
