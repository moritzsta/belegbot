"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle } from "lucide-react";

import { authClient } from "@/lib/auth-client";
import { createReceipt as createReceiptAction } from "@/lib/actions/receipts";
import { useReceiptScan } from "@/hooks/useReceiptScan";
import type { ScanResult } from "@/lib/receipt-scan-client";
import type { User, Area, Receipt } from "@/lib/types";
import Layout from "./Layout";
import Dashboard from "./Dashboard";
import ReceiptList from "./ReceiptList";
import MonthlyOverview from "./MonthlyOverview";
import Statistics from "./Statistics";
import ReceiptModal from "./ReceiptModal";
import ScanButton from "./ScanButton";

type Page = "dashboard" | "list" | "month" | "stats";

/** Scan-Ergebnis -> Vorbelegung fuer den Beleg-Dialog (Felder heissen gleich). */
const toPrefill = (r: ScanResult): Partial<Receipt> => ({ ...r.extraction, file_path: r.file_path });

export default function AppShell({ currentUser, isAdmin }: { currentUser: User; isAdmin: boolean }) {
  const router = useRouter();
  const [area, setArea] = useState<Area>("private");
  const [page, setPage] = useState<Page>("dashboard");
  // Nach dem Speichern die aktive Seite neu mounten, damit sie frisch laedt.
  const [refreshKey, setRefreshKey] = useState(0);
  const scan = useReceiptScan();

  const createReceipt = useCallback(async (data: Partial<Receipt>): Promise<boolean> => {
    try {
      const ok = await createReceiptAction(data);
      if (ok) setRefreshKey((k) => k + 1);
      return ok;
    } catch {
      return false;
    }
  }, []);

  const createScanned = useCallback(async (data: Partial<Receipt>): Promise<boolean> => {
    const ok = await createReceipt(data);
    if (ok) scan.finish();
    return ok;
  }, [createReceipt, scan]);

  const handleLogout = async () => {
    await authClient.signOut();
    router.push("/login");
    router.refresh();
  };

  const pageKey = `${page}-${refreshKey}`;

  return (
    <Layout
      currentUser={currentUser}
      area={area}
      page={page}
      isAdmin={isAdmin}
      onAreaChange={(a) => { setArea(a); setPage("dashboard"); }}
      onPageChange={setPage}
      onLogout={handleLogout}
    >
      {page === "dashboard" && (
        <Dashboard
          key={pageKey}
          currentUser={currentUser}
          area={area}
          onNavigateToList={() => setPage("list")}
          onCreate={createReceipt}
        />
      )}
      {page === "list" && <ReceiptList key={pageKey} currentUser={currentUser} area={area} />}
      {page === "month" && <MonthlyOverview key={pageKey} area={area} />}
      {page === "stats" && <Statistics key={pageKey} currentUser={currentUser} area={area} />}

      {/* TK-0007: Beleg per Kamera/Datei erfassen */}
      <ScanButton area={area} disabled={scan.state.status === "scanning"} onFile={scan.start} />

      {scan.state.status === "scanning" && (
        <div className="modal-backdrop" style={{ alignItems: "center" }}>
          <div className="loading-center" style={{ color: "var(--text-primary)" }}>
            <span className="loading-spinner" /> Beleg wird gelesen…
          </div>
        </div>
      )}

      {scan.state.status === "error" && (
        <div className="modal-backdrop" style={{ alignItems: "center" }} onClick={scan.dismiss}>
          <div className="card" style={{ maxWidth: 380, display: "flex", flexDirection: "column", gap: 14 }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: "flex", gap: 10, alignItems: "flex-start", color: "var(--red)", fontSize: "0.9rem" }}>
              <AlertCircle size={18} style={{ flexShrink: 0, marginTop: 2 }} />
              <span>{scan.state.message}</span>
            </div>
            <button onClick={scan.dismiss} className="btn btn-ghost">Schließen</button>
          </div>
        </div>
      )}

      {scan.state.status === "review" && (
        <ReceiptModal
          isNew
          prefill={toPrefill(scan.state.result)}
          onClose={scan.dismiss}
          onCreate={createScanned}
          defaultArea={area}
          defaultUser={currentUser}
        />
      )}
    </Layout>
  );
}
