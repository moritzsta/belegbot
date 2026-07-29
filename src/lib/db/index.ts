import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { PeerCertificate } from "node:tls";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import * as schema from "./schema";

type DbInstance = ReturnType<typeof drizzle<typeof schema>>;

const DB_SERVER_IP = "178.105.135.102";

function loadCaCert(): string | undefined {
  // 1. Env-Variable (Base64-kodiert, fuer Vercel)
  if (process.env.DATABASE_CA_CERT) {
    try {
      return Buffer.from(process.env.DATABASE_CA_CERT, "base64").toString("utf-8");
    } catch {
      return process.env.DATABASE_CA_CERT;
    }
  }

  // 2. Lokale Datei als Fallback (Entwicklung)
  try {
    return readFileSync(join(process.cwd(), "certs", "db-ca.crt"), "utf-8");
  } catch {
    return undefined;
  }
}

/** Prueft ob das Server-Zertifikat die erwartete IP im SAN enthaelt */
function verifyServerIdentity(_host: string, cert: PeerCertificate): Error | undefined {
  const altNames = cert.subjectaltname ?? "";
  if (altNames.includes(`IP Address:${DB_SERVER_IP}`)) {
    return undefined;
  }
  return new Error(`DB-Server-Zertifikat enthaelt nicht die erwartete IP ${DB_SERVER_IP}`);
}

function createDb(): DbInstance {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error("Missing DATABASE_URL environment variable");
  }

  const caCert = loadCaCert();

  const client = postgres(url, {
    prepare: false,
    max: 5,
    connect_timeout: 15,
    idle_timeout: 300,
    max_lifetime: 1800,
    keep_alive: 60,
    ssl: caCert
      ? { rejectUnauthorized: true, ca: caCert, checkServerIdentity: verifyServerIdentity }
      : "require",
  });
  return drizzle(client, { schema });
}

// Survive HMR — cache on globalThis so hot reloads reuse the same pool
const globalForDb = globalThis as unknown as { _belegbotDb?: DbInstance };

export const db = new Proxy({} as DbInstance, {
  get(_target, prop, receiver) {
    if (!globalForDb._belegbotDb) {
      globalForDb._belegbotDb = createDb();
    }
    return Reflect.get(globalForDb._belegbotDb, prop, receiver);
  },
});
