import type { ReceiptRow } from "./db/schema/receipts";
import type { Receipt, User } from "./types";

const num = (v: string | null): number | null => (v == null ? null : Number(v));

/** Drizzle-Row → App-Receipt (numeric-Strings zu Zahlen, Dates zu ISO-Strings). */
export function rowToReceipt(r: ReceiptRow): Receipt {
  return {
    id: r.id,
    created_at: r.createdAt.toISOString(),
    updated_at: r.updatedAt.toISOString(),
    owner: r.owner as User,
    is_shared: r.isShared,
    paid_by: r.paidBy as User,
    receipt_date: r.receiptDate,
    date_is_fallback: r.dateIsFallback,
    merchant: r.merchant,
    total_amount: num(r.totalAmount),
    category: r.category,
    vat_7_base: num(r.vat7Base),
    vat_7_amount: num(r.vat7Amount),
    vat_19_base: num(r.vat19Base),
    vat_19_amount: num(r.vat19Amount),
    note: r.note,
    telegram_message_id: r.telegramMessageId,
    telegram_user_id: r.telegramUserId,
    file_path: r.filePath,
    extraction_confidence: (r.extractionConfidence as Receipt["extraction_confidence"]) ?? null,
  };
}
