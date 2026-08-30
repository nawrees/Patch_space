#!/usr/bin/env node
// Generates the REAL environment.ts / environment.prod.ts from build-time
// secrets, used only inside the Docker build (see ../Dockerfile) — never
// run in CI, which instead copies the committed .example placeholder files
// since type-check/lint/build only need the import to resolve there, not
// real credentials.
//
// apiUrl is a constant '/api', not a build arg — nginx proxies /api to the
// backend on the same origin the page is served from (see
// frontend/nginx.conf), so this value is correct no matter what host ends
// up serving the built image. That's also why index.html's CSP no longer
// needs patching here: connect-src 'self' already covers a same-origin
// request, unlike the old cross-origin http://localhost:4000 setup.
//
// Writes to both environment.ts and environment.prod.ts: Angular's
// production build config replaces environment.ts with environment.prod.ts
// content via fileReplacements (angular.json), but keeping both in sync
// avoids depending on exactly how/when that swap happens during the build.

import { writeFileSync } from 'node:fs';

const required = ['SUPABASE_URL', 'SUPABASE_ANON_KEY'];
const missing = required.filter((key) => !process.env[key]);
if (missing.length > 0) {
  console.error(`write-env.mjs: missing required env var(s): ${missing.join(', ')}`);
  process.exit(1);
}

const { SUPABASE_URL, SUPABASE_ANON_KEY } = process.env;

const render = (production) => `export const environment = {
  production: ${production},
  supabaseUrl: '${SUPABASE_URL}',
  supabaseAnonKey: '${SUPABASE_ANON_KEY}',
  apiUrl: '/api',
};
`;

writeFileSync('src/environments/environment.ts', render(false));
writeFileSync('src/environments/environment.prod.ts', render(true));

console.log('write-env.mjs: generated environment.ts and environment.prod.ts');
