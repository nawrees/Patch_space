import { isValidTunisianPhone } from './phone';

describe('isValidTunisianPhone', () => {
  it.each<[string, boolean]>([
    ['12345678', true], // plain 8-digit number
    ['+21612345678', true], // +216 prefix
    ['+216 12 345 678', true], // +216 prefix with spaces
    ['+216-12-345-678', true], // +216 prefix with dashes
    ['21612345678', true], // bare 216 prefix, no leading +
    ['12345678a', false], // trailing letter
    ['12345678!', false], // trailing punctuation
    ['1234567', false], // too few digits
    ['123456789', false], // too many digits
    ['', false], // empty string
    ['   ', false], // whitespace only
    ['+1 12345678', false], // non-Tunisian country code
  ])('isValidTunisianPhone(%j) === %s', (input, expected) => {
    expect(isValidTunisianPhone(input)).toBe(expected);
  });
});
