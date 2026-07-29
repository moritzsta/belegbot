import postgres from "postgres";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";

const OLD = "http://192.168.178.61:8000";
const ANON = process.env.OLD_SUPABASE_ANON_KEY;
if (!ANON) throw new Error("OLD_SUPABASE_ANON_KEY fehlt");

const sql = postgres(process.env.DATABASE_URL_ADMIN, { ssl: "require", prepare: false });
const s3 = new S3Client({
  endpoint: process.env.BELEGBOT_S3_ENDPOINT,
  region: "us-east-1",
  forcePathStyle: true,
  credentials: {
    accessKeyId: process.env.BELEGBOT_S3_ACCESS_KEY,
    secretAccessKey: process.env.BELEGBOT_S3_SECRET_KEY,
  },
});
const BUCKET = process.env.BELEGBOT_S3_BUCKET;

const res = await fetch(`${OLD}/rest/v1/receipts?select=*`, {
  headers: { apikey: ANON, Authorization: `Bearer ${ANON}`, "Accept-Profile": "belegbot" },
});
if (!res.ok) throw new Error(`Fetch alte Belege fehlgeschlagen: ${res.status}`);
const receipts = await res.json();
console.log(`Geladen: ${receipts.length} Belege aus alter Supabase`);

let files = 0, inserted = 0, missingFiles = 0;
for (const r of receipts) {
  // Datei migrieren (alter public Bucket → MinIO, gleicher Key)
  if (r.file_path) {
    const fres = await fetch(`${OLD}/storage/v1/object/public/receipts/${r.file_path}`, {
      headers: { apikey: ANON },
    });
    if (fres.ok) {
      const buf = Buffer.from(await fres.arrayBuffer());
      const ct = fres.headers.get("content-type") || "application/octet-stream";
      await s3.send(new PutObjectCommand({ Bucket: BUCKET, Key: r.file_path, Body: buf, ContentType: ct }));
      files++;
    } else {
      console.warn(`  ⚠ Datei fehlt (${fres.status}): ${r.file_path}`);
      missingFiles++;
    }
  }

  const result = await sql`
    INSERT INTO belegbot_receipts
      (id, created_at, updated_at, owner, is_shared, paid_by, receipt_date, merchant,
       total_amount, category, vat_7_base, vat_7_amount, vat_19_base, vat_19_amount,
       note, telegram_message_id, telegram_user_id, file_path, extraction_confidence)
    VALUES
      (${r.id}, ${r.created_at}, ${r.updated_at}, ${r.owner}, ${r.is_shared}, ${r.paid_by},
       ${r.receipt_date}, ${r.merchant}, ${r.total_amount}, ${r.category},
       ${r.vat_7_base}, ${r.vat_7_amount}, ${r.vat_19_base}, ${r.vat_19_amount},
       ${r.note}, ${r.telegram_message_id}, ${r.telegram_user_id}, ${r.file_path},
       ${r.extraction_confidence})
    ON CONFLICT (id) DO NOTHING
    RETURNING id`;
  if (result.length > 0) inserted++;
}

const [{ n }] = await sql`SELECT count(*)::int AS n FROM belegbot_receipts`;
console.log(`Fertig: ${inserted} neu eingefuegt, ${files} Dateien migriert, ${missingFiles} Dateien fehlten.`);
console.log(`belegbot_receipts enthaelt jetzt ${n} Belege.`);
await sql.end();
