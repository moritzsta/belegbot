import { useState } from 'react';
import { Receipt, RefreshCw } from 'lucide-react';
import { useReceipts } from '../hooks/useReceipts';
import FilterBar from './FilterBar';
import ReceiptModal from './ReceiptModal';
import type { User, Area, Receipt as ReceiptType } from '../types';
import { formatEuro, formatDate, getCategoryColor, capitalize } from '../utils/categories';

interface Props {
  currentUser: User;
  area: Area;
}

export default function ReceiptList({ currentUser, area }: Props) {
  const [selectedReceipt, setSelectedReceipt] = useState<ReceiptType | null>(null);
  const { receipts, loading, error, filters, setFilters, resetFilters, activeFilterCount, refetch, updateReceipt, deleteReceipt } = useReceipts(currentUser, area);

  const isShared = area === 'shared';
  const accentColor = isShared ? 'var(--teal)' : 'var(--accent)';

  return (
    <div className="animate-fade-in">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
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
        <button onClick={refetch} className="btn btn-ghost btn-sm" disabled={loading}>
          <RefreshCw size={14} style={{ animation: loading ? 'spin 0.6s linear infinite' : 'none' }} />
          Aktualisieren
        </button>
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
    </div>
  );
}

function ReceiptRow({ receipt: r, accentColor, isShared, animDelay, onClick }: {
  receipt: ReceiptType;
  accentColor: string;
  isShared: boolean;
  animDelay: number;
  onClick: () => void;
}) {
  const catColor = getCategoryColor(r.category);

  return (
    <div
      onClick={onClick}
      style={{
        background: 'var(--bg-card)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--r-md)',
        padding: '12px 16px',
        display: 'flex',
        alignItems: 'center',
        gap: 14,
        cursor: 'pointer',
        transition: 'var(--t-base)',
        animationDelay: `${animDelay}ms`,
      }}
      className="animate-fade-in"
      onMouseEnter={e => {
        (e.currentTarget as HTMLElement).style.background = 'var(--bg-card-hover)';
        (e.currentTarget as HTMLElement).style.borderColor = 'var(--border-active)';
        (e.currentTarget as HTMLElement).style.transform = 'translateX(2px)';
      }}
      onMouseLeave={e => {
        (e.currentTarget as HTMLElement).style.background = 'var(--bg-card)';
        (e.currentTarget as HTMLElement).style.borderColor = 'var(--border)';
        (e.currentTarget as HTMLElement).style.transform = 'translateX(0)';
      }}
    >
      {/* Category dot */}
      <div style={{
        width: 8, height: 8, borderRadius: '50%', flexShrink: 0,
        background: catColor,
        boxShadow: `0 0 5px ${catColor}50`,
      }} />

      {/* Main info */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontWeight: 500, fontSize: '0.9rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {r.merchant ?? '—'}
          </span>
          {r.extraction_confidence === 'low' && (
            <span className="badge badge-amber" style={{ fontSize: '0.68rem' }}>unsicher</span>
          )}
        </div>
        <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: 2, display: 'flex', gap: 10 }}>
          <span>{formatDate(r.receipt_date)}</span>
          <span>·</span>
          <span>{r.category}</span>
          {isShared && <><span>·</span><span style={{ color: 'var(--text-secondary)' }}>{capitalize(r.paid_by)}</span></>}
          {r.note && <><span>·</span><span style={{ fontStyle: 'italic', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 150 }}>{r.note}</span></>}
        </div>
      </div>

      {/* Amount */}
      <div style={{
        fontFamily: 'var(--font-mono)',
        fontWeight: 700,
        fontSize: '0.95rem',
        color: accentColor,
        flexShrink: 0,
      }}>
        {formatEuro(r.total_amount)}
      </div>
    </div>
  );
}
