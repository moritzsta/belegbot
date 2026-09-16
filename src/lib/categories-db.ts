import "server-only";
import { asc, eq, sql } from "drizzle-orm";

import { db } from "@/lib/db";
import { categories, type CategoryRow } from "@/lib/db/schema/categories";
import { receipts } from "@/lib/db/schema/receipts";
import type { Category } from "@/lib/types";

// TK-0005: Datenzugriff fuer Kategorien. Validierung liegt hier, damit
// Server Actions, Scan-Route und Telegram dieselben Regeln nutzen.

export const NAME_MAX = 50;
// Buchstaben (inkl. Umlaute), Ziffern, Leerzeichen und die Zeichen & - / . '
// Alles andere gilt als Sonderzeichen. Passt zu den bisherigen Namen
// ("Restaurant & Cafe", "Bildung & Buecher").
const NAME_PATTERN = /^[\p{L}\p{N} &\-/.']+$/u;

export interface CategoryInput {
  name: string;
  description?: string | null;
  color?: string | null;
  icon?: string | null;
}

/** Liefert den bereinigten Namen oder eine Fehlermeldung. */
export function validateName(raw: string): { ok: true; name: string } | { ok: false; error: string } {
  const name = raw.trim().replace(/\s+/g, " ");
  if (!name) return { ok: false, error: "Name darf nicht leer sein." };
  if (name.length > NAME_MAX) return { ok: false, error: `Name darf höchstens ${NAME_MAX} Zeichen haben.` };
  if (!NAME_PATTERN.test(name)) return { ok: false, error: "Name enthält unerlaubte Sonderzeichen." };
  return { ok: true, name };
}

const toCategory = (r: CategoryRow): Category => ({
  id: r.id, name: r.name, description: r.description, color: r.color, icon: r.icon, position: r.position,
});

export async function listCategories(): Promise<Category[]> {
  const rows = await db.select().from(categories).orderBy(asc(categories.position), asc(categories.name));
  return rows.map(toCategory);
}

/** Nur die Namen — fuer den Claude-Prompt und die Telegram-Zuordnung. */
export async function listCategoryNames(): Promise<string[]> {
  return (await listCategories()).map((c) => c.name);
}

/** Kategorie per Name, case-insensitive. */
export async function findCategoryByName(name: string): Promise<Category | null> {
  const [row] = await db
    .select()
    .from(categories)
    .where(sql`lower(${categories.name}) = lower(${name.trim()})`)
    .limit(1);
  return row ? toCategory(row) : null;
}

/** Wie viele Belege tragen diesen Kategorienamen? (Warnung bei Umbenennen/Loeschen) */
export async function countReceiptsWithCategory(name: string): Promise<number> {
  const [row] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(receipts)
    .where(eq(receipts.category, name));
  return row?.n ?? 0;
}

const cleanColor = (c?: string | null): string | undefined =>
  c && /^#[0-9a-f]{6}$/i.test(c) ? c.toUpperCase() : undefined;

export async function createCategory(input: CategoryInput): Promise<Category> {
  const v = validateName(input.name);
  if (!v.ok) throw new Error(v.error);
  if (await findCategoryByName(v.name)) throw new Error(`Kategorie „${v.name}“ gibt es schon.`);
  const [row] = await db
    .insert(categories)
    .values({
      name: v.name,
      description: input.description?.trim() || null,
      color: cleanColor(input.color) ?? "#8A90B0",
      icon: input.icon || null,
    })
    .returning();
  return toCategory(row!);
}

/**
 * Aendert eine Kategorie. Bei Umbenennung werden die Belege mitgezogen, wenn
 * `renameReceipts` gesetzt ist (Standard der UI) — sonst behalten sie den
 * alten Namen und tauchen als "verwaiste" Kategorie auf.
 */
export async function updateCategory(
  id: string,
  input: CategoryInput,
  renameReceipts: boolean,
): Promise<Category> {
  const v = validateName(input.name);
  if (!v.ok) throw new Error(v.error);
  const [current] = await db.select().from(categories).where(eq(categories.id, id)).limit(1);
  if (!current) throw new Error("Kategorie nicht gefunden.");

  const clash = await findCategoryByName(v.name);
  if (clash && clash.id !== id) throw new Error(`Kategorie „${v.name}“ gibt es schon.`);

  const [row] = await db
    .update(categories)
    .set({
      name: v.name,
      description: input.description?.trim() || null,
      color: cleanColor(input.color) ?? current.color,
      icon: input.icon || null,
      updatedAt: new Date(),
    })
    .where(eq(categories.id, id))
    .returning();

  if (renameReceipts && current.name !== v.name) {
    await db.update(receipts).set({ category: v.name }).where(eq(receipts.category, current.name));
  }
  return toCategory(row!);
}

/** Loescht die Kategorie. Belege behalten ihren Kategorienamen als Freitext. */
export async function deleteCategory(id: string): Promise<void> {
  await db.delete(categories).where(eq(categories.id, id));
}
