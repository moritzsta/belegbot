import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";

import { db } from "./db";

// belegbot teilt sich die Better-Auth-Tabellen mit dem TeamPortal (Shared DB).
// Eigenes Secret + eigene Domain → eigene, unabhaengige Cookies/Sessions.
const trustedOrigins = (process.env.BETTER_AUTH_TRUSTED_ORIGINS ?? "")
  .split(",")
  .map((origin) => origin.trim())
  .filter((origin) => origin.length > 0);

export const auth = betterAuth({
  trustedOrigins,
  database: drizzleAdapter(db, {
    provider: "pg",
  }),
  emailAndPassword: {
    enabled: true,
    // Nur bestehende Accounts (lena/moritz) — keine Selbstregistrierung.
    disableSignUp: true,
  },
  session: {
    expiresIn: 60 * 60 * 24 * 7, // 7 Tage
    updateAge: 60 * 60 * 24, // alle 24h erneuern
    cookieCache: {
      enabled: true,
      maxAge: 5 * 60, // 5 Minuten — spart DB-Roundtrip pro Page-Load
    },
  },
  plugins: [
    nextCookies(), // MUSS am Ende stehen
  ],
});

export type Session = typeof auth.$Infer.Session;
