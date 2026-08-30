#!/usr/bin/env node
// Generates the REAL environment.ts / environment.prod.ts from build-time
// secrets, used only inside the Docker build (see ../Dockerfile) — never
// run in CI, which instead copies the committed .example placeholder files
// since type-check/lint/build only need the import to resolve there, not
// real credentials.
//
// Writes to both environment.ts and environment.prod.ts: Angular's
// production build config replaces environment.ts with environment.prod.ts
// content via fileReplacements (angular.json), but keeping both in sync
// avoids depending on exactly how/when that swap happens during the build.

import { readFileSync, writeFileSync } from 'node:fs';

const required = ['SUPABASE_URL', 'SUPABASE_ANON_KEY', 'API_URL'];
const missing = required.filter((key) => !process.env[key]);
if (missing.length > 0) {
  console.error(`write-env.mjs: missing required env var(s): ${missing.join(', ')}`);
  process.exit(1);
}

const { SUPABASE_URL, SUPABASE_ANON_KEY, API_URL } = process.env;
const apiOrigin = new URL(API_URL).origin;

const render = (production) => `export const environment = {
  production: ${production},
  supabaseUrl: '${SUPABASE_URL}',
  supabaseAnonKey: '${SUPABASE_ANON_KEY}',
  apiUrl: '${API_URL}',
};
`;

writeFileSync('src/environments/environment.ts', render(false));
writeFileSync('src/environments/environment.prod.ts', render(true));

// index.html's CSP connect-src hardcodes http://localhost:4000 for local
// dev — a real deployment's API lives at a different origin, and the
// browser silently blocks every fetch to it otherwise (surfaces in Angular
// as a generic "status 0 / Unknown Error", not an obvious CSP message).
// Swapped for the real origin here, same build-time-real-values approach
// as environment.ts above.
const indexHtmlPath = 'src/index.html';
const html = readFileSync(indexHtmlPath, 'utf8');
const localDevOrigin = 'http://localhost:4000';
if (!html.includes(localDevOrigin)) {
  console.error(`write-env.mjs: expected to find "${localDevOrigin}" in ${indexHtmlPath}'s CSP — it may have already been patched, or the CSP changed shape. Aborting so a real deployment never silently ships the wrong connect-src.`);
  process.exit(1);
}
writeFileSync(indexHtmlPath, html.replace(localDevOrigin, apiOrigin));

console.log(`write-env.mjs: generated environment.ts, environment.prod.ts, and patched CSP connect-src to ${apiOrigin}`);
