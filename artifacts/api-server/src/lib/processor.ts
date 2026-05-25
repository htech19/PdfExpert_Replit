import { eq } from "drizzle-orm";
import { db, jobsTable, productsTable, productImagesTable } from "@workspace/db";
import { addLog } from "./logger-db";
import { logger } from "./logger";

const RAW_PRODUCT_NAMES = [
  "REF 8472-X CAB MDF PREM BR 2P",
  "MOD 3390-Y EST MADEIRITE PINUS 4N",
  "SKU-9921 MESA ESC MDF LAQ BRANCO",
  "COD AB-441 CADEIRA EXEC COURO PU",
  "REF 2210 ARM CORR PORTE VIDRO 3F",
  "MOD K-881 SOFA 3LUG TEX CINZA",
  "ITEM 7733 ESTANTE METAL 5N PRETA",
  "REF 5510-Z CAMA BOX QUEEN ESPUMA",
  "SKU-0033 GUARDA-ROUPA 6P ESPELHO",
  "COD CF-229 CRISTALEIRA MADEIRA 4P",
  "REF 1122 RACK TV 60 MDF WENGE",
  "MOD 8844 PENTEADEIRA ESPELHO LED",
  "ITEM 3301-A PAINEL TV SALA",
  "REF 6629 MESA JANTAR 6 LUG CARV",
  "SKU-4412 POLTRONA SALA VELUDO",
];

const CLEAN_PRODUCT_NAMES = [
  "Armário MDF Premium Branco 2 Portas",
  "Estante Madeirite Pinus 4 Nichos",
  "Mesa Escrivaninha MDF Laqueado Branco",
  "Cadeira Executiva Couro PU",
  "Armário Corrediço Portas de Vidro 3 Folhas",
  "Sofá 3 Lugares Tecido Cinza",
  "Estante de Metal 5 Nichos Preta",
  "Cama Box Queen Espuma",
  "Guarda-Roupa 6 Portas com Espelho",
  "Cristaleira Madeira 4 Portas",
  "Rack para TV 60\" MDF Wengê",
  "Penteadeira com Espelho e Iluminação LED",
  "Painel para TV Sala de Estar",
  "Mesa de Jantar 6 Lugares Carvalho",
  "Poltrona de Sala Veludo",
];

const BRANDS = ["Movelo", "ArtiPlan", "Henn", "Ceval", "Favorita", "MadeiraMadeira", "Tokstok", "Etna"];
const CATEGORIES = ["Armários", "Estantes", "Mesas", "Cadeiras", "Sofás", "Camas", "Poltronas", "Racks"];
const MATERIALS = ["MDF", "Madeira Maciça", "Metal", "Couro PU", "Tecido", "Vidro", "MDP"];
const COLORS = ["Branco", "Preto", "Cinza", "Wengê", "Carvalho", "Natural", "Bege"];

function slugify(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-");
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function simulateProcessing(jobId: number, totalPages: number, aiCorrection: boolean, imageExtraction: boolean): Promise<void> {
  try {
    await addLog(jobId, "info", `Starting pipeline: OCR → Image extraction → AI correction`);

    const productCount = Math.floor(totalPages / 3) + Math.floor(Math.random() * 5) + 2;
    let imageCount = 0;

    for (let page = 1; page <= totalPages; page++) {
      const [currentJob] = await db.select().from(jobsTable).where(eq(jobsTable.id, jobId));
      if (!currentJob || currentJob.status === "cancelled") {
        await addLog(jobId, "warn", "Job was cancelled — stopping pipeline");
        return;
      }

      const progress = Math.round((page / totalPages) * 90);
      await db.update(jobsTable).set({ processedPages: page, progress }).where(eq(jobsTable.id, jobId));

      if (page % 5 === 0) {
        await addLog(jobId, "info", `OCR processed page ${page}/${totalPages}`);
      }

      await sleep(300);
    }

    await addLog(jobId, "info", `OCR complete. Extracting product data from ${productCount} products...`);

    for (let i = 0; i < productCount; i++) {
      const idx = i % RAW_PRODUCT_NAMES.length;
      const rawName = RAW_PRODUCT_NAMES[idx];
      const cleanName = aiCorrection ? CLEAN_PRODUCT_NAMES[idx] : rawName;
      const brand = BRANDS[Math.floor(Math.random() * BRANDS.length)];
      const category = CATEGORIES[Math.floor(Math.random() * CATEGORIES.length)];
      const material = MATERIALS[Math.floor(Math.random() * MATERIALS.length)];
      const color = COLORS[Math.floor(Math.random() * COLORS.length)];
      const sku = `SKU-${String(jobId).padStart(3, "0")}-${String(i + 1).padStart(4, "0")}`;
      const imgCount = imageExtraction ? Math.floor(Math.random() * 4) + 1 : 0;

      const [product] = await db.insert(productsTable).values({
        jobId,
        rawName,
        cleanName,
        sku,
        brand,
        category,
        material,
        color,
        slug: slugify(cleanName),
        imageCount: imgCount,
      }).returning();

      if (imageExtraction) {
        for (let j = 0; j < imgCount; j++) {
          const width = [800, 1200, 1600, 2048][Math.floor(Math.random() * 4)];
          const height = [600, 900, 1200, 1536][Math.floor(Math.random() * 4)];
          await db.insert(productImagesTable).values({
            productId: product.id,
            filename: `${product.slug}_img_${j + 1}.png`,
            width,
            height,
            fileSize: width * height * 3,
          });
          imageCount++;
        }
      }

      await addLog(jobId, "info", `Product extracted: ${cleanName}${aiCorrection ? ` (corrected from: ${rawName})` : ""}`);
      await sleep(200);
    }

    await db.update(jobsTable).set({
      status: "completed",
      progress: 100,
      productCount,
      imageCount,
    }).where(eq(jobsTable.id, jobId));

    await addLog(jobId, "info", `Pipeline complete: ${productCount} products, ${imageCount} images extracted`);
  } catch (err) {
    logger.error({ err, jobId }, "Processing pipeline failed");
    await addLog(jobId, "error", `Pipeline failed: ${err instanceof Error ? err.message : String(err)}`);
    await db.update(jobsTable).set({
      status: "failed",
      error: err instanceof Error ? err.message : "Unknown error",
    }).where(eq(jobsTable.id, jobId));
  }
}
