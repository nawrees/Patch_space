// Tunisian phone numbers are 8 digits, optionally prefixed with the +216
// country code — no variable per-city length to account for. Shared by
// signup and account-edit so both enforce exactly the same rule as the
// database trigger (031_validate_tunisian_phone.sql).
export function isValidTunisianPhone(phone: string): boolean {
  const digits = phone.replace(/\D/g, '');
  const local = digits.startsWith('216') && digits.length === 11 ? digits.slice(3) : digits;
  return local.length === 8;
}
