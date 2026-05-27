import { create } from 'zustand';
import { 
  Product, Category, Transaction, Supplier, Customer, 
  PurchaseOrder, DebtReceivable, PaymentQR, StoreSettings, Voucher,
  ActivityLog, Subscription, UserProfile, Staff, Reseller, Commission
} from '../types';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { fetchData, saveData, deleteData, snakeToCamel, getActiveUserId } from './supabaseService';
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
  fetchInitialData: () => Promise<void>;
  
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

  fetchInitialData: async () => {
    if (!isSupabaseConfigured) return;
    
    try {
      const userId = await getActiveUserId();
      if (!userId) return;

      set({ isLoading: true });

      // Parallelize with individual error handling to ensure one table error doesn't break everything
      const fetchWithCatch = async <T>(table: any): Promise<T[]> => {
        try {
          return await fetchData<T>(table);
        } catch (err) {
          console.error(`[ForsDig POS] Individual fetch error for ${table}:`, err);
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

      set({
        products: p.length > 0 ? p : [],
        categories: cat.length > 0 ? cat : [
          { id: '1', name: 'Makanan' },
          { id: '2', name: 'Minuman' },
          { id: '3', name: 'Snack' },
          { id: '4', name: 'Lainnya' }
        ],
        transactions: tx,
        customers: cust,
        suppliers: supp,
        purchaseOrders: po,
        debts: d,
        paymentQrs: qr,
        storeSettings: s[0] || {
          id: generateUUID(),
          name: 'ForsDig POS',
          address: 'Kawasan Bisnis Digital, Jakarta Selatan',
          phone: '021-555-0123',
          email: 'kontak@forsdig.com',
          logo: '',
          footerMessage: 'Terima kasih atas kunjungan Anda!',
          taxRate: 11
        },
        vouchers: v,
        activityLogs: l,
        subscriptions: sub,
        staff: st,
        resellers: res,
        commissions: com,
        isLoading: false
      });
    } catch (globalErr) {
      console.error('[ForsDig POS] fetchInitialData critical error:', globalErr);
      set({ isLoading: false });
    }
  },

  setProducts: (products) => set({ products }),
  
  addProduct: async (product) => {
    const { products } = get();
    set({ products: [product, ...products] });
    try {
      await saveData('products', product);
    } catch (err) {
      toast.error('Gagal menyimpan produk ke cloud');
    }
  },

  updateProduct: async (product) => {
    const { products } = get();
    set({ products: products.map(p => p.id === product.id ? product : p) });
    try {
      await saveData('products', product);
    } catch (err) {
      toast.error('Gagal memperbarui produk di cloud');
    }
  },

  deleteProduct: async (id) => {
    const { products } = get();
    set({ products: products.filter(p => p.id !== id) });
    try {
      await deleteData('products', id);
    } catch (err) {
      toast.error('Gagal menghapus produk dari cloud');
    }
  },

  setCategories: (categories) => set({ categories }),
  
  addCategory: async (category) => {
    const { categories } = get();
    set({ categories: [...categories, category] });
    try {
      await saveData('categories', category);
    } catch (err) {
      toast.error('Gagal menyimpan kategori ke cloud');
    }
  },

  updateCategory: async (category) => {
    const { categories } = get();
    set({ categories: categories.map(c => c.id === category.id ? category : c) });
    try {
      await saveData('categories', category);
    } catch (err) {
      toast.error('Gagal memperbarui kategori di cloud');
    }
  },

  deleteCategory: async (id) => {
    const { categories } = get();
    set({ categories: categories.filter(c => c.id !== id) });
    try {
      await deleteData('categories', id);
    } catch (err) {
      toast.error('Gagal menghapus kategori dari cloud');
    }
  },

  addTransaction: async (transaction) => {
    const { transactions } = get();
    set({ transactions: [transaction, ...transactions] });
    try {
      await saveData('transactions', transaction);
    } catch (err) {
      console.error('Failed to sync transaction:', err);
    }
  },

  syncEntity: async (table, data) => {
    try {
      await saveData(table as any, data);
    } catch (err) {
      console.error(`Sync error for ${table}:`, err);
    }
  },

  deleteEntity: async (table, id) => {
    try {
      await deleteData(table as any, id);
    } catch (err) {
      console.error(`Delete error for ${table}:`, err);
    }
  }
}));
