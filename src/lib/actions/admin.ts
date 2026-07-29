"use server";

import { requireAdmin } from "@/lib/auth-utils";
import { getTelegramConfig, setTelegramId } from "@/lib/user-config";
import type { User } from "@/lib/types";

/** Liest die aktuelle Telegram-Zuordnung (admin-only). */
export async function loadTelegramConfig(): Promise<Record<User, number | null>> {
  await requireAdmin();
  return getTelegramConfig();
}

/** Setzt/loescht die Telegram-User-ID eines Users (admin-only). */
export async function saveTelegramId(owner: User, value: string): Promise<{ ok: boolean; error?: string }> {
  await requireAdmin();
  const trimmed = value.trim();
  if (trimmed === "") {
    await setTelegramId(owner, null);
    return { ok: true };
  }
  if (!/^\d+$/.test(trimmed)) {
    return { ok: false, error: "Telegram-User-ID muss eine Zahl sein." };
  }
  await setTelegramId(owner, Number(trimmed));
  return { ok: true };
}
