"use client";

import { Search, X, SlidersHorizontal } from 'lucide-react';
import type { ReceiptFilters, Area } from '@/lib/types';
import { useState } from 'react';
import CategorySelect from './CategorySelect';

interface Props {
  filters: ReceiptFilters;
  onChange: (filters: ReceiptFilters) => void;
  onReset: () => void;
  activeCount: number;
  area: Area;
}

export default function FilterBar({ filters, onChange, onReset, activeCount, area }: Props) {
  const [expanded, setExpanded] = useState(false);
  const isShared = area === 'shared';
  const accentColor = isShared ? 'var(--teal)' : 'var(--accent)';

  const set = (key: keyof ReceiptFilters, value: string) =>
    onChange({ ...filters, [key]: value });

  return (
    <div className="card" style={{ padding: '14px 16px', marginBottom: 16 }}>
      {/* Main row */}
      <div className="filter-row">
        {/* Merchant search */}
        <div className="filter-search">
          <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input
            placeholder="Händler suchen…"
            value={filters.merchant}
            onChange={e => set('merchant', e.target.value)}
            className="input-sm"
            style={{ paddingLeft: 32 }}
          />
        </div>

        {/* Category */}
        <CategorySelect
          value={filters.category}
          onChange={v => set('category', v)}
          emptyLabel="Alle Kategorien"
          className="filter-select input-sm"
          aria-label="Kategorie filtern"
        />

        {/* More filters toggle */}
        <button
          onClick={() => setExpanded(!expanded)}
          className="btn btn-ghost btn-sm"
          aria-label="Weitere Filter"
          style={{
            height: 36,
            borderColor: activeCount > 0 ? accentColor : undefined,
            color: activeCount > 0 ? accentColor : undefined,
          }}
        >
          <SlidersHorizontal size={14} />
          {activeCount > 0 && (
            <span style={{
              background: accentColor,
              color: '#0D0F14',
              borderRadius: 100,
              padding: '1px 6px',
              fontSize: '0.7rem',
              fontWeight: 700,
            }}>
              {activeCount}
            </span>
          )}
        </button>

        {/* Reset */}
        {activeCount > 0 && (
          <button onClick={onReset} className="btn btn-ghost btn-sm" aria-label="Filter zuruecksetzen" style={{ height: 36, padding: '5px 8px' }}>
            <X size={14} />
          </button>
        )}
      </div>

      {/* Expanded */}
      {expanded && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 10, marginTop: 12, paddingTop: 12, borderTop: '1px solid var(--border)' }}>
          <div className="form-group">
            <label className="form-label">Von</label>
            <input type="date" value={filters.dateFrom} onChange={e => set('dateFrom', e.target.value)} className="input-sm" />
          </div>
          <div className="form-group">
            <label className="form-label">Bis</label>
            <input type="date" value={filters.dateTo} onChange={e => set('dateTo', e.target.value)} className="input-sm" />
          </div>
          <div className="form-group">
            <label className="form-label">Betrag ab (€)</label>
            <input type="number" inputMode="decimal" placeholder="0,00" value={filters.amountMin} onChange={e => set('amountMin', e.target.value)} className="input-sm" />
          </div>
          <div className="form-group">
            <label className="form-label">Betrag bis (€)</label>
            <input type="number" inputMode="decimal" placeholder="999,00" value={filters.amountMax} onChange={e => set('amountMax', e.target.value)} className="input-sm" />
          </div>
          {area === 'shared' && (
            <div className="form-group">
              <label className="form-label">Ausleger</label>
              <select value={filters.paidBy} onChange={e => set('paidBy', e.target.value)} className="input-sm">
                <option value="">Alle</option>
                <option value="lena">Lena</option>
                <option value="moritz">Moritz</option>
              </select>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
