import { type NextRequest, NextResponse } from "next/server";

import { saveReceipt } from "@/lib/save-receipt";

// Maschinen-zu-Maschinen Ingest (Secret-Auth) — z.B. externe Uploader.
// Der Telegram-Bot laeuft ueber /api/telegram/webhook.
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

  const owner = body.owner;
  if (owner !== "lena" && owner !== "moritz") {
    return NextResponse.json({ error: "owner must be 'lena' or 'moritz'" }, { status: 400 });
  }

  try {
    const { id, filePath, receiptDate, dateIsFallback } = await saveReceipt({
      owner,
      paid_by: body.paid_by === "lena" || body.paid_by === "moritz" ? body.paid_by : owner,
      is_shared: Boolean(body.is_shared),
      receipt_date: (body.receipt_date as string) ?? null,
      merchant: (body.merchant as string) ?? null,
      total_amount: (body.total_amount as number) ?? null,
      category: (body.category as string) ?? null,
      vat_7_base: (body.vat_7_base as number) ?? null,
      vat_7_amount: (body.vat_7_amount as number) ?? null,
      vat_19_base: (body.vat_19_base as number) ?? null,
      vat_19_amount: (body.vat_19_amount as number) ?? null,
      note: (body.note as string) ?? null,
      telegram_message_id: body.telegram_message_id != null ? Number(body.telegram_message_id) : null,
      telegram_user_id: body.telegram_user_id != null ? Number(body.telegram_user_id) : null,
      extraction_confidence: (body.extraction_confidence as string) ?? null,
      file: (body.file as { data: string; contentType?: string; ext?: string }) ?? null,
    });
    return NextResponse.json({
      ok: true,
      id,
      file_path: filePath,
      receipt_date: receiptDate,
      date_is_fallback: dateIsFallback,
    });
  } catch (e) {
    return NextResponse.json(
      { error: "Speichern fehlgeschlagen: " + (e instanceof Error ? e.message : "unbekannt") },
      { status: 500 },
    );
  }
}
