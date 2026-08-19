// Template only — copy to environment.ts and fill in real values for local
// dev. environment.ts itself is gitignored (contains real Supabase keys),
// so this is what CI copies into place: type-check/lint only need the
// import to resolve, not real credentials.
export const environment = {
  production: false,
  supabaseUrl: 'https://your-project.supabase.co',
  supabaseAnonKey: 'replace-with-your-supabase-anon-key',
  apiUrl: 'http://localhost:4000/api',
};
