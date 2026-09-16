"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

import { loadCategories } from "@/lib/actions/categories";
import { getCategoryColor } from "@/lib/categories";
import type { Category } from "@/lib/types";

// TK-0005: Kategorien einmal pro App-Sitzung laden und ueberall bereitstellen.
// Nach Anlegen/Aendern/Loeschen ruft die jeweilige Stelle refresh().

interface CategoriesContextValue {
  categories: Category[];
  loading: boolean;
  refresh: () => Promise<void>;
  /** Farbe zum Namen; fuer verwaiste Namen (Kategorie geloescht) der alte Fallback. */
  colorOf: (name: string) => string;
  byName: (name: string) => Category | undefined;
}

const CategoriesContext = createContext<CategoriesContextValue | null>(null);

export function CategoriesProvider({ children }: { children: React.ReactNode }) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      setCategories(await loadCategories());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const value = useMemo<CategoriesContextValue>(() => {
    const map = new Map(categories.map((c) => [c.name.toLowerCase(), c]));
    const byName = (name: string) => map.get(name.toLowerCase());
    return {
      categories,
      loading,
      refresh,
      byName,
      colorOf: (name) => byName(name)?.color ?? getCategoryColor(name),
    };
  }, [categories, loading, refresh]);

  return <CategoriesContext.Provider value={value}>{children}</CategoriesContext.Provider>;
}

export function useCategories(): CategoriesContextValue {
  const ctx = useContext(CategoriesContext);
  if (!ctx) throw new Error("useCategories() braucht einen CategoriesProvider (AppShell).");
  return ctx;
}
