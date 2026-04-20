/**
 * Sanitise un code scanné (USB-HID / clavier).
 * - Retire tout caractère non alphanumérique sauf tiret et underscore
 * - Tronque à 64 caractères pour éviter les payloads anormalement longs
 * Retourne null si le résultat est vide après nettoyage.
 */
export function sanitizeBarcode(raw: string): string | null {
  if (typeof raw !== "string") return null;
  const cleaned = raw.trim().replace(/[^A-Za-z0-9\-_]/g, "").slice(0, 64);
  return cleaned.length > 0 ? cleaned : null;
}

/** Generate a valid EAN-13 barcode string (client-side, for preview only). */
export function generateEAN13(): string {
  const digits: number[] = Array.from({ length: 12 }, () => Math.floor(Math.random() * 10));
  const sum = digits.reduce((acc, d, i) => acc + d * (i % 2 === 0 ? 1 : 3), 0);
  const check = (10 - (sum % 10)) % 10;
  return [...digits, check].join("");
}

/** Validate EAN-13 check digit. */
export function isValidEAN13(code: string): boolean {
  if (!/^\d{13}$/.test(code)) return false;
  const digits = code.split("").map(Number);
  const sum = digits.slice(0, 12).reduce((acc, d, i) => acc + d * (i % 2 === 0 ? 1 : 3), 0);
  return (10 - (sum % 10)) % 10 === digits[12];
}
