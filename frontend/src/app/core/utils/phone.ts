// Tunisian phone numbers are 8 digits, optionally prefixed with the +216
// country code — no variable per-city length to account for. Shared by
// signup and account-edit so both enforce exactly the same rule as the
// database trigger (031_validate_tunisian_phone.sql).
export function isValidTunisianPhone(phone: string): boolean {
  const trimmed = phone.trim();
  // Reject anything containing characters other than digits, spaces,
  // dashes, or a leading + up front — otherwise something like
  // "21025126hh" would have its letters silently stripped by the digit
  // count below and pass as if it were a clean 8-digit number.
  if (!/^\+?[\d\s-]+$/.test(trimmed)) return false;

  const digits = trimmed.replace(/[\s-]/g, '').replace(/^\+/, '');
  const local = digits.startsWith('216') && digits.length === 11 ? digits.slice(3) : digits;
  return /^\d{8}$/.test(local);
}
