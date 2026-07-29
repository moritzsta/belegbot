import { config } from "dotenv";
import { defineConfig } from "drizzle-kit";

config({ path: ".env" });

export default defineConfig({
  // Nur belegbot-eigenes Schema migrieren — die Better-Auth-Tabellen
  // (user/session/account/verification) gehoeren dem TeamPortal und werden
  // hier NICHT verwaltet.
  schema: ["./src/lib/db/schema/receipts.ts", "./src/lib/db/schema/user-config.ts"],
  out: "./src/lib/db/migrations",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL_ADMIN ?? process.env.DATABASE_URL ?? "",
  },
});
