"use client";

/**
 * TK-0006: PWA-Infrastruktur.
 *
 * - `PwaInstaller`      registriert /sw.js (im Root-Layout gemountet) und prueft
 *                       stuendlich auf Updates, damit ein Deploy zeitnah greift.
 * - `useInstallPrompt`  liefert, ob der native Install-Prompt verfuegbar ist.
 * - `InstallButton`     Icon-Button fuer Header/Login. Ohne nativen Prompt
 *                       (iOS Safari, Firefox) zeigt er eine Inline-Anleitung.
 *
 * Der beforeinstallprompt-Event feuert genau EINMAL und meist bevor irgendeine
 * Komponente gemountet ist — deshalb lebt der Store ausserhalb von React.
 * Muster uebernommen aus der gruenpflege-app (docs/PWA-BEST-PRACTICES.md dort).
 */

import { useCallback, useEffect, useState, useSyncExternalStore } from "react";
import { Download, MoreVertical, Plus, Share, Smartphone, X } from "lucide-react";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

type Snapshot = { hasPrompt: boolean; installed: boolean };

let deferredPrompt: BeforeInstallPromptEvent | null = null;
let installed = false;
// useSyncExternalStore vergleicht per Object.is — nur bei echter Aenderung
// eine neue Referenz erzeugen, sonst Endlosschleife.
let snapshot: Snapshot = { hasPrompt: false, installed: false };
const SERVER_SNAPSHOT: Snapshot = { hasPrompt: false, installed: false };
const listeners = new Set<() => void>();

function emit() {
  const next = { hasPrompt: !!deferredPrompt, installed };
  if (next.hasPrompt !== snapshot.hasPrompt || next.installed !== snapshot.installed) snapshot = next;
  listeners.forEach((l) => l());
}

if (typeof window !== "undefined") {
  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    deferredPrompt = e as BeforeInstallPromptEvent;
    emit();
  });
  window.addEventListener("appinstalled", () => {
    installed = true;
    deferredPrompt = null;
    emit();
  });
}

function subscribe(l: () => void) {
  listeners.add(l);
  return () => { listeners.delete(l); };
}

export function useInstallPrompt() {
  const state = useSyncExternalStore(subscribe, () => snapshot, () => SERVER_SNAPSHOT);

  const triggerInstall = useCallback(async (): Promise<"accepted" | "dismissed" | "unavailable"> => {
    const current = deferredPrompt;
    if (!current) return "unavailable";
    try {
      await current.prompt();
      const choice = await current.userChoice;
      deferredPrompt = null; // Prompt ist nur einmal nutzbar
      emit();
      return choice.outcome;
    } catch {
      return "unavailable";
    }
  }, []);

  return { ...state, triggerInstall };
}

function detectPlatform(): "ios" | "android" | "desktop" {
  const ua = navigator.userAgent;
  if (/iPad|iPhone|iPod/.test(ua)) return "ios";
  if (/Android/i.test(ua)) return "android";
  return "desktop";
}

/** Laeuft die App bereits installiert (ohne Browser-Chrome)? */
function isStandalone(): boolean {
  return (
    window.matchMedia?.("(display-mode: standalone)").matches ||
    (window.navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

/** Registriert den Service Worker. Rendert nichts. */
export function PwaInstaller() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    let timer: ReturnType<typeof setInterval> | null = null;
    navigator.serviceWorker
      .register("/sw.js", { scope: "/" })
      .then((reg) => { timer = setInterval(() => reg.update().catch(() => {}), 60 * 60 * 1000); })
      .catch(() => { /* best effort */ });
    return () => { if (timer) clearInterval(timer); };
  }, []);
  return null;
}

/**
 * Icon-Button "App installieren". Versteckt sich, wenn die App bereits als
 * PWA laeuft. Ohne nativen Prompt oeffnet er die plattformspezifische Anleitung.
 */
export function InstallButton({ style }: { style?: React.CSSProperties }) {
  const { hasPrompt, installed: isInstalled, triggerInstall } = useInstallPrompt();
  const [showHelp, setShowHelp] = useState(false);
  const [standalone, setStandalone] = useState(true); // bis zum Mount nichts zeigen

  useEffect(() => { setStandalone(isStandalone()); }, []);
  if (standalone || isInstalled) return null;

  const handleClick = async () => {
    if (!hasPrompt || (await triggerInstall()) === "unavailable") setShowHelp(true);
  };

  return (
    <>
      <button
        type="button"
        onClick={handleClick}
        className="btn btn-ghost btn-sm"
        title="App installieren"
        aria-label="App installieren"
        style={{ padding: "5px 8px", ...style }}
      >
        <Download size={15} />
      </button>
      {showHelp && <InstallHelpModal onClose={() => setShowHelp(false)} />}
    </>
  );
}

const NUM_STYLE: React.CSSProperties = {
  flexShrink: 0, width: 22, height: 22, borderRadius: "50%",
  background: "var(--accent-bg)", color: "var(--accent)",
  display: "flex", alignItems: "center", justifyContent: "center",
  fontSize: "0.75rem", fontWeight: 700, marginTop: 1,
};
const LIST_STYLE: React.CSSProperties = { listStyle: "none", display: "flex", flexDirection: "column", gap: 12 };
// Bewusst inline statt Klassen aus dem Mobile-Ticket, damit die Komponente
// unabhaengig von der Merge-Reihenfolge korrekt aussieht.
const HEADER_STYLE: React.CSSProperties = {
  display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12,
  padding: "18px 22px", borderBottom: "1px solid var(--border)",
};
const BODY_STYLE: React.CSSProperties = { padding: "20px 22px", display: "flex", flexDirection: "column", gap: 16 };
const CLOSE_STYLE: React.CSSProperties = {
  background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)",
  minWidth: 44, minHeight: 44, display: "flex", alignItems: "center", justifyContent: "center",
};
const INLINE_ICON: React.CSSProperties = { display: "inline", verticalAlign: "middle" };

function Step({ n, children }: { n: number; children: React.ReactNode }) {
  return (
    <li style={{ display: "flex", gap: 10, alignItems: "flex-start", fontSize: "0.9rem" }}>
      <span style={NUM_STYLE}>{n}</span>
      <span style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>{children}</span>
    </li>
  );
}

function InstallHelpModal({ onClose }: { onClose: () => void }) {
  const platform = detectPlatform();

  return (
    <div className="modal-backdrop" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal-content" style={{ maxWidth: 420 }}>
        <div style={HEADER_STYLE}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <Smartphone size={18} color="var(--accent)" />
            <h2 style={{ fontFamily: "var(--font-heading)", fontWeight: 700, fontSize: "1.05rem" }}>App installieren</h2>
          </div>
          <button onClick={onClose} aria-label="Schliessen" style={CLOSE_STYLE}>
            <X size={18} />
          </button>
        </div>
        <div style={BODY_STYLE}>
          {platform === "ios" && (
            <ol style={LIST_STYLE}>
              <Step n={1}>Diese Seite in <b>Safari</b> öffnen (nicht Chrome).</Step>
              <Step n={2}>Unten auf <Share size={15} style={INLINE_ICON} /> <b>Teilen</b> tippen.</Step>
              <Step n={3}><Plus size={15} style={INLINE_ICON} /> <b>Zum Home-Bildschirm</b> wählen.</Step>
              <Step n={4}>Oben rechts mit <b>Hinzufügen</b> bestätigen.</Step>
            </ol>
          )}
          {platform === "android" && (
            <ol style={LIST_STYLE}>
              <Step n={1}>Oben rechts auf <MoreVertical size={15} style={INLINE_ICON} /> tippen.</Step>
              <Step n={2}><b>App installieren</b> oder <b>Zum Startbildschirm hinzufügen</b> wählen.</Step>
              <Step n={3}>Mit <b>Installieren</b> bestätigen.</Step>
            </ol>
          )}
          {platform === "desktop" && (
            <ul style={{ ...LIST_STYLE, gap: 8, fontSize: "0.9rem" }}>
              <li><b>Chrome/Edge:</b> Symbol in der Adressleiste (Monitor mit Pfeil) → <b>Installieren</b>.</li>
              <li><b>Chrome-Menü:</b> <MoreVertical size={15} style={INLINE_ICON} /> → <b>App installieren</b>.</li>
              <li><b>Firefox:</b> unterstützt keine Desktop-Installation.</li>
            </ul>
          )}
          <p style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>
            Fehlt die Option? Seite einmal neu laden — der Browser braucht sie komplett, um sie als installierbar zu erkennen.
          </p>
          <button onClick={onClose} className="btn btn-ghost" style={{ width: "100%" }}>Verstanden</button>
        </div>
      </div>
    </div>
  );
}
