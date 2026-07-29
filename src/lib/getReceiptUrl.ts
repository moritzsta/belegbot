/** Liefert die authentifizierte File-Route-URL fuer einen Beleg (Client-safe). */
export function getReceiptUrl(filePath: string | null | undefined): string | null {
  if (!filePath) return null;
  return `/api/receipts/file?path=${encodeURIComponent(filePath)}`;
}
