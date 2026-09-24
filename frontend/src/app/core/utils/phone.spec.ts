import { isValidTunisianPhone } from './phone';

describe('isValidTunisianPhone', () => {
  it('accepts a plain 8-digit number', () => {
    expect(isValidTunisianPhone('12345678')).toBe(true);
  });

  it('accepts a +216 prefix', () => {
    expect(isValidTunisianPhone('+21612345678')).toBe(true);
  });

  it('accepts a +216 prefix with spaces', () => {
    expect(isValidTunisianPhone('+216 12 345 678')).toBe(true);
  });

  it('accepts a +216 prefix with dashes', () => {
    expect(isValidTunisianPhone('+216-12-345-678')).toBe(true);
  });

  it('accepts a bare 216 prefix without a leading +', () => {
    expect(isValidTunisianPhone('21612345678')).toBe(true);
  });

  it('rejects trailing letters after otherwise-valid digits', () => {
    expect(isValidTunisianPhone('12345678a')).toBe(false);
  });

  it('rejects an exclamation mark appended to an otherwise valid number', () => {
    expect(isValidTunisianPhone('12345678!')).toBe(false);
  });

  it('rejects too few digits', () => {
    expect(isValidTunisianPhone('1234567')).toBe(false);
  });

  it('rejects too many digits', () => {
    expect(isValidTunisianPhone('123456789')).toBe(false);
  });

  it('rejects an empty string', () => {
    expect(isValidTunisianPhone('')).toBe(false);
  });

  it('rejects whitespace-only input', () => {
    expect(isValidTunisianPhone('   ')).toBe(false);
  });

  it('rejects a non-Tunisian country code', () => {
    expect(isValidTunisianPhone('+1 12345678')).toBe(false);
  });
});
