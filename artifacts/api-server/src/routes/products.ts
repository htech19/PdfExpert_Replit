import { Router, type IRouter } from "express";
import { eq, and, ilike, SQL, desc } from "drizzle-orm";
import { db, productsTable, productImagesTable } from "@workspace/db";
import {
  ListProductsQueryParams,
  GetProductParams,
  UpdateProductParams,
  UpdateProductBody,
  DeleteProductParams,
} from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/products", async (req, res): Promise<void> => {
  const query = ListProductsQueryParams.safeParse(req.query);
  if (!query.success) {
    res.status(400).json({ error: query.error.message });
    return;
  }

  const { jobId, brand, category, search, limit = 20, offset = 0 } = query.data;

  const conditions: SQL[] = [];
  if (jobId) conditions.push(eq(productsTable.jobId, jobId));
  if (brand) conditions.push(eq(productsTable.brand, brand));
  if (category) conditions.push(eq(productsTable.category, category));
  if (search) conditions.push(ilike(productsTable.cleanName, `%${search}%`));

  const where = conditions.length > 0 ? and(...conditions) : undefined;

  const [items, countResult] = await Promise.all([
    db.select().from(productsTable).where(where).orderBy(desc(productsTable.createdAt)).limit(limit).offset(offset),
    db.$count(productsTable, where),
  ]);

  const itemsWithImages = await Promise.all(
    items.map(async (p) => {
      const images = await db.select().from(productImagesTable).where(eq(productImagesTable.productId, p.id)).limit(10);
      return { ...p, images };
    })
  );

  res.json({ items: itemsWithImages, total: Number(countResult), limit, offset });
});

router.get("/products/:id", async (req, res): Promise<void> => {
  const params = GetProductParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [product] = await db.select().from(productsTable).where(eq(productsTable.id, params.data.id));
  if (!product) {
    res.status(404).json({ error: "Product not found" });
    return;
  }

  const images = await db.select().from(productImagesTable).where(eq(productImagesTable.productId, product.id));

  res.json({ ...product, images });
});

router.patch("/products/:id", async (req, res): Promise<void> => {
  const params = UpdateProductParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const parsed = UpdateProductBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [product] = await db.update(productsTable)
    .set(parsed.data)
    .where(eq(productsTable.id, params.data.id))
    .returning();

  if (!product) {
    res.status(404).json({ error: "Product not found" });
    return;
  }

  const images = await db.select().from(productImagesTable).where(eq(productImagesTable.productId, product.id));

  res.json({ ...product, images });
});

router.delete("/products/:id", async (req, res): Promise<void> => {
  const params = DeleteProductParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  await db.delete(productImagesTable).where(eq(productImagesTable.productId, params.data.id));
  const [product] = await db.delete(productsTable).where(eq(productsTable.id, params.data.id)).returning();

  if (!product) {
    res.status(404).json({ error: "Product not found" });
    return;
  }

  res.sendStatus(204);
});

export default router;
