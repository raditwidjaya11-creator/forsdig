import { useState, useEffect, useRef, lazy, Suspense, memo } from 'react';
import { Product, CartItem, Transaction, User, PaymentQR } from './types';
import { INITIAL_PRODUCTS } from './constants';
import Auth from './components/Auth';
import { Toaster, toast } from 'sonner';

// Lazy loaded components for better performance
const Dashboard = lazy(() => import('./components/Dashboard'));
const InventoryManager = lazy(() => import('./components/InventoryManager'));
const TransactionHistory = lazy(() => import('./components/TransactionHistory'));
const PartnerManager = lazy(() => import('./components/PartnerManager'));
const StoreSettings = lazy(() => import('./components/StoreSettings'));
const PPOBDashboard = lazy(() => import('./components/PPOB/PPOBDashboard'));
const AdminPPOB = lazy(() => import('./components/PPOB/AdminPPOB'));
const QRManager = lazy(() => import('./components/QRManager'));
const CustomerDisplay = lazy(() => import('./components/CustomerDisplay'));

import Cart from './components/Cart';
import PaymentModal from './components/PaymentModal';
import ReceiptModal from './components/ReceiptModal';
import RecentTransactionsPOS from './components/RecentTransactionsPOS';
import InvoiceModal from './components/InvoiceModal';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ShoppingBag, 
  Package, 
  BarChart3, 
  LogOut, 
  LayoutDashboard, 
  Sun, 
  Moon,
  Menu,
  X,
  Settings,
  Users,
  Smartphone, 
  Bell,
  AlertTriangle,
  RefreshCcw,
  Cloud,
  ShieldCheck,
  Monitor
} from 'lucide-react';
import { StoreSettings as StoreSettingsType, Supplier, Client, PurchaseOrder, DebtReceivable, PPOBTransaction, Category, PPOBService, ApiSettings, MarkupSettings, PromoBanner, BroadcastNotification } from './types';
import { fetchData, saveData, deleteData } from './services/supabaseService';
import { isSupabaseConfigured } from './lib/supabase';
import LoadingScreen from './components/LoadingScreen';

export default function App() {
  const getInitialUser = () => {
    const saved = localStorage.getItem('pos_user');
    return saved ? JSON.parse(saved) : null;
  };

  const initialUser = getInitialUser();
  const isMounted = useRef(true);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [user, setUser] = useState<User | null>(initialUser);

  const getStorageKey = (key: string, userId?: string) => {
    const id = userId || user?.id;
    return id ? `pos_u${id}_${key}` : `pos_guest_${key}`;
  };

  const [activeTab, setActiveTab] = useState<'kasir' | 'produk' | 'laporan' | 'pengaturan' | 'mitra' | 'ppob' | 'qr' | 'admin_ppob'>('kasir');
  const [posSubTab, setPosSubTab] = useState<'produk' | 'riwayat'>('produk');
  
  const [products, setProducts] = useState<Product[]>(() => {
    const saved = localStorage.getItem(getStorageKey('products', initialUser?.id));
    return saved ? JSON.parse(saved) : INITIAL_PRODUCTS;
  });
  const [categories, setCategories] = useState<Category[]>(() => {
    const saved = localStorage.getItem(getStorageKey('categories', initialUser?.id));
    if (saved) return JSON.parse(saved);
    return [
      { id: '1', name: 'Makanan' },
      { id: '2', name: 'Minuman' },
      { id: '3', name: 'Snack' },
      { id: '4', name: 'Lainnya' }
    ];
  });
  const [cart, setCart] = useState<CartItem[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>(() => {
    const saved = localStorage.getItem(getStorageKey('transactions', initialUser?.id));
    return saved ? JSON.parse(saved) : [];
  });
  const [ppobTransactions, setPpobTransactions] = useState<PPOBTransaction[]>(() => {
    const saved = localStorage.getItem(getStorageKey('ppob_transactions', initialUser?.id));
    return saved ? JSON.parse(saved) : [];
  });
  const [ppobServices, setPpobServices] = useState<PPOBService[]>(() => {
    const saved = localStorage.getItem(getStorageKey('ppob_services', initialUser?.id));
    if (saved) return JSON.parse(saved);
    return [
      { id: '1', category: 'Pulsa', name: 'Telkomsel 10,000', provider: 'Telkomsel', price: 10500, adminFee: 2000 },
      { id: '2', category: 'Paket Data', name: 'Telkomsel 10GB 30 Hari', provider: 'Telkomsel', price: 85000, adminFee: 2000 },
      { id: '3', category: 'PLN', name: 'Token Listrik 20,000', provider: 'PLN', price: 20000, adminFee: 3000 },
      { id: '4', category: 'PLN', name: 'Token Listrik 100,000', provider: 'PLN', price: 100000, adminFee: 3000 },
      { id: '5', category: 'E-Wallet', name: 'Dana Topup 50,000', provider: 'Dana', price: 50000, adminFee: 2500 },
      { id: '6', category: 'PDAM', name: 'Tagihan Air PDAM', provider: 'PDAM', price: 0, adminFee: 5000 },
    ];
  });
  const [suppliers, setSuppliers] = useState<Supplier[]>(() => {
    const saved = localStorage.getItem(getStorageKey('suppliers', initialUser?.id));
    return saved ? JSON.parse(saved) : [];
  });
  const [clients, setClients] = useState<Client[]>(() => {
    const saved = localStorage.getItem(getStorageKey('clients', initialUser?.id));
    return saved ? JSON.parse(saved) : [];
  });
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>(() => {
    const saved = localStorage.getItem(getStorageKey('purchases', initialUser?.id));
    return saved ? JSON.parse(saved) : [];
  });
  const [debts, setDebts] = useState<DebtReceivable[]>(() => {
    const saved = localStorage.getItem(getStorageKey('debts', initialUser?.id));
    return saved ? JSON.parse(saved) : [];
  });
  const [paymentQrs, setPaymentQrs] = useState<PaymentQR[]>(() => {
    const saved = localStorage.getItem(getStorageKey('qrs', initialUser?.id));
    return saved ? JSON.parse(saved) : [];
  });
  const [showPayment, setShowPayment] = useState(false);
  const [lastTransaction, setLastTransaction] = useState<Transaction | null>(null);
  const [selectedInvoice, setSelectedInvoice] = useState<Transaction | null>(null);
  const [selectedCustomer, setSelectedCustomer] = useState<{ name: string; address?: string; phone?: string; email?: string; type?: string } | undefined>(undefined);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [showNotifications, setShowNotifications] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSync, setLastSync] = useState<number | null>(() => {
    const saved = localStorage.getItem(getStorageKey('last_sync', initialUser?.id));
    return saved ? parseInt(saved) : null;
  });
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [storeSettings, setStoreSettings] = useState<StoreSettingsType>(() => {
    const saved = localStorage.getItem(getStorageKey('settings', initialUser?.id));
    return saved ? JSON.parse(saved) : {
      name: 'forsdig',
      address: 'Kawasan Bisnis Digital, Jakarta Selatan',
      phone: '021-555-0123',
      email: 'kontak@forsdig.com',
      logo: '',
      footerMessage: 'Terima kasih atas kunjungan Anda!',
      taxRate: 11,
      printerServiceUuid: ''
    };
  });

  const [users, setUsers] = useState<User[]>(() => {
    const saved = localStorage.getItem(getStorageKey('users', initialUser?.id));
    return saved ? JSON.parse(saved) : [];
  });

  const [apiSettings, setApiSettings] = useState<ApiSettings[]>(() => {
    const saved = localStorage.getItem(getStorageKey('api_settings', initialUser?.id));
    if (saved) return JSON.parse(saved);
    return [
      { provider: 'Digiflazz', apiKey: '', apiId: '', username: '', endpointUrl: 'https://api.digiflazz.com/v1', isActive: false },
      { provider: 'Tripay', apiKey: '', secretKey: '', endpointUrl: 'https://tripay.co.id/api', isActive: false },
    ];
  });

  const [markupSettings, setMarkupSettings] = useState<MarkupSettings>(() => {
    const saved = localStorage.getItem(getStorageKey('markup_settings', initialUser?.id));
    return saved ? JSON.parse(saved) : {
      type: 'flat',
      value: 2000,
      categoryMarkups: {}
    };
  });

  const [promos, setPromos] = useState<PromoBanner[]>(() => {
    const saved = localStorage.getItem(getStorageKey('promos', initialUser?.id));
    return saved ? JSON.parse(saved) : [];
  });

  const [broadcasts, setBroadcasts] = useState<BroadcastNotification[]>(() => {
    const saved = localStorage.getItem(getStorageKey('broadcasts', initialUser?.id));
    return saved ? JSON.parse(saved) : [];
  });

  const isCustomerDisplayMode = typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('display') === 'customer';

  const channelRef = useRef<BroadcastChannel | null>(null);

  useEffect(() => {
    isMounted.current = true;
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      isMounted.current = false;
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  useEffect(() => {
    if (activeTab === 'kasir' || activeTab === 'display') {
      try {
        if (!channelRef.current) {
          channelRef.current = new BroadcastChannel('pos_customer_display');
        }
      } catch (err) {
        console.warn('[ForsDig POS] BroadcastChannel Initialization Error:', err);
      }
    }
    
    return () => {
      if (channelRef.current) {
        try {
          channelRef.current.close();
        } catch (err) {
          // Ignore close errors
        }
        channelRef.current = null;
      }
    };
  }, [activeTab]);

  const lowStockProducts = products.filter(p => p.stock <= (p.minStock || 0) && p.isActive);

  useEffect(() => {
    const channel = new BroadcastChannel('pos_customer_display');
    const commonData = {
      config: storeSettings.displayConfig,
      storeName: storeSettings.name,
      storeLogo: storeSettings.logo
    };

    try {
      if (cart.length > 0) {
        const total = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0) * (1 + (storeSettings.taxRate || 0) / 100);
        channel.postMessage({
          type: 'cart',
          items: cart,
          total: total,
          ...commonData
        });
      } else {
        channel.postMessage({ 
          type: 'idle',
          ...commonData
        });
      }
    } catch (err) {
      console.warn('[ForsDig POS] BroadcastChannel Error:', err);
    }

    return () => {
      try {
        channel.close();
      } catch (err) {
        // Silently fail if channel is already closed
      }
    };
  }, [cart, storeSettings]);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const syncWithSupabase = async () => {
    if (!user || !isOnline || !isSupabaseConfigured) return;
    setIsSyncing(true);
    try {
      await Promise.all([
        products.length > 0 ? saveData('products', products) : Promise.resolve(),
        suppliers.length > 0 ? saveData('suppliers', suppliers) : Promise.resolve(),
        clients.length > 0 ? saveData('clients', clients) : Promise.resolve(),
        transactions.length > 0 ? saveData('transactions', transactions) : Promise.resolve(),
        purchaseOrders.length > 0 ? saveData('purchase_orders', purchaseOrders) : Promise.resolve(),
        debts.length > 0 ? saveData('debts', debts) : Promise.resolve(),
        ppobTransactions.length > 0 ? saveData('ppob_transactions', ppobTransactions) : Promise.resolve(),
        paymentQrs.length > 0 ? saveData('payment_qrs', paymentQrs) : Promise.resolve(),
        saveData('store_settings', { ...storeSettings, id: 'default-settings' })
      ]);
      
      if (isMounted.current) {
        setLastSync(Date.now());
        toast.success('Data berhasil disinkronkan dengan Supabase');
      }
      localStorage.setItem('pos_last_sync', Date.now().toString());
    } catch (error) {
      console.error('[ForsDig POS] Sync Error:', error);
      if (isMounted.current) {
        toast.error('Sinkronisasi gagal. Pastikan koneksi stabil.');
      }
    } finally {
      if (isMounted.current) {
        setIsSyncing(false);
      }
    }
  };

  const saveProducts = (updated: Product[]) => {
    setProducts(updated);
    localStorage.setItem(getStorageKey('products'), JSON.stringify(updated));
  };

  const saveCategories = (updated: Category[]) => {
    setCategories(updated);
    localStorage.setItem(getStorageKey('categories'), JSON.stringify(updated));
  };

  const saveSuppliers = (updated: Supplier[]) => {
    setSuppliers(updated);
    localStorage.setItem(getStorageKey('suppliers'), JSON.stringify(updated));
  };

  const saveClients = (updated: Client[]) => {
    setClients(updated);
    localStorage.setItem(getStorageKey('clients'), JSON.stringify(updated));
  };

  const savePurchases = (updated: PurchaseOrder[]) => {
    setPurchaseOrders(updated);
    localStorage.setItem(getStorageKey('purchases'), JSON.stringify(updated));
  };

  const saveDebts = (updated: DebtReceivable[]) => {
    setDebts(updated);
    localStorage.setItem(getStorageKey('debts'), JSON.stringify(updated));
  };

  const savePpob = (updated: PPOBTransaction[]) => {
    setPpobTransactions(updated);
    localStorage.setItem(getStorageKey('ppob_transactions'), JSON.stringify(updated));
  };

  const savePPOBServices = (updated: PPOBService[]) => {
    setPpobServices(updated);
    localStorage.setItem(getStorageKey('ppob_services'), JSON.stringify(updated));
  };

  const saveTransactions = (updated: Transaction[]) => {
    setTransactions(updated);
    localStorage.setItem(getStorageKey('transactions'), JSON.stringify(updated));
  };

  const savePaymentQrs = async (updated: PaymentQR[]) => {
    setPaymentQrs(updated);
    localStorage.setItem(getStorageKey('qrs'), JSON.stringify(updated));
  };

  const saveSettings = (updated: StoreSettingsType) => {
    setStoreSettings(updated);
    localStorage.setItem(getStorageKey('settings'), JSON.stringify(updated));
  };

  const saveUsers = (updated: User[]) => {
    setUsers(updated);
    localStorage.setItem(getStorageKey('users'), JSON.stringify(updated));
  };

  const saveApiSettings = (updated: ApiSettings[]) => {
    setApiSettings(updated);
    localStorage.setItem(getStorageKey('api_settings'), JSON.stringify(updated));
  };

  const saveMarkupSettings = (updated: MarkupSettings) => {
    setMarkupSettings(updated);
    localStorage.setItem(getStorageKey('markup_settings'), JSON.stringify(updated));
  };

  const savePromos = (updated: PromoBanner[]) => {
    setPromos(updated);
    localStorage.setItem(getStorageKey('promos'), JSON.stringify(updated));
  };

  const saveBroadcasts = (updated: BroadcastNotification[]) => {
    setBroadcasts(updated);
    localStorage.setItem(getStorageKey('broadcasts'), JSON.stringify(updated));
  };

  const resetBusinessData = (userId?: string) => {
    const id = userId || user?.id;
    if (!id) return;

    const keys = [
      'products', 'categories', 'transactions', 'ppob_transactions', 
      'ppob_services', 'suppliers', 'clients', 'purchases', 
      'debts', 'qrs', 'last_sync', 'settings', 
      'api_settings', 'markup_settings', 'promos', 'broadcasts', 'users'
    ];
    keys.forEach(k => localStorage.removeItem(`pos_u${id}_${k}`));
    
    // If resetting current user, reset local states too
    if (id === user?.id) {
      setProducts(INITIAL_PRODUCTS);
      setCategories([
        { id: '1', name: 'Makanan' },
        { id: '2', name: 'Minuman' },
        { id: '3', name: 'Snack' },
        { id: '4', name: 'Lainnya' }
      ]);
      setCart([]);
      setTransactions([]);
      setPpobTransactions([]);
      setPpobServices([
        { id: '1', category: 'Pulsa', name: 'Telkomsel 10,000', provider: 'Telkomsel', price: 10500, adminFee: 2000 },
        { id: '2', category: 'Paket Data', name: 'Telkomsel 10GB 30 Hari', provider: 'Telkomsel', price: 85000, adminFee: 2000 },
        { id: '3', category: 'PLN', name: 'Token Listrik 20,000', provider: 'PLN', price: 20000, adminFee: 3000 },
        { id: '4', category: 'PLN', name: 'Token Listrik 100,000', provider: 'PLN', price: 100000, adminFee: 3000 },
        { id: '5', category: 'E-Wallet', name: 'Dana Topup 50,000', provider: 'Dana', price: 50000, adminFee: 2500 },
        { id: '6', category: 'PDAM', name: 'Tagihan Air PDAM', provider: 'PDAM', price: 0, adminFee: 5000 },
      ]);
      setSuppliers([]);
      setClients([]);
      setPurchaseOrders([]);
      setDebts([]);
      setPaymentQrs([]);
      setApiSettings([
        { provider: 'Digiflazz', apiKey: '', apiId: '', username: '', endpointUrl: 'https://api.digiflazz.com/v1', isActive: false },
        { provider: 'Tripay', apiKey: '', secretKey: '', endpointUrl: 'https://tripay.co.id/api', isActive: false },
      ]);
      setMarkupSettings({
        type: 'flat',
        value: 2000,
        categoryMarkups: {}
      });
      setPromos([]);
      setBroadcasts([]);
      setStoreSettings({
        name: 'forsdig',
        address: 'Kawasan Bisnis Digital, Jakarta Selatan',
        phone: '021-555-0123',
        email: 'kontak@forsdig.com',
        logo: '',
        footerMessage: 'Terima kasih atas kunjungan Anda!',
        taxRate: 11,
        printerServiceUuid: ''
      });
      setLastSync(null);
    }
  };

  const loadUserData = (userId: string) => {
    const get = (k: string) => localStorage.getItem(`pos_u${userId}_${k}`);
    
    const sProducts = get('products');
    setProducts(sProducts ? JSON.parse(sProducts) : INITIAL_PRODUCTS);
    
    const sCategories = get('categories');
    setCategories(sCategories ? JSON.parse(sCategories) : [
      { id: '1', name: 'Makanan' },
      { id: '2', name: 'Minuman' },
      { id: '3', name: 'Snack' },
      { id: '4', name: 'Lainnya' }
    ]);
    
    const sTx = get('transactions');
    setTransactions(sTx ? JSON.parse(sTx) : []);
    
    const sPpobTx = get('ppob_transactions');
    setPpobTransactions(sPpobTx ? JSON.parse(sPpobTx) : []);
    
    const sPpobSv = get('ppob_services');
    setPpobServices(sPpobSv ? JSON.parse(sPpobSv) : [
      { id: '1', category: 'Pulsa', name: 'Telkomsel 10,000', provider: 'Telkomsel', price: 10500, adminFee: 2000 },
      { id: '2', category: 'Paket Data', name: 'Telkomsel 10GB 30 Hari', provider: 'Telkomsel', price: 85000, adminFee: 2000 },
      { id: '3', category: 'PLN', name: 'Token Listrik 20,000', provider: 'PLN', price: 20000, adminFee: 3000 },
      { id: '4', category: 'PLN', name: 'Token Listrik 100,000', provider: 'PLN', price: 100000, adminFee: 3000 },
      { id: '5', category: 'E-Wallet', name: 'Dana Topup 50,000', provider: 'Dana', price: 50000, adminFee: 2500 },
      { id: '6', category: 'PDAM', name: 'Tagihan Air PDAM', provider: 'PDAM', price: 0, adminFee: 5000 },
    ]);

    const sSuppliers = get('suppliers');
    setSuppliers(sSuppliers ? JSON.parse(sSuppliers) : []);
    
    const sClients = get('clients');
    setClients(sClients ? JSON.parse(sClients) : []);
    
    const sPurchases = get('purchases');
    setPurchaseOrders(sPurchases ? JSON.parse(sPurchases) : []);
    
    const sDebts = get('debts');
    setDebts(sDebts ? JSON.parse(sDebts) : []);
    
    const sQrs = get('qrs');
    setPaymentQrs(sQrs ? JSON.parse(sQrs) : []);
    
    const sApi = get('api_settings');
    setApiSettings(sApi ? JSON.parse(sApi) : [
      { provider: 'Digiflazz', apiKey: '', apiId: '', username: '', endpointUrl: 'https://api.digiflazz.com/v1', isActive: false },
      { provider: 'Tripay', apiKey: '', secretKey: '', endpointUrl: 'https://tripay.co.id/api', isActive: false },
    ]);
    
    const sMarkup = get('markup_settings');
    setMarkupSettings(sMarkup ? JSON.parse(sMarkup) : {
      type: 'flat',
      value: 2000,
      categoryMarkups: {}
    });
    
    const sPromos = get('promos');
    setPromos(sPromos ? JSON.parse(sPromos) : []);
    
    const sBroadcasts = get('broadcasts');
    setBroadcasts(sBroadcasts ? JSON.parse(sBroadcasts) : []);
    
    const sSettings = get('settings');
    setStoreSettings(sSettings ? JSON.parse(sSettings) : {
      name: 'forsdig',
      address: 'Kawasan Bisnis Digital, Jakarta Selatan',
      phone: '021-555-0123',
      email: 'kontak@forsdig.com',
      logo: '',
      footerMessage: 'Terima kasih atas kunjungan Anda!',
      taxRate: 11,
      printerServiceUuid: ''
    });

    const sUsers = get('users');
    setUsers(sUsers ? JSON.parse(sUsers) : []);

    const sLastSync = get('last_sync');
    setLastSync(sLastSync ? parseInt(sLastSync) : null);
  };

  const handleLogin = (authenticatedUser: User, isSignup?: boolean) => {
    if (isSignup) {
      resetBusinessData(authenticatedUser.id);
    }
    
    setUser(authenticatedUser);
    localStorage.setItem('pos_user', JSON.stringify(authenticatedUser));
    
    // Load this specific user's data
    loadUserData(authenticatedUser.id);
    
    // Only trigger sync if this is a registration and Supabase is configured
    if (isSignup && isOnline && isSupabaseConfigured) {
      syncWithSupabase();
    }
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem('pos_user');
    // We keep business data in localStorage for persistence even after logging out
    // It will be re-synced and potentially updated when logging back in
    setCart([]);
    setShowPayment(false);
    setIsCartOpen(false);
  };

  const addToCart = (product: Product) => {
    setCart((prev) => {
      const existing = prev.find((item) => item.id === product.id);
      if (existing) {
        return prev.map((item) =>
          item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
        );
      }
      return [...prev, { ...product, quantity: 1 }];
    });
  };

  const updateCartQuantity = (id: string, delta: number) => {
    setCart((prev) =>
      prev.map((item) => {
        if (item.id === id) {
          const newQty = Math.max(1, item.quantity + delta);
          return { ...item, quantity: newQty };
        }
        return item;
      })
    );
  };

  const removeFromCart = (id: string) => {
    setCart((prev) => prev.filter((item) => item.id !== id));
  };

  const handleAddManual = (price: number) => {
    const manualProduct: Product = {
      id: `manual-${Date.now()}`,
      sku: '',
      name: 'Item Manual',
      price: price,
      costPrice: 0,
      category: 'Lainnya',
      image: 'https://images.unsplash.com/photo-1516321497487-e288fb19713f?w=100&h=100&fit=crop',
      stock: 1,
      minStock: 0,
      unit: 'pcs',
      isActive: true
    };
    addToCart(manualProduct);
  };

  const handlePaymentSuccess = (method: string, amountPaid: number, details?: any, status: 'success' | 'pending' = 'success') => {
    const subtotal = cart.reduce((acc, item) => acc + item.price * item.quantity, 0);
    const tax = subtotal * (storeSettings.taxRate / 100);
    const total = subtotal + tax;

    const newTransaction: Transaction = {
      id: `TRX-${Date.now()}`,
      items: [...cart],
      subtotal,
      tax,
      total,
      paymentMethod: method as any,
      status,
      amountPaid,
      change: amountPaid - total,
      timestamp: Date.now(),
      paymentDetails: details ? {
        ...details,
        cashierName: user?.username
      } : undefined
    };

    const updatedTransactions = [...transactions, newTransaction];
    saveTransactions(updatedTransactions);
    
    // Update stock
    const updatedProducts = products.map(p => {
      const cartItem = cart.find(item => item.id === p.id);
      if (cartItem) return { ...p, stock: Math.max(0, p.stock - cartItem.quantity) };
      return p;
    });
    saveProducts(updatedProducts);

    setCart([]);
    setShowPayment(false);
    setIsCartOpen(false);
    setLastTransaction(newTransaction);
  };

  if (!user) {
    return <Auth onLogin={handleLogin} />;
  }

  if (isCustomerDisplayMode) {
    return <CustomerDisplay />;
  }

  const navItems = [
    { id: 'kasir', label: 'Kasir', icon: LayoutDashboard },
    { id: 'produk', label: 'Stok', icon: Package },
    { id: 'mitra', label: 'Mitra', icon: Users },
    { id: 'ppob', label: 'PPOB', icon: Smartphone },
    { id: 'laporan', label: 'Laporan', icon: BarChart3 },
    { id: 'pengaturan', label: 'Pengaturan', icon: Settings },
  ];

  return (
    <div className="flex h-screen bg-slate-50 text-slate-800 overflow-hidden font-sans flex-col md:flex-row">
      
      {/* Sidebar Navigation (Desktop) */}
      <aside className="hidden md:flex w-20 bg-slate-900 flex-col items-center py-6 gap-8 shadow-xl z-20">
        <div className="w-12 h-12 bg-white/10 rounded-xl flex items-center justify-center text-white">
           <ShoppingBag className="w-8 h-8" />
        </div>

        <nav className="flex flex-col gap-6">
          {navItems.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                title={tab.label}
                className={`w-12 h-12 rounded-xl flex items-center justify-center transition-all ${
                  activeTab === tab.id
                    ? 'bg-red-600 text-white shadow-lg'
                    : 'text-white/60 hover:text-white hover:bg-white/10'
                }`}
              >
                <Icon className="w-6 h-6" />
              </button>
            );
          })}
        </nav>

        <div className="mt-auto flex flex-col gap-4 items-center">
          <button 
            onClick={handleLogout}
            title="Keluar"
            className="w-12 h-12 text-white/60 hover:text-red-300 transition-colors flex items-center justify-center"
          >
            <LogOut className="w-6 h-6" />
          </button>
          <div className="w-10 h-10 rounded-full bg-slate-800 overflow-hidden border-2 border-white/20">
            <div className="w-full h-full bg-red-600 flex items-center justify-center text-xs font-bold text-white">
               {user.username[0].toUpperCase()}
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col min-w-0 bg-slate-50 relative pb-20 md:pb-0">
        <Toaster position="top-right" richColors closeButton />
        {!isOnline && (
          <div className="bg-slate-800 text-white py-1 px-4 text-[10px] font-bold uppercase tracking-[0.2em] flex items-center justify-center gap-2">
            <div className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse" />
            Mode Offline Aktif - Data Disimpan Lokal
          </div>
        )}
        {/* Header */}
        <header className="sticky top-0 h-14 sm:h-16 flex-shrink-0 bg-white border-b border-slate-200 px-4 md:px-6 flex items-center justify-between shadow-sm z-30">
          <div className="flex items-center gap-3">
             <div className="flex items-center gap-2">
               <div className="text-[13px] sm:text-lg md:text-xl font-bold text-slate-800 tracking-tight uppercase truncate max-w-[110px] xs:max-w-[150px] sm:max-w-none text-nowrap">
                 {activeTab === 'kasir' ? 'Sistem Kasir' : activeTab === 'produk' ? 'Stok Barang' : activeTab === 'mitra' ? 'Manajemen Mitra' : activeTab === 'ppob' ? 'Layanan PPOB' : activeTab === 'laporan' ? 'Laporan Keuntungan' : activeTab === 'qr' ? 'QR Code' : 'Pengaturan Toko'}
               </div>
               {activeTab === 'kasir' && lowStockProducts.length > 0 && (
                 <motion.div
                   initial={{ scale: 0, opacity: 0 }}
                   animate={{ scale: 1, opacity: 1 }}
                   className="flex items-center gap-1 sm:gap-1.5 px-1.5 py-0.5 sm:px-2 sm:py-0.5 bg-red-600 text-white rounded-lg shadow-sm shadow-red-100/50 animate-pulse"
                   title={`${lowStockProducts.length} produk stok rendah`}
                 >
                   <AlertTriangle className="w-2.5 h-2.5 sm:w-3.5 sm:h-3.5" />
                   <span className="text-[8px] sm:text-[10px] font-black uppercase tracking-widest">{lowStockProducts.length}</span>
                 </motion.div>
               )}
             </div>
             {activeTab === 'kasir' && (
               <div className="flex bg-slate-100 p-1 rounded-xl ml-2">
                 <button 
                    onClick={() => setPosSubTab('produk')}
                    className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${posSubTab === 'produk' ? 'bg-white text-red-600 shadow-sm' : 'text-slate-400'}`}
                 >
                   Items
                 </button>
                 <button 
                    onClick={() => setPosSubTab('riwayat')}
                    className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${posSubTab === 'riwayat' ? 'bg-white text-red-600 shadow-sm' : 'text-slate-400'}`}
                 >
                   Riwayat
                 </button>
               </div>
             )}
          </div>
          
          <div className="flex items-center gap-2 sm:gap-4 md:gap-8">
            <div className="hidden lg:flex items-center gap-2 px-3 py-1.5 bg-slate-50 border border-slate-100 rounded-lg">
              <div className={`w-2 h-2 rounded-full ${isSyncing ? 'bg-amber-500 animate-pulse' : isOnline ? 'bg-green-500' : 'bg-red-500'}`} />
              <div className="flex flex-col">
                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none">Status Sync</span>
                <span className="text-[10px] font-bold text-slate-600">
                  {isSyncing ? 'Menyelaraskan...' : lastSync ? `Tersimpan: ${new Date(lastSync).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : 'Belum Sinkron'}
                </span>
              </div>
            </div>

            <button
               onClick={() => window.open(window.location.href + '?display=customer', '_blank', 'width=1024,height=768')}
               title="Buka Layar Pelanggan"
               className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-slate-50 hover:bg-red-50 text-slate-500 hover:text-red-700 rounded-xl border border-slate-100 hover:border-red-100 transition-all font-black text-[9px] uppercase tracking-[0.1em]"
            >
               <Monitor size={14} />
               <span>Display</span>
            </button>

            <div className="relative">
              <button 
                onClick={() => setShowNotifications(!showNotifications)}
                className={`p-1.5 sm:p-2 rounded-xl transition-all relative ${showNotifications ? 'bg-red-50 text-red-600' : 'text-slate-400 hover:bg-slate-50'}`}
              >
                <Bell size={18} className="sm:w-5 sm:h-5" />
                {lowStockProducts.length > 0 && (
                  <span className="absolute top-0 right-0 sm:top-1 sm:right-1 w-3.5 h-3.5 sm:w-4 sm:h-4 bg-red-600 border-2 border-white rounded-full flex items-center justify-center text-[7px] sm:text-[8px] text-white font-bold animate-pulse">
                    {lowStockProducts.length}
                  </span>
                )}
              </button>

              <AnimatePresence mode="wait">
                {showNotifications && (
                  <motion.div
                    key="notifications-panel"
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                    className="absolute right-0 mt-2 w-72 bg-white rounded-2xl shadow-2xl border border-slate-100 overflow-hidden z-[100]"
                  >
                    <div className="p-4 bg-slate-50 border-b border-slate-100 flex justify-between items-center">
                      <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest">Notifikasi</h3>
                      {lowStockProducts.length > 0 && (
                        <span className="px-2 py-0.5 bg-red-100 text-red-600 text-[10px] font-black rounded-full uppercase">
                          {lowStockProducts.length} Low Stock
                        </span>
                      )}
                    </div>
                    
                    <div className="max-h-64 overflow-y-auto">
                      {lowStockProducts.length === 0 ? (
                        <div className="p-8 text-center">
                          <div className="w-10 h-10 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-2">
                             <Bell size={16} className="text-slate-300" />
                          </div>
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Tidak ada notifikasi</p>
                        </div>
                      ) : (
                        <div className="divide-y divide-slate-50">
                          {lowStockProducts.map(p => (
                            <button
                              key={p.id}
                              onClick={() => {
                                setActiveTab('produk');
                                setShowNotifications(false);
                              }}
                              className="w-full p-4 text-left hover:bg-slate-50 transition-colors flex gap-3 items-start group"
                            >
                              <div className="w-8 h-8 rounded-lg bg-red-50 flex items-center justify-center text-red-500 flex-shrink-0 group-hover:bg-red-100 transition-colors">
                                <AlertTriangle size={14} />
                              </div>
                              <div className="space-y-0.5">
                                <p className="text-[11px] font-bold text-slate-800 line-clamp-1">{p.name}</p>
                                <p className="text-[10px] text-slate-500 font-medium">Stok tersisa: <span className="font-black text-red-600">{p.stock} {p.unit}</span></p>
                                <p className="text-[9px] text-slate-400 font-bold uppercase tracking-tighter">Batas Minimal: {p.minStock} {p.unit}</p>
                              </div>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="p-3 bg-slate-50 border-t border-slate-100">
                      <button 
                        onClick={() => {
                          setActiveTab('produk');
                          setShowNotifications(false);
                        }}
                        className="w-full py-2 bg-white border border-slate-200 rounded-xl text-[10px] font-black text-slate-600 uppercase tracking-widest hover:bg-slate-100 transition-all"
                      >
                        Lihat Semua Stok
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <div className="hidden sm:flex flex-col items-end">
              <div className="text-base sm:text-lg font-black text-slate-800 leading-none">
                {new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
              </div>
              <div className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                {new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date())}
              </div>
            </div>
            
            <div className="hidden md:block h-8 w-px bg-slate-200" />

            <div className="flex items-center gap-1.5 sm:gap-2 md:gap-4">
              <div className="hidden lg:flex flex-col items-end">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">Sistem</span>
                <div className="flex items-center gap-1.5">
                  <div className={`w-2 h-2 rounded-full ${isOnline ? 'bg-green-500 animate-pulse' : 'bg-slate-400'}`} />
                  <span className={`text-[10px] font-bold uppercase ${isOnline ? 'text-green-600' : 'text-slate-500'}`}>
                    {isOnline ? 'Online' : 'Offline'}
                  </span>
                  {!isOnline && (
                    <div className="px-1.5 py-0.5 bg-red-100 text-red-600 text-[8px] font-black uppercase rounded shadow-sm">Sync Pending</div>
                  )}
                </div>
              </div>
              <div className="px-2 py-1 sm:px-3 sm:py-1.5 md:px-4 md:py-2 bg-slate-50 border border-slate-200 rounded-xl flex items-center gap-1.5 sm:gap-2 md:gap-3">
                <div className="w-5 h-5 md:w-6 md:h-6 rounded-lg bg-red-600 flex items-center justify-center text-[8px] md:text-[10px] text-white font-bold shrink-0">
                  {user.username[0].toUpperCase()}
                </div>
                <span className="text-[9px] sm:text-[10px] md:text-xs font-black text-slate-700 uppercase truncate max-w-[50px] sm:max-w-[80px] md:max-w-none">{user.username}</span>
              </div>
              <button onClick={handleLogout} className="md:hidden p-1.5 text-slate-400 hover:text-red-600 transition-colors">
                <LogOut size={18} />
              </button>
            </div>
          </div>
        </header>

        <Suspense fallback={<LoadingScreen />}>
          <AnimatePresence mode="wait">
            {activeTab === 'kasir' && (
              <motion.div 
                key="kasir"
                 initial={{ opacity: 0, x: -20 }}
                 animate={{ opacity: 1, x: 0 }}
                 exit={{ opacity: 0, x: 20 }}
                 className="flex h-full flex-col xl:flex-row overflow-hidden"
              >
                {/* Conditional Content for Mobile: Dashboard (Products) or Recent History */}
                <div className="flex-1 flex flex-col h-full overflow-hidden">
                  <AnimatePresence mode="wait">
                    {posSubTab === 'produk' ? (
                      <motion.div 
                        key="pos-produk"
                        initial={{ opacity: 0, scale: 0.98 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 1.02 }}
                        className="flex-1 overflow-hidden flex flex-col"
                      >
                        <Dashboard products={products} categories={categories} onAddToCart={addToCart} />
                      </motion.div>
                    ) : (
                      <motion.div 
                        key="pos-riwayat"
                        initial={{ opacity: 0, scale: 0.98 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 1.02 }}
                        className="flex-1 overflow-hidden flex flex-col"
                      >
                        <RecentTransactionsPOS 
                          transactions={transactions} 
                          onViewReceipt={(t) => setLastTransaction(t)}
                          onViewInvoice={(t) => setSelectedInvoice(t)}
                        />
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
                
                {/* Desktop Cart */}
                <div className="w-[400px] flex-shrink-0 hidden xl:block border-l border-slate-200">
                  <Cart 
                    items={cart} 
                    taxRate={storeSettings.taxRate}
                    onUpdateQuantity={updateCartQuantity}
                    onRemove={removeFromCart}
                    onCheckout={() => setShowPayment(true)}
                    onAddManual={handleAddManual}
                  />
                </div>
              </motion.div>
            )}

            {activeTab === 'produk' && (
              <motion.div 
                key="produk"
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 1.02 }}
                className="flex-1 overflow-y-auto"
              >
                <InventoryManager 
                  products={products}
                  categories={categories}
                  storeSettings={storeSettings}
                  onAdd={(p) => saveProducts([...products, p])}
                  onUpdate={(p) => saveProducts(products.map(pr => pr.id === p.id ? p : pr))}
                  onDelete={(id) => saveProducts(products.filter(p => p.id !== id))}
                  onUpdateCategories={saveCategories}
                />
              </motion.div>
            )}

            {activeTab === 'mitra' && (
              <motion.div 
                key="mitra"
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 1.02 }}
                className="flex-1 overflow-y-auto"
              >
                <PartnerManager 
                  suppliers={suppliers}
                  clients={clients}
                  purchaseOrders={purchaseOrders}
                  debts={debts}
                  products={products}
                  transactions={transactions}
                  storeSettings={storeSettings}
                  onViewInvoice={(t, customer) => {
                    setSelectedInvoice(t);
                    setSelectedCustomer(customer);
                  }}
                  onAddSupplier={(s) => {
                    saveSuppliers([...suppliers, s]);
                  }}
                  onAddClient={(c) => {
                    saveClients([...clients, c]);
                  }}
                  onAddPurchase={(p) => {
                    savePurchases([...purchaseOrders, p]);

                    // If Hutang, add to debts
                    if (p.paymentStatus === 'Hutang') {
                      const newDebt: DebtReceivable = {
                        id: `DEBT-${Math.random().toString(36).substr(2, 9).toUpperCase()}`,
                        partnerId: p.supplierId,
                        partnerType: 'Supplier',
                        type: 'Hutang',
                        amount: p.total,
                        remainingAmount: p.total,
                        dueDate: Date.now() + (30 * 24 * 60 * 60 * 1000), // 30 days default
                        status: 'Belum Lunas',
                        referenceId: p.id,
                        timestamp: Date.now()
                      };
                      saveDebts([...debts, newDebt]);
                    }
                  }}
                  onReceivePurchase={(p) => {
                    // Mark as Diterima
                    const updatedPurchases = purchaseOrders.map(po => 
                      po.id === p.id ? { ...po, status: 'Diterima' as const, receivedAt: Date.now() } : po
                    );
                    savePurchases(updatedPurchases);

                    // Update stock for each item
                    const updatedProducts = products.map(product => {
                      const item = p.items.find(i => i.productId === product.id);
                      if (item) {
                        return { ...product, stock: product.stock + item.quantity };
                      }
                      return product;
                    });
                    saveProducts(updatedProducts);
                  }}
                  onUpdateDebt={(d) => {
                    saveDebts(debts.map(debt => debt.id === d.id ? d : debt));
                  }}
                />
              </motion.div>
            )}

            {activeTab === 'ppob' && (
              <motion.div 
                key="ppob"
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 1.02 }}
                className="flex-1 overflow-y-auto"
              >
                {user && <PPOBDashboard userId={user.id} storeSettings={storeSettings} />}
              </motion.div>
            )}

            {activeTab === 'admin_ppob' && (
              <motion.div 
                key="admin_ppob"
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 1.02 }}
                className="flex-1 overflow-y-auto"
              >
                <AdminPPOB />
              </motion.div>
            )}

            {activeTab === 'laporan' && (
              <motion.div 
                key="laporan"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="flex-1 overflow-y-auto"
              >
                <TransactionHistory 
                  transactions={transactions} 
                  storeSettings={storeSettings}
                  isOnline={isOnline}
                  onUpdateTransaction={(t) => saveTransactions(transactions.map(old => old.id === t.id ? t : old))}
                />
              </motion.div>
            )}

            {activeTab === 'pengaturan' && (
              <motion.div 
                key="pengaturan"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="flex-1 overflow-y-auto"
              >
                <StoreSettings 
                  settings={storeSettings}
                  onSave={saveSettings}
                  onOpenQRManager={() => setActiveTab('qr')}
                  isOnline={isOnline}
                />
              </motion.div>
            )}

            {activeTab === 'qr' && (
              <motion.div 
                key="qr"
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 1.02 }}
                className="flex-1 overflow-y-auto p-4 md:p-8"
              >
                <QRManager 
                  initialQrs={paymentQrs}
                  onSave={savePaymentQrs}
                  onNotify={(msg, type) => {
                    if (type === 'error') toast.error(msg);
                    else toast.success(msg);
                  }}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </Suspense>

        {/* Mobile Bottom Navigation */}
        <nav className="md:hidden fixed bottom-0 left-0 right-0 h-16 bg-white border-t border-slate-200 flex items-center justify-around z-40 shadow-up px-2">
          {navItems.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex flex-col items-center gap-1 transition-all ${
                  activeTab === tab.id ? 'text-red-600' : 'text-slate-400'
                }`}
              >
                <Icon size={24} />
                <span className="text-[10px] font-bold uppercase">{tab.label}</span>
              </button>
            );
          })}
        </nav>
      </main>

      {/* Mobile Cart Trigger / Drawer */}
      {activeTab === 'kasir' && cart.length > 0 && (
         <>
           <button 
             onClick={() => setIsCartOpen(true)}
             className="fixed bottom-20 right-6 xl:hidden p-4 bg-red-600 text-white rounded-full shadow-2xl z-40 flex items-center gap-3 animate-bounce"
           >
             <ShoppingBag />
             <span className="font-bold">{cart.reduce((acc, i) => acc + i.quantity, 0)}</span>
           </button>

           <AnimatePresence>
             {isCartOpen && (
               <div className="fixed inset-0 z-50 xl:hidden">
                 <motion.div 
                   initial={{ opacity: 0 }}
                   animate={{ opacity: 1 }}
                   exit={{ opacity: 0 }}
                   onClick={() => setIsCartOpen(false)}
                   className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
                 />
                 <motion.div 
                   initial={{ y: '100%' }}
                   animate={{ y: 0 }}
                   exit={{ y: '100%' }}
                   transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                   className="absolute inset-x-0 bottom-0 h-[80vh] bg-white rounded-t-[2.5rem] overflow-hidden"
                 >
                   <div className="absolute top-3 left-1/2 -translate-x-1/2 w-12 h-1.5 bg-slate-200 rounded-full" />
                    <Cart 
                      items={cart} 
                      taxRate={storeSettings.taxRate}
                      onUpdateQuantity={updateCartQuantity}
                      onRemove={removeFromCart}
                      onCheckout={() => setShowPayment(true)}
                      onAddManual={handleAddManual}
                    />
                 </motion.div>
               </div>
             )}
           </AnimatePresence>
         </>
      )}

      {/* Modals */}
      <AnimatePresence>
        {showPayment && (
          <PaymentModal 
            total={cart.reduce((acc, item) => acc + item.price * item.quantity, 0) * (1 + storeSettings.taxRate / 100)}
            items={cart}
            paymentQrs={paymentQrs}
            storeSettings={storeSettings}
            onClose={() => setShowPayment(false)}
            onSuccess={handlePaymentSuccess}
          />
        )}
        
        {lastTransaction && (
          <ReceiptModal 
            transaction={lastTransaction}
            storeSettings={storeSettings}
            onClose={() => {
              setLastTransaction(null);
              setActiveTab('kasir');
            }}
            onViewInvoice={(t) => {
              setLastTransaction(null);
              setSelectedInvoice(t);
            }}
          />
        )}

        {selectedInvoice && (
          <InvoiceModal 
            transaction={selectedInvoice}
            storeSettings={storeSettings}
            customer={selectedCustomer}
            onClose={() => {
              setSelectedInvoice(null);
              setSelectedCustomer(undefined);
            }}
          />
        )}
      </AnimatePresence>

    </div>
  );
}
