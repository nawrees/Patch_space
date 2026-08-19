#!/usr/bin/env node
// Sanity-checks database/migrations/*.sql before it's merged:
//   1. every filename follows NNN_description.sql
//   2. numeric prefixes are sequential from 001, no gaps, no duplicates
//   3. no empty files
//   4. "$$" (the plpgsql function-body delimiter used throughout these
//      migrations) appears in balanced pairs per file — a cheap way to
//      catch a truncated/corrupted file without a real SQL parser
//
// Exits 1 with a readable message on any violation, 0 otherwise.

import { readdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const MIGRATIONS_DIR = path.resolve(__dirname, '..', 'migrations');
const NAME_PATTERN = /^(\d+)_[a-z0-9_]+\.sql$/;

const errors = [];

const files = readdirSync(MIGRATIONS_DIR).filter((f) => f.endsWith('.sql'));

if (files.length === 0) {
  console.error(`No .sql files found in ${MIGRATIONS_DIR}`);
  process.exit(1);
}

const numbered = [];
for (const file of files) {
  const match = NAME_PATTERN.exec(file);
  if (!match) {
    errors.push(`"${file}" doesn't match the expected NNN_description.sql naming pattern`);
    continue;
  }
  numbered.push({ file, num: parseInt(match[1], 10) });
}

numbered.sort((a, b) => a.num - b.num);

const seen = new Map();
for (const { file, num } of numbered) {
  if (seen.has(num)) {
    errors.push(`Duplicate migration number ${num}: "${seen.get(num)}" and "${file}"`);
  } else {
    seen.set(num, file);
  }
}

const sortedNums = [...seen.keys()].sort((a, b) => a - b);
sortedNums.forEach((num, i) => {
  const expected = i + 1;
  if (num !== expected) {
    errors.push(`Gap in migration sequence: expected ${expected} but found ${num} (file "${seen.get(num)}")`);
  }
});

for (const { file } of numbered) {
  const fullPath = path.join(MIGRATIONS_DIR, file);
  const content = readFileSync(fullPath, 'utf8');

  if (content.trim().length === 0) {
    errors.push(`"${file}" is empty`);
    continue;
  }

  const dollarQuoteCount = (content.match(/\$\$/g) || []).length;
  if (dollarQuoteCount % 2 !== 0) {
    errors.push(`"${file}" has an unbalanced "$$" count (${dollarQuoteCount}) — looks truncated or corrupted`);
  }
}

if (errors.length > 0) {
  console.error(`Migration check failed with ${errors.length} problem(s):\n`);
  for (const e of errors) console.error(`  - ${e}`);
  process.exit(1);
}

console.log(`Migration check passed: ${numbered.length} files, sequential 001-${String(numbered.length).padStart(3, '0')}.`);
