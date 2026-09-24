import 'react-native-url-polyfill/auto';

import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { AppState } from 'react-native';

import { config, isDemoMode } from '@/constants/config';
import { chunkedSecureStorage } from './secureStorage';

/**
 * Anon-key client. Reads of reference data and reports go straight to Supabase —
 * Row Level Security makes that safe (design doc §4). Null in demo mode.
 */
export const supabase: SupabaseClient | null = isDemoMode
  ? null
  : createClient(config.supabaseUrl, config.supabaseAnonKey, {
      auth: {
        storage: chunkedSecureStorage,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,
      },
    });

// Only refresh tokens while the app is in the foreground.
if (supabase) {
  AppState.addEventListener('change', (state) => {
    if (state === 'active') supabase.auth.startAutoRefresh();
    else supabase.auth.stopAutoRefresh();
  });
}
