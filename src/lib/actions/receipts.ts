"use server";

import { and, desc, eq, gte, ilike, lte, or, type SQL } from "drizzle-orm";

import { db } from "@/lib/db";
import { receipts, type ReceiptInsert } from "@/lib/db/schema/receipts";
import { requireBelegbotUser } from "@/lib/auth-utils";
import { rowToReceipt } from "@/lib/receipts-mapper";
import type { Area, Receipt, ReceiptFilters, User } from "@/lib/types";

/** Basis-Scope: privat = nur eigene, gemeinsam = alle geteilten. */
function scopeCondition(area: Area, me: User): SQL {
  return area === "private"
    ? (and(eq(receipts.isShared, false), eq(receipts.owner, me)) as SQL)
    : eq(receipts.isShared, true);
}

/** Sichtbarkeit fuer Update/Delete: eigene Belege ODER geteilte. */
function visibleTo(me: User): SQL {
  return or(eq(receipts.owner, me), eq(receipts.isShared, true)) as SQL;
}

const numStr = (v: number | null | undefined): string | null =>
  v == null ? null : String(v);

/** Partial<Receipt> (snake_case) → DB-Insert/Update-Spalten. */
function toColumns(data: Partial<Receipt>): Partial<ReceiptInsert> {
  const c: Partial<ReceiptInsert> = {};
  if (data.owner !== undefined) c.owner = data.owner;
  if (data.is_shared !== undefined) c.isShared = data.is_shared;
  if (data.paid_by !== undefined) c.paidBy = data.paid_by;
  if (data.receipt_date !== undefined) {
    c.receiptDate = data.receipt_date;
    // Ein manuell gesetztes/bestaetigtes Datum ist per Definition kein Fallback mehr.
    c.dateIsFallback = false;
  }
  if (data.merchant !== undefined) c.merchant = data.merchant;
  if (data.total_amount !== undefined) c.totalAmount = numStr(data.total_amount);
  if (data.category !== undefined) c.category = data.category;
  if (data.vat_7_base !== undefined) c.vat7Base = numStr(data.vat_7_base);
  if (data.vat_7_amount !== undefined) c.vat7Amount = numStr(data.vat_7_amount);
  if (data.vat_19_base !== undefined) c.vat19Base = numStr(data.vat_19_base);
  if (data.vat_19_amount !== undefined) c.vat19Amount = numStr(data.vat_19_amount);
  if (data.note !== undefined) c.note = data.note;
  if (data.file_path !== undefined) c.filePath = data.file_path;
  if (data.extraction_confidence !== undefined) c.extractionConfidence = data.extraction_confidence;
  return c;
}

export async function listReceipts(area: Area, filters?: Partial<ReceiptFilters>): Promise<Receipt[]> {
  const { user } = await requireBelegbotUser();
  const conds: SQL[] = [scopeCondition(area, user)];

  if (filters?.dateFrom) conds.push(gte(receipts.receiptDate, filters.dateFrom));
  if (filters?.dateTo) conds.push(lte(receipts.receiptDate, filters.dateTo));
  if (filters?.category) conds.push(eq(receipts.category, filters.category));
  if (filters?.merchant) conds.push(ilike(receipts.merchant, `%${filters.merchant}%`));
  if (filters?.amountMin) conds.push(gte(receipts.totalAmount, String(parseFloat(filters.amountMin))));
  if (filters?.amountMax) conds.push(lte(receipts.totalAmount, String(parseFloat(filters.amountMax))));
  if (filters?.paidBy) conds.push(eq(receipts.paidBy, filters.paidBy));

  const rows = await db
    .select()
    .from(receipts)
    .where(and(...conds))
    .orderBy(desc(receipts.receiptDate), desc(receipts.createdAt));

  return rows.map(rowToReceipt);
}

/** Belege ab einem Datum (fuer Dashboard-/Statistik-Berechnungen im Client). */
export async function listReceiptsSince(area: Area, sinceDate: string): Promise<Receipt[]> {
  const { user } = await requireBelegbotUser();
  const rows = await db
    .select()
    .from(receipts)
    .where(and(scopeCondition(area, user), gte(receipts.receiptDate, sinceDate)))
    .orderBy(desc(receipts.receiptDate), desc(receipts.createdAt));
  return rows.map(rowToReceipt);
}

export async function createReceipt(data: Partial<Receipt>): Promise<boolean> {
  const { user } = await requireBelegbotUser();
  const cols = toColumns(data);
  await db.insert(receipts).values({
    ...cols,
    owner: user, // owner ist immer der eingeloggte User (serverseitig erzwungen)
    paidBy: cols.paidBy ?? user,
  });
  return true;
}

export async function updateReceipt(id: string, updates: Partial<Receipt>): Promise<boolean> {
  const { user } = await requireBelegbotUser();
  const cols = toColumns(updates);
  await db
    .update(receipts)
    .set({ ...cols, updatedAt: new Date() })
    .where(and(eq(receipts.id, id), visibleTo(user)));
  return true;
}

export async function deleteReceipt(id: string): Promise<boolean> {
  const { user } = await requireBelegbotUser();
  await db.delete(receipts).where(and(eq(receipts.id, id), visibleTo(user)));
  return true;
}

/** Letzter Tag des Monats (month = "YYYY-MM") als ISO-Datum. */
function monthEnd(month: string): string {
  const [y, m] = month.split("-").map(Number) as [number, number];
  const last = new Date(Date.UTC(y, m, 0)).getUTCDate();
  return `${month}-${String(last).padStart(2, "0")}`;
}

/**
 * Belege eines Kalendermonats (month = "YYYY-MM").
 * Bereichs-Query auf dem indizierten receipt_date — laedt nur den Monat,
 * damit auch weit zurueckliegende Monate ohne Performance-Einbussen laden.
 */
export async function listReceiptsInMonth(
  area: Area,
  month: string,
  filters?: Pick<ReceiptFilters, "category" | "paidBy">,
): Promise<Receipt[]> {
  const { user } = await requireBelegbotUser();
  const conds: SQL[] = [
    scopeCondition(area, user),
    gte(receipts.receiptDate, `${month}-01`),
    lte(receipts.receiptDate, monthEnd(month)),
  ];
  if (filters?.category) conds.push(eq(receipts.category, filters.category));
  if (filters?.paidBy) conds.push(eq(receipts.paidBy, filters.paidBy));

  const rows = await db
    .select()
    .from(receipts)
    .where(and(...conds))
    .orderBy(desc(receipts.receiptDate), desc(receipts.createdAt));

  return rows.map(rowToReceipt);
}
