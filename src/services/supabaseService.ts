import { supabase, DbTable, isSupabaseConfigured } from '../lib/supabase';
import { Product } from '../types';

const camelToSnake = (obj: any) => {
  if (typeof obj !== 'object' || obj === null) return obj;
  if (Array.isArray(obj)) return obj.map(camelToSnake);
  
  const newObj: any = {};
  for (const key in obj) {
    const snakeKey = key.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
    newObj[snakeKey] = camelToSnake(obj[key]);
  }
  return newObj;
};

const snakeToCamel = (obj: any) => {
  if (typeof obj !== 'object' || obj === null) return obj;
  if (Array.isArray(obj)) return obj.map(snakeToCamel);
  
  const newObj: any = {};
  for (const key in obj) {
    const camelKey = key.replace(/(_\w)/g, match => match[1].toUpperCase());
    newObj[camelKey] = snakeToCamel(obj[key]);
  }
  return newObj;
};

export async function fetchData<T>(table: DbTable): Promise<T[]> {
  if (!isSupabaseConfigured) return [];
  
  const { data: { session } } = await supabase.auth.getSession();
  const userId = session?.user?.id;
  
  if (!userId) {
    console.warn('No active session for fetchData');
    return [];
  }

  const { data, error } = await supabase
    .from(table)
    .select('*')
    .eq('user_id', userId);

  if (error) {
    console.error(`Error fetching from ${table}:`, error);
    return [];
  }

  return (data || []).map(item => snakeToCamel(item)) as T[];
}

/**
 * Fetches products with specific columns, ordered by ID desc, limited to 100
 */
export async function fetchLimitedProducts(): Promise<Partial<Product>[]> {
  if (!isSupabaseConfigured) return [];
  
  const { data: { session } } = await supabase.auth.getSession();
  const userId = session?.user?.id;
  
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
  
  const { data: { session } } = await supabase.auth.getSession();
  const userId = session?.user?.id;
  
  if (!userId) {
    throw new Error('User must be logged in to save data');
  }

  const addUserId = (item: any) => ({ ...item, user_id: userId });
  const rawData = Array.isArray(data) ? data.map(addUserId) : addUserId(data);
  const transformedData = camelToSnake(rawData);

  const { error } = await supabase
    .from(table)
    .upsert(transformedData);

  if (error) {
    console.error(`Error saving to ${table}:`, error);
    throw error;
  }
}

export async function deleteData(table: DbTable, id: string | number) {
  if (!isSupabaseConfigured) return;
  
  const { data: { session } } = await supabase.auth.getSession();
  const userId = session?.user?.id;
  
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
