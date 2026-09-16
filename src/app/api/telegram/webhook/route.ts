import { type NextRequest, NextResponse } from "next/server";

import type { User } from "@/lib/types";
import { saveReceipt } from "@/lib/save-receipt";
import { extractReceipt, extractReceiptFromText } from "@/lib/receipt-extract";
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

// Fuehrende Flags (nur am Anfang der Nachricht):
//   g → gemeinsam, m → ausgelegt von Moritz, l → ausgelegt von Lena.
// Ab dem ersten Nicht-Flag ist der Rest die Notiz. So gilt z.B. das "g" in
// "500 g Mehl" NICHT als "gemeinsam".
function parseTokens(raw: string, owner: User): { isShared: boolean; paidBy: User; note: string | null } {
  let isShared = false;
  let paidBy: User = owner;
  const words = raw.trim().split(/\s+/).filter(Boolean);
  let i = 0;
  for (; i < words.length; i++) {
    const flag = words[i]!.toLowerCase();
    if (flag === "g") isShared = true;
    else if (flag === "m") paidBy = "moritz";
    else if (flag === "l") paidBy = "lena";
    else break;
  }
  return { isShared, paidBy, note: words.slice(i).join(" ").trim() || null };
}

const FLAGS = new Set(["g", "m", "l"]);

/** Beginnt der Text mit einem Flag (g/m/l)? Dann ist es sicher ein Beleg. */
function hasControlToken(raw: string): boolean {
  const first = raw.trim().split(/\s+/)[0]?.toLowerCase() ?? "";
  return FLAGS.has(first);
}

const HELP_TEXT = [
  "🧾 *BelegBot — so funktioniert's*",
  "",
  "💡 *Am schnellsten geht's in der App:* Beleg direkt mit der Handy-Kamera scannen, prüfen, speichern — https://belege.staebler.dev",
  "",
  "Alternativ hier per Telegram: Schick mir einen Beleg als *Foto*, *PDF* oder als *Text* — ich erkenne Händler, Betrag, Datum & Kategorie automatisch.",
  "",
  "*Flags* (optional, ganz am *Anfang* der Nachricht/Bildunterschrift):",
  "`g` — gemeinsame Ausgabe (sonst privat)",
  "`m` — ausgelegt von Moritz",
  "`l` — ausgelegt von Lena",
  "",
  "Der Rest der Nachricht wird als *Notiz* gespeichert.",
  "",
  "*Beispiel:*",
  "`g m Wocheneinkauf` → gemeinsam, von Moritz, Notiz „Wocheneinkauf“",
  "",
  "_Flags zählen nur am Anfang — so gilt z.B. das „g“ in „500 g Mehl“ nicht als gemeinsam. Groß-/Kleinschreibung egal._",
].join("\n");

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

  const rawText = (msg.caption ?? msg.text ?? "").trim();

  // 2. Befehle (/help, /start) → Hilfe anzeigen, niemals als Beleg speichern
  const command = rawText.split(/\s+/)[0]?.split("@")[0].toLowerCase() ?? "";
  if (command === "/help" || command === "/start") {
    await sendTelegramMessage(chatId, HELP_TEXT);
    return NextResponse.json({ ok: true });
  }

  // 3. User-Zuordnung (Laufzeit aus DB, gepflegt im Admin-Panel)
  const owner = await getTelegramOwner(msg.from?.id);
  if (!owner) {
    await sendTelegramMessage(chatId, "❌ Du bist nicht als Nutzer registriert.");
    return NextResponse.json({ ok: true });
  }

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

  // 5. Halb-intelligente Beleg-Erkennung: nur verarbeiten, wenn echte Daten da sind.
  //    Bild/PDF, ODER Text > 10 Zeichen, ODER ein Steuer-Token (g:/p:) → Beleg. Sonst ignorieren.
  const hasToken = hasControlToken(rawText);
  const isReceipt = fileId != null || rawText.length > 10 || hasToken;
  if (!isReceipt) {
    await sendTelegramMessage(
      chatId,
      "🤔 Das sieht nicht nach einem Beleg aus. Schick ein Foto/PDF oder beschreib den Beleg mit etwas mehr Text.\n\nℹ️ Hilfe: /help",
    );
    return NextResponse.json({ ok: true });
  }

  // 6. Tokens parsen (g:ja/nein, p:lena/moritz, Rest = Notiz)
  const { isShared, paidBy, note } = parseTokens(rawText, owner);

  try {
    if (!fileId) {
      // Reiner Text-Beleg → Felder aus dem Text extrahieren (falls beschreibender Text da ist)
      const ex = note ? await extractReceiptFromText(note) : null;
      const { id, receiptDate, dateIsFallback } = await saveReceipt({
        owner,
        paid_by: paidBy,
        is_shared: isShared,
        note,
        telegram_message_id: msg.message_id ?? null,
        telegram_user_id: msg.from?.id ?? null,
        receipt_date: ex?.receipt_date,
        merchant: ex?.merchant,
        total_amount: ex?.total_amount,
        category: ex?.category,
        vat_7_base: ex?.vat_7_base,
        vat_7_amount: ex?.vat_7_amount,
        vat_19_base: ex?.vat_19_base,
        vat_19_amount: ex?.vat_19_amount,
        extraction_confidence: ex?.extraction_confidence ?? "low",
      });
      await sendTelegramMessage(
        chatId,
        confirmation({ owner, paidBy, isShared, note, id, ...(ex ?? {}), receipt_date: receiptDate, date_is_fallback: dateIsFallback }),
      );
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
    const { id, receiptDate, dateIsFallback } = await saveReceipt({
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
      confirmation({ owner, paidBy, isShared, note, id, ...ex, receipt_date: receiptDate, date_is_fallback: dateIsFallback }),
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
  date_is_fallback?: boolean;
  category?: string;
  extraction_confidence?: string;
}): string {
  const dateLine = d.date_is_fallback
    ? `📅 Datum: ${formatDate(d.receipt_date ?? null)} _(heute — kein Datum erkannt)_`
    : `📅 Datum: ${formatDate(d.receipt_date ?? null)}`;
  const lines = [
    "✅ *Beleg gespeichert*",
    "",
    `📍 Bereich: ${d.isShared ? "👫 Gemeinsam" : "🔒 Privat"}`,
    `🏪 Händler: ${d.merchant ?? "—"}`,
    `💶 Betrag: ${formatEuro(d.total_amount ?? null)}`,
    dateLine,
    `🏷 Kategorie: ${d.category ?? "Andere"}`,
    `👤 Ausleger: ${capitalize(d.paidBy)}`,
  ];
  if (d.note) lines.push(`📝 Notiz: ${d.note}`);
  if (d.extraction_confidence === "low") lines.push("\n⚠️ _Niedrige Erkennungsqualität — bitte in der App prüfen._");
  lines.push("\n💡 _Bearbeiten: https://belege.staebler.dev/_");
  return lines.join("\n");
}
