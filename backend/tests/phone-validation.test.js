import { test } from 'node:test';
import assert from 'node:assert/strict';
import { isValidTunisianPhone } from '../src/controllers/auth.controller.js';

test('accepts a plain 8-digit number', () => {
  assert.equal(isValidTunisianPhone('12345678'), true);
});

test('accepts +216 prefix with spaces', () => {
  assert.equal(isValidTunisianPhone('+216 12 345 678'), true);
});

test('accepts +216 prefix with dashes', () => {
  assert.equal(isValidTunisianPhone('+216-12-345-678'), true);
});

test('rejects trailing letters after valid digits (regression: used to silently pass)', () => {
  // The exact input that slipped through before the fix — digit-count
  // validation alone stripped the letters first and saw a clean 8 digits.
  assert.equal(isValidTunisianPhone('21025126hh'), false);
});

test('rejects trailing letters directly after the number', () => {
  assert.equal(isValidTunisianPhone('12345678x'), false);
});

test('rejects an exclamation mark appended to an otherwise valid number', () => {
  assert.equal(isValidTunisianPhone('+216-12-345-678!'), false);
});

test('rejects extra trailing digits after separators', () => {
  assert.equal(isValidTunisianPhone('  12345678  extra'), false);
});

test('rejects too few digits', () => {
  assert.equal(isValidTunisianPhone('1234567'), false);
});

test('rejects too many digits', () => {
  assert.equal(isValidTunisianPhone('123456789'), false);
});

test('rejects an empty string', () => {
  assert.equal(isValidTunisianPhone(''), false);
});

test('rejects a non-Tunisian country code', () => {
  assert.equal(isValidTunisianPhone('+1 234 567 8900'), false);
});
