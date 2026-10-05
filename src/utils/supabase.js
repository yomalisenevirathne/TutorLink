import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

// In-Memory Storage Fallback to prevent native module crashes in Expo / Web
const inMemoryStorage = new Map();

const safeStorageAdapter = {
  getItem: async (key) => {
    try {
      if (Platform.OS === 'web') {
        if (typeof window !== 'undefined' && window.localStorage) {
          return window.localStorage.getItem(key);
        }
      }
      // Check if AsyncStorage is available natively
      const value = await AsyncStorage.getItem(key);
      return value;
    } catch (error) {
      // Catch native module null error silently and fallback to memory storage
      return inMemoryStorage.has(key) ? inMemoryStorage.get(key) : null;
    }
  },
  setItem: async (key, value) => {
    try {
      if (Platform.OS === 'web') {
        if (typeof window !== 'undefined' && window.localStorage) {
          window.localStorage.setItem(key, value);
          return;
        }
      }
      await AsyncStorage.setItem(key, value);
    } catch (error) {
      inMemoryStorage.set(key, value);
    }
  },
  removeItem: async (key) => {
    try {
      if (Platform.OS === 'web') {
        if (typeof window !== 'undefined' && window.localStorage) {
          window.localStorage.removeItem(key);
          return;
        }
      }
      await AsyncStorage.removeItem(key);
    } catch (error) {
      inMemoryStorage.delete(key);
    }
  },
};

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://zycqidwaepstggspofvc.supabase.co';
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_KEY || 'sb_publishable_5bLuMzWMzc4K7puPYHZdeA_Mtm6Cyc4';

export const supabase = createClient(
  supabaseUrl,
  supabaseAnonKey,
  {
    auth: {
      storage: safeStorageAdapter,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    },
  }
);
