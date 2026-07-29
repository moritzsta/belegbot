import "server-only";

const API = "https://api.telegram.org";

function token(): string {
  const t = process.env.BELEGBOT_TELEGRAM_BOT_TOKEN;
  if (!t) throw new Error("Missing BELEGBOT_TELEGRAM_BOT_TOKEN");
  return t;
}

/** Prueft das von Telegram gesetzte Secret-Token (Header). */
export function verifyTelegramSecret(headerValue: string | null): boolean {
  const secret = process.env.BELEGBOT_TELEGRAM_WEBHOOK_SECRET;
  return !!secret && headerValue === secret;
}

/** file_id → file_path (via getFile). */
export async function getTelegramFilePath(fileId: string): Promise<string | null> {
  const res = await fetch(`${API}/bot${token()}/getFile?file_id=${encodeURIComponent(fileId)}`);
  if (!res.ok) return null;
  const json = (await res.json()) as { ok: boolean; result?: { file_path?: string } };
  return json.result?.file_path ?? null;
}

/** Laedt eine Telegram-Datei herunter → Base64 + Content-Type. */
export async function downloadTelegramFile(
  filePath: string,
): Promise<{ base64: string; contentType: string } | null> {
  const res = await fetch(`${API}/file/bot${token()}/${filePath}`);
  if (!res.ok) return null;
  const buf = Buffer.from(await res.arrayBuffer());
  const contentType = res.headers.get("content-type") || "application/octet-stream";
  return { base64: buf.toString("base64"), contentType };
}

/** Sendet eine Textnachricht (Markdown) an einen Chat. */
export async function sendTelegramMessage(chatId: number | string, text: string): Promise<void> {
  await fetch(`${API}/bot${token()}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, text, parse_mode: "Markdown" }),
  });
}
