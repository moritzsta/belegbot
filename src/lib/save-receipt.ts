import "server-only";
import { db } from "@/lib/db";
import { receipts, type ReceiptInsert } from "@/lib/db/schema/receipts";
import { uploadReceiptFile } from "@/lib/storage/minio";
import type { User } from "@/lib/types";

const numStr = (v: unknown): string | null => {
  if (v == null || v === "") return null;
  const n = typeof v === "number" ? v : parseFloat(String(v));
  return Number.isFinite(n) ? String(n) : null;
};

/** Heutiges Datum als YYYY-MM-DD in lokaler Zeit (Server). */
const todayIso = (): string => {
  const d = new Date();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
};

/**
 * Normalisiert das Belegdatum: akzeptiert nur ein gueltiges YYYY-MM-DD.
 * Fehlt es oder ist es ungueltig, wird serverseitig das heutige Datum gesetzt
 * und `isFallback` = true zurueckgegeben.
 */
function resolveReceiptDate(raw: string | null | undefined): { date: string; isFallback: boolean } {
  if (typeof raw === "string" && /^\d{4}-\d{2}-\d{2}$/.test(raw.trim())) {
    const d = new Date(raw.trim());
    if (!Number.isNaN(d.getTime())) return { date: raw.trim(), isFallback: false };
  }
  return { date: todayIso(), isFallback: true };
}

/**
 * Legt eine Beleg-Datei unter `<owner>/<zeitstempel>.<ext>` in MinIO ab und
 * liefert den Key. Wird von saveReceipt() und der Scan-Route genutzt.
 */
export async function storeReceiptFile(
  owner: User,
  buffer: Buffer | Uint8Array,
  contentType?: string,
  ext?: string,
): Promise<string> {
  const safeExt = (ext ?? "jpg").replace(/[^a-z0-9]/gi, "").toLowerCase() || "jpg";
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const key = `${owner}/${stamp}.${safeExt}`;
  await uploadReceiptFile(key, buffer, contentType ?? "application/octet-stream");
  return key;
}

export interface SaveReceiptInput {
  owner: User;
  paid_by?: User;
  is_shared?: boolean;
  receipt_date?: string | null;
  merchant?: string | null;
  total_amount?: number | string | null;
  category?: string | null;
  vat_7_base?: number | string | null;
  vat_7_amount?: number | string | null;
  vat_19_base?: number | string | null;
  vat_19_amount?: number | string | null;
  note?: string | null;
  telegram_message_id?: number | null;
  telegram_user_id?: number | null;
  extraction_confidence?: string | null;
  /** Optionales File → MinIO. */
  file?: { data: string; contentType?: string; ext?: string } | null;
}

/**
 * Zentrale Beleg-Persistenz: optionales Base64-File → MinIO, dann Insert in die DB.
 * Genutzt von /api/ingest und /api/telegram.
 */
export async function saveReceipt(
  input: SaveReceiptInput,
): Promise<{ id: string; filePath: string | null; receiptDate: string; dateIsFallback: boolean }> {
  const { date: receiptDate, isFallback: dateIsFallback } = resolveReceiptDate(input.receipt_date);

  const filePath = input.file?.data
    ? await storeReceiptFile(input.owner, Buffer.from(input.file.data, "base64"), input.file.contentType, input.file.ext)
    : null;

  const values: ReceiptInsert = {
    owner: input.owner,
    paidBy: input.paid_by ?? input.owner,
    isShared: Boolean(input.is_shared),
    receiptDate,
    dateIsFallback,
    merchant: input.merchant || null,
    totalAmount: numStr(input.total_amount),
    category: input.category || "Andere",
    vat7Base: numStr(input.vat_7_base),
    vat7Amount: numStr(input.vat_7_amount),
    vat19Base: numStr(input.vat_19_base),
    vat19Amount: numStr(input.vat_19_amount),
    note: input.note || null,
    telegramMessageId: input.telegram_message_id ?? null,
    telegramUserId: input.telegram_user_id ?? null,
    filePath,
    extractionConfidence: input.extraction_confidence || "medium",
  };

  const [row] = await db.insert(receipts).values(values).returning({ id: receipts.id });
  return { id: row!.id, filePath, receiptDate, dateIsFallback };
}
