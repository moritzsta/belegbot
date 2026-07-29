import "server-only";
import Anthropic from "@anthropic-ai/sdk";

import { CATEGORIES } from "@/lib/categories";

// Liest ANTHROPIC_API_KEY aus der Umgebung.
const client = new Anthropic();

export interface ExtractedReceipt {
  receipt_date: string | null;
  merchant: string | null;
  total_amount: number | null;
  category: string;
  vat_7_base: number | null;
  vat_7_amount: number | null;
  vat_19_base: number | null;
  vat_19_amount: number | null;
  extraction_confidence: "high" | "medium" | "low";
}

const PROMPT = `Analysiere diesen Kassenbon/Beleg und extrahiere die Informationen. Antworte NUR mit einem gültigen JSON-Objekt, kein Markdown, kein Text davor oder danach.

Gesuchte Felder:
- date: Kaufdatum (Format: YYYY-MM-DD, oder null)
- merchant: Name des Händlers/Restaurants/Shops (String oder null)
- total_amount: Gesamtbetrag in Euro als Zahl (ohne €-Zeichen, oder null)
- category: Passende Kategorie aus dieser Liste: ${CATEGORIES.join(", ")}
- vat_7_amount: MwSt-Betrag 7% als Zahl (oder null)
- vat_7_base: Nettobetrag 7% als Zahl (oder null)
- vat_19_amount: MwSt-Betrag 19% als Zahl (oder null)
- vat_19_base: Nettobetrag 19% als Zahl (oder null)
- confidence: Qualität der Erkennung: high, medium, oder low

Beispiel-Output:
{"date":"2024-01-15","merchant":"Rewe","total_amount":42.80,"category":"Lebensmittel","vat_7_amount":1.23,"vat_7_base":17.57,"vat_19_amount":3.45,"vat_19_base":18.16,"confidence":"high"}`;

const num = (v: unknown): number | null => {
  if (v == null) return null;
  const n = typeof v === "number" ? v : parseFloat(String(v));
  return Number.isFinite(n) ? Math.abs(n) : null;
};

/** Extrahiert Beleg-Felder aus einem Bild/PDF (Base64) via Claude Vision. */
export async function extractReceipt(base64: string, mediaType: string): Promise<ExtractedReceipt> {
  const isPdf = mediaType === "application/pdf";
  const source = { type: "base64" as const, media_type: mediaType as never, data: base64 };
  const mediaBlock = isPdf
    ? ({ type: "document", source } as const)
    : ({ type: "image", source } as const);

  const res = await client.messages.create({
    model: "claude-opus-4-8",
    max_tokens: 1024,
    messages: [{ role: "user", content: [mediaBlock, { type: "text", text: PROMPT }] }],
  });

  const textBlock = res.content.find((b) => b.type === "text");
  let parsed: Record<string, unknown> = {};
  try {
    const raw = (textBlock && "text" in textBlock ? textBlock.text : "{}").replace(/```json|```/g, "").trim();
    parsed = JSON.parse(raw);
  } catch {
    return emptyExtraction();
  }

  const category =
    typeof parsed.category === "string" && (CATEGORIES as readonly string[]).includes(parsed.category)
      ? parsed.category
      : "Andere";
  const confidence =
    parsed.confidence === "high" || parsed.confidence === "low" ? parsed.confidence : "medium";

  return {
    receipt_date: typeof parsed.date === "string" ? parsed.date : null,
    merchant: typeof parsed.merchant === "string" ? parsed.merchant : null,
    total_amount: num(parsed.total_amount),
    category,
    vat_7_base: num(parsed.vat_7_base),
    vat_7_amount: num(parsed.vat_7_amount),
    vat_19_base: num(parsed.vat_19_base),
    vat_19_amount: num(parsed.vat_19_amount),
    extraction_confidence: confidence,
  };
}

function emptyExtraction(): ExtractedReceipt {
  return {
    receipt_date: null,
    merchant: null,
    total_amount: null,
    category: "Andere",
    vat_7_base: null,
    vat_7_amount: null,
    vat_19_base: null,
    vat_19_amount: null,
    extraction_confidence: "low",
  };
}
