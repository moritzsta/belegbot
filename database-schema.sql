-- ============================================================
--  BelegBot Datenbankschema
--  Schema: belegbot
--  Ausführen in: docker exec -it supabase-db psql -U supabase_admin -d postgres
-- ============================================================

-- ── Tabelle: receipts ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS belegbot.receipts (
    id                    UUID          DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at            TIMESTAMPTZ   DEFAULT now() NOT NULL,
    updated_at            TIMESTAMPTZ   DEFAULT now() NOT NULL,

    -- Eigentümer und Bereich
    owner                 TEXT          NOT NULL CHECK (owner IN ('lena', 'moritz')),
    is_shared             BOOLEAN       DEFAULT false NOT NULL,
    paid_by               TEXT          NOT NULL CHECK (paid_by IN ('lena', 'moritz')),

    -- KI-extrahierte Felder
    receipt_date          DATE,
    merchant              TEXT,
    total_amount          NUMERIC(10, 2),
    category              TEXT          DEFAULT 'Andere' NOT NULL,

    -- MwSt (optional)
    vat_7_base            NUMERIC(10, 2),
    vat_7_amount          NUMERIC(10, 2),
    vat_19_base           NUMERIC(10, 2),
    vat_19_amount         NUMERIC(10, 2),

    -- Metadaten
    note                  TEXT,
    telegram_message_id   BIGINT,
    telegram_user_id      BIGINT,
    file_path             TEXT,

    -- Qualität der KI-Extraktion
    extraction_confidence TEXT          DEFAULT 'medium' CHECK (extraction_confidence IN ('high', 'medium', 'low'))
);

-- ── Automatisches updated_at ───────────────────────────────
CREATE OR REPLACE FUNCTION belegbot.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER receipts_updated_at
    BEFORE UPDATE ON belegbot.receipts
    FOR EACH ROW EXECUTE FUNCTION belegbot.set_updated_at();

-- ── Indizes ───────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_receipts_owner        ON belegbot.receipts (owner);
CREATE INDEX IF NOT EXISTS idx_receipts_is_shared    ON belegbot.receipts (is_shared);
CREATE INDEX IF NOT EXISTS idx_receipts_date         ON belegbot.receipts (receipt_date DESC);
CREATE INDEX IF NOT EXISTS idx_receipts_category     ON belegbot.receipts (category);
CREATE INDEX IF NOT EXISTS idx_receipts_paid_by      ON belegbot.receipts (paid_by);

-- ── Row Level Security ────────────────────────────────────
ALTER TABLE belegbot.receipts ENABLE ROW LEVEL SECURITY;

-- Im MVP: anon darf alles (keine Auth-Logik in der App)
-- Für Produktion durch nutzerspezifische Policies ersetzen
CREATE POLICY "allow_all_anon" ON belegbot.receipts
    FOR ALL TO anon USING (true) WITH CHECK (true);

CREATE POLICY "allow_all_authenticated" ON belegbot.receipts
    FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ── Berechtigungen ────────────────────────────────────────
GRANT SELECT                       ON ALL TABLES    IN SCHEMA belegbot TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES  IN SCHEMA belegbot TO authenticated;
GRANT ALL                          ON ALL TABLES    IN SCHEMA belegbot TO service_role;
GRANT USAGE                        ON ALL SEQUENCES IN SCHEMA belegbot TO anon, authenticated;
GRANT ALL                          ON ALL SEQUENCES IN SCHEMA belegbot TO service_role;

-- ── Storage Bucket ────────────────────────────────────────
-- Muss in der Supabase-UI oder via API angelegt werden!
-- Name: receipts
-- Public: true  (damit die App Belege anzeigen kann)

-- ── Beispieldaten (optional zum Testen) ──────────────────
-- INSERT INTO belegbot.receipts (owner, is_shared, paid_by, receipt_date, merchant, total_amount, category, note)
-- VALUES
--     ('lena', false, 'lena', '2025-01-15', 'Rewe', 42.80, 'Lebensmittel', NULL),
--     ('moritz', false, 'moritz', '2025-01-16', 'Saturn', 129.99, 'Elektronik & Technik', 'Ladekabel'),
--     ('lena', true, 'lena', '2025-01-18', 'Restaurant Bella', 78.50, 'Restaurant & Café', 'Pizzaabend'),
--     ('moritz', true, 'moritz', '2025-01-20', 'Bauhaus', 56.30, 'Haushalt & Wohnen', 'Baumarkt für Küche');
