import "server-only";
import { DeleteObjectCommand, GetObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

// S3-Client gegen das self-hosted MinIO auf dem Hetzner-Server.
// Oeffentlich erreichbar unter https://s3.aurora-showcase.de (nginx-Proxy).
// forcePathStyle: true ist fuer MinIO Pflicht (keine virtual-hosted Buckets).
const ENDPOINT = process.env.BELEGBOT_S3_ENDPOINT ?? "https://s3.aurora-showcase.de";
export const RECEIPTS_BUCKET = process.env.BELEGBOT_S3_BUCKET ?? "belegbot";

let cached: S3Client | null = null;

function client(): S3Client {
  if (cached) return cached;
  const accessKeyId = process.env.BELEGBOT_S3_ACCESS_KEY;
  const secretAccessKey = process.env.BELEGBOT_S3_SECRET_KEY;
  if (!accessKeyId || !secretAccessKey) {
    throw new Error("Missing BELEGBOT_S3_ACCESS_KEY / BELEGBOT_S3_SECRET_KEY");
  }
  cached = new S3Client({
    endpoint: ENDPOINT,
    region: process.env.BELEGBOT_S3_REGION ?? "us-east-1",
    forcePathStyle: true,
    credentials: { accessKeyId, secretAccessKey },
  });
  return cached;
}

/** Presigned GET-URL fuer einen Beleg (privat, laeuft nach `expiresIn` Sek. ab). */
export async function getReceiptSignedUrl(key: string, expiresIn = 3600): Promise<string> {
  const cmd = new GetObjectCommand({ Bucket: RECEIPTS_BUCKET, Key: key });
  return getSignedUrl(client(), cmd, { expiresIn });
}

/** Laedt einen Beleg hoch (z.B. bei manueller Erfassung ueber die Website). */
export async function uploadReceiptFile(
  key: string,
  body: Buffer | Uint8Array,
  contentType: string,
): Promise<string> {
  await client().send(
    new PutObjectCommand({ Bucket: RECEIPTS_BUCKET, Key: key, Body: body, ContentType: contentType }),
  );
  return key;
}

/** Roh-Stream/Bytes eines Belegs (fuer die authentifizierte File-Route). */
export async function getReceiptObject(
  key: string,
): Promise<{ body: ReadableStream | null; contentType: string | undefined }> {
  const res = await client().send(new GetObjectCommand({ Bucket: RECEIPTS_BUCKET, Key: key }));
  return {
    body: (res.Body as ReadableStream) ?? null,
    contentType: res.ContentType,
  };
}

/** Loescht einen Beleg (z.B. Scan abgebrochen, bevor der Beleg gespeichert wurde). */
export async function deleteReceiptFile(key: string): Promise<void> {
  await client().send(new DeleteObjectCommand({ Bucket: RECEIPTS_BUCKET, Key: key }));
}
