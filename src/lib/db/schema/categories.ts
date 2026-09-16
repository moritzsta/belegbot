// TK-0005: Beleg-Kategorien, vom Nutzer verwaltbar (vorher hartcodierte Liste).
// `receipts.category` bleibt bewusst Freitext OHNE Fremdschluessel: Umbenennen
// oder Loeschen einer Kategorie kann bestehende Belege nie brechen.
// Angelegt per scripts/migrate-tk0005-categories.mjs (idempotent, kein db:push).
import { pgTable, uuid, text, integer, timestamp, uniqueIndex } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

export const categories = pgTable(
  "belegbot_categories",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: text("name").notNull(),
    description: text("description"),
    // Hex-Farbe fuer Punkt, Balken, Diagramm
    color: text("color").default("#8A90B0").notNull(),
    // Schluessel aus dem kuratierten Icon-Set (src/components/CategoryIcon.tsx), optional
    icon: text("icon"),
    position: integer("position").default(0).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    // Eindeutigkeit case-insensitive: "Bioladen" und "bioladen" sind dieselbe Kategorie.
    uniqueIndex("belegbot_categories_name_lower_idx").on(sql`lower(${t.name})`),
  ],
);

export type CategoryRow = typeof categories.$inferSelect;
export type CategoryInsert = typeof categories.$inferInsert;
