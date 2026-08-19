// Template only — copy to environment.prod.ts and fill in real values for a
// production build. environment.prod.ts itself is gitignored (contains real
// Supabase keys), so this is what CI copies into place: type-check/lint
// only need the import to resolve, not real credentials.
export const environment = {
  production: true,
  supabaseUrl: 'https://your-project.supabase.co',
  supabaseAnonKey: 'replace-with-your-supabase-anon-key',
  apiUrl: 'http://localhost:4000/api',
};
