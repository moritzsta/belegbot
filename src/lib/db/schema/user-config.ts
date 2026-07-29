// Laufzeit-Konfiguration pro belegbot-User (aktuell: Telegram-User-ID-Zuordnung).
// Wird zur Laufzeit über das Admin-Panel gepflegt, statt über Env-Variablen.
import { pgTable, text, bigint, timestamp } from "drizzle-orm/pg-core";

export const userConfig = pgTable("belegbot_user_config", {
  owner: text("owner").primaryKey(), // 'lena' | 'moritz'
  telegramUserId: bigint("telegram_user_id", { mode: "number" }).unique(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export type UserConfigRow = typeof userConfig.$inferSelect;
