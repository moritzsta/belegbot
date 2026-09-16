"use client";

import { useState, useEffect, useCallback } from "react";
import {
  listReceipts,
  listReceiptsSince,
  listReceiptsInMonth,
  createReceipt as createReceiptAction,
  updateReceipt as updateReceiptAction,
  deleteReceipt as deleteReceiptAction,
} from "@/lib/actions/receipts";
import type { Receipt, ReceiptFilters, User, Area } from "@/lib/types";

const DEFAULT_FILTERS: ReceiptFilters = {
  dateFrom: "",
  dateTo: "",
  category: "",
  merchant: "",
  amountMin: "",
  amountMax: "",
  paidBy: "",
};

const errorMessage = (e: unknown, fallback: string): string =>
  e instanceof Error ? e.message : fallback;

/**
 * Schreib-Operationen auf Belegen: Action ausfuehren, danach neu laden.
 * Wird von Belegliste und Monatsuebersicht gemeinsam genutzt.
 */
function useReceiptMutations(
  refetch: () => Promise<void>,
  setError: (message: string) => void,
) {
  const run = async (action: () => Promise<unknown>, fallback: string): Promise<boolean> => {
    try {
      await action();
      await refetch();
      return true;
    } catch (e: unknown) {
      setError(errorMessage(e, fallback));
      return false;
    }
  };

  return {
    updateReceipt: (id: string, updates: Partial<Receipt>) =>
      run(() => updateReceiptAction(id, updates), "Update fehlgeschlagen"),
    deleteReceipt: (id: string) =>
      run(() => deleteReceiptAction(id), "Löschen fehlgeschlagen"),
    createReceipt: (data: Partial<Receipt>) =>
      run(() => createReceiptAction(data), "Erstellen fehlgeschlagen"),
  };
}

export function useReceipts(currentUser: User, area: Area) {
  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<ReceiptFilters>(DEFAULT_FILTERS);

  const fetchReceipts = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await listReceipts(area, filters);
      setReceipts(data);
    } catch (e: unknown) {
      setError(errorMessage(e, "Unbekannter Fehler"));
    } finally {
      setLoading(false);
    }
  }, [area, filters]);

  useEffect(() => {
    fetchReceipts();
  }, [fetchReceipts]);

  const mutations = useReceiptMutations(fetchReceipts, setError);

  const resetFilters = () => setFilters(DEFAULT_FILTERS);
  const activeFilterCount = Object.values(filters).filter((v) => v !== "").length;

  return {
    receipts,
    loading,
    error,
    filters,
    setFilters,
    resetFilters,
    activeFilterCount,
    refetch: fetchReceipts,
    ...mutations,
  };
}

/**
 * Belege eines Kalendermonats (month = "YYYY-MM") inkl. Gesamtsumme.
 * Laedt serverseitig nur den gewaehlten Monat — auch weit zurueckliegende
 * Monate bleiben dadurch gleich schnell.
 */
export function useMonthReceipts(area: Area, month: string, category: string, paidBy: string) {
  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchReceipts = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await listReceiptsInMonth(area, month, { category, paidBy });
      setReceipts(data);
    } catch (e: unknown) {
      setError(errorMessage(e, "Unbekannter Fehler"));
    } finally {
      setLoading(false);
    }
  }, [area, month, category, paidBy]);

  useEffect(() => {
    fetchReceipts();
  }, [fetchReceipts]);

  const mutations = useReceiptMutations(fetchReceipts, setError);
  const total = receipts.reduce((sum, r) => sum + (r.total_amount ?? 0), 0);

  return { receipts, total, loading, error, refetch: fetchReceipts, ...mutations };
}

export function useDashboardStats(currentUser: User, area: Area) {
  const [stats, setStats] = useState({
    totalMonth: 0,
    totalWeek: 0,
    countMonth: 0,
    recentReceipts: [] as Receipt[],
    topCategories: [] as { category: string; total: number }[],
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      setLoading(true);
      try {
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split("T")[0]!;
        const startOfWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0]!;

        const monthReceipts = await listReceiptsSince(area, startOfMonth);
        const weekReceipts = monthReceipts.filter((r) => r.receipt_date && r.receipt_date >= startOfWeek);

        const totalMonth = monthReceipts.reduce((s, r) => s + (r.total_amount ?? 0), 0);
        const totalWeek = weekReceipts.reduce((s, r) => s + (r.total_amount ?? 0), 0);

        const catMap: Record<string, number> = {};
        monthReceipts.forEach((r) => {
          if (r.category) catMap[r.category] = (catMap[r.category] ?? 0) + (r.total_amount ?? 0);
        });
        const topCategories = Object.entries(catMap)
          .map(([category, total]) => ({ category, total }))
          .sort((a, b) => b.total - a.total)
          .slice(0, 5);

        const all = await listReceipts(area);
        const recentReceipts = all.slice(0, 5);

        setStats({
          totalMonth,
          totalWeek,
          countMonth: monthReceipts.length,
          recentReceipts,
          topCategories,
        });
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, [currentUser, area]);

  return { ...stats, loading };
}
