"use client";

import { useCallback, useRef, useState } from "react";

import { discardScannedFile, scanReceiptFile, ScanError, type ScanResult } from "@/lib/receipt-scan-client";

// TK-0007: Zustand des Scan-Flows.
//   idle -> scanning (Upload + Claude) -> review (Dialog vorausgefuellt) -> idle
//                                     \-> error
// Wird der Dialog ohne Speichern geschlossen, raeumen wir die hochgeladene
// Datei wieder weg. Nach dem Speichern darf das NICHT passieren — dafuer der
// savedRef, weil ReceiptModal nach dem Speichern ebenfalls onClose ruft und
// der React-State in dem Moment noch der alte ist.

export type ScanState =
  | { status: "idle" }
  | { status: "scanning" }
  | { status: "error"; message: string }
  | { status: "review"; result: ScanResult };

export function useReceiptScan() {
  const [state, setState] = useState<ScanState>({ status: "idle" });
  const savedRef = useRef(false);

  const start = useCallback(async (file: File) => {
    savedRef.current = false;
    setState({ status: "scanning" });
    try {
      setState({ status: "review", result: await scanReceiptFile(file) });
    } catch (e) {
      const message = e instanceof ScanError ? e.message : "Beleg konnte nicht verarbeitet werden.";
      setState({ status: "error", message });
    }
  }, []);

  /** Beleg wurde gespeichert — Datei behalten, Flow beenden. */
  const finish = useCallback(() => {
    savedRef.current = true;
    setState({ status: "idle" });
  }, []);

  /** Dialog/Fehler geschlossen ohne Speichern — Datei verwerfen. */
  const dismiss = useCallback(() => {
    if (state.status === "review" && !savedRef.current) discardScannedFile(state.result.file_path);
    setState({ status: "idle" });
  }, [state]);

  return { state, start, finish, dismiss };
}
