import "server-only";
import { eq } from "drizzle-orm";

import { db } from "@/lib/db";
import { userConfig } from "@/lib/db/schema/user-config";
import type { User } from "@/lib/types";

/** Telegram-User-ID → belegbot-User (Laufzeit-Zuordnung aus der DB). */
export async function getTelegramOwner(telegramId: number | undefined): Promise<User | null> {
  if (telegramId == null) return null;
  const [row] = await db
    .select({ owner: userConfig.owner })
    .from(userConfig)
    .where(eq(userConfig.telegramUserId, telegramId))
    .limit(1);
  return (row?.owner as User) ?? null;
}

/** Aktuelle Zuordnung beider User (fuers Admin-Panel). */
export async function getTelegramConfig(): Promise<Record<User, number | null>> {
  const rows = await db
    .select({ owner: userConfig.owner, tg: userConfig.telegramUserId })
    .from(userConfig);
  const map: Record<User, number | null> = { lena: null, moritz: null };
  for (const r of rows) {
    if (r.owner === "lena" || r.owner === "moritz") map[r.owner] = r.tg;
  }
  return map;
}

/** Setzt/loescht die Telegram-User-ID eines Users (Upsert). */
export async function setTelegramId(owner: User, telegramId: number | null): Promise<void> {
  await db
    .insert(userConfig)
    .values({ owner, telegramUserId: telegramId, updatedAt: new Date() })
    .onConflictDoUpdate({
      target: userConfig.owner,
      set: { telegramUserId: telegramId, updatedAt: new Date() },
    });
}
