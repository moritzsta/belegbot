#!/usr/bin/env node
/**
 * TK-0005: Tabelle belegbot_categories anlegen und mit den 14 bisherigen
 * Kategorien (inkl. Farben aus src/lib/categories.ts) befuellen.
 *
 * WARUM EIN EIGENES SCRIPT: belegbot teilt sich die Postgres-DB mit dem
 * TeamPortal. `drizzle-kit push` wuerde alle fremden Tabellen droppen wollen —
 * deshalb nur chirurgische, idempotente Statements gegen DATABASE_URL_ADMIN.
 * Mehrfaches Ausfuehren ist harmlos (IF NOT EXISTS / ON CONFLICT DO NOTHING).
 *
 * Aufruf (aus dem Projektroot, .env muss DATABASE_URL_ADMIN enthalten):
 *   node scripts/migrate-tk0005-categories.mjs
 */
import "dotenv/config";
import postgres from "postgres";

const URL = process.env.DATABASE_URL_ADMIN;
if (!URL) {
  console.error("DATABASE_URL_ADMIN fehlt in .env");
  process.exit(1);
}

// Muss mit CATEGORIES / CATEGORY_COLORS in src/lib/categories.ts uebereinstimmen.
const SEED = [
  ["Lebensmittel", "#4ECB71"],
  ["Restaurant & Café", "#E8A838"],
  ["Haushalt & Wohnen", "#3FC9C0"],
  ["Gesundheit & Apotheke", "#E85050"],
  ["Kleidung & Mode", "#A855F7"],
  ["Elektronik & Technik", "#3B82F6"],
  ["Transport & Auto", "#F97316"],
  ["Freizeit & Sport", "#EC4899"],
  ["Reisen & Urlaub", "#14B8A6"],
  ["Bildung & Bücher", "#F59E0B"],
  ["Beauty & Pflege", "#E879F9"],
  ["Versicherung & Finanzen", "#6366F1"],
  ["Sonstiges", "#8A90B0"],
  ["Andere", "#555A78"],
];

const sql = postgres(URL, { ssl: "require", prepare: false, max: 1 });

try {
  await sql`
    CREATE TABLE IF NOT EXISTS belegbot_categories (
      id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      name        text NOT NULL,
      description text,
      color       text NOT NULL DEFAULT '#8A90B0',
      icon        text,
      position    integer NOT NULL DEFAULT 0,
      created_at  timestamptz NOT NULL DEFAULT now(),
      updated_at  timestamptz NOT NULL DEFAULT now()
    )`;
  await sql`
    CREATE UNIQUE INDEX IF NOT EXISTS belegbot_categories_name_lower_idx
      ON belegbot_categories (lower(name))`;

  let inserted = 0;
  for (const [i, [name, color]] of SEED.entries()) {
    const res = await sql`
      INSERT INTO belegbot_categories (name, color, position)
      VALUES (${name}, ${color}, ${i})
      ON CONFLICT ((lower(name))) DO NOTHING`;
    inserted += res.count;
  }

  const [{ n }] = await sql`SELECT count(*)::int AS n FROM belegbot_categories`;
  console.log(`belegbot_categories: ${inserted} neu eingefuegt, ${n} insgesamt.`);
} finally {
  await sql.end();
}
