import { type NextRequest, NextResponse } from "next/server";

import type { User } from "@/lib/types";
import { saveReceipt } from "@/lib/save-receipt";
import { extractReceipt } from "@/lib/receipt-extract";
import { getTelegramOwner } from "@/lib/user-config";
import {
  verifyTelegramSecret,
  getTelegramFilePath,
  downloadTelegramFile,
  sendTelegramMessage,
} from "@/lib/telegram";
import { formatEuro, formatDate, capitalize } from "@/lib/categories";

// Telegram → belegbot. Ersetzt den n8n-Workflow vollstaendig:
// Foto rein → Claude extrahiert → MinIO + DB → Bestaetigung zurueck.

interface TgMessage {
  message_id?: number;
  from?: { id?: number };
  chat?: { id?: number };
  caption?: string;
  text?: string;
  photo?: { file_id: string }[];
  document?: { file_id: string; mime_type?: string };
}

function parseTokens(raw: string, owner: User): { isShared: boolean; paidBy: User; note: string | null } {
  let isShared = false;
  let paidBy: User = owner;
  const rest: string[] = [];
  for (const token of raw.trim().split(/\s+/).filter(Boolean)) {
    const low = token.toLowerCase();
    if (low === "g:ja") isShared = true;
    else if (low === "g:nein") isShared = false;
    else if (low === "p:lena") paidBy = "lena";
    else if (low === "p:moritz") paidBy = "moritz";
    else rest.push(token);
  }
  return { isShared, paidBy, note: rest.join(" ").trim() || null };
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  // 1. Secret-Token pruefen
  if (!verifyTelegramSecret(req.headers.get("x-telegram-bot-api-secret-token"))) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  let update: { message?: TgMessage; edited_message?: TgMessage };
  try {
    update = await req.json();
  } catch {
    return NextResponse.json({ ok: true });
  }

  const msg = update.message ?? update.edited_message;
  const chatId = msg?.chat?.id;
  if (!msg || chatId == null) return NextResponse.json({ ok: true });

  // 2. User-Zuordnung (Laufzeit aus DB, gepflegt im Admin-Panel)
  const owner = await getTelegramOwner(msg.from?.id);
  if (!owner) {
    await sendTelegramMessage(chatId, "❌ Du bist nicht als Nutzer registriert.");
    return NextResponse.json({ ok: true });
  }

  // 3. Tokens parsen (g:ja/nein, p:lena/moritz, Rest = Notiz)
  const { isShared, paidBy, note } = parseTokens(msg.caption ?? msg.text ?? "", owner);

  // 4. Datei bestimmen
  let fileId: string | null = null;
  let ext = "jpg";
  let mimeHint = "image/jpeg";
  if (msg.photo && msg.photo.length > 0) {
    fileId = msg.photo[msg.photo.length - 1]!.file_id;
  } else if (msg.document) {
    fileId = msg.document.file_id;
    if (msg.document.mime_type === "application/pdf") {
      ext = "pdf";
      mimeHint = "application/pdf";
    } else if (msg.document.mime_type) {
      mimeHint = msg.document.mime_type;
    }
  }

  try {
    if (!fileId) {
      // Kein Anhang → Minimal-Datensatz
      const { id } = await saveReceipt({
        owner,
        paid_by: paidBy,
        is_shared: isShared,
        note,
        telegram_message_id: msg.message_id ?? null,
        telegram_user_id: msg.from?.id ?? null,
        extraction_confidence: "low",
      });
      await sendTelegramMessage(chatId, confirmation({ owner, paidBy, isShared, note, id }));
      return NextResponse.json({ ok: true });
    }

    // 5. Datei laden
    const path = await getTelegramFilePath(fileId);
    const dl = path ? await downloadTelegramFile(path) : null;
    if (!dl) {
      await sendTelegramMessage(chatId, "⚠️ Datei konnte nicht geladen werden.");
      return NextResponse.json({ ok: true });
    }
    const mediaType = dl.contentType.startsWith("image/") || dl.contentType === "application/pdf" ? dl.contentType : mimeHint;

    // 6. Claude-Extraktion
    const ex = await extractReceipt(dl.base64, mediaType);

    // 7. Speichern (Datei → MinIO + DB)
    const { id } = await saveReceipt({
      owner,
      paid_by: paidBy,
      is_shared: isShared,
      note,
      telegram_message_id: msg.message_id ?? null,
      telegram_user_id: msg.from?.id ?? null,
      receipt_date: ex.receipt_date,
      merchant: ex.merchant,
      total_amount: ex.total_amount,
      category: ex.category,
      vat_7_base: ex.vat_7_base,
      vat_7_amount: ex.vat_7_amount,
      vat_19_base: ex.vat_19_base,
      vat_19_amount: ex.vat_19_amount,
      extraction_confidence: ex.extraction_confidence,
      file: { data: dl.base64, contentType: mediaType, ext },
    });

    // 8. Bestaetigung
    await sendTelegramMessage(
      chatId,
      confirmation({ owner, paidBy, isShared, note, id, ...ex }),
    );
    return NextResponse.json({ ok: true });
  } catch (e) {
    await sendTelegramMessage(chatId, "⚠️ Fehler beim Speichern des Belegs.");
    console.error("[telegram] save failed:", e);
    return NextResponse.json({ ok: true });
  }
}

function confirmation(d: {
  owner: User;
  paidBy: User;
  isShared: boolean;
  note: string | null;
  id: string;
  merchant?: string | null;
  total_amount?: number | null;
  receipt_date?: string | null;
  category?: string;
  extraction_confidence?: string;
}): string {
  const lines = [
    "✅ *Beleg gespeichert*",
    "",
    `📍 Bereich: ${d.isShared ? "👫 Gemeinsam" : "🔒 Privat"}`,
    `🏪 Händler: ${d.merchant ?? "—"}`,
    `💶 Betrag: ${formatEuro(d.total_amount ?? null)}`,
    `📅 Datum: ${formatDate(d.receipt_date ?? null)}`,
    `🏷 Kategorie: ${d.category ?? "Andere"}`,
    `👤 Ausleger: ${capitalize(d.paidBy)}`,
  ];
  if (d.note) lines.push(`📝 Notiz: ${d.note}`);
  if (d.extraction_confidence === "low") lines.push("\n⚠️ _Niedrige Erkennungsqualität — bitte in der App prüfen._");
  lines.push("\n💡 _Bearbeiten: https://belege.staebler.dev/_");
  return lines.join("\n");
}
