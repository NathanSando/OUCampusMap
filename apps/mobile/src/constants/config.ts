/**
 * Runtime configuration from EXPO_PUBLIC_* env vars (see apps/mobile/.env.example).
 * Expo inlines these at build time, so they must be read as literal `process.env.X`.
 */

// TODO(team): app name and branding are undecided (design doc §15). "SoonerMap" is the
// working name from the Stitch mockups.
export const APP_NAME = 'SoonerMap';

const trim = (v: string | undefined) => (v ?? '').trim();

export const config = {
  supabaseUrl: trim(process.env.EXPO_PUBLIC_SUPABASE_URL),
  supabaseAnonKey: trim(process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY),
  mapboxToken: trim(process.env.EXPO_PUBLIC_MAPBOX_PUBLIC_TOKEN),
  apiBaseUrl: trim(process.env.EXPO_PUBLIC_API_BASE_URL).replace(/\/+$/, ''),
};

/** Without Supabase configured the app runs read-only on the bundled seed data. */
export const isDemoMode = !config.supabaseUrl || !config.supabaseAnonKey;
export const hasApi = config.apiBaseUrl !== '';
export const hasMapbox = config.mapboxToken.startsWith('pk.');
