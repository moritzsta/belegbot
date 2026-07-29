"use client";

import { useState } from 'react';
import { TrendingUp, Receipt, Calendar, Tag, Plus } from 'lucide-react';
import { useDashboardStats } from '@/hooks/useReceipts';
import ReceiptModal from './ReceiptModal';
import type { Receipt as ReceiptType, User, Area } from '@/lib/types';
import { formatEuro, formatDate, getCategoryColor } from '@/lib/categories';

interface Props {
  currentUser: User;
  area: Area;
  onNavigateToList: () => void;
  onCreate: (data: Partial<ReceiptType>) => Promise<boolean>;
}

export default function Dashboard({ currentUser, area, onNavigateToList, onCreate }: Props) {
  const stats = useDashboardStats(currentUser, area);
  const isShared = area === 'shared';
  const accentColor = isShared ? 'var(--teal)' : 'var(--accent)';
  const [showCreateModal, setShowCreateModal] = useState(false);

  return (
    <div className="animate-fade-in">
      {/* Page Title */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontFamily: 'var(--font-heading)', fontWeight: 700, fontSize: '1.5rem', letterSpacing: '-0.02em' }}>
            {isShared ? 'Gemeinsame Ausgaben' : 'Meine Ausgaben'}
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginTop: 4 }}>
            {isShared ? 'Ausgaben von Lena & Moritz' : `Nur deine privaten Belege`}
          </p>
        </div>
        <button onClick={() => setShowCreateModal(true)} className={`btn btn-sm ${isShared ? 'btn-teal' : 'btn-primary'}`}>
          <Plus size={14} />
          Neuer Beleg
        </button>
      </div>

      {/* Stats row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 14, marginBottom: 24 }}>
        <StatCard
          label="Diesen Monat"
          value={formatEuro(stats.totalMonth)}
          icon={<TrendingUp size={16} />}
          accent={accentColor}
          loading={stats.loading}
        />
        <StatCard
          label="Diese Woche"
          value={formatEuro(stats.totalWeek)}
          icon={<Calendar size={16} />}
          accent={accentColor}
          loading={stats.loading}
        />
        <StatCard
          label="Belege (Monat)"
          value={stats.countMonth.toString()}
          icon={<Receipt size={16} />}
          accent={accentColor}
          loading={stats.loading}
          mono={false}
        />
      </div>

      {/* Content grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        {/* Top Categories */}
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <h3 style={{ fontFamily: 'var(--font-heading)', fontWeight: 600, fontSize: '0.95rem' }}>
              Top Kategorien <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>— Monat</span>
            </h3>
            <Tag size={14} color="var(--text-muted)" />
          </div>
          {stats.loading ? (
            <div className="loading-center" style={{ padding: '30px 0' }}><span className="loading-spinner" /></div>
          ) : stats.topCategories.length === 0 ? (
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', textAlign: 'center', padding: '20px 0' }}>
              Noch keine Daten
            </p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {stats.topCategories.map((cat, i) => {
                const max = stats.topCategories[0]?.total ?? 1;
                const pct = (cat.total / max) * 100;
                const color = getCategoryColor(cat.category);
                return (
                  <div key={i}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4, fontSize: '0.82rem' }}>
                      <span style={{ color: 'var(--text-secondary)' }}>{cat.category}</span>
                      <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-primary)' }}>
                        {formatEuro(cat.total)}
                      </span>
                    </div>
                    <div style={{ height: 4, background: 'var(--border)', borderRadius: 2, overflow: 'hidden' }}>
                      <div style={{
                        height: '100%',
                        width: `${pct}%`,
                        background: color,
                        borderRadius: 2,
                        transition: 'width 0.6s ease',
                      }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Recent Receipts */}
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <h3 style={{ fontFamily: 'var(--font-heading)', fontWeight: 600, fontSize: '0.95rem' }}>
              Letzte Belege
            </h3>
            <button
              onClick={onNavigateToList}
              style={{
                fontSize: '0.78rem', color: accentColor,
                background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'var(--font-ui)',
              }}
            >
              Alle →
            </button>
          </div>

          {stats.loading ? (
            <div className="loading-center" style={{ padding: '30px 0' }}><span className="loading-spinner" /></div>
          ) : stats.recentReceipts.length === 0 ? (
            <div className="empty-state" style={{ padding: '20px 0' }}>
              <Receipt size={28} />
              <p>Noch keine Belege</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
              {stats.recentReceipts.map((r, i) => (
                <div key={r.id} style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '9px 0',
                  borderBottom: i < stats.recentReceipts.length - 1 ? '1px solid var(--border-subtle)' : 'none',
                }}>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontWeight: 500, fontSize: '0.85rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {r.merchant ?? '—'}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 1 }}>
                      {formatDate(r.receipt_date)} · {r.category}
                    </div>
                  </div>
                  <div style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: '0.85rem',
                    color: accentColor,
                    flexShrink: 0,
                    marginLeft: 12,
                  }}>
                    {formatEuro(r.total_amount)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {showCreateModal && (
        <ReceiptModal
          isNew
          onClose={() => setShowCreateModal(false)}
          onCreate={onCreate}
          defaultArea={area}
          defaultUser={currentUser}
        />
      )}
    </div>
  );
}

function StatCard({ label, value, icon, accent, loading, mono = true }: {
  label: string;
  value: string;
  icon: React.ReactNode;
  accent: string;
  loading: boolean;
  mono?: boolean;
}) {
  return (
    <div className="card" style={{ padding: '16px 18px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
        <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          {label}
        </span>
        <span style={{ color: accent, opacity: 0.7 }}>{icon}</span>
      </div>
      {loading ? (
        <div style={{ height: 28, display: 'flex', alignItems: 'center' }}>
          <span className="loading-spinner" style={{ width: 16, height: 16 }} />
        </div>
      ) : (
        <div style={{
          fontSize: '1.4rem',
          fontFamily: mono ? 'var(--font-mono)' : 'var(--font-heading)',
          fontWeight: 700,
          color: 'var(--text-primary)',
          lineHeight: 1.2,
        }}>
          {value}
        </div>
      )}
    </div>
  );
}
