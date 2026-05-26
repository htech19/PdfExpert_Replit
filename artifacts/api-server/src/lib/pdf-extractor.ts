import fs from "fs";

export interface PageTextBlock {
  text: string;
  page: number;
}

export interface PdfExtractResult {
  totalPages: number;
  blocks: PageTextBlock[];
  rawText: string;
}

// Polyfill DOMMatrix for Node.js (required by pdfjs-dist canvas module)
function applyPolyfills() {
  const g = globalThis as Record<string, unknown>;
  if (!g["DOMMatrix"]) {
    g["DOMMatrix"] = class DOMMatrix { constructor() {} };
  }
  if (!g["ImageData"]) {
    g["ImageData"] = class ImageData { constructor() {} };
  }
  if (!g["Path2D"]) {
    g["Path2D"] = class Path2D { constructor() {} };
  }
}

let _pdfjs: any = null;

async function getPdfjs() {
  if (_pdfjs) return _pdfjs;
  applyPolyfills();
  // Dynamic import so esbuild externalizes pdfjs-dist
  _pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
  _pdfjs.GlobalWorkerOptions.workerSrc = "";
  return _pdfjs;
}

export async function extractPdf(filePath: string): Promise<PdfExtractResult> {
  const pdfjs = await getPdfjs();
  const buffer = fs.readFileSync(filePath);
  const uint8 = new Uint8Array(buffer.buffer, buffer.byteOffset, buffer.byteLength);

  const doc = await pdfjs.getDocument({
    data: uint8,
    disableFontFace: true,
    verbosity: 0,
  }).promise;

  const totalPages: number = doc.numPages;
  const blocks: PageTextBlock[] = [];
  const allLines: string[] = [];

  for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
    const page = await doc.getPage(pageNum);
    const content = await page.getTextContent();

    const lineMap = new Map<number, string[]>();
    for (const item of content.items as any[]) {
      if (!item.str) continue;
      const str: string = item.str.trim();
      if (!str) continue;
      const y = Math.round(item.transform[5]);
      if (!lineMap.has(y)) lineMap.set(y, []);
      lineMap.get(y)!.push(str);
    }

    const sortedYs = [...lineMap.keys()].sort((a, b) => b - a);
    for (const y of sortedYs) {
      const line = lineMap.get(y)!.join(" ").trim();
      if (line.length > 1) {
        blocks.push({ text: line, page: pageNum });
        allLines.push(line);
      }
    }
  }

  return { totalPages, blocks, rawText: allLines.join("\n") };
}

export function detectProductCandidates(blocks: PageTextBlock[]): string[] {
  const seen = new Set<string>();
  const candidates: string[] = [];

  for (const { text } of blocks) {
    const t = text.trim();
    if (t.length < 4 || t.length > 200) continue;
    if (/^\d+$/.test(t)) continue;
    if (/^(pág|page|total|subtotal|frete|desconto|cnpj|cpf|endereço|email|tel|fax|www\.|http)/i.test(t)) continue;

    const isProductLike =
      /\b(ref|cod|sku|mod|item|art)\b/i.test(t) ||
      /\b(mesa|cadeira|sof[aá]|arm[aá]rio|estante|rack|cama|guarda.roupa|poltrona|criado|penteadeira|painel|cristaleira|escrivaninha|buffet|aparador|c[oô]moda|prateleira|gaveta)\b/i.test(t) ||
      /\b(mdf|madeira|metal|couro|tecido|vidro|inox|alum[ií]nio|veludo|linho)\b/i.test(t) ||
      /[A-Z]{2,}-?\d{3,}/.test(t) ||
      (/[A-Z]/.test(t) && /\d/.test(t) && t.split(/\s+/).length >= 2 && t.split(/\s+/).length <= 12);

    if (isProductLike && !seen.has(t.toLowerCase())) {
      seen.add(t.toLowerCase());
      candidates.push(t);
    }
  }

  return candidates.slice(0, 60);
}
