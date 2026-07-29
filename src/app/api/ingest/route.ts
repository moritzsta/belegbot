import { type NextRequest, NextResponse } from "next/server";

import { db } from "@/lib/db";
import { receipts, type ReceiptInsert } from "@/lib/db/schema/receipts";
import { uploadReceiptFile } from "@/lib/storage/minio";

// Maschinen-zu-Maschinen Ingest fuer den n8n-Telegram-Workflow.
// Ein einziger Call: optionales Base64-File → MinIO, dann Insert in die DB.
// Auth ueber statisches Secret (kein Better-Auth-Session-Kontext).

const numStr = (v: unknown): string | null => {
  if (v == null || v === "") return null;
  const n = typeof v === "number" ? v : parseFloat(String(v));
  return Number.isFinite(n) ? String(n) : null;
};

type IngestFile = { data: string; contentType?: string; ext?: string };

export async function POST(req: NextRequest): Promise<NextResponse> {
  const secret = process.env.BELEGBOT_INGEST_SECRET;
  if (!secret || req.headers.get("x-belegbot-ingest-key") !== secret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const owner = String(body.owner ?? "");
  if (owner !== "lena" && owner !== "moritz") {
    return NextResponse.json({ error: "owner must be 'lena' or 'moritz'" }, { status: 400 });
  }
  const paidBy = body.paid_by === "lena" || body.paid_by === "moritz" ? body.paid_by : owner;

  // Optionales File → MinIO
  let filePath: string | null = null;
  const file = body.file as IngestFile | undefined;
  if (file?.data) {
    try {
      const buffer = Buffer.from(file.data, "base64");
      const ext = (file.ext ?? "jpg").replace(/[^a-z0-9]/gi, "").toLowerCase() || "jpg";
      const stamp = new Date().toISOString().replace(/[:.]/g, "-");
      const key = `${owner}/${stamp}.${ext}`;
      await uploadReceiptFile(key, buffer, file.contentType ?? "application/octet-stream");
      filePath = key;
    } catch (e) {
      return NextResponse.json(
        { error: "Upload fehlgeschlagen: " + (e instanceof Error ? e.message : "unbekannt") },
        { status: 500 },
      );
    }
  }

  const values: ReceiptInsert = {
    owner,
    paidBy,
    isShared: Boolean(body.is_shared),
    receiptDate: (body.receipt_date as string) || null,
    merchant: (body.merchant as string) || null,
    totalAmount: numStr(body.total_amount),
    category: (body.category as string) || "Andere",
    vat7Base: numStr(body.vat_7_base),
    vat7Amount: numStr(body.vat_7_amount),
    vat19Base: numStr(body.vat_19_base),
    vat19Amount: numStr(body.vat_19_amount),
    note: (body.note as string) || null,
    telegramMessageId: body.telegram_message_id != null ? Number(body.telegram_message_id) : null,
    telegramUserId: body.telegram_user_id != null ? Number(body.telegram_user_id) : null,
    filePath,
    extractionConfidence: (body.extraction_confidence as string) || "medium",
  };

  try {
    const [row] = await db.insert(receipts).values(values).returning({ id: receipts.id });
    return NextResponse.json({ ok: true, id: row?.id, file_path: filePath });
  } catch (e) {
    return NextResponse.json(
      { error: "DB-Insert fehlgeschlagen: " + (e instanceof Error ? e.message : "unbekannt") },
      { status: 500 },
    );
  }
}
