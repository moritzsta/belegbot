import { createClient } from '@supabase/supabase-js';

const IS_DEV = import.meta.env.DEV;

// Regel 1: Supabase-URL NIEMALS hardcoden
// Lokal:      Vite-Proxy /supabase → 192.168.178.61:8000
// Production: window.location.origin → Apache leitet /rest/, /auth/ etc. weiter
const SUPABASE_URL = IS_DEV
  ? 'http://localhost:5173/supabase'
  : window.location.origin;

// Regel 4: API-Keys NIEMALS hardcoden — kommt aus .env (VITE_SUPABASE_ANON_KEY)
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

if (!SUPABASE_ANON_KEY) {
  throw new Error(
    '[BelegBot] VITE_SUPABASE_ANON_KEY fehlt! Bitte .env Datei anlegen (siehe .env.example).'
  );
}

export const CONFIG = {
  SUPABASE_URL,
  SUPABASE_ANON_KEY,
  SCHEMA: 'belegbot',
  STORAGE_BUCKET: 'receipts',
  APP_NAME: 'BelegBot',
  APP_VERSION: '0.1.0',
} as const;

export const supabase = createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_ANON_KEY, {
  db: { schema: CONFIG.SCHEMA },
  auth: {
    autoRefreshToken: true,
    persistSession: true,
  },
});

/** Returns the public URL for a receipt file */
export function getReceiptUrl(filePath: string | null): string | null {
  if (!filePath) return null;
  const { data } = supabase.storage.from(CONFIG.STORAGE_BUCKET).getPublicUrl(filePath);
  return data.publicUrl;
}
