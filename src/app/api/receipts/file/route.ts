import { type NextRequest, NextResponse } from "next/server";

import { getBelegbotUser } from "@/lib/auth-utils";
import { getReceiptSignedUrl } from "@/lib/storage/minio";

// Authentifizierte Datei-Route: leitet auf eine kurzlebige presigned MinIO-URL
// um. So bleibt der Bucket privat und der S3-Secret serverseitig.
export async function GET(req: NextRequest): Promise<NextResponse> {
  const me = await getBelegbotUser();
  if (!me) {
    return NextResponse.json({ error: "Nicht authentifiziert" }, { status: 401 });
  }

  const path = req.nextUrl.searchParams.get("path");
  if (!path) {
    return NextResponse.json({ error: "Missing path" }, { status: 400 });
  }

  try {
    const url = await getReceiptSignedUrl(path);
    return NextResponse.redirect(url);
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Storage-Fehler" },
      { status: 500 },
    );
  }
}
