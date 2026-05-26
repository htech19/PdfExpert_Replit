import { logger } from "./logger";

let openai: { chat: { completions: { create: Function } } } | null = null;

async function getOpenAI() {
  if (openai) return openai;
  try {
    const { default: OpenAI } = await import("openai");
    openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY ?? "sk-placeholder",
      baseURL: process.env.OPENAI_BASE_URL,
    });
    return openai;
  } catch {
    return null;
  }
}

const FALLBACK_CORRECTIONS: Record<string, string> = {
  "REF": "", "MOD": "", "SKU": "", "COD": "", "ITEM": "", "ART": "",
  "MDF": "MDF", "LAQ": "Laqueado", "PREM": "Premium", "BR": "Branco",
  "PT": "Preto", "CZ": "Cinza", "2P": "2 Portas", "3P": "3 Portas",
  "4P": "4 Portas", "6P": "6 Portas", "3LUG": "3 Lugares", "4N": "4 Nichos",
  "5N": "5 Nichos", "ESC": "Escrivaninha", "EXEC": "Executiva",
  "ARM": "Armário", "CORR": "Corrediço", "PORTE": "Porta",
  "MADEIRITE": "Madeirite", "EST": "Estante",
};

function localCorrect(raw: string): string {
  let result = raw
    .replace(/^(REF|MOD|SKU|COD|ITEM|ART)\s*[:#-]?\s*[\w-]+\s*/i, "")
    .replace(/\b([A-Z]{2,4})-?\d{3,6}-?[A-Z]?\b/g, "")
    .trim();

  const words = result.split(/\s+/);
  const corrected = words.map(w => {
    const up = w.toUpperCase();
    if (FALLBACK_CORRECTIONS[up] !== undefined) return FALLBACK_CORRECTIONS[up];
    if (w.length <= 3 && /^[A-Z]+$/.test(w)) return w;
    return w.charAt(0).toUpperCase() + w.slice(1).toLowerCase();
  }).filter(Boolean);

  return corrected.join(" ").replace(/\s{2,}/g, " ").trim() || raw;
}

export async function correctProductNames(rawNames: string[]): Promise<string[]> {
  if (!rawNames.length) return [];

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey || apiKey === "sk-placeholder") {
    logger.warn("OpenAI API key not configured — using local name correction");
    return rawNames.map(localCorrect);
  }

  const client = await getOpenAI();
  if (!client) return rawNames.map(localCorrect);

  const BATCH = 15;
  const results: string[] = [];

  for (let i = 0; i < rawNames.length; i += BATCH) {
    const batch = rawNames.slice(i, i + BATCH);
    try {
      const prompt = `You are a product data specialist for a Brazilian furniture e-commerce catalog.
Clean and normalize each product name from raw catalog codes to proper Portuguese product names.
Rules:
- Remove reference codes (REF, MOD, SKU, COD, ITEM, ART followed by alphanumeric codes)
- Expand abbreviations: MDF→MDF, LAQ→Laqueado, PREM→Premium, BR→Branco, PT→Preto, CZ→Cinza, 2P→2 Portas, 3LUG→3 Lugares, etc.
- Use proper Portuguese capitalization
- Keep material, color, size info
- Return ONLY a JSON array of strings, one per input, same order, no explanation

Input: ${JSON.stringify(batch)}`;

      const resp = await client.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.2,
        max_tokens: 800,
      });

      const content = resp.choices[0]?.message?.content ?? "";
      const match = content.match(/\[[\s\S]*\]/);
      if (match) {
        const parsed: string[] = JSON.parse(match[0]);
        if (Array.isArray(parsed) && parsed.length === batch.length) {
          results.push(...parsed);
          continue;
        }
      }
    } catch (err) {
      logger.error({ err }, "OpenAI batch correction failed — falling back to local");
    }
    results.push(...batch.map(localCorrect));
  }

  return results;
}
