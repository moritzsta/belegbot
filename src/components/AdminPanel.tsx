"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Save, Send } from "lucide-react";

import { saveTelegramId } from "@/lib/actions/admin";
import type { User } from "@/lib/types";
import { capitalize } from "@/lib/categories";

interface Props {
  currentUser: User;
  initialConfig: Record<User, number | null>;
}

export default function AdminPanel({ initialConfig }: Props) {
  return (
    <div className="admin-page">
      <div style={{ maxWidth: 620, margin: "0 auto" }}>
        <Link
          href="/"
          className="touch-target"
          style={{ display: "inline-flex", alignItems: "center", gap: 6, color: "var(--text-secondary)", fontSize: "0.85rem", marginBottom: 24, textDecoration: "none" }}
        >
          <ArrowLeft size={15} /> Zurück zur App
        </Link>

        <h1 style={{ fontFamily: "var(--font-heading)", fontWeight: 800, fontSize: "1.6rem", letterSpacing: "-0.02em", marginBottom: 6 }}>
          Admin
        </h1>
        <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem", marginBottom: 28 }}>
          Telegram-Zuordnung — welche Telegram-User-ID gehört zu welchem App-User.
        </p>

        <div className="card">
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
            <Send size={16} color="var(--accent)" />
            <h3 style={{ fontFamily: "var(--font-heading)", fontWeight: 600, fontSize: "1rem" }}>
              Telegram-User-IDs
            </h3>
          </div>
          <p style={{ color: "var(--text-muted)", fontSize: "0.8rem", marginBottom: 20 }}>
            Die ID findet ihr, indem der jeweilige User <b>@userinfobot</b> auf Telegram anschreibt.
            Leer lassen = Zugriff entziehen.
          </p>

          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {(["lena", "moritz"] as User[]).map((u) => (
              <IdRow key={u} owner={u} initial={initialConfig[u]} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function IdRow({ owner, initial }: { owner: User; initial: number | null }) {
  const [value, setValue] = useState(initial != null ? String(initial) : "");
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<{ ok: boolean; msg: string } | null>(null);

  const save = async () => {
    setSaving(true);
    setStatus(null);
    const res = await saveTelegramId(owner, value);
    setSaving(false);
    setStatus(res.ok ? { ok: true, msg: "Gespeichert" } : { ok: false, msg: res.error ?? "Fehler" });
  };

  return (
    <div className="admin-row">
      <div className="form-group" style={{ flex: 1 }}>
        <label className="form-label">{capitalize(owner)} — Telegram-User-ID</label>
        <input
          value={value}
          onChange={(e) => { setValue(e.target.value); setStatus(null); }}
          placeholder="z.B. 123456789"
          inputMode="numeric"
        />
      </div>
      <button onClick={save} className="btn btn-primary btn-sm" disabled={saving} style={{ height: 38 }}>
        <Save size={13} />
        {saving ? "…" : "Speichern"}
      </button>
      {status && (
        <span style={{ fontSize: "0.78rem", color: status.ok ? "var(--green)" : "var(--red)", paddingBottom: 10, whiteSpace: "nowrap" }}>
          {status.msg}
        </span>
      )}
    </div>
  );
}
