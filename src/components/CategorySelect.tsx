"use client";

import { useState } from "react";
import { Check, X } from "lucide-react";

import { useCategories } from "@/hooks/useCategories";
import { createCategory } from "@/lib/actions/categories";

interface Props {
  value: string;
  onChange: (name: string) => void;
  /** "+ Neue Kategorie…" als letzte Option anbieten (Beleg-Dialog). */
  allowCreate?: boolean;
  /** Leere Option ganz oben, z.B. "Alle Kategorien" fuer Filter. */
  emptyLabel?: string;
  className?: string;
  "aria-label"?: string;
}

const NEW = "__new__";

/**
 * TK-0005: Kategorie-Auswahl aus der DB. Mit `allowCreate` laesst sich direkt
 * hier eine neue Kategorie anlegen — der Nutzer bleibt im Beleg-Dialog.
 * Ein Wert, der nicht (mehr) in der Liste steht (geloeschte Kategorie), wird
 * als eigene Option gezeigt, damit der Beleg seinen Namen nicht verliert.
 */
export default function CategorySelect({ value, onChange, allowCreate, emptyLabel, className, ...rest }: Props) {
  const { categories, refresh } = useCategories();
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const orphan = value && !categories.some((c) => c.name === value);

  const handleSelect = (v: string) => {
    if (v === NEW) { setCreating(true); setError(null); return; }
    onChange(v);
  };

  const handleCreate = async () => {
    setBusy(true);
    setError(null);
    const res = await createCategory({ name });
    setBusy(false);
    if (!res.ok) { setError(res.error); return; }
    await refresh();
    onChange(res.value.name);
    setCreating(false);
    setName("");
  };

  if (creating) {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        <div style={{ display: "flex", gap: 6 }}>
          <input
            autoFocus
            value={name}
            maxLength={50}
            placeholder="Neue Kategorie"
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleCreate(); } if (e.key === "Escape") setCreating(false); }}
            className={className}
            aria-label="Name der neuen Kategorie"
          />
          <button type="button" onClick={handleCreate} className="btn btn-primary btn-sm" disabled={busy || !name.trim()} aria-label="Kategorie anlegen">
            <Check size={14} />
          </button>
          <button type="button" onClick={() => setCreating(false)} className="btn btn-ghost btn-sm" aria-label="Abbrechen">
            <X size={14} />
          </button>
        </div>
        {error && <span style={{ fontSize: "0.78rem", color: "var(--red)" }}>{error}</span>}
      </div>
    );
  }

  return (
    <select value={value} onChange={(e) => handleSelect(e.target.value)} className={className} {...rest}>
      {emptyLabel !== undefined && <option value="">{emptyLabel}</option>}
      {orphan && <option value={value}>{value} (gelöscht)</option>}
      {categories.map((c) => <option key={c.id} value={c.name}>{c.name}</option>)}
      {allowCreate && <option value={NEW}>＋ Neue Kategorie…</option>}
    </select>
  );
}
