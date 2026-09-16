"use client";

import type { Receipt as ReceiptType } from '@/lib/types';
import { formatEuro, formatDate, getCategoryColor, capitalize } from '@/lib/categories';

interface Props {
  receipt: ReceiptType;
  accentColor: string;
  /** Gemeinsam-Bereich: zeigt zusaetzlich wer ausgelegt hat. */
  isShared: boolean;
  animDelay: number;
  onClick: () => void;
}

/** Eine Beleg-Zeile — geteilt zwischen Belegliste und Monatsuebersicht. */
export default function ReceiptRow({ receipt: r, accentColor, isShared, animDelay, onClick }: Props) {
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
