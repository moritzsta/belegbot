"use client";

import { useState, useEffect } from 'react';
import { X, ExternalLink, Save, Trash2, AlertCircle, Info } from 'lucide-react';
import type { Receipt, User, Area } from '@/lib/types';
import { CATEGORIES, formatEuro, formatDate, toInputDate, getCategoryColor } from '@/lib/categories';
import { getReceiptUrl } from '@/lib/getReceiptUrl';

interface Props {
  receipt?: Receipt;
  onClose: () => void;
  onSave?: (id: string, updates: Partial<Receipt>) => Promise<boolean>;
  onDelete?: (id: string) => Promise<boolean>;
  isNew?: boolean;
  onCreate?: (data: Partial<Receipt>) => Promise<boolean>;
  defaultArea?: Area;
  defaultUser?: User;
}

export default function ReceiptModal({ receipt, onClose, onSave, onDelete, isNew, onCreate, defaultArea, defaultUser }: Props) {
  const [editing, setEditing] = useState(!!isNew);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [lightboxOpen, setLightboxOpen] = useState(false);

  const todayStr = new Date().toISOString().split('T')[0];

  const [form, setForm] = useState({
    merchant: receipt?.merchant ?? '',
    receipt_date: isNew ? todayStr : toInputDate(receipt?.receipt_date),
    total_amount: receipt?.total_amount?.toString() ?? '',
    category: receipt?.category ?? 'Sonstiges',
    paid_by: (receipt?.paid_by ?? defaultUser ?? 'moritz') as User,
    note: receipt?.note ?? '',
    is_shared: receipt?.is_shared ?? (defaultArea === 'shared'),
    vat_7_base: receipt?.vat_7_base?.toString() ?? '',
    vat_7_amount: receipt?.vat_7_amount?.toString() ?? '',
    vat_19_base: receipt?.vat_19_base?.toString() ?? '',
    vat_19_amount: receipt?.vat_19_amount?.toString() ?? '',
  });

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (lightboxOpen) setLightboxOpen(false);
        else onClose();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose, lightboxOpen]);

  const handleSave = async () => {
    setSaving(true);
    const updates: Partial<Receipt> = {
      merchant: form.merchant || null,
      receipt_date: form.receipt_date || null,
      total_amount: form.total_amount ? parseFloat(form.total_amount) : null,
      category: form.category,
      paid_by: form.paid_by,
      note: form.note || null,
      is_shared: form.is_shared,
      vat_7_base: form.vat_7_base ? parseFloat(form.vat_7_base) : null,
      vat_7_amount: form.vat_7_amount ? parseFloat(form.vat_7_amount) : null,
      vat_19_base: form.vat_19_base ? parseFloat(form.vat_19_base) : null,
      vat_19_amount: form.vat_19_amount ? parseFloat(form.vat_19_amount) : null,
    };
    let ok: boolean;
    if (isNew && onCreate) {
      ok = await onCreate(updates);
    } else if (onSave && receipt) {
      ok = await onSave(receipt.id, updates);
    } else {
      ok = false;
    }
    setSaving(false);
    if (ok) { setEditing(false); onClose(); }
  };

  const handleDelete = async () => {
    if (!receipt || !onDelete) return;
    if (!confirmDelete) { setConfirmDelete(true); return; }
    setDeleting(true);
    await onDelete(receipt.id);
    setDeleting(false);
    onClose();
  };

  const fileUrl = !isNew ? getReceiptUrl(receipt?.file_path ?? null) : null;
  const isPdf = receipt?.file_path?.toLowerCase().endsWith('.pdf');
  const catColor = getCategoryColor(receipt?.category ?? form.category);

  return (<>
    <div className="modal-backdrop" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal-content">
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 22px', borderBottom: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{
              width: 10, height: 10, borderRadius: '50%',
              background: catColor,
              boxShadow: `0 0 6px ${catColor}`,
            }} />
            <h2 style={{ fontFamily: 'var(--font-heading)', fontWeight: 700, fontSize: '1.05rem' }}>
              {isNew ? 'Neuer Beleg' : editing ? 'Beleg bearbeiten' : (receipt?.merchant ?? 'Beleg Details')}
            </h2>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 4 }}>
            <X size={18} />
          </button>
        </div>

        <div style={{ padding: '20px 22px', display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* File Preview */}
          {fileUrl && (
            <div style={{ borderRadius: 'var(--r-md)', overflow: 'hidden', border: '1px solid var(--border)', background: 'var(--bg-input)' }}>
              {isPdf ? (
                <button onClick={() => setLightboxOpen(true)}
                  style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '12px 16px', color: 'var(--accent)', fontSize: '0.875rem', background: 'none', border: 'none', cursor: 'pointer', width: '100%' }}>
                  <ExternalLink size={15} /> PDF öffnen
                </button>
              ) : (
                <img src={fileUrl} alt="Beleg" onClick={() => setLightboxOpen(true)}
                  style={{ width: '100%', maxHeight: 360, objectFit: 'contain', display: 'block', cursor: 'pointer' }} />
              )}
            </div>
          )}

          {/* Confidence warning */}
          {!isNew && receipt?.extraction_confidence === 'low' && (
            <div style={{
              display: 'flex', gap: 8, alignItems: 'flex-start',
              padding: '10px 14px',
              background: 'rgba(232, 168, 56, 0.1)',
              border: '1px solid rgba(232, 168, 56, 0.25)',
              borderRadius: 'var(--r-md)',
              fontSize: '0.82rem', color: 'var(--accent)',
            }}>
              <AlertCircle size={14} style={{ flexShrink: 0, marginTop: 1 }} />
              <span>Niedrige Extraktionsqualität — bitte Felder prüfen.</span>
            </div>
          )}

          {/* Mode: View */}
          {!editing && receipt ? (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              <InfoField label="Händler" value={receipt.merchant} />
              <InfoField
                label="Datum"
                value={formatDate(receipt.receipt_date)}
                hint={receipt.date_is_fallback ? 'Automatisch gesetzt — kein Datum erkannt' : undefined}
              />
              <InfoField label="Betrag" value={formatEuro(receipt.total_amount)} mono />
              <InfoField label="Kategorie" value={receipt.category} accent={catColor} />
              <InfoField label="Bereich" value={receipt.is_shared ? 'Gemeinsam' : 'Privat'} />
              <InfoField label="Ausleger" value={receipt.paid_by === 'lena' ? 'Lena' : 'Moritz'} />
              {receipt.note && <InfoField label="Bemerkung" value={receipt.note} span />}
              {(receipt.vat_7_amount || receipt.vat_19_amount) && (
                <div style={{ gridColumn: '1 / -1' }}>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em' }}>MwSt.</div>
                  <div style={{ display: 'flex', gap: 10 }}>
                    {receipt.vat_7_amount && (
                      <span className="badge badge-muted">7% = {formatEuro(receipt.vat_7_amount)}</span>
                    )}
                    {receipt.vat_19_amount && (
                      <span className="badge badge-muted">19% = {formatEuro(receipt.vat_19_amount)}</span>
                    )}
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* Mode: Edit */
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              <div className="form-group">
                <label className="form-label">Händler</label>
                <input value={form.merchant} onChange={e => setForm(f => ({ ...f, merchant: e.target.value }))} />
              </div>
              <div className="form-group">
                <label className="form-label">Datum</label>
                <input type="date" value={form.receipt_date} onChange={e => setForm(f => ({ ...f, receipt_date: e.target.value }))} />
              </div>
              <div className="form-group">
                <label className="form-label">Betrag (€)</label>
                <input type="number" step="0.01" value={form.total_amount} onChange={e => setForm(f => ({ ...f, total_amount: e.target.value }))} />
              </div>
              <div className="form-group">
                <label className="form-label">Kategorie</label>
                <select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}>
                  {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Bereich</label>
                <select value={form.is_shared ? 'shared' : 'private'} onChange={e => setForm(f => ({ ...f, is_shared: e.target.value === 'shared' }))}>
                  <option value="private">Privat</option>
                  <option value="shared">Gemeinsam</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Ausleger</label>
                <select value={form.paid_by} onChange={e => setForm(f => ({ ...f, paid_by: e.target.value as User }))}>
                  <option value="lena">Lena</option>
                  <option value="moritz">Moritz</option>
                </select>
              </div>
              <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                <label className="form-label">Bemerkung</label>
                <textarea value={form.note} onChange={e => setForm(f => ({ ...f, note: e.target.value }))} rows={2} style={{ resize: 'vertical' }} />
              </div>
              {/* VAT */}
              <div className="form-group">
                <label className="form-label">MwSt 7% Betrag (€)</label>
                <input type="number" step="0.01" value={form.vat_7_amount} onChange={e => setForm(f => ({ ...f, vat_7_amount: e.target.value }))} placeholder="—" />
              </div>
              <div className="form-group">
                <label className="form-label">MwSt 19% Betrag (€)</label>
                <input type="number" step="0.01" value={form.vat_19_amount} onChange={e => setForm(f => ({ ...f, vat_19_amount: e.target.value }))} placeholder="—" />
              </div>
            </div>
          )}

          {/* Actions */}
          <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: 4, borderTop: '1px solid var(--border)' }}>
            {editing ? (
              <>
                {!isNew ? (
                  <button onClick={handleDelete} className={`btn btn-sm ${confirmDelete ? 'btn-danger' : 'btn-ghost'}`} disabled={deleting}>
                    <Trash2 size={13} />
                    {deleting ? 'Löschen…' : confirmDelete ? 'Wirklich löschen?' : 'Löschen'}
                  </button>
                ) : <div />}
                <div style={{ display: 'flex', gap: 8 }}>
                  <button onClick={onClose} className="btn btn-ghost btn-sm">Abbrechen</button>
                  <button onClick={handleSave} className={`btn btn-sm ${form.is_shared ? 'btn-teal' : 'btn-primary'}`} disabled={saving}>
                    <Save size={13} />
                    {saving ? 'Speichern…' : 'Speichern'}
                  </button>
                </div>
              </>
            ) : (
              <>
                <button onClick={handleDelete} className={`btn btn-sm ${confirmDelete ? 'btn-danger' : 'btn-ghost'}`} disabled={deleting}>
                  <Trash2 size={13} />
                  {deleting ? 'Löschen…' : confirmDelete ? 'Wirklich löschen?' : 'Löschen'}
                </button>
                <div style={{ display: 'flex', gap: 8 }}>
                  {fileUrl && (
                    <button onClick={() => setLightboxOpen(true)} className="btn btn-ghost btn-sm">
                      <ExternalLink size={13} /> Original öffnen
                    </button>
                  )}
                  <button className="btn btn-primary btn-sm" onClick={() => setEditing(true)}>
                    Bearbeiten
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>

    {/* Lightbox */}
    {lightboxOpen && fileUrl && (
      <div
        onClick={() => setLightboxOpen(false)}
        style={{
          position: 'fixed', inset: 0, zIndex: 1000,
          background: 'rgba(0,0,0,0.9)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}
      >
        <button
          onClick={() => setLightboxOpen(false)}
          style={{
            position: 'absolute', top: 16, right: 16,
            background: 'rgba(255,255,255,0.1)', border: 'none',
            borderRadius: '50%', width: 36, height: 36,
            cursor: 'pointer', color: '#fff',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >
          <X size={18} />
        </button>
        {isPdf ? (
          <iframe
            src={fileUrl}
            onClick={e => e.stopPropagation()}
            style={{ width: '90vw', height: '90vh', border: 'none', borderRadius: 4 }}
          />
        ) : (
          <img
            src={fileUrl}
            alt="Beleg Vollansicht"
            onClick={e => e.stopPropagation()}
            style={{ maxWidth: '90vw', maxHeight: '90vh', objectFit: 'contain', borderRadius: 4 }}
          />
        )}
      </div>
    )}
  </>);
}

function InfoField({ label, value, mono, accent, span, hint }: {
  label: string; value: string | null | undefined;
  mono?: boolean; accent?: string; span?: boolean; hint?: string;
}) {
  return (
    <div style={{ gridColumn: span ? '1 / -1' : undefined }}>
      <div style={{ fontSize: '0.73rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>
        {label}
      </div>
      <div style={{
        fontSize: '0.9rem',
        fontFamily: mono ? 'var(--font-mono)' : undefined,
        color: accent ?? 'var(--text-primary)',
        fontWeight: mono ? 700 : 500,
      }}>
        {value ?? '—'}
      </div>
      {hint && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 3, fontSize: '0.72rem', color: 'var(--accent)' }}>
          <Info size={12} style={{ flexShrink: 0 }} />
          <span>{hint}</span>
        </div>
      )}
    </div>
  );
}
