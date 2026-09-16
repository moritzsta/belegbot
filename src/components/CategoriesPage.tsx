"use client";

import { useState } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";

import { useCategories } from "@/hooks/useCategories";
import { countReceiptsForCategory, createCategory, deleteCategory, updateCategory } from "@/lib/actions/categories";
import type { Category } from "@/lib/types";
import CategoryIcon, { CATEGORY_ICON_KEYS } from "./CategoryIcon";

// TK-0005: Verwaltungsseite fuer Beleg-Kategorien (beide Nutzer).

type FormState = { name: string; description: string; color: string; icon: string };
const EMPTY: FormState = { name: "", description: "", color: "#8A90B0", icon: "" };
const toForm = (c: Category): FormState => ({ name: c.name, description: c.description ?? "", color: c.color, icon: c.icon ?? "" });

export default function CategoriesPage() {
  const { categories, loading, refresh } = useCategories();
  const [editing, setEditing] = useState<Category | "new" | null>(null);

  return (
    <div className="animate-fade-in">
      <div className="page-header">
        <div>
          <h1 style={{ fontFamily: "var(--font-heading)", fontWeight: 700, fontSize: "1.5rem", letterSpacing: "-0.02em" }}>Kategorien</h1>
          <p style={{ color: "var(--text-secondary)", fontSize: "0.875rem", marginTop: 2 }}>
            {categories.length} Kategorien · gelten für alle Belege
          </p>
        </div>
        <div className="page-header-actions">
          <button onClick={() => setEditing("new")} className="btn btn-primary btn-sm" disabled={editing === "new"}>
            <Plus size={14} /> Neue Kategorie
          </button>
        </div>
      </div>

      {editing === "new" && (
        <CategoryForm initial={EMPTY} title="Neue Kategorie" onDone={() => { setEditing(null); refresh(); }} onCancel={() => setEditing(null)} />
      )}

      {loading ? (
        <div className="loading-center"><span className="loading-spinner" /> Kategorien werden geladen…</div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {categories.map((c) =>
            editing !== "new" && editing?.id === c.id ? (
              <CategoryForm key={c.id} initial={toForm(c)} category={c} title="Kategorie bearbeiten"
                onDone={() => { setEditing(null); refresh(); }} onCancel={() => setEditing(null)} />
            ) : (
              <CategoryRowView key={c.id} category={c} onEdit={() => setEditing(c)} onDeleted={refresh} />
            ),
          )}
        </div>
      )}
    </div>
  );
}

function CategoryRowView({ category: c, onEdit, onDeleted }: { category: Category; onEdit: () => void; onDeleted: () => void }) {
  const [confirm, setConfirm] = useState<number | null>(null); // Anzahl betroffener Belege
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const askDelete = async () => { setConfirm(await countReceiptsForCategory(c.name)); };
  const doDelete = async () => {
    setBusy(true);
    const res = await deleteCategory(c.id);
    setBusy(false);
    if (!res.ok) { setError(res.error); return; }
    onDeleted();
  };

  return (
    <div className="receipt-row" style={{ cursor: "default", flexWrap: "wrap" }}>
      <CategoryIcon icon={c.icon} color={c.color} size={18} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 500, fontSize: "0.9rem" }}>{c.name}</div>
        {c.description && <div style={{ fontSize: "0.78rem", color: "var(--text-muted)", marginTop: 2 }}>{c.description}</div>}
      </div>
      <div style={{ display: "flex", gap: 6 }}>
        <button onClick={onEdit} className="btn btn-ghost btn-sm" aria-label={`${c.name} bearbeiten`} style={{ padding: "5px 8px" }}><Pencil size={14} /></button>
        {confirm === null ? (
          <button onClick={askDelete} className="btn btn-ghost btn-sm" aria-label={`${c.name} löschen`} style={{ padding: "5px 8px" }}><Trash2 size={14} /></button>
        ) : (
          <button onClick={doDelete} className="btn btn-danger btn-sm" disabled={busy}>
            {busy ? "Löschen…" : "Wirklich löschen?"}
          </button>
        )}
      </div>
      {confirm !== null && (
        <div style={{ flexBasis: "100%", fontSize: "0.8rem", color: "var(--accent)", display: "flex", justifyContent: "space-between", gap: 8 }}>
          <span>
            {confirm === 0
              ? "Kein Beleg nutzt diese Kategorie."
              : `${confirm} ${confirm === 1 ? "Beleg behält" : "Belege behalten"} den Namen „${c.name}“ als Text — nichts geht verloren.`}
          </span>
          <button onClick={() => setConfirm(null)} className="btn btn-ghost btn-sm">Abbrechen</button>
        </div>
      )}
      {error && <div style={{ flexBasis: "100%", fontSize: "0.8rem", color: "var(--red)" }}>{error}</div>}
    </div>
  );
}

function CategoryForm({ initial, category, title, onDone, onCancel }: {
  initial: FormState; category?: Category; title: string; onDone: () => void; onCancel: () => void;
}) {
  const [form, setForm] = useState<FormState>(initial);
  const [renameReceipts, setRenameReceipts] = useState(true);
  const [affected, setAffected] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const renamed = !!category && form.name.trim() !== category.name;
  const set = (patch: Partial<FormState>) => setForm((f) => ({ ...f, ...patch }));

  // Beim ersten Umbenennen nachschauen, wie viele Belege betroffen waeren.
  const onNameChange = async (name: string) => {
    set({ name });
    if (category && affected === null && name.trim() !== category.name) {
      setAffected(await countReceiptsForCategory(category.name));
    }
  };

  const submit = async () => {
    setBusy(true);
    setError(null);
    const input = { name: form.name, description: form.description, color: form.color, icon: form.icon || null };
    const res = category ? await updateCategory(category.id, input, renameReceipts) : await createCategory(input);
    setBusy(false);
    if (!res.ok) { setError(res.error); return; }
    onDone();
  };

  return (
    <div className="card" style={{ marginBottom: 12, display: "flex", flexDirection: "column", gap: 14 }}>
      <h3 style={{ fontFamily: "var(--font-heading)", fontWeight: 600, fontSize: "0.95rem" }}>{title}</h3>
      <div className="grid-2">
        <div className="form-group">
          <label className="form-label">Name</label>
          <input value={form.name} maxLength={50} onChange={(e) => onNameChange(e.target.value)} placeholder="z.B. Bioladen" autoFocus />
        </div>
        <div className="form-group">
          <label className="form-label">Farbe</label>
          <input type="color" value={form.color} onChange={(e) => set({ color: e.target.value })} style={{ height: 40, padding: 4, cursor: "pointer" }} />
        </div>
        <div className="form-group" style={{ gridColumn: "1 / -1" }}>
          <label className="form-label">Beschreibung (optional)</label>
          <input value={form.description} maxLength={200} onChange={(e) => set({ description: e.target.value })} placeholder="Wofür ist diese Kategorie gedacht?" />
        </div>
        <div className="form-group" style={{ gridColumn: "1 / -1" }}>
          <label className="form-label">Icon (optional)</label>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            <IconChoice selected={form.icon === ""} onClick={() => set({ icon: "" })} label="Kein Icon">
              <CategoryIcon icon={null} color={form.color} />
            </IconChoice>
            {CATEGORY_ICON_KEYS.map((key) => (
              <IconChoice key={key} selected={form.icon === key} onClick={() => set({ icon: key })} label={key}>
                <CategoryIcon icon={key} color={form.color} size={18} />
              </IconChoice>
            ))}
          </div>
        </div>
      </div>

      {renamed && affected !== null && affected > 0 && (
        <label style={{ display: "flex", gap: 10, alignItems: "flex-start", fontSize: "0.85rem", color: "var(--accent)", cursor: "pointer" }}>
          <input type="checkbox" checked={renameReceipts} onChange={(e) => setRenameReceipts(e.target.checked)} style={{ width: "auto", marginTop: 3 }} />
          <span>
            {affected} {affected === 1 ? "Beleg trägt" : "Belege tragen"} noch „{category!.name}“ — auf „{form.name.trim()}“ umbenennen?
            Ohne Häkchen behalten sie den alten Namen.
          </span>
        </label>
      )}

      {error && <div style={{ fontSize: "0.85rem", color: "var(--red)" }}>{error}</div>}

      <div className="modal-actions" style={{ justifyContent: "flex-end" }}>
        <button onClick={onCancel} className="btn btn-ghost btn-sm">Abbrechen</button>
        <button onClick={submit} className="btn btn-primary btn-sm" disabled={busy || !form.name.trim()}>
          {busy ? "Speichern…" : "Speichern"}
        </button>
      </div>
    </div>
  );
}

function IconChoice({ selected, onClick, label, children }: { selected: boolean; onClick: () => void; label: string; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={label}
      aria-label={label}
      aria-pressed={selected}
      className="touch-target"
      style={{
        width: 40, height: 40, borderRadius: 10,
        display: "flex", alignItems: "center", justifyContent: "center",
        background: selected ? "var(--accent-bg)" : "var(--bg-input)",
        border: `1px solid ${selected ? "var(--accent)" : "var(--border)"}`,
        cursor: "pointer",
      }}
    >
      {children}
    </button>
  );
}
