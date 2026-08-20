import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { checkMigrations } from '../../database/scripts/check-migrations.mjs';

function makeTempMigrationsDir(files) {
  const dir = mkdtempSync(path.join(tmpdir(), 'migration-check-test-'));
  for (const [name, content] of Object.entries(files)) {
    writeFileSync(path.join(dir, name), content);
  }
  return dir;
}

test('passes on a clean, sequential set of migrations', () => {
  const dir = makeTempMigrationsDir({
    '001_init.sql': 'create table foo (id int);',
    '002_add_bar.sql': 'alter table foo add column bar text;',
  });
  const { errors, count } = checkMigrations(dir);
  assert.deepEqual(errors, []);
  assert.equal(count, 2);
  rmSync(dir, { recursive: true, force: true });
});

test('detects a gap in the numbering', () => {
  const dir = makeTempMigrationsDir({
    '001_init.sql': 'create table foo (id int);',
    '003_add_bar.sql': 'alter table foo add column bar text;',
  });
  const { errors } = checkMigrations(dir);
  assert.equal(errors.length, 1);
  assert.match(errors[0], /Gap in migration sequence/);
  rmSync(dir, { recursive: true, force: true });
});

test('detects a duplicate migration number', () => {
  const dir = makeTempMigrationsDir({
    '001_init.sql': 'create table foo (id int);',
    '001_also_init.sql': 'create table bar (id int);',
  });
  const { errors } = checkMigrations(dir);
  assert.ok(errors.some((e) => /Duplicate migration number/.test(e)));
  rmSync(dir, { recursive: true, force: true });
});

test('detects an empty migration file', () => {
  const dir = makeTempMigrationsDir({
    '001_init.sql': '   \n  ',
  });
  const { errors } = checkMigrations(dir);
  assert.ok(errors.some((e) => /is empty/.test(e)));
  rmSync(dir, { recursive: true, force: true });
});

test('detects an unbalanced $$ dollar-quote block (truncated file)', () => {
  const dir = makeTempMigrationsDir({
    '001_init.sql': 'create function foo() returns void as $$\nbegin\n  null;\nend;',
  });
  const { errors } = checkMigrations(dir);
  assert.ok(errors.some((e) => /unbalanced "\$\$"/.test(e)));
  rmSync(dir, { recursive: true, force: true });
});

test('rejects a filename that does not match NNN_description.sql', () => {
  const dir = makeTempMigrationsDir({
    'not_numbered.sql': 'create table foo (id int);',
  });
  const { errors } = checkMigrations(dir);
  assert.ok(errors.some((e) => /naming pattern/.test(e)));
  rmSync(dir, { recursive: true, force: true });
});

test('the real database/migrations directory in this repo passes cleanly', () => {
  const __dirname = path.dirname(fileURLToPath(import.meta.url));
  const realDir = path.resolve(__dirname, '..', '..', 'database', 'migrations');
  const { errors } = checkMigrations(realDir);
  assert.deepEqual(errors, []);
});
