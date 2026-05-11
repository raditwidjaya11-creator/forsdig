import { createClient } from '@supabase/supabase-js';

const supabaseUrl = (import.meta as any).env.VITE_SUPABASE_URL?.trim().replace(/\/$/, '').replace(/\/rest\/v1$/, '').replace(/\/auth\/v1$/, '');
const supabaseAnonKey = (import.meta as any).env.VITE_SUPABASE_ANON_KEY?.trim();

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey && supabaseUrl !== '' && supabaseAnonKey !== '' && !supabaseUrl.includes('placeholder'));

if (!isSupabaseConfigured) {
  console.warn('Supabase configuration missing or invalid! Database features will be disabled. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your environment variables.');
}

export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseAnonKey || 'placeholder-key',
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true
    }
  }
);

export type DbTable = 'products' | 'transactions' | 'suppliers' | 'clients' | 'purchase_orders' | 'debts' | 'ppob_transactions' | 'ppob_services' | 'store_settings' | 'payment_qrs' | 'outlets' | 'balance_mutations' | 'profiles';
