import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../config/supabase';
import type { Receipt, ReceiptFilters, User, Area } from '../types';

const DEFAULT_FILTERS: ReceiptFilters = {
  dateFrom: '',
  dateTo: '',
  category: '',
  merchant: '',
  amountMin: '',
  amountMax: '',
  paidBy: '',
};

export function useReceipts(currentUser: User, area: Area) {
  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<ReceiptFilters>(DEFAULT_FILTERS);

  const fetchReceipts = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      let query = supabase
        .from('receipts')
        .select('*')
        .order('receipt_date', { ascending: false })
        .order('created_at', { ascending: false });

      if (area === 'private') {
        query = query.eq('is_shared', false).eq('owner', currentUser);
      } else {
        query = query.eq('is_shared', true);
      }

      // Apply filters
      if (filters.dateFrom) query = query.gte('receipt_date', filters.dateFrom);
      if (filters.dateTo) query = query.lte('receipt_date', filters.dateTo);
      if (filters.category) query = query.eq('category', filters.category);
      if (filters.merchant) query = query.ilike('merchant', `%${filters.merchant}%`);
      if (filters.amountMin) query = query.gte('total_amount', parseFloat(filters.amountMin));
      if (filters.amountMax) query = query.lte('total_amount', parseFloat(filters.amountMax));
      if (filters.paidBy) query = query.eq('paid_by', filters.paidBy);

      const { data, error: err } = await query;
      if (err) throw err;
      setReceipts(data as Receipt[]);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Unbekannter Fehler');
    } finally {
      setLoading(false);
    }
  }, [currentUser, area, filters]);

  useEffect(() => {
    fetchReceipts();
  }, [fetchReceipts]);

  const updateReceipt = async (id: string, updates: Partial<Receipt>): Promise<boolean> => {
    try {
      const { error: err } = await supabase
        .from('receipts')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id);
      if (err) throw err;
      await fetchReceipts();
      return true;
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Update fehlgeschlagen');
      return false;
    }
  };

  const deleteReceipt = async (id: string): Promise<boolean> => {
    try {
      const { error: err } = await supabase
        .from('receipts')
        .delete()
        .eq('id', id);
      if (err) throw err;
      await fetchReceipts();
      return true;
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Löschen fehlgeschlagen');
      return false;
    }
  };

  const createReceipt = async (data: Partial<Receipt>): Promise<boolean> => {
    try {
      const { error: err } = await supabase
        .from('receipts')
        .insert({
          ...data,
          owner: currentUser,
          extraction_confidence: null,
          file_path: null,
          telegram_message_id: null,
          telegram_user_id: null,
        });
      if (err) throw err;
      await fetchReceipts();
      return true;
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Erstellen fehlgeschlagen');
      return false;
    }
  };

  const resetFilters = () => setFilters(DEFAULT_FILTERS);

  const activeFilterCount = Object.values(filters).filter(v => v !== '').length;

  return {
    receipts,
    loading,
    error,
    filters,
    setFilters,
    resetFilters,
    activeFilterCount,
    refetch: fetchReceipts,
    updateReceipt,
    deleteReceipt,
    createReceipt,
  };
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
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
      const startOfWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

      let base = supabase.from('receipts').select('*');
      if (area === 'private') {
        base = base.eq('is_shared', false).eq('owner', currentUser);
      } else {
        base = base.eq('is_shared', true);
      }

      const { data } = await base.gte('receipt_date', startOfMonth);
      if (!data) { setLoading(false); return; }

      const monthReceipts = data as Receipt[];
      const weekReceipts = monthReceipts.filter(r => r.receipt_date && r.receipt_date >= startOfWeek);

      const totalMonth = monthReceipts.reduce((s, r) => s + (r.total_amount ?? 0), 0);
      const totalWeek = weekReceipts.reduce((s, r) => s + (r.total_amount ?? 0), 0);

      // Top categories
      const catMap: Record<string, number> = {};
      monthReceipts.forEach(r => {
        if (r.category) catMap[r.category] = (catMap[r.category] ?? 0) + (r.total_amount ?? 0);
      });
      const topCategories = Object.entries(catMap)
        .map(([category, total]) => ({ category, total }))
        .sort((a, b) => b.total - a.total)
        .slice(0, 5);

      // Recent
      const { data: recent } = await supabase
        .from('receipts')
        .select('*')
        .eq(area === 'private' ? 'owner' : 'is_shared', area === 'private' ? currentUser : true)
        .eq(area === 'private' ? 'is_shared' : 'is_shared', area === 'private' ? false : true)
        .order('receipt_date', { ascending: false })
        .limit(5);

      setStats({
        totalMonth,
        totalWeek,
        countMonth: monthReceipts.length,
        recentReceipts: (recent as Receipt[]) ?? [],
        topCategories,
      });
      setLoading(false);
    };
    fetch();
  }, [currentUser, area]);

  return { ...stats, loading };
}
