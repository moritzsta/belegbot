import type { User } from "./types";

// Mapping Login-E-Mail → belegbot-User. Nur diese beiden Accounts haben Zugriff.
// Konfigurierbar via Env (sonst Default fuer lena). moritz' E-Mail MUSS via
// BELEGBOT_MORITZ_EMAIL gesetzt werden, sonst wird ihm der Zugriff verweigert.
const EMAIL_TO_USER: Record<string, User> = {
  [(process.env.BELEGBOT_LENA_EMAIL ?? "reising.lena@web.de").toLowerCase()]: "lena",
};

const moritzEmail = process.env.BELEGBOT_MORITZ_EMAIL?.toLowerCase();
if (moritzEmail) {
  EMAIL_TO_USER[moritzEmail] = "moritz";
}

/**
 * Liefert den belegbot-User zur Login-E-Mail — oder null, wenn die E-Mail
 * keinem der beiden erlaubten Accounts entspricht (Zugriff verweigert).
 */
export function emailToUser(email: string | null | undefined): User | null {
  if (!email) return null;
  return EMAIL_TO_USER[email.toLowerCase()] ?? null;
}
