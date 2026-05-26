import { db, productsTable, productImagesTable } from "@workspace/db";
import { eq, inArray } from "drizzle-orm";
import * as XLSX from "xlsx";

export interface ExportOptions {
  format: "csv" | "json" | "xlsx" | "shopify" | "woocommerce";
  jobId?: number;
  productIds?: number[];
  includeImages?: boolean;
}

interface ProductRow {
  id: number;
  sku: string;
  name: string;
  raw_name: string;
  brand: string;
  category: string;
  subcategory: string;
  color: string;
  material: string;
  size: string;
  slug: string;
  image_count: number;
  images?: string;
}

async function fetchProducts(opts: ExportOptions): Promise<ProductRow[]> {
  let query = db.select().from(productsTable);
  let products;

  if (opts.productIds && opts.productIds.length > 0) {
    products = await db.select().from(productsTable).where(inArray(productsTable.id, opts.productIds));
  } else if (opts.jobId) {
    products = await db.select().from(productsTable).where(eq(productsTable.jobId, opts.jobId));
  } else {
    products = await db.select().from(productsTable);
  }

  const rows: ProductRow[] = [];
  for (const p of products) {
    let images = "";
    if (opts.includeImages && p.imageCount > 0) {
      const imgs = await db.select().from(productImagesTable).where(eq(productImagesTable.productId, p.id));
      images = imgs.map(i => i.filename).join("|");
    }
    rows.push({
      id: p.id,
      sku: p.sku ?? "",
      name: p.cleanName,
      raw_name: p.rawName,
      brand: p.brand ?? "",
      category: p.category ?? "",
      subcategory: p.subcategory ?? "",
      color: p.color ?? "",
      material: p.material ?? "",
      size: p.size ?? "",
      slug: p.slug ?? "",
      image_count: p.imageCount,
      images,
    });
  }
  return rows;
}

function toCSV(rows: ProductRow[], includeImages: boolean): string {
  const headers = ["id", "sku", "name", "raw_name", "brand", "category", "subcategory", "color", "material", "size", "slug", "image_count"];
  if (includeImages) headers.push("images");

  const escape = (v: unknown) => {
    const s = String(v ?? "");
    return s.includes(",") || s.includes('"') || s.includes("\n") ? `"${s.replace(/"/g, '""')}"` : s;
  };

  const lines = [headers.join(",")];
  for (const row of rows) {
    const vals = headers.map(h => escape(row[h as keyof ProductRow]));
    lines.push(vals.join(","));
  }
  return lines.join("\n");
}

function toShopifyCSV(rows: ProductRow[], includeImages: boolean): string {
  const headers = ["Handle", "Title", "Body (HTML)", "Vendor", "Type", "Tags", "Published", "Variant SKU", "Variant Price", "Image Src"];
  const lines = [headers.join(",")];
  const escape = (v: unknown) => {
    const s = String(v ?? "");
    return s.includes(",") || s.includes('"') ? `"${s.replace(/"/g, '""')}"` : s;
  };
  for (const row of rows) {
    const tags = [row.category, row.material, row.color].filter(Boolean).join(", ");
    const imageSrc = includeImages && row.images ? row.images.split("|")[0] : "";
    lines.push([
      escape(row.slug || row.name.toLowerCase().replace(/\s+/g, "-")),
      escape(row.name),
      escape(""),
      escape(row.brand),
      escape(row.category),
      escape(tags),
      "true",
      escape(row.sku),
      "0.00",
      escape(imageSrc),
    ].join(","));
  }
  return lines.join("\n");
}

function toWooCSV(rows: ProductRow[], includeImages: boolean): string {
  const headers = ["ID", "Type", "SKU", "Name", "Published", "Short description", "Categories", "Tags", "Images", "Regular price", "Stock status"];
  const lines = [headers.join(",")];
  const escape = (v: unknown) => {
    const s = String(v ?? "");
    return s.includes(",") || s.includes('"') ? `"${s.replace(/"/g, '""')}"` : s;
  };
  for (const row of rows) {
    const images = includeImages && row.images ? row.images.split("|").join(", ") : "";
    lines.push([
      escape(row.id),
      "simple",
      escape(row.sku),
      escape(row.name),
      "1",
      escape(`${row.material} ${row.color}`.trim()),
      escape(row.category),
      escape([row.material, row.color, row.brand].filter(Boolean).join(", ")),
      escape(images),
      "0",
      "instock",
    ].join(","));
  }
  return lines.join("\n");
}

export interface ExportResult {
  content: Buffer;
  mimeType: string;
  extension: string;
  productCount: number;
}

export async function generateExport(opts: ExportOptions): Promise<ExportResult> {
  const rows = await fetchProducts(opts);
  const includeImages = opts.includeImages ?? false;

  switch (opts.format) {
    case "json": {
      const data = JSON.stringify(rows.map(r => {
        const { images, ...rest } = r;
        return includeImages ? { ...rest, images: images ? images.split("|") : [] } : rest;
      }), null, 2);
      return { content: Buffer.from(data, "utf-8"), mimeType: "application/json", extension: "json", productCount: rows.length };
    }

    case "csv": {
      const csv = toCSV(rows, includeImages);
      return { content: Buffer.from(csv, "utf-8"), mimeType: "text/csv", extension: "csv", productCount: rows.length };
    }

    case "xlsx": {
      const sheetData = rows.map(r => {
        const obj: Record<string, unknown> = {
          ID: r.id, SKU: r.sku, Nome: r.name, "Nome Original": r.raw_name,
          Marca: r.brand, Categoria: r.category, Subcategoria: r.subcategory,
          Cor: r.color, Material: r.material, Tamanho: r.size, Slug: r.slug,
          "Qtd. Imagens": r.image_count,
        };
        if (includeImages) obj["Imagens"] = r.images;
        return obj;
      });
      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.json_to_sheet(sheetData);
      ws["!cols"] = [{ wch: 6 }, { wch: 18 }, { wch: 40 }, { wch: 40 }, { wch: 16 }, { wch: 16 }, { wch: 16 }, { wch: 12 }, { wch: 14 }, { wch: 12 }, { wch: 30 }, { wch: 10 }];
      XLSX.utils.book_append_sheet(wb, ws, "Produtos");
      const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
      return { content: buf, mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", extension: "xlsx", productCount: rows.length };
    }

    case "shopify": {
      const csv = toShopifyCSV(rows, includeImages);
      return { content: Buffer.from(csv, "utf-8"), mimeType: "text/csv", extension: "csv", productCount: rows.length };
    }

    case "woocommerce": {
      const csv = toWooCSV(rows, includeImages);
      return { content: Buffer.from(csv, "utf-8"), mimeType: "text/csv", extension: "csv", productCount: rows.length };
    }

    default:
      throw new Error(`Unknown format: ${opts.format}`);
  }
}
