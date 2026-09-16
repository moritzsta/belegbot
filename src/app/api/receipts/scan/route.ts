import { type NextRequest, NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";

import { db } from "@/lib/db";
import { receipts } from "@/lib/db/schema/receipts";
import { getBelegbotUser } from "@/lib/auth-utils";
import { extractReceipt, type ExtractedReceipt } from "@/lib/receipt-extract";
import { storeReceiptFile } from "@/lib/save-receipt";
import { deleteReceiptFile } from "@/lib/storage/minio";

// TK-0007: In-App-Erfassung. Die App schickt ein (clientseitig verkleinertes)
// Foto oder PDF. Wir legen die Datei in MinIO ab und lassen Claude die Felder
// auslesen — gespeichert wird der Beleg erst, wenn der Nutzer den vorausgefuellten
// Dialog bestaetigt (createReceipt mit file_path). Bricht er ab, raeumt DELETE
// die Datei wieder weg.
//
// Bewusst eine API-Route statt Server Action: kein Body-Limit-Gefummel, und
// spaeter aus einer Offline-Warteschlange replay-bar.

const ALLOWED_TYPES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
  "application/pdf": "pdf",
};
// Vercel akzeptiert ~4.5 MB Request-Body; der Client verkleinert Fotos vorher.
const MAX_BYTES = 4 * 1024 * 1024;

export interface ScanResponse {
  file_path: string;
  extraction: ExtractedReceipt;
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  const me = await getBelegbotUser();
  if (!me) return NextResponse.json({ error: "Nicht authentifiziert" }, { status: 401 });

  const file = await readFile(req);
  if ("error" in file) return NextResponse.json({ error: file.error }, { status: file.status });

  try {
    const buffer = Buffer.from(await file.blob.arrayBuffer());
    const [filePath, extraction] = await Promise.all([
      storeReceiptFile(me.user, buffer, file.type, ALLOWED_TYPES[file.type]),
      extractReceipt(buffer.toString("base64"), file.type),
    ]);
    const body: ScanResponse = { file_path: filePath, extraction };
    return NextResponse.json(body);
  } catch (e) {
    console.error("[scan] failed:", e);
    return NextResponse.json({ error: "Beleg konnte nicht verarbeitet werden." }, { status: 500 });
  }
}

/** Abbruch: Datei nur loeschen, wenn sie dem User gehoert und kein Beleg sie referenziert. */
export async function DELETE(req: NextRequest): Promise<NextResponse> {
  const me = await getBelegbotUser();
  if (!me) return NextResponse.json({ error: "Nicht authentifiziert" }, { status: 401 });

  const path = req.nextUrl.searchParams.get("path") ?? "";
  if (!path.startsWith(`${me.user}/`)) {
    return NextResponse.json({ error: "Kein Zugriff" }, { status: 403 });
  }
  const [used] = await db
    .select({ id: receipts.id })
    .from(receipts)
    .where(and(eq(receipts.filePath, path), eq(receipts.owner, me.user)))
    .limit(1);
  if (used) return NextResponse.json({ error: "Datei ist einem Beleg zugeordnet" }, { status: 409 });

  await deleteReceiptFile(path).catch(() => { /* best effort */ });
  return NextResponse.json({ ok: true });
}

type ReadResult = { blob: Blob; type: string } | { error: string; status: number };

/** Multipart-Feld "file" lesen und Typ/Groesse pruefen. */
async function readFile(req: NextRequest): Promise<ReadResult> {
  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return { error: "Ungueltiger Upload", status: 400 };
  }
  const blob = form.get("file");
  if (!(blob instanceof Blob) || blob.size === 0) return { error: "Keine Datei", status: 400 };
  if (!ALLOWED_TYPES[blob.type]) {
    return { error: "Format nicht unterstuetzt (JPEG, PNG, WebP, GIF oder PDF).", status: 415 };
  }
  if (blob.size > MAX_BYTES) return { error: "Datei zu gross (max. 4 MB).", status: 413 };
  return { blob, type: blob.type };
}
