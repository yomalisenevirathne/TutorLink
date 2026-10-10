import 'react-native-url-polyfill/auto';
import * as SecureStore from 'expo-secure-store';
import { createClient } from '@supabase/supabase-js';

const ExpoSecureStoreAdapter = {
  getItem: (key) => {
    return SecureStore.getItemAsync(key);
  },
  setItem: (key, value) => {
    SecureStore.setItemAsync(key, value);
  },
  removeItem: (key) => {
    SecureStore.deleteItemAsync(key);
  },
};

// .env එකෙන් හෝ direct fallback එකෙන් values ලබා ගැනීම (Undefined වීම වැළැක්වීමට)
const SUPABASE_URL = 
  process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://zycqidwaepstggspofvc.supabase.co';
  
const SUPABASE_KEY = 
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || process.env.EXPO_PUBLIC_SUPABASE_KEY || 'sb_publishable_5bLuMzWMzc4K7puPYHZdeA_Mtm6Cyc4';

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: {
    storage: ExpoSecureStoreAdapter,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

export default supabase;