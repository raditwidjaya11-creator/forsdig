import { create } from 'zustand';
import { 
  Product, Category, Transaction, Supplier, Customer, 
  PurchaseOrder, DebtReceivable, PaymentQR, StoreSettings, Voucher,
  ActivityLog, Subscription, UserProfile, Staff, Reseller, Commission
} from '../types';
import { isFirebaseConfigured, auth, getCachedUserId } from '../lib/firebase';
import { fetchData, saveData, deleteData, snakeToCamel, getActiveUserId } from './firebaseService';
import { generateUUID } from '../lib/utils';
import { toast } from 'sonner';

interface POSState {
  products: Product[];
  categories: Category[];
  transactions: Transaction[];
  customers: Customer[];
  suppliers: Supplier[];
  purchaseOrders: PurchaseOrder[];
  debts: DebtReceivable[];
  paymentQrs: PaymentQR[];
  storeSettings: StoreSettings | null;
  vouchers: Voucher[];
  activityLogs: ActivityLog[];
  subscriptions: Subscription[];
  staff: Staff[];
  resellers: Reseller[];
  commissions: Commission[];
  isLoading: boolean;
  
  // Actions
  fetchInitialData: (forceCloudAwait?: boolean) => Promise<void>;
  resetStore: () => void;
  
  // Products
  setProducts: (products: Product[]) => void;
  addProduct: (product: Product) => Promise<void>;
  updateProduct: (product: Product) => Promise<void>;
  deleteProduct: (id: string) => Promise<void>;
  
  // Categories
  setCategories: (categories: Category[]) => void;
  addCategory: (category: Category) => Promise<void>;
  updateCategory: (category: Category) => Promise<void>;
  deleteCategory: (id: string) => Promise<void>;
  
  // Transactions
  addTransaction: (transaction: Transaction) => Promise<void>;
  
  // Generic sync for other entities
  syncEntity: (table: string, data: any) => Promise<void>;
  deleteEntity: (table: string, id: string) => Promise<void>;
}

const getLocalSuffix = (): string => {
  const cached = getCachedUserId();
  if (cached) return `_${cached}`;
  const currentUid = auth.currentUser?.uid;
  if (currentUid) return `_${currentUid}`;
  try {
    const savedProfileStr = localStorage.getItem('pos_local_user_profile');
    if (savedProfileStr) {
      const parsed = JSON.parse(savedProfileStr);
      if (parsed && parsed.id) return `_${parsed.id}`;
    }
  } catch (e) {}
  return '';
};

const loadLocal = <T>(table: string, fallback: T[] = []): T[] => {
  try {
    const suffix = getLocalSuffix();
    const saved = localStorage.getItem(`pos_local_${table}${suffix}`);
    return saved ? JSON.parse(saved) : fallback;
  } catch (e) {
    return fallback;
  }
};

const saveLocal = (table: string, data: any) => {
  try {
    const suffix = getLocalSuffix();
    localStorage.setItem(`pos_local_${table}${suffix}`, JSON.stringify(data));
  } catch (e) {
    console.warn(`[ForsDig POS] Failed to backup ${table} to localStorage`, e);
  }
};

export const usePOSStore = create<POSState>((set, get) => ({
  products: [],
  categories: [],
  transactions: [],
  customers: [],
  suppliers: [],
  purchaseOrders: [],
  debts: [],
  paymentQrs: [],
  storeSettings: null,
  vouchers: [],
  activityLogs: [],
  subscriptions: [],
  staff: [],
  resellers: [],
  commissions: [],
  isLoading: false,

  resetStore: () => {
    set({
      products: [],
      categories: [],
      transactions: [],
      customers: [],
      suppliers: [],
      purchaseOrders: [],
      debts: [],
      paymentQrs: [],
      storeSettings: null,
      vouchers: [],
      activityLogs: [],
      subscriptions: [],
      staff: [],
      resellers: [],
      commissions: [],
      isLoading: false
    });
  },

  fetchInitialData: async (forceCloudAwait = false) => {
    // 1. Instantly load loaded local components from localStorage so that POS screen is responsive and ready in 1-2 milliseconds!
    const savedSettings = loadLocal<any>('store_settings');
    const defaultSettings: StoreSettings = {
      id: generateUUID(),
      name: 'ForsDig POS',
      address: 'Kawasan Bisnis Digital, Jakarta Selatan',
      phone: '021-555-0123',
      email: 'kontak@forsdig.com',
      logo: '',
      footerMessage: 'Terima kasih atas kunjungan Anda!',
      taxRate: 11
    };

    const localProducts = loadLocal<Product>('products');
    const localCategories = loadLocal<Category>('categories', [
      { id: '1', name: 'Makanan' },
      { id: '2', name: 'Minuman' },
      { id: '3', name: 'Snack' },
      { id: '4', name: 'Lainnya' }
    ]);
    const localTransactions = loadLocal<Transaction>('transactions');
    const localCustomers = loadLocal<Customer>('customers');
    const localSuppliers = loadLocal<Supplier>('suppliers');
    const localPurchaseOrders = loadLocal<PurchaseOrder>('purchase_orders');
    const localDebts = loadLocal<DebtReceivable>('debts');
    const localPaymentQrs = loadLocal<PaymentQR>('qris');
    const localVouchers = loadLocal<Voucher>('vouchers');
    const localActivityLogs = loadLocal<ActivityLog>('activity_logs');
    const localSubscriptions = loadLocal<Subscription>('subscriptions');
    const localStaff = loadLocal<Staff>('staff');
    const localResellers = loadLocal<Reseller>('resellers');
    const localCommissions = loadLocal<Commission>('commissions');

    set({
      products: localProducts,
      categories: localCategories,
      transactions: localTransactions,
      customers: localCustomers,
      suppliers: localSuppliers,
      purchaseOrders: localPurchaseOrders,
      debts: localDebts,
      paymentQrs: localPaymentQrs,
      storeSettings: savedSettings.length > 0 ? savedSettings[0] : defaultSettings,
      vouchers: localVouchers,
      activityLogs: localActivityLogs,
      subscriptions: localSubscriptions,
      staff: localStaff,
      resellers: localResellers,
      commissions: localCommissions,
      isLoading: false
    });

    if (!isFirebaseConfigured) {
      return;
    }

    const performSync = async () => {
      try {
        const userId = await getActiveUserId();
        if (!userId) return;

        const fetchWithCatch = async <T>(table: any): Promise<T[]> => {
          try {
            return await fetchData<T>(table);
          } catch (err) {
            console.error(`[ForsDig POS Background] Individual sync fetch error for ${table}:`, err);
            return [];
          }
        };

        const [
          p, cat, tx, cust, supp, po, d, qr, s, v, l, sub, st, res, com
        ] = await Promise.all([
          fetchWithCatch<Product>('products'),
          fetchWithCatch<Category>('categories'),
          fetchWithCatch<Transaction>('transactions'),
          fetchWithCatch<Customer>('customers'),
          fetchWithCatch<Supplier>('suppliers'),
          fetchWithCatch<PurchaseOrder>('purchase_orders'),
          fetchWithCatch<DebtReceivable>('debts'),
          fetchWithCatch<PaymentQR>('qris'),
          fetchWithCatch<StoreSettings>('store_settings'),
          fetchWithCatch<Voucher>('vouchers'),
          fetchWithCatch<ActivityLog>('activity_logs'),
          fetchWithCatch<Subscription>('subscriptions'),
          fetchWithCatch<Staff>('staff'),
          fetchWithCatch<Reseller>('resellers'),
          fetchWithCatch<Commission>('commissions')
        ]);

        const mergedSettings = s[0] || savedSettings[0] || defaultSettings;

        set({
          products: p.length > 0 ? p : localProducts,
          categories: cat.length > 0 ? cat : localCategories,
          transactions: tx.length > 0 ? tx : localTransactions,
          customers: cust.length > 0 ? cust : localCustomers,
          suppliers: supp.length > 0 ? supp : localSuppliers,
          purchaseOrders: po.length > 0 ? po : localPurchaseOrders,
          debts: d.length > 0 ? d : localDebts,
          paymentQrs: qr.length > 0 ? qr : localPaymentQrs,
          storeSettings: mergedSettings,
          vouchers: v.length > 0 ? v : localVouchers,
          activityLogs: l.length > 0 ? l : localActivityLogs,
          subscriptions: sub.length > 0 ? sub : localSubscriptions,
          staff: st.length > 0 ? st : localStaff,
          resellers: res.length > 0 ? res : localResellers,
          commissions: com.length > 0 ? com : localCommissions,
          isLoading: false
        });

        // Background write cache back into local storage
        if (p.length > 0) saveLocal('products', p);
        if (cat.length > 0) saveLocal('categories', cat);
        if (tx.length > 0) saveLocal('transactions', tx);
        if (cust.length > 0) saveLocal('customers', cust);
        if (supp.length > 0) saveLocal('suppliers', supp);
        if (po.length > 0) saveLocal('purchase_orders', po);
        if (d.length > 0) saveLocal('debts', d);
        if (qr.length > 0) saveLocal('qris', qr);
        if (s.length > 0) saveLocal('store_settings', s);
        if (v.length > 0) saveLocal('vouchers', v);
        if (l.length > 0) saveLocal('activity_logs', l);
        if (sub.length > 0) saveLocal('subscriptions', sub);
        if (st.length > 0) saveLocal('staff', st);
        if (res.length > 0) saveLocal('resellers', res);
        if (com.length > 0) saveLocal('commissions', com);

      } catch (err) {
        console.error('[ForsDig POS Background] Master sync exception:', err);
      }
    };

    if (forceCloudAwait) {
      set({ isLoading: true });
      await performSync();
    } else {
      // Execute background sync instantly without blocking returning execution!
      performSync();
    }
  },

  setProducts: (products) => {
    set({ products });
    saveLocal('products', products);
  },
  
  addProduct: async (product) => {
    const { products } = get();
    const updated = [product, ...products];
    set({ products: updated });
    saveLocal('products', updated);
    try {
      await saveData('products', product);
    } catch (err) {
      console.warn('Silent save offline product backup completed.');
    }
  },

  updateProduct: async (product) => {
    const { products } = get();
    const updated = products.map(p => p.id === product.id ? product : p);
    set({ products: updated });
    saveLocal('products', updated);
    try {
      await saveData('products', product);
    } catch (err) {
      console.warn('Silent update offline product backup completed.');
    }
  },

  deleteProduct: async (id) => {
    const { products } = get();
    const updated = products.filter(p => p.id !== id);
    set({ products: updated });
    saveLocal('products', updated);
    try {
      await deleteData('products', id);
    } catch (err) {
      console.warn('Silent delete offline product backup completed.');
    }
  },

  setCategories: (categories) => {
    set({ categories });
    saveLocal('categories', categories);
  },
  
  addCategory: async (category) => {
    const { categories } = get();
    const updated = [...categories, category];
    set({ categories: updated });
    saveLocal('categories', updated);
    try {
      await saveData('categories', category);
    } catch (err) {
      console.warn('Silent add offline category backup completed.');
    }
  },

  updateCategory: async (category) => {
    const { categories } = get();
    const updated = categories.map(c => c.id === category.id ? category : c);
    set({ categories: updated });
    saveLocal('categories', updated);
    try {
      await saveData('categories', category);
    } catch (err) {
      console.warn('Silent update offline category backup completed.');
    }
  },

  deleteCategory: async (id) => {
    const { categories } = get();
    const updated = categories.filter(c => c.id !== id);
    set({ categories: updated });
    saveLocal('categories', updated);
    try {
      await deleteData('categories', id);
    } catch (err) {
      console.warn('Silent delete offline category backup completed.');
    }
  },

  addTransaction: async (transaction) => {
    const { transactions } = get();
    const updated = [transaction, ...transactions];
    set({ transactions: updated });
    saveLocal('transactions', updated);
    try {
      await saveData('transactions', transaction);
    } catch (err) {
      console.error('Failed to sync transaction:', err);
    }
  },

  syncEntity: async (table, data) => {
    const stateKeyMap: Record<string, string> = {
      customers: 'customers',
      suppliers: 'suppliers',
      purchase_orders: 'purchaseOrders',
      debts: 'debts',
      qris: 'paymentQrs',
      store_settings: 'storeSettings',
      vouchers: 'vouchers',
      activity_logs: 'activityLogs',
      subscriptions: 'subscriptions',
      staff: 'staff',
      resellers: 'resellers',
      commissions: 'commissions'
    };

    const key = stateKeyMap[table];
    if (key) {
      if (key === 'storeSettings') {
        set({ storeSettings: data });
        saveLocal('store_settings', [data]);
      } else {
        const currentList = (get() as any)[key] as any[] || [];
        const index = currentList.findIndex((item: any) => item.id === data.id);
        let updatedList;
        if (index >= 0) {
          updatedList = currentList.map((item: any) => item.id === data.id ? { ...item, ...data } : item);
        } else {
          updatedList = [data, ...currentList];
        }
        set({ [key]: updatedList });
        saveLocal(table, updatedList);
      }
    }

    try {
      await saveData(table as any, data);
    } catch (err) {
      console.error(`Sync error for ${table} on cloud:`, err);
    }
  },

  deleteEntity: async (table, id) => {
    const stateKeyMap: Record<string, string> = {
      customers: 'customers',
      suppliers: 'suppliers',
      purchase_orders: 'purchaseOrders',
      debts: 'debts',
      qris: 'paymentQrs',
      vouchers: 'vouchers',
      activity_logs: 'activityLogs',
      subscriptions: 'subscriptions',
      staff: 'staff',
      resellers: 'resellers',
      commissions: 'commissions'
    };

    const key = stateKeyMap[table];
    if (key) {
      const currentList = (get() as any)[key] as any[] || [];
      const updatedList = currentList.filter((item: any) => item.id !== id);
      set({ [key]: updatedList });
      saveLocal(table, updatedList);
    }

    try {
      await deleteData(table as any, id);
    } catch (err) {
      console.error(`Delete error for ${table} on cloud:`, err);
    }
  }
}));
