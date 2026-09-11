import 'react-native-url-polyfill/auto';

import { createClient } from '@supabase/supabase-js';

import { getSupabaseConfig } from '@/config/supabase';
import { supabaseStorage } from '@/lib/supabaseStorage';

const { publishableKey, url } = getSupabaseConfig({
  EXPO_PUBLIC_SUPABASE_URL: process.env.EXPO_PUBLIC_SUPABASE_URL,
  EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY:
    process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
});

export const supabase = createClient(url, publishableKey, {
  auth: {
    storage: supabaseStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
