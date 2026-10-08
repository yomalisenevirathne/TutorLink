// src/utils/supabase.js
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://zycqidwaepstggspofvc.supabase.co';
const SUPABASE_KEY = 'sb_publishable_5bLuMzWMzc4K7puPYHZdeA_Mtm6Cyc4';

// Exported Supabase JS client for direct queries
export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
});

export default supabase;