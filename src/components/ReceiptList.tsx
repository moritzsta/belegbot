"use client";

import { useState } from 'react';
import { Receipt, RefreshCw, Plus } from 'lucide-react';
import { useReceipts } from '@/hooks/useReceipts';
import FilterBar from './FilterBar';
import ReceiptModal from './ReceiptModal';
import ReceiptRow from './ReceiptRow';
import type { User, Area, Receipt as ReceiptType } from '@/lib/types';

interface Props {
  currentUser: User;
  area: Area;
}

export default function ReceiptList({ currentUser, area }: Props) {
  const [selectedReceipt, setSelectedReceipt] = useState<ReceiptType | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const { receipts, loading, error, filters, setFilters, resetFilters, activeFilterCount, refetch, updateReceipt, deleteReceipt, createReceipt } = useReceipts(currentUser, area);

  const isShared = area === 'shared';
  const accentColor = isShared ? 'var(--teal)' : 'var(--accent)';

  return (
    <div className="animate-fade-in">
      <div className="page-header">
        <div>
          <h1 style={{ fontFamily: 'var(--font-heading)', fontWeight: 700, fontSize: '1.5rem', letterSpacing: '-0.02em' }}>
            {isShared ? 'Gemeinsame Belege' : 'Meine Belege'}
          </h1>
          {!loading && (
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginTop: 2 }}>
              {receipts.length} {receipts.length === 1 ? 'Beleg' : 'Belege'}
            </p>
          )}
        </div>
        <div className="page-header-actions">
          <button onClick={() => setShowCreateModal(true)} className={`btn btn-sm ${isShared ? 'btn-teal' : 'btn-primary'}`}>
            <Plus size={14} />
            Neuer Beleg
          </button>
          <button onClick={refetch} className="btn btn-ghost btn-sm" disabled={loading}>
            <RefreshCw size={14} style={{ animation: loading ? 'spin 0.6s linear infinite' : 'none' }} />
            Aktualisieren
          </button>
        </div>
      </div>

      <FilterBar
        filters={filters}
        onChange={setFilters}
        onReset={resetFilters}
        activeCount={activeFilterCount}
        area={area}
      />

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
          <p style={{ fontWeight: 500 }}>Keine Belege gefunden</p>
          {activeFilterCount > 0 && (
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

      {showCreateModal && (
        <ReceiptModal
          isNew
          onClose={() => setShowCreateModal(false)}
          onCreate={createReceipt}
          defaultArea={area}
          defaultUser={currentUser}
        />
      )}
    </div>
  );
}
