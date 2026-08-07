// belegbot-eigene Tabelle in der geteilten teamportal-DB.
// Prefix `belegbot_` grenzt sie klar von den TeamPortal-Tabellen ab.
// Spaltennamen bewusst snake_case wie im alten Supabase-Schema, damit die
// Datenmigration 1:1 kopieren kann.
import { pgTable, uuid, text, boolean, numeric, date, timestamp, bigint, index } from "drizzle-orm/pg-core";

export const receipts = pgTable(
  "belegbot_receipts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),

    // Ownership — 'lena' | 'moritz'
    owner: text("owner").notNull(),
    isShared: boolean("is_shared").default(false).notNull(),
    paidBy: text("paid_by").notNull(),

    // KI-extrahierte Felder
    receiptDate: date("receipt_date"),
    // true = kein Datum erkannt, Belegdatum wurde serverseitig auf "heute" gesetzt
    dateIsFallback: boolean("date_is_fallback").default(false).notNull(),
    merchant: text("merchant"),
    totalAmount: numeric("total_amount", { precision: 10, scale: 2 }),
    category: text("category").default("Andere").notNull(),

    // MwSt (optional)
    vat7Base: numeric("vat_7_base", { precision: 10, scale: 2 }),
    vat7Amount: numeric("vat_7_amount", { precision: 10, scale: 2 }),
    vat19Base: numeric("vat_19_base", { precision: 10, scale: 2 }),
    vat19Amount: numeric("vat_19_amount", { precision: 10, scale: 2 }),

    // Metadaten
    note: text("note"),
    telegramMessageId: bigint("telegram_message_id", { mode: "number" }),
    telegramUserId: bigint("telegram_user_id", { mode: "number" }),
    filePath: text("file_path"),

    // Extraktionsqualitaet — 'high' | 'medium' | 'low'
    extractionConfidence: text("extraction_confidence").default("medium"),
  },
  (table) => [
    index("belegbot_receipts_owner_idx").on(table.owner),
    index("belegbot_receipts_is_shared_idx").on(table.isShared),
    index("belegbot_receipts_receipt_date_idx").on(table.receiptDate),
    index("belegbot_receipts_category_idx").on(table.category),
    index("belegbot_receipts_paid_by_idx").on(table.paidBy),
  ],
);

export type ReceiptRow = typeof receipts.$inferSelect;
export type ReceiptInsert = typeof receipts.$inferInsert;
