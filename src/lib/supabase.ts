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

// Memory cache for active authenticated user ID to prevent concurrent local storage locking issues
let cachedUserId: string | null = null;

export const setCachedUserId = (id: string | null) => {
  console.log(`[ForsDig POS] Supplying memory-cached userId: ${id}`);
  cachedUserId = id;
};

export const getCachedUserId = (): string | null => {
  return cachedUserId;
};

export type DbTable = 'products' | 'transactions' | 'suppliers' | 'customers' | 'purchase_orders' | 'debts' | 'store_settings' | 'qris' | 'outlets' | 'balance_mutations' | 'profiles' | 'categories' | 'vouchers' | 'staff' | 'resellers' | 'commissions' | 'subscriptions' | 'activity_logs';
