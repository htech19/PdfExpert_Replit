import { Router, type IRouter } from "express";
import { eq, desc, and, SQL } from "drizzle-orm";
import { db, logsTable } from "@workspace/db";
import { GetLogsQueryParams } from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/logs", async (req, res): Promise<void> => {
  const query = GetLogsQueryParams.safeParse(req.query);
  if (!query.success) {
    res.status(400).json({ error: query.error.message });
    return;
  }

  const { level, limit = 100 } = query.data;

  const conditions: SQL[] = [];
  if (level) conditions.push(eq(logsTable.level, level));

  const where = conditions.length > 0 ? and(...conditions) : undefined;

  const logs = await db.select().from(logsTable).where(where).orderBy(desc(logsTable.timestamp)).limit(limit);

  res.json(logs);
});

export default router;
