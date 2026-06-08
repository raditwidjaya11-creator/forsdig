import { db, auth, getCachedUserId, setCachedUserId, isFirebaseConfigured } from '../lib/firebase';
import { 
  collection, 
  query, 
  where, 
  getDocs, 
  doc, 
  setDoc, 
  deleteDoc, 
  getDoc,
  serverTimestamp,
  orderBy,
  limit
} from 'firebase/firestore';
import { Product } from '../types';

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  }
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  };
  console.error('[FirebaseService] Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

const plainObject = (val: any) => 
  !!val && typeof val === 'object' && (Object.getPrototypeOf(val) === Object.prototype || Object.getPrototypeOf(val) === null);

// In Firestore, we generally prefer camelCase. We'll convert any snake_case fields returned from legacy endpoints 
// or keep camelCase in JS for total consistency with frontend components and stores.
export const snakeToCamel = (obj: any): any => {
  if (!plainObject(obj) && !Array.isArray(obj)) return obj;
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

export const camelToSnake = (obj: any): any => {
  if (!plainObject(obj) && !Array.isArray(obj)) return obj;
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

const FETCH_TIMEOUT = 10000;

async function withTimeout<T>(promise: Promise<T>, timeoutMs: number = FETCH_TIMEOUT): Promise<T> {
  let timeoutId: any;
  const timeoutPromise = new Promise<T>((_, reject) => {
    timeoutId = setTimeout(() => reject(new Error('Firebase operation timed out')), timeoutMs);
  });

  try {
    return await Promise.race([promise, timeoutPromise]);
  } finally {
    clearTimeout(timeoutId);
  }
}

// Safely get Firebase current user ID using cache
export async function getActiveUserId(): Promise<string | null> {
  const cached = getCachedUserId();
  if (cached) return cached;
  
  const current = auth.currentUser?.uid || null;
  if (current) {
    setCachedUserId(current);
  }
  return current;
}

export type DbTable = 
  | 'products' 
  | 'transactions' 
  | 'suppliers' 
  | 'customers' 
  | 'purchase_orders' 
  | 'debts' 
  | 'store_settings' 
  | 'qris' 
  | 'outlets' 
  | 'balance_mutations' 
  | 'profiles' 
  | 'categories' 
  | 'vouchers' 
  | 'staff' 
  | 'resellers' 
  | 'commissions' 
  | 'subscriptions' 
  | 'shifts' 
  | 'activity_logs';

export async function fetchData<T>(table: DbTable): Promise<T[]> {
  if (!isFirebaseConfigured) return [];
  
  const path = table;
  try {
    const userId = await getActiveUserId();
    if (!userId) {
      console.warn(`[FirebaseService] No active user session for fetchData from ${table}`);
      return [];
    }

    const colRef = collection(db, table);
    // Queries on standard collections must enforce security filters
    const q = query(colRef, where('userId', '==', userId));
    const querySnapshot = await withTimeout(getDocs(q));
    
    const results: any[] = [];
    querySnapshot.forEach((docSnap) => {
      const dataDoc = docSnap.data();
      // Ensure local object has id property matching document ID
      results.push({
        id: docSnap.id,
        ...dataDoc
      });
    });

    return snakeToCamel(results) as T[];
  } catch (err) {
    try {
      handleFirestoreError(err, OperationType.LIST, path);
    } catch (transformed) {
      // Return local backup as safe fallback in the posStore if error is fired
      console.error(`[FirebaseService] Fetch failed for ${table}:`, transformed);
    }
    return [];
  }
}

export async function fetchLimitedProducts(): Promise<Partial<Product>[]> {
  if (!isFirebaseConfigured) return [];
  
  try {
    const userId = await getActiveUserId();
    if (!userId) return [];

    const colRef = collection(db, 'products');
    const q = query(
      colRef, 
      where('userId', '==', userId), 
      limit(100)
    );
    const querySnapshot = await getDocs(q);
    
    const results: any[] = [];
    querySnapshot.forEach((docSnap) => {
      results.push({
        id: docSnap.id,
        ...docSnap.data()
      });
    });

    return snakeToCamel(results);
  } catch (err) {
    console.error('[FirebaseService] fetchLimitedProducts error:', err);
    return [];
  }
}

export async function saveData<T>(table: DbTable, data: T | T[]) {
  if (!isFirebaseConfigured) return;
  
  const path = table;
  const userId = await getActiveUserId();
  if (!userId) {
    console.error(`[FirebaseService] Gagal menyimpan ke ${table}: User tidak login`);
    throw new Error('User must be logged in to save data');
  }

  const items = Array.isArray(data) ? data : [data];
  
  try {
    for (const rawItem of items) {
      const item = rawItem as any;
      const itemId = item.id || `doc_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      
      // Keep structural properties clean and assign metadata
      const documentPayload = {
        ...item,
        userId: userId,
        updatedAt: serverTimestamp()
      };

      // Exclude redundant id inside document field if needed, but keeping it is fine
      const docRef = doc(db, table, itemId);
      await setDoc(docRef, documentPayload, { merge: true });
    }
    
    console.log(`[FirebaseService] Berhasil menyimpan ${items.length} dokumen ke ${table}`);
    return data;
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, path);
  }
}

export async function fetchProfile(id?: string) {
  if (!isFirebaseConfigured) return null;
  
  const userId = id || (await getActiveUserId());
  if (!userId) return null;

  const path = `profiles/${userId}`;
  try {
    const docRef = doc(db, 'profiles', userId);
    const docSnap = await getDoc(docRef);
    
    if (!docSnap.exists()) {
      return null;
    }
    
    return snakeToCamel({
      id: docSnap.id,
      ...docSnap.data()
    });
  } catch (err) {
    try {
      handleFirestoreError(err, OperationType.GET, path);
    } catch (e) {
      console.error('[FirebaseService] fetchProfile failed:', e);
    }
    return null;
  }
}

export async function deleteData(table: DbTable, id: string | number) {
  if (!isFirebaseConfigured) return;
  
  const path = `${table}/${id}`;
  try {
    const docRef = doc(db, table, String(id));
    await deleteDoc(docRef);
    console.log(`[FirebaseService] Berhasil menghapus dari ${table}: ${id}`);
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, path);
  }
}
