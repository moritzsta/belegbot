"use client";

import type { Receipt as ReceiptType } from '@/lib/types';
import { formatEuro, formatDate, capitalize } from '@/lib/categories';
import { useCategories } from '@/hooks/useCategories';
import CategoryIcon from './CategoryIcon';

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
  const { colorOf, byName } = useCategories();
  const catColor = colorOf(r.category);

  return (
    <div
      onClick={onClick}
      className="receipt-row animate-fade-in"
      style={{ animationDelay: `${animDelay}ms` }}
    >
      {/* Kategorie: Icon falls gesetzt, sonst der Farbpunkt */}
      <CategoryIcon icon={byName(r.category)?.icon} color={catColor} size={16} />

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
        <div className="receipt-row-meta">
          <span>{formatDate(r.receipt_date)}</span>
          <span>·</span>
          <span>{r.category}</span>
          {isShared && <><span>·</span><span style={{ color: 'var(--text-secondary)' }}>{capitalize(r.paid_by)}</span></>}
          {r.note && <><span>·</span><span className="receipt-row-note">{r.note}</span></>}
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
