"use server";

import { requireBelegbotUser } from "@/lib/auth-utils";
import {
  countReceiptsWithCategory,
  createCategory as createCategoryDb,
  deleteCategory as deleteCategoryDb,
  listCategories as listCategoriesDb,
  updateCategory as updateCategoryDb,
  type CategoryInput,
} from "@/lib/categories-db";
import type { Category } from "@/lib/types";

// TK-0005: Kategorien duerfen BEIDE Nutzer verwalten (kein Admin-Recht noetig).

type Result<T> = { ok: true; value: T } | { ok: false; error: string };

async function guarded<T>(fn: () => Promise<T>): Promise<Result<T>> {
  await requireBelegbotUser();
  try {
    return { ok: true, value: await fn() };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Unbekannter Fehler" };
  }
}

export async function loadCategories(): Promise<Category[]> {
  await requireBelegbotUser();
  return listCategoriesDb();
}

export async function createCategory(input: CategoryInput): Promise<Result<Category>> {
  return guarded(() => createCategoryDb(input));
}

export async function updateCategory(
  id: string,
  input: CategoryInput,
  renameReceipts: boolean,
): Promise<Result<Category>> {
  return guarded(() => updateCategoryDb(id, input, renameReceipts));
}

export async function deleteCategory(id: string): Promise<Result<void>> {
  return guarded(() => deleteCategoryDb(id));
}

/** Anzahl Belege mit diesem Namen — fuer die Warnung vor Umbenennen/Loeschen. */
export async function countReceiptsForCategory(name: string): Promise<number> {
  await requireBelegbotUser();
  return countReceiptsWithCategory(name);
}
