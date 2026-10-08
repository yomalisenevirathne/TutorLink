import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import { Platform } from 'react-native';
import { SUPABASE_URL, SUPABASE_KEY } from './supabase';

let client;

export function getPaymentDemoClient() {
  // Keep the payment demo session independent of the unfinished login flow.
  // The same browser/device reuses it even when the app's dummy ID changes.
  if (!client) {
    client = createClient(SUPABASE_URL, SUPABASE_KEY, {
      auth: {
        ...(Platform.OS !== 'web' ? { storage: AsyncStorage } : {}),
        storageKey: 'tutorlink-payment-demo-session',
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: false,
      },
    });
  }
  return client;
}
