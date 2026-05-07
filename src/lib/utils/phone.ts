/**
 * Convierte un número de teléfono ingresado en cualquier formato a uno
 * compatible con wa.me (sólo dígitos, con código de país si lo deduce).
 * Heurística pensada para Argentina:
 *  - Si ya empieza con 54 → respeta.
 *  - Si empieza con 0 (formato local AR) → quita el 0 y prepende 549.
 *  - Si tiene 10 dígitos y empieza con 9 → prepende 54.
 *  - Caso contrario → devuelve sólo los dígitos tal cual.
 */
export function toWhatsAppNumber(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const digits = String(raw).replace(/\D+/g, "");
  if (!digits) return null;

  if (digits.startsWith("54")) return digits;
  if (digits.startsWith("00")) return digits.slice(2);
  if (digits.startsWith("0")) return "549" + digits.slice(1);
  if (digits.length === 10 && digits.startsWith("9")) return "54" + digits;
  if (digits.length === 10) return "549" + digits;
  return digits;
}

/** URL completa para iniciar chat de WhatsApp. */
export function toWhatsAppUrl(raw: string | null | undefined): string | null {
  const num = toWhatsAppNumber(raw);
  if (!num) return null;
  return `https://wa.me/${num}`;
}
