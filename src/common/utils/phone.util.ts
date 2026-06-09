/**
 * Indian mobile number normalization.
 *
 * Cleans the common dirty inputs we see from Excel / bulk uploads / manual
 * entry — leading/trailing/internal spaces, +91 / 91 / 0 prefixes — and returns
 * a canonical 10-digit number starting 6-9.
 *
 * IMPORTANT: it only strips a prefix when the *remainder* is a valid 10-digit
 * mobile. It never blindly takes "last 10 digits" (that turned 084569782900 ->
 * 4569782900, a wrong number). If the value can't be safely recovered it
 * returns null — callers then reject (manual entry) or keep the raw value
 * (bulk import) rather than storing a corrupted number.
 */
export function normalizeIndianPhone(raw: string | null | undefined): string | null {
  if (raw == null) return null;
  const digits = String(raw).replace(/[^0-9]/g, '');
  if (!digits) return null;

  // Already a clean 10-digit mobile.
  if (/^[6-9]\d{9}$/.test(digits)) return digits;
  // Leading STD/trunk 0 + 10-digit mobile.
  if (/^0[6-9]\d{9}$/.test(digits)) return digits.slice(1);
  // Country code 91 + 10-digit mobile.
  if (/^91[6-9]\d{9}$/.test(digits)) return digits.slice(2);
  // 0091 / +91 with extra zero.
  if (/^0091[6-9]\d{9}$/.test(digits)) return digits.slice(4);

  return null;
}

/** True when the value is (or normalizes to) a valid 10-digit Indian mobile. */
export function isValidIndianPhone(raw: string | null | undefined): boolean {
  return normalizeIndianPhone(raw) !== null;
}
