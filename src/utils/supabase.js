import 'react-native-url-polyfill/auto';
import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { createClient } from '@supabase/supabase-js';
import { Platform } from 'react-native';

const ExpoSecureStoreAdapter = {
  getItem: (key) => {
    return SecureStore.getItemAsync(key);
  },
  setItem: (key, value) => {
    return SecureStore.setItemAsync(key, value);
  },
  removeItem: (key) => {
    return SecureStore.deleteItemAsync(key);
  },
};

// .env එකෙන් හෝ direct fallback එකෙන් values ලබා ගැනීම (Undefined වීම වැළැක්වීමට)
const SUPABASE_URL = 
  process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://zycqidwaepstggspofvc.supabase.co';
  
const SUPABASE_KEY = 
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || process.env.EXPO_PUBLIC_SUPABASE_KEY || 'sb_publishable_5bLuMzWMzc4K7puPYHZdeA_Mtm6Cyc4';

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: {
    // Let Supabase use browser localStorage on web; SecureStore is native-only.
    storage: Platform.OS === 'web' ? undefined : ExpoSecureStoreAdapter,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

export default supabase;
