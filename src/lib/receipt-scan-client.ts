// TK-0007: Client-Seite der In-App-Erfassung.
// Foto verkleinern -> an /api/receipts/scan schicken -> Extraktion zurueck.
// Bewusst ohne "use client"-Komponente: reine Funktionen, nutzbar aus jedem
// Client-Component (Scan-Button, spaeter Offline-Warteschlange).

import type { ExtractedReceipt } from "@/lib/receipt-extract";

export interface ScanResult {
  file_path: string;
  extraction: ExtractedReceipt;
}

// Laengste Kante nach dem Verkleinern. 1600px reicht Claude fuer Kassenbons
// locker und drueckt ein 4-8 MB Handyfoto auf ~300-500 KB.
const MAX_EDGE = 1600;
const JPEG_QUALITY = 0.82;
const MAX_UPLOAD_BYTES = 4 * 1024 * 1024;

export class ScanError extends Error {}

/** Scan-Flow: verkleinern, hochladen, Extraktion entgegennehmen. */
export async function scanReceiptFile(file: File): Promise<ScanResult> {
  if (typeof navigator !== "undefined" && navigator.onLine === false) {
    throw new ScanError("Keine Internetverbindung — bitte später erneut versuchen.");
  }
  const upload = file.type.startsWith("image/") ? await compressImage(file) : file;
  if (upload.size > MAX_UPLOAD_BYTES) {
    throw new ScanError("Datei zu gross (max. 4 MB). Bitte ein kleineres Foto oder PDF wählen.");
  }

  const form = new FormData();
  form.append("file", upload, upload.name);
  const res = await fetch("/api/receipts/scan", { method: "POST", body: form }).catch(() => null);
  if (!res) throw new ScanError("Upload fehlgeschlagen — Verbindung prüfen.");
  const body = (await res.json().catch(() => ({}))) as Partial<ScanResult> & { error?: string };
  if (!res.ok || !body.file_path || !body.extraction) {
    throw new ScanError(body.error ?? "Beleg konnte nicht verarbeitet werden.");
  }
  return { file_path: body.file_path, extraction: body.extraction };
}

/** Abbruch nach dem Scan: hochgeladene Datei wieder entfernen (best effort). */
export function discardScannedFile(filePath: string): void {
  fetch(`/api/receipts/scan?path=${encodeURIComponent(filePath)}`, { method: "DELETE" }).catch(() => {});
}

/**
 * Skaliert ein Bild auf MAX_EDGE und kodiert es als JPEG. EXIF-Drehung wird
 * vom Browser beim Dekodieren angewandt (imageOrientation: from-image), sonst
 * laegen iPhone-Fotos quer. Kann der Browser das Format nicht dekodieren
 * (z.B. HEIC in Chrome), geht das Original raus — der Server meldet dann
 * einen verstaendlichen Fehler.
 */
async function compressImage(file: File): Promise<File> {
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  } catch {
    return file;
  }
  const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height));
  const width = Math.round(bitmap.width * scale);
  const height = Math.round(bitmap.height * scale);

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  canvas.getContext("2d")?.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", JPEG_QUALITY));
  if (!blob) return file;
  return new File([blob], file.name.replace(/\.[^.]+$/, "") + ".jpg", { type: "image/jpeg" });
}
