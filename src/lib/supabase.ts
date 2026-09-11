import 'react-native-url-polyfill/auto';

import { createClient } from '@supabase/supabase-js';
import { AppState, Platform } from 'react-native';
import { waitBackendTimeoutMilliseconds } from '@/config/waitBackend';

import { getSupabaseConfig } from '@/config/supabase';
import { supabaseStorage } from '@/lib/supabaseStorage';

const { publishableKey, url } = getSupabaseConfig({
  EXPO_PUBLIC_SUPABASE_URL: process.env.EXPO_PUBLIC_SUPABASE_URL,
  EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY:
    process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
});

export const supabase = createClient(url, publishableKey, {
  global: {
    fetch: async (input, init) => {
      const controller = new AbortController();
      const abort = () => controller.abort();
      if (init?.signal?.aborted) controller.abort();
      init?.signal?.addEventListener('abort', abort);
      const timer = setTimeout(abort, waitBackendTimeoutMilliseconds);
      try { return await fetch(input, { ...init, signal: controller.signal }); }
      finally { clearTimeout(timer); init?.signal?.removeEventListener('abort', abort); }
    },
  },
  auth: {
    storage: supabaseStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

// One shared client; no sign-out on backgrounding or app restart.
if (Platform.OS !== 'web') {
  const refresh = (state: string) => {
    if (state === 'active') void supabase.auth.startAutoRefresh();
    else void supabase.auth.stopAutoRefresh();
  };
  refresh(AppState.currentState);
  AppState.addEventListener('change', refresh);
}
