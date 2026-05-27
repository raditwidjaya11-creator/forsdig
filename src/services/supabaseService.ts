import { supabase, DbTable, isSupabaseConfigured, getCachedUserId, setCachedUserId } from '../lib/supabase';
import { Product } from '../types';

const isPlainObject = (val: any) => 
  !!val && typeof val === 'object' && (Object.getPrototypeOf(val) === Object.prototype || Object.getPrototypeOf(val) === null);

const camelToSnake = (obj: any) => {
  if (!isPlainObject(obj) && !Array.isArray(obj)) return obj;
  if (Array.isArray(obj)) return obj.map(camelToSnake);
  
  const newObj: any = {};
  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      const snakeKey = key.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
      newObj[snakeKey] = camelToSnake(obj[key]);
    }
  }
  return newObj;
};

export const snakeToCamel = (obj: any) => {
  if (!isPlainObject(obj) && !Array.isArray(obj)) return obj;
  if (Array.isArray(obj)) return obj.map(snakeToCamel);
  
  const newObj: any = {};
  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      const camelKey = key.replace(/(_\w)/g, match => match[1].toUpperCase());
      newObj[camelKey] = snakeToCamel(obj[key]);
    }
  }
  return newObj;
};

const FETCH_TIMEOUT = 10000; // 10 seconds

async function withTimeout<T>(promise: PromiseLike<T> | Promise<T>, timeoutMs: number = FETCH_TIMEOUT): Promise<T> {
  let timeoutId: any;
  const timeoutPromise = new Promise<T>((_, reject) => {
    timeoutId = setTimeout(() => reject(new Error('Supabase request timed out')), timeoutMs);
  });

  try {
    const result = await Promise.race([
      Promise.resolve(promise),
      timeoutPromise
    ]);
    return result;
  } finally {
    clearTimeout(timeoutId);
  }
}

// Safely get user ID using local cache to completely avoid lock contention in parallel fetches
export async function getActiveUserId(): Promise<string | null> {
  const cached = getCachedUserId();
  if (cached) return cached;
  
  try {
    console.log("[ForsDig POS] Cache miss. Fetching session from Supabaseauth...");
    const sessionResponse = await withTimeout(supabase.auth.getSession());
    const id = sessionResponse.data.session?.user?.id || null;
    if (id) {
      setCachedUserId(id);
    }
    return id;
  } catch (err) {
    console.error("[ForsDig POS] Error fetching active user session:", err);
    return null;
  }
}

export async function fetchData<T>(table: DbTable): Promise<T[]> {
  if (!isSupabaseConfigured) return [];
  
  try {
    const userId = await getActiveUserId();
    
    if (!userId) {
      console.warn(`[ForsDig POS] No active session for fetchData from ${table}`);
      return [];
    }

    const response = await withTimeout(
      supabase
        .from(table)
        .select('*')
        .eq('user_id', userId)
    );

    if (response.error) {
      console.error(`[ForsDig POS] Error fetching from ${table}:`, response.error);
      return [];
    }

    return (response.data || []).map(item => snakeToCamel(item)) as T[];
  } catch (err) {
    console.error(`[ForsDig POS] fetchData timeout or error for ${table}:`, err);
    return [];
  }
}

/**
 * Fetches products with specific columns, ordered by ID desc, limited to 100
 */
export async function fetchLimitedProducts(): Promise<Partial<Product>[]> {
  if (!isSupabaseConfigured) return [];
  
  const userId = await getActiveUserId();
  if (!userId) return [];

  const { data, error } = await supabase
    .from('products')
    .select('id, sku, name, price, cost_price, stock, category, unit')
    .eq('user_id', userId)
    .order('id', { ascending: false })
    .limit(100);

  if (error) {
    console.error('Error fetching limited products:', error);
    return [];
  }

  return (data || []).map(item => snakeToCamel(item));
}

export async function saveData<T>(table: DbTable, data: T | T[]) {
  if (!isSupabaseConfigured) return;
  
  const userId = await getActiveUserId();
  
  if (!userId) {
    console.error(`[ForsDig POS] Gagal menyimpan ke ${table}: User tidak login`);
    throw new Error('User must be logged in to save data');
  }

  const addUserId = (item: any) => ({ ...item, user_id: userId });
  const rawData = Array.isArray(data) ? data.map(addUserId) : [addUserId(data)];
  const transformedData = camelToSnake(rawData);

  console.log(`[ForsDig POS] Menghubungi Supabase table: ${table}`, transformedData);

  const { data: result, error } = await supabase
    .from(table)
    .upsert(transformedData, { onConflict: 'id' })
    .select();

  if (error) {
    console.error(`[ForsDig POS] Error saving to ${table}:`, error);
    throw error;
  }

  console.log(`[ForsDig POS] Berhasil simpan ke ${table}:`, result);
  return result ? snakeToCamel(result) : null;
}

export async function fetchProfile(id?: string) {
  if (!isSupabaseConfigured) return null;
  
  try {
    const userId = id || (await getActiveUserId());
    
    if (!userId) return null;

    const response = await withTimeout(
      supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single()
    );

    if (response.error) {
      console.error('[ForsDig POS] Error fetching profile:', response.error);
      return null;
    }

    return snakeToCamel(response.data);
  } catch (err) {
    console.error('[ForsDig POS] fetchProfile timeout or error:', err);
    return null;
  }
}

export async function deleteData(table: DbTable, id: string | number) {
  if (!isSupabaseConfigured) return;
  
  const userId = await getActiveUserId();
  if (!userId) return;

  const { error } = await supabase
    .from(table)
    .delete()
    .match({ id, user_id: userId });

  if (error) {
    console.error(`Error deleting from ${table}:`, error);
    throw error;
  }
}
