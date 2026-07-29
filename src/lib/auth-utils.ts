import { headers } from "next/headers";

import { auth } from "./auth";
import { emailToUser } from "./users";
import type { User } from "./types";

export interface BelegbotUser {
  id: string;
  email: string;
  user: User;
  isAdmin: boolean;
}

// Admin ist moritz (verwaltet u.a. die Telegram-Zuordnungen). lena ist normaler User.
const isAdminUser = (user: User): boolean => user === "moritz";

/**
 * Liefert den eingeloggten belegbot-User (lena/moritz) aus der Session.
 * Wirft, wenn keine Session existiert oder die E-Mail keinem erlaubten
 * Account zugeordnet ist. Fuer Server Actions/Components.
 */
export async function requireBelegbotUser(): Promise<BelegbotUser> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) throw new Error("Nicht authentifiziert");
  const user = emailToUser(session.user.email);
  if (!user) throw new Error("Kein Zugriff auf belegbot");
  return { id: session.user.id, email: session.user.email, user, isAdmin: isAdminUser(user) };
}

/** Wie oben, aber null statt Fehler (fuer Server Components die redirecten). */
export async function getBelegbotUser(): Promise<BelegbotUser | null> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) return null;
  const user = emailToUser(session.user.email);
  if (!user) return null;
  return { id: session.user.id, email: session.user.email, user, isAdmin: isAdminUser(user) };
}

/** Erfordert Admin-Rechte. Wirft sonst. */
export async function requireAdmin(): Promise<BelegbotUser> {
  const me = await requireBelegbotUser();
  if (!me.isAdmin) throw new Error("Keine Admin-Rechte");
  return me;
}
