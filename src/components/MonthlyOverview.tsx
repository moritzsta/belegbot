"use client";

import { useState } from 'react';
import { Receipt, ChevronLeft, ChevronRight, RefreshCw } from 'lucide-react';
import { useMonthReceipts } from '@/hooks/useReceipts';
import ReceiptModal from './ReceiptModal';
import ReceiptRow from './ReceiptRow';
import type { Area, Receipt as ReceiptType } from '@/lib/types';
import { CATEGORIES, formatEuro } from '@/lib/categories';

interface Props {
  area: Area;
}

/** Aktueller Kalendermonat als "YYYY-MM" (lokale Zeit, wie das Belegdatum). */
export function currentMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

/** Monat verschieben: shiftMonth("2026-01", -1) === "2025-12". */
export function shiftMonth(month: string, delta: number): string {
  const [year, m] = month.split('-').map(Number) as [number, number];
  const d = new Date(year, m - 1 + delta, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

/** "2026-09" → "September 2026" */
function monthLabel(month: string): string {
  const [year, m] = month.split('-').map(Number) as [number, number];
  return new Date(year, m - 1, 1).toLocaleDateString('de-DE', { month: 'long', year: 'numeric' });
}

export default function MonthlyOverview({ area }: Props) {
  const [month, setMonth] = useState<string>(currentMonth());
  const [category, setCategory] = useState('');
  const [paidBy, setPaidBy] = useState('');
  const [selectedReceipt, setSelectedReceipt] = useState<ReceiptType | null>(null);

  const { receipts, total, loading, error, refetch, updateReceipt, deleteReceipt } =
    useMonthReceipts(area, month, category, paidBy);

  const isShared = area === 'shared';
  const accentColor = isShared ? 'var(--teal)' : 'var(--accent)';
  const isCurrentMonth = month === currentMonth();
  const hasFilters = category !== '' || paidBy !== '';

  const resetFilters = () => { setCategory(''); setPaidBy(''); };

  return (
    <div className="animate-fade-in">
      {/* Header: Titel + Gesamtsumme des Monats */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20, gap: 16 }}>
        <div>
          <h1 style={{ fontFamily: 'var(--font-heading)', fontWeight: 700, fontSize: '1.5rem', letterSpacing: '-0.02em' }}>
            {monthLabel(month)}
          </h1>
          {!loading && (
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginTop: 2 }}>
              Gesamt:{' '}
              <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: accentColor }}>
                {formatEuro(total)}
              </span>
              {' '}· {receipts.length} {receipts.length === 1 ? 'Beleg' : 'Belege'}
            </p>
          )}
        </div>

        {/* Monatsnavigation */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button
            onClick={() => setMonth(shiftMonth(month, -1))}
            className="btn btn-ghost btn-sm"
            title="Vorheriger Monat"
            style={{ padding: '5px 8px' }}
          >
            <ChevronLeft size={15} />
          </button>
          <input
            type="month"
            value={month}
            max={currentMonth()}
            onChange={e => { if (e.target.value) setMonth(e.target.value); }}
            style={{ height: 34, width: 160, fontSize: '0.85rem' }}
          />
          <button
            onClick={() => setMonth(shiftMonth(month, 1))}
            className="btn btn-ghost btn-sm"
            title="Naechster Monat"
            disabled={isCurrentMonth}
            style={{ padding: '5px 8px' }}
          >
            <ChevronRight size={15} />
          </button>
          {!isCurrentMonth && (
            <button onClick={() => setMonth(currentMonth())} className="btn btn-ghost btn-sm" style={{ height: 34 }}>
              Heute
            </button>
          )}
          <button onClick={refetch} className="btn btn-ghost btn-sm" disabled={loading} style={{ padding: '5px 8px' }}>
            <RefreshCw size={14} style={{ animation: loading ? 'spin 0.6s linear infinite' : 'none' }} />
          </button>
        </div>
      </div>

      {/* Filter innerhalb des Monats */}
      <div className="card" style={{ padding: '14px 16px', marginBottom: 16, display: 'flex', gap: 10, alignItems: 'center' }}>
        <select
          value={category}
          onChange={e => setCategory(e.target.value)}
          style={{ width: 200, height: 36, fontSize: '0.875rem' }}
        >
          <option value="">Alle Kategorien</option>
          {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
        </select>

        {isShared && (
          <select
            value={paidBy}
            onChange={e => setPaidBy(e.target.value)}
            style={{ width: 160, height: 36, fontSize: '0.875rem' }}
          >
            <option value="">Alle Ausleger</option>
            <option value="lena">Lena</option>
            <option value="moritz">Moritz</option>
          </select>
        )}

        {hasFilters && (
          <button onClick={resetFilters} className="btn btn-ghost btn-sm" style={{ height: 36 }}>
            Filter zurücksetzen
          </button>
        )}
      </div>

      {error && (
        <div style={{ background: 'var(--red-bg)', border: '1px solid rgba(232,80,80,0.25)', borderRadius: 'var(--r-md)', padding: '12px 16px', marginBottom: 16, fontSize: '0.875rem', color: 'var(--red)' }}>
          Fehler: {error}
        </div>
      )}

      {loading ? (
        <div className="loading-center"><span className="loading-spinner" /> Belege werden geladen…</div>
      ) : receipts.length === 0 ? (
        <div className="empty-state card">
          <Receipt size={40} />
          <p style={{ fontWeight: 500 }}>Keine Belege in {monthLabel(month)}</p>
          {hasFilters && (
            <button onClick={resetFilters} className="btn btn-ghost btn-sm" style={{ marginTop: 8 }}>
              Filter zurücksetzen
            </button>
          )}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {receipts.map((r, i) => (
            <ReceiptRow
              key={r.id}
              receipt={r}
              accentColor={accentColor}
              isShared={isShared}
              animDelay={i * 30}
              onClick={() => setSelectedReceipt(r)}
            />
          ))}
        </div>
      )}

      {selectedReceipt && (
        <ReceiptModal
          receipt={selectedReceipt}
          onClose={() => setSelectedReceipt(null)}
          onSave={updateReceipt}
          onDelete={deleteReceipt}
        />
      )}
    </div>
  );
}
