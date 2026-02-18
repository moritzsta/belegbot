import { useState, useEffect } from 'react';
import {
  PieChart, Pie, Cell, Tooltip, BarChart, Bar, XAxis, YAxis,
  CartesianGrid, ResponsiveContainer, LineChart, Line,
} from 'recharts';
import { supabase } from '../config/supabase';
import type { User, Area } from '../types';
import type { Receipt } from '../types';
import { formatEuro, getCategoryColor, capitalize } from '../utils/categories';

interface Props {
  currentUser: User;
  area: Area;
}

type Period = 'month' | 'quarter' | 'year';

export default function Statistics({ currentUser, area }: Props) {
  const [period, setPeriod] = useState<Period>('month');
  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [loading, setLoading] = useState(true);

  const isShared = area === 'shared';
  const accentColor = isShared ? 'var(--teal)' : 'var(--accent)';

  useEffect(() => {
    const fetch = async () => {
      setLoading(true);
      const now = new Date();
      let since: string;
      if (period === 'month') since = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
      else if (period === 'quarter') since = new Date(now.getFullYear(), now.getMonth() - 3, 1).toISOString().split('T')[0];
      else since = new Date(now.getFullYear(), 0, 1).toISOString().split('T')[0];

      let q = supabase.from('receipts').select('*').gte('receipt_date', since);
      if (isShared) q = q.eq('is_shared', true);
      else q = q.eq('is_shared', false).eq('owner', currentUser);

      const { data } = await q;
      setReceipts((data ?? []) as Receipt[]);
      setLoading(false);
    };
    fetch();
  }, [currentUser, area, period]);

  // Category stats
  const catMap: Record<string, number> = {};
  receipts.forEach(r => {
    if (r.category && r.total_amount) catMap[r.category] = (catMap[r.category] ?? 0) + r.total_amount;
  });
  const catData = Object.entries(catMap)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);

  // Time series (by month)
  const timeMap: Record<string, number> = {};
  receipts.forEach(r => {
    if (!r.receipt_date || !r.total_amount) return;
    const key = r.receipt_date.slice(0, 7);
    timeMap[key] = (timeMap[key] ?? 0) + r.total_amount;
  });
  const timeData = Object.entries(timeMap)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, total]) => ({
      month: new Date(month + '-01').toLocaleDateString('de-DE', { month: 'short', year: '2-digit' }),
      total,
    }));

  // Payer stats (shared only)
  const payerData = isShared
    ? ['lena', 'moritz'].map(p => ({
        name: capitalize(p),
        total: receipts.filter(r => r.paid_by === p).reduce((s, r) => s + (r.total_amount ?? 0), 0),
        count: receipts.filter(r => r.paid_by === p).length,
      }))
    : [];

  const total = receipts.reduce((s, r) => s + (r.total_amount ?? 0), 0);

  const customTooltip = ({ active, payload }: { active?: boolean; payload?: { name: string; value: number }[] }) => {
    if (!active || !payload?.length) return null;
    return (
      <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8, padding: '8px 12px', fontSize: '0.8rem' }}>
        <div style={{ fontWeight: 600, marginBottom: 2 }}>{payload[0].name}</div>
        <div style={{ fontFamily: 'var(--font-mono)', color: accentColor }}>{formatEuro(payload[0].value)}</div>
      </div>
    );
  };

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontFamily: 'var(--font-heading)', fontWeight: 700, fontSize: '1.5rem', letterSpacing: '-0.02em' }}>
            Statistiken
          </h1>
          {!loading && (
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginTop: 2 }}>
              Gesamt: <span style={{ fontFamily: 'var(--font-mono)', color: accentColor }}>{formatEuro(total)}</span>
              {' '}· {receipts.length} Belege
            </p>
          )}
        </div>
        {/* Period selector */}
        <div style={{ display: 'flex', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--r-md)', padding: 3, gap: 2 }}>
          {([['month', 'Monat'], ['quarter', 'Quartal'], ['year', 'Jahr']] as [Period, string][]).map(([p, label]) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              style={{
                padding: '4px 12px',
                borderRadius: 7,
                border: 'none', cursor: 'pointer', fontFamily: 'var(--font-ui)',
                fontSize: '0.8rem', fontWeight: 500,
                background: period === p ? accentColor : 'transparent',
                color: period === p ? '#0D0F14' : 'var(--text-secondary)',
                transition: 'var(--t-base)',
              }}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="loading-center"><span className="loading-spinner" /> Wird geladen…</div>
      ) : receipts.length === 0 ? (
        <div className="empty-state card"><p>Keine Daten für diesen Zeitraum.</p></div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Time series */}
          {timeData.length > 1 && (
            <div className="card">
              <h3 style={{ fontFamily: 'var(--font-heading)', fontWeight: 600, fontSize: '0.95rem', marginBottom: 16 }}>
                Ausgaben über Zeit
              </h3>
              <ResponsiveContainer width="100%" height={180}>
                <LineChart data={timeData} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="month" tick={{ fill: 'var(--text-muted)', fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: 'var(--text-muted)', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={v => `${v}€`} />
                  <Tooltip content={customTooltip as unknown as React.ReactElement} />
                  <Line type="monotone" dataKey="total" stroke={isShared ? 'var(--teal)' : 'var(--accent)'} strokeWidth={2} dot={{ fill: isShared ? 'var(--teal)' : 'var(--accent)', r: 3 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: isShared ? '1fr 1fr 1fr' : '1fr 1fr', gap: 16 }}>
            {/* Pie chart */}
            <div className="card" style={{ gridColumn: isShared ? '1 / 3' : '1' }}>
              <h3 style={{ fontFamily: 'var(--font-heading)', fontWeight: 600, fontSize: '0.95rem', marginBottom: 16 }}>
                Nach Kategorie
              </h3>
              <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
                <ResponsiveContainer width={160} height={160}>
                  <PieChart>
                    <Pie data={catData} cx="50%" cy="50%" innerRadius={45} outerRadius={70} paddingAngle={2} dataKey="value">
                      {catData.map((entry, index) => (
                        <Cell key={index} fill={getCategoryColor(entry.name)} />
                      ))}
                    </Pie>
                    <Tooltip content={customTooltip as unknown as React.ReactElement} />
                  </PieChart>
                </ResponsiveContainer>
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {catData.slice(0, 6).map((c, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.8rem' }}>
                      <div style={{ width: 8, height: 8, borderRadius: '50%', background: getCategoryColor(c.name), flexShrink: 0 }} />
                      <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: 'var(--text-secondary)' }}>{c.name}</span>
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.78rem', flexShrink: 0 }}>{formatEuro(c.value)}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Payer (shared only) */}
            {isShared && (
              <div className="card">
                <h3 style={{ fontFamily: 'var(--font-heading)', fontWeight: 600, fontSize: '0.95rem', marginBottom: 16 }}>
                  Ausleger
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  {payerData.map(p => {
                    const pct = total > 0 ? (p.total / total) * 100 : 0;
                    const color = p.name === 'Lena' ? 'var(--accent)' : 'var(--teal)';
                    return (
                      <div key={p.name}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, fontSize: '0.85rem' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <div style={{ width: 24, height: 24, borderRadius: '50%', background: color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: '#0D0F14' }}>
                              {p.name[0]}
                            </div>
                            <span style={{ fontWeight: 500 }}>{p.name}</span>
                          </div>
                          <span style={{ fontFamily: 'var(--font-mono)', color }}>{formatEuro(p.total)}</span>
                        </div>
                        <div style={{ height: 6, background: 'var(--border)', borderRadius: 3, overflow: 'hidden' }}>
                          <div style={{ height: '100%', width: `${pct}%`, background: color, borderRadius: 3, transition: 'width 0.6s ease' }} />
                        </div>
                        <div style={{ fontSize: '0.73rem', color: 'var(--text-muted)', marginTop: 3 }}>
                          {pct.toFixed(0)}% · {p.count} Belege
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Bar chart by merchant */}
            <div className="card" style={{ gridColumn: '1 / -1' }}>
              <h3 style={{ fontFamily: 'var(--font-heading)', fontWeight: 600, fontSize: '0.95rem', marginBottom: 16 }}>
                Top Händler
              </h3>
              {(() => {
                const merchantMap: Record<string, number> = {};
                receipts.forEach(r => {
                  if (r.merchant && r.total_amount) merchantMap[r.merchant] = (merchantMap[r.merchant] ?? 0) + r.total_amount;
                });
                const merchantData = Object.entries(merchantMap)
                  .map(([name, total]) => ({ name, total }))
                  .sort((a, b) => b.total - a.total)
                  .slice(0, 8);

                return (
                  <ResponsiveContainer width="100%" height={180}>
                    <BarChart data={merchantData} margin={{ top: 4, right: 4, bottom: 20, left: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                      <XAxis dataKey="name" tick={{ fill: 'var(--text-muted)', fontSize: 10 }} axisLine={false} tickLine={false} angle={-20} textAnchor="end" />
                      <YAxis tick={{ fill: 'var(--text-muted)', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={v => `${v}€`} />
                      <Tooltip content={customTooltip as unknown as React.ReactElement} />
                      <Bar dataKey="total" fill={isShared ? 'var(--teal)' : 'var(--accent)'} radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                );
              })()}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
