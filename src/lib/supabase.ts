import { createClient } from '@supabase/supabase-js';

const supabaseUrl = (import.meta as any).env.VITE_SUPABASE_URL;
const supabaseAnonKey = (import.meta as any).env.VITE_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = Boolean(
  supabaseUrl && 
  supabaseAnonKey && 
  supabaseUrl !== '' && 
  supabaseAnonKey !== '' && 
  !supabaseUrl.includes('placeholder')
);

if (!isSupabaseConfigured) {
  console.error('Supabase configuration missing or invalid! Database features will be disabled. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your environment variables.');
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

export type DbTable = 'products' | 'transactions' | 'suppliers' | 'customers' | 'purchase_orders' | 'debts' | 'ppob_transactions' | 'ppob_services' | 'store_settings' | 'qris' | 'outlets' | 'balance_mutations' | 'profiles' | 'categories' | 'vouchers' | 'staff' | 'resellers' | 'commissions' | 'user_markups' | 'subscriptions' | 'activity_logs';
