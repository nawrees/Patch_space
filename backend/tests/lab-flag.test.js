import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildSessionFlag } from '../src/controllers/labs.controller.js';

// Several lab Docker images (idor-*, mass-assignment-*) hard-validate the
// flag against exactly this pattern in their own init_db.py and refuse to
// start otherwise — a "readable" attack-name-prefixed format was tried once
// and silently broke every session for those images. This is a direct
// regression guard for that incident.
const STRICT_FLAG_FORMAT = /^FLAG\{[0-9a-f]{32}\}$/;

test('flag matches the strict 32-char lowercase-hex format the lab images require', () => {
  assert.match(buildSessionFlag(), STRICT_FLAG_FORMAT);
});

test('two calls produce different flags (real randomness, not a fixed/predictable value)', () => {
  const a = buildSessionFlag();
  const b = buildSessionFlag();
  assert.notEqual(a, b);
});

test('flag contains no uppercase hex characters', () => {
  const flag = buildSessionFlag();
  const hex = flag.slice('FLAG{'.length, -1);
  assert.equal(hex, hex.toLowerCase());
});
