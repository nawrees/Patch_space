#!/usr/bin/env node
// jest-preset-angular's coverage remapping writes SF: paths in lcov.info as
// a bogus relative-directory prefix glued onto a full file: URI, e.g.:
//   SF:src/app/features/auth/login/file:/home/runner/.../login.component.ts
// instead of the plain relative path SonarCloud (and any other lcov reader)
// expects:
//   SF:src/app/features/auth/login/login.component.ts
//
// This affects every real .ts source file's coverage entry (confirmed: 6 of
// 7 SF: lines in a full `jest --coverage` run here), which is why SonarCloud
// logged "Could not resolve N file paths" and reported 0% coverage despite
// real, passing tests - not a gap in the tests, a gap in how the coverage
// tool wrote the paths. Same shape of problem as .github/scripts/
// zap-json-to-sarif.mjs: a third-party tool's output needed a small,
// dependency-free fixup before the next tool in the pipeline could read it.
//
// Run after `jest --coverage`, before anything reads coverage/lcov.info.

import { readFileSync, writeFileSync } from 'node:fs';

const lcovPath = process.argv[2] || 'coverage/lcov.info';

const content = readFileSync(lcovPath, 'utf8');
let fixedCount = 0;

const fixed = content
  .split('\n')
  .map((line) => {
    if (!line.startsWith('SF:')) return line;

    const raw = line.slice(3);
    const normalized = raw.replace(/\\/g, '/');

    // The real path is everything after the last "file:" marker (there's
    // exactly one bogus prefix segment before it in every case seen so
    // far, but taking the LAST occurrence is robust even if that changes).
    const fileMarker = normalized.lastIndexOf('file:');
    const realPath = fileMarker === -1 ? normalized : normalized.slice(fileMarker + 'file:'.length);

    // Make it relative to this package (frontend/), matching the plain
    // relative paths every other SF: entry already uses.
    const frontendMarker = realPath.lastIndexOf('/frontend/');
    const relativePath = frontendMarker === -1 ? realPath : realPath.slice(frontendMarker + '/frontend/'.length);

    if (relativePath !== raw) fixedCount++;
    return `SF:${relativePath}`;
  })
  .join('\n');

writeFileSync(lcovPath, fixed);
console.log(`fix-lcov-paths.mjs: normalized ${fixedCount} SF: path(s) in ${lcovPath}`);
