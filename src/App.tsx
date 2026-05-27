import { useState, useEffect, useRef, lazy, Suspense, useCallback } from 'react';
import { Product, CartItem, Transaction, Category } from './types';
import Auth from './components/Auth';
import { Toaster, toast } from 'sonner';

// Lazy loaded components for better performance
const Dashboard = lazy(() => import('./components/Dashboard'));
const InventoryManager = lazy(() => import('./components/InventoryManager'));
const TransactionHistory = lazy(() => import('./components/TransactionHistory'));
const StoreSettings = lazy(() => import('./components/StoreSettings'));
const QRManager = lazy(() => import('./components/QRManager'));
const StaffManager = lazy(() => import('./components/StaffManager'));
const PromotionManager = lazy(() => import('./components/PromotionManager'));
const VoucherReports = lazy(() => import('./components/VoucherReports'));

import Cart from './components/Cart';
import PaymentModal from './components/PaymentModal';
import RecentTransactionsPOS from './components/RecentTransactionsPOS';
import ReceiptModal from './components/ReceiptModal';
import InvoiceModal from './components/InvoiceModal';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ShoppingBag, 
  Package, 
  BarChart3, 
  LogOut, 
  Settings,
  Users,
  Smartphone, 
  Bell,
  RefreshCcw,
  Zap,
  Ticket,
  Keyboard,
  HelpCircle,
  X
} from 'lucide-react';
import { supabase, isSupabaseConfigured, setCachedUserId } from './lib/supabase';
import { generateUUID } from './lib/utils';
import LoadingScreen from './components/LoadingScreen';

import { usePOSStore } from './services/posStore';
import { useUserStore } from './services/userStore';

export default function App() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [lastSync, setLastSync] = useState<number | null>(null);
  const isMounted = useRef(true);
  
  // Stores
  const {
    products, categories, transactions, paymentQrs, storeSettings, vouchers,
    fetchInitialData, addTransaction, updateProduct, deleteProduct,
    addProduct, addCategory, updateCategory, deleteCategory, syncEntity,
    setCategories
  } = usePOSStore();
  
  const {
    userProfile: user,
    fetchUserProfile,
    fetchMutations
  } = useUserStore();

  const [activeTab, setActiveTab] = useState<'kasir' | 'produk' | 'laporan' | 'pengaturan' | 'qr' | 'promosi' | 'karyawan' | 'laporan_voucher'>('kasir');
  const [posSubTab, setPosSubTab] = useState<'produk' | 'riwayat'>('produk');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [showPayment, setShowPayment] = useState(false);
  const [showHotkeyGuide, setShowHotkeyGuide] = useState(false);
  const [lastTransaction, setLastTransaction] = useState<Transaction | null>(null);
  const [selectedInvoice, setSelectedInvoice] = useState<Transaction | null>(null);
  const [selectedCustomer, setSelectedCustomer] = useState<{ name: string; address?: string; phone?: string; email?: string; type?: string } | undefined>(undefined);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [showNotifications, setShowNotifications] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [discount, setDiscount] = useState(0);
  const [appliedVoucherCode, setAppliedVoucherCode] = useState<string | null>(null);

  const [authState, setAuthState] = useState<'loading' | 'authenticated' | 'unauthenticated'>('loading');
  const authStateRef = useRef(authState);
  const lastProcessedUserRef = useRef<string | null>(null);

  useEffect(() => {
    authStateRef.current = authState;
  }, [authState]);

  useEffect(() => {
    let isSubscribed = true;

    // Helper for robust profile fetching with retries (defensive programming)
    const fetchProfileWithRetry = async (userId: string, retries = 3, initialDelay = 400): Promise<boolean> => {
      let delay = initialDelay;
      for (let i = 0; i < retries; i++) {
        if (!isSubscribed) return false;
        console.log(`[ForsDig POS] [Profile Fetch Attempt ${i + 1}/${retries}] Fetching profile for user: ${userId}`);
        
        try {
          const success = await fetchUserProfile(userId);
          if (success) {
            console.log(`[ForsDig POS] Profile successfully loaded on attempt ${i + 1}`);
            return true;
          }
        } catch (err) {
          console.error(`[ForsDig POS] Attempt ${i + 1} failed with error:`, err);
        }

        if (i < retries - 1) {
          console.warn(`[ForsDig POS] Profile not found or not created yet. Retrying in ${delay}ms...`);
          if (i === 1) {
            toast.info("Menyiapkan profil Anda, mohon tunggu...");
          }
          await new Promise((resolve) => setTimeout(resolve, delay));
          delay *= 1.5; // Exponential backoff (e.g., 400ms, 600ms)
        }
      }
      return false;
    };

    const checkUser = async () => {
      // Set a safety timeout to transition out of 'loading' state no matter what
      const timeoutId = setTimeout(() => {
        if (isSubscribed && authStateRef.current === 'loading') {
          console.warn('[ForsDig POS] Startup timeout (15s) reached. Forcing unauthenticated/fallback state.');
          setAuthState('unauthenticated');
        }
      }, 15000);

      try {
        if (!isSupabaseConfigured) {
          const isDemoLocal = localStorage.getItem('pos_demo_logged_in') === 'true';
          if (isDemoLocal) {
            setIsSyncing(true);
            const profileSuccess = await fetchUserProfile('demo-user-id');
            if (profileSuccess) {
              setAuthState('authenticated');
              setLastSync(Date.now());
            } else {
              setAuthState('unauthenticated');
            }
            setIsSyncing(false);
          } else {
            setAuthState('unauthenticated');
          }
          return;
        }

        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError) throw sessionError;
        if (!isSubscribed) return;

        console.log("[ForsDig POS] Initial session check:", session?.user?.id ? `User ${session.user.id}` : "No Active Session");
        
        if (session?.user) {
          const userId = session.user.id;
          setCachedUserId(userId);

          if (lastProcessedUserRef.current === userId) {
            console.log(`[ForsDig POS] Startup session check: User ${userId} is already being processed.`);
            return;
          }
          lastProcessedUserRef.current = userId;

          setIsSyncing(true);
          const profileSuccess = await fetchProfileWithRetry(userId);
          
          if (!isSubscribed) return;
          
          if (profileSuccess) {
            setAuthState('authenticated');
            setLastSync(Date.now());

            Promise.allSettled([
              fetchInitialData(),
              fetchMutations(userId)
            ]).finally(() => {
              if (isSubscribed) setIsSyncing(false);
            });
          } else {
            console.error('[ForsDig POS] Profile initialization failed after all retries in initial check.');
            toast.error("Profil pengguna belum siap atau gagal dimuat dari Supabase. Silakan coba masuk kembali.");
            setAuthState('unauthenticated');
            setIsSyncing(false);
          }
        } else {
          setAuthState('unauthenticated');
        }
      } catch (authErr: any) {
        console.error('[ForsDig POS] Error during startup auth check:', authErr);
        toast.error(`Kesalahan inisialisasi sesi atau jaringan terputus. Silakan masuk kembali.`);
        if (isSubscribed) setAuthState('unauthenticated');
      } finally {
        clearTimeout(timeoutId);
      }
    };

    checkUser();

    if (!isSupabaseConfigured) {
      return () => {
        isSubscribed = false;
      };
    }

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!isSubscribed) return;
      console.log(`[ForsDig POS] Database Auth Event Triggered: ${event} for user: ${session?.user?.id || 'None'}`);
      
      const userId = session?.user?.id || null;
      setCachedUserId(userId);

      if (!userId) {
        lastProcessedUserRef.current = null;
        setAuthState('unauthenticated');
        return;
      }

      if (lastProcessedUserRef.current === userId) {
        console.log(`[ForsDig POS] Auth State Change de-duplicated for user ${userId}.`);
        if (authStateRef.current === 'loading') {
          setAuthState('authenticated');
        }
        return;
      }
      lastProcessedUserRef.current = userId;

      setIsSyncing(true);
      try {
        const profileSuccess = await fetchProfileWithRetry(userId);
        
        if (!isSubscribed) return;

        if (profileSuccess) {
          setAuthState('authenticated');
          setLastSync(Date.now());
          
          Promise.allSettled([
            fetchInitialData(),
            fetchMutations(userId)
          ]).finally(() => {
            if (isSubscribed) setIsSyncing(false);
          });
        } else {
          console.error("[ForsDig POS] Profile fetch failed on Auth State Change after all retries.");
          toast.error("Gagal menyinkronkan profil Anda dengan cloud. Sesi dibatalkan.", { duration: 5000 });
          setAuthState('unauthenticated');
          setIsSyncing(false);
        }
      } catch (err: any) {
        console.error('[ForsDig POS] Auth State change profile resolution error:', err);
        toast.error(`Gagal memuat detail profil Anda: ${err.message || err}`);
        if (isSubscribed) {
          setAuthState('unauthenticated');
          setIsSyncing(false);
        }
      }
    });

    return () => {
      isSubscribed = false;
      subscription.unsubscribe();
    };
  }, []);

  const handleLogin = useCallback(async () => {
    setIsSyncing(true);
    try {
      if (!isSupabaseConfigured) {
        localStorage.setItem('pos_demo_logged_in', 'true');
        const success = await fetchUserProfile('demo-user-id');
        if (success) {
          setAuthState('authenticated');
          setLastSync(Date.now());
          toast.success("Masuk dalam Mode Demo (Offline)!");
        } else {
          toast.error("Gagal memulai Mode Demo.");
          setAuthState('unauthenticated');
        }
        return;
      }

      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        setCachedUserId(session.user.id);
        const success = await fetchUserProfile(session.user.id);
        if (success) {
          setAuthState('authenticated');
          await fetchInitialData();
          setLastSync(Date.now());
          toast.success("Selamat datang kembali!");
        } else {
          toast.error("Profil pengguna tidak ditemukan.");
          setAuthState('unauthenticated');
        }
      }
    } catch (err) {
      console.error("[POS-AUTH] Login callback error:", err);
      toast.error("Gagal memverifikasi sesi login.");
    } finally {
      setIsSyncing(false);
    }
  }, [fetchUserProfile, fetchInitialData]);

  const handleLogout = useCallback(async () => {
    try {
      lastProcessedUserRef.current = null;
      setCachedUserId(null);
      if (!isSupabaseConfigured) {
        localStorage.removeItem('pos_demo_logged_in');
        setAuthState('unauthenticated');
        setCart([]);
        toast.success("Berhasil keluar dari Mode Demo.");
        return;
      }

      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      setAuthState('unauthenticated');
      setCart([]);
      toast.success("Berhasil keluar dari akun.");
    } catch (err: any) {
      toast.error(`Gagal logout: ${err.message}`);
    }
  }, []);

  useEffect(() => {
    const handleGlobalKeys = (e: KeyboardEvent) => {
      if (e.key === 'F9') {
        e.preventDefault();
        if (cart.length > 0) {
          setShowPayment(true);
        } else {
          toast.error("Keranjang belanja Anda masih kosong! Tambahkan produk terlebih dahulu.");
        }
        return;
      }

      if (e.key === 'Escape') {
        setShowPayment(false);
        return;
      }

      if (e.altKey) {
        switch (e.key.toLowerCase()) {
          case '1':
          case 'k':
            e.preventDefault();
            setActiveTab('kasir');
            break;
          case '2':
          case 'p':
            e.preventDefault();
            setActiveTab('produk');
            break;
          case '3':
          case 'l':
            e.preventDefault();
            setActiveTab('laporan');
            break;
          case '4':
          case 'q':
            e.preventDefault();
            setActiveTab('qr');
            break;
          case '5':
          case 'm':
            e.preventDefault();
            setActiveTab('promosi');
            break;
          case '6':
          case 'v':
            e.preventDefault();
            setActiveTab('laporan_voucher');
            break;
          case '7':
          case 's':
            e.preventDefault();
            setActiveTab('karyawan');
            break;
          case '8':
          case 'a':
            e.preventDefault();
            setActiveTab('pengaturan');
            break;
        }
      }
    };

    window.addEventListener('keydown', handleGlobalKeys);
    return () => window.removeEventListener('keydown', handleGlobalKeys);
  }, [cart, setActiveTab, setShowPayment]);

  const handleSyncData = useCallback(async () => {
    if (!navigator.onLine) {
      toast.error("Anda sedang offline. Periksa koneksi internet.");
      return;
    }
    setIsSyncing(true);
    try {
      if (user?.id) {
        await Promise.all([
          fetchInitialData(),
          fetchMutations(user.id)
        ]);
        setLastSync(Date.now());
        toast.success("Semua data berhasil disinkronisasi ke cloud.");
      }
    } catch (err) {
      toast.error("Gagal menyinkronkan data.");
    } finally {
      setIsSyncing(false);
    }
  }, [user?.id, fetchInitialData, fetchMutations]);

  // Efek pendeteksi status internet
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      toast.success("Koneksi internet terhubung. Menyinkronkan...", { icon: '🌐' });
      handleSyncData();
    };
    const handleOffline = () => {
      setIsOnline(false);
      toast.warning("Koneksi terputus. Mengaktifkan mode offline lokal.", { duration: 5000, icon: '⚠️' });
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [handleSyncData]);

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
      id: generateUUID(),
      sku: '',
      name: 'Item Manual',
      price: price,
      costPrice: 0,
      category: 'Lainnya',
      image: 'https://images.unsplash.com/photo-1516321497487-e288fb19713f?w=100&h=100&fit=crop',
      stock: 999,
      minStock: 0,
      unit: 'pcs',
      isActive: true
    };
    addToCart(manualProduct);
  };

  const handlePaymentSuccess = async (
    method: string, 
    amountPaid: number, 
    details?: any, 
    status: 'success' | 'pending' = 'success', 
    staffId?: string, 
    resellerId?: string
  ) => {
    const subtotal = cart.reduce((acc, item) => acc + item.price * item.quantity, 0);
    const discountedSubtotal = Math.max(0, subtotal - discount);
    const tax = discountedSubtotal * ((storeSettings?.taxRate || 11) / 100);
    const total = discountedSubtotal + tax;

    const newTransaction: Transaction = {
      id: generateUUID(),
      items: [...cart],
      subtotal,
      tax,
      discount,
      total,
      paymentMethod: method as any,
      status,
      amountPaid,
      change: amountPaid - total,
      timestamp: Date.now(),
      staffId,
      resellerId,
      paymentDetails: details ? {
        ...details,
        cashierName: user?.username
      } : undefined
    };

    await addTransaction(newTransaction);
    
    for (const item of cart) {
      const product = products.find(p => p.id === item.id);
      if (product) {
        const newStock = Math.max(0, product.stock - item.quantity);
        await updateProduct({
          ...product,
          stock: newStock
        });

        if (newStock === 0) {
          toast.error(`Stok Habis: ${product.name}`, { icon: '🚫' });
        } else if (newStock <= (product.minStock || 0)) {
          toast.warning(`Stok Menipis: ${product.name} (Sisa ${newStock})`, { icon: '⚠️' });
        }
      }
    }

    await fetchInitialData();

    setCart([]);
    setDiscount(0);
    setAppliedVoucherCode(null);
    setShowPayment(false);
    setLastTransaction(newTransaction);
    toast.success('Transaksi Berhasil Disimpan');
  };

  const handleUpdateCategories = async (updatedCategories: Category[]) => {
    setCategories(updatedCategories);
    
    for (const cat of updatedCategories) {
      const existing = categories.find(c => c.id === cat.id);
      if (!existing) {
        await addCategory(cat);
      } else if (existing.name !== cat.name) {
        await updateCategory(cat);
      }
    }
    for (const cat of categories) {
      if (!updatedCategories.find(c => c.id === cat.id)) {
        await deleteCategory(cat.id);
      }
    }
  };

  // Render Layar Memuat Sistem Utama
  if (authState === 'loading') {
    return <LoadingScreen message="Menyiapkan Sistem Kasir ForsDig..." />;
  }

  // Render Layar Autentikasi Login/Register
  if (authState === 'unauthenticated') {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex items-center justify-center p-4">
        <Auth onLogin={handleLogin} />
        <Toaster position="top-center" richColors />
      </div>
    );
  }

  // Menu navigasi bilah samping (Sidebar)
  const menuItems = [
    { id: 'kasir', label: 'Mesin Kasir', icon: ShoppingBag },
    { id: 'produk', label: 'Stok & Produk', icon: Package },
    { id: 'laporan', label: 'Riwayat Laporan', icon: BarChart3 },
    { id: 'qr', label: 'Kelola QRIS', icon: Smartphone },
    { id: 'promosi', label: 'Promo & Banner', icon: Zap },
    { id: 'laporan_voucher', label: 'Laporan Voucher', icon: Ticket },
    { id: 'karyawan', label: 'Manajemen Staf', icon: Users },
    { id: 'pengaturan', label: 'Pengaturan Toko', icon: Settings },
  ] as const;

  return (
    <div className="flex h-screen bg-slate-100 dark:bg-slate-950 overflow-hidden text-slate-800 dark:text-slate-100 font-sans">
      <Toaster position="top-right" richColors />

      {/* BILAH SAMPING (SIDEBAR) */}
      <aside className={`${isSidebarOpen ? 'w-64' : 'w-20'} bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 transition-all duration-300 flex flex-col z-20 shrink-0`}>
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          {isSidebarOpen ? (
            <span className="font-bold text-lg tracking-wider text-blue-600 dark:text-blue-400">ForsDig POS</span>
          ) : (
            <ShoppingBag className="h-6 w-6 text-blue-600 mx-auto" />
          )}
          <button 
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500"
          >
            <ShoppingBag className="h-4 w-4" />
          </button>
        </div>

        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                  isActive 
                    ? 'bg-blue-50 text-blue-600 dark:bg-blue-950/50 dark:text-blue-400' 
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50'
                }`}
              >
                <Icon className="h-5 w-5 flex-shrink-0" />
                {isSidebarOpen && <span className="truncate">{item.label}</span>}
              </button>
            );
          })}
        </nav>

        {/* PROFIL PENGGUNA BOTTOM SIDEBAR */}
        <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
          <div className="flex items-center gap-3 mb-3">
            <div className="h-9 w-9 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-sm shrink-0">
              {user?.username?.charAt(0).toUpperCase() || 'U'}
            </div>
            {isSidebarOpen && (
              <div className="overflow-hidden">
                <p className="text-sm font-semibold truncate text-slate-800 dark:text-slate-200">{user?.username || 'Kasir Utama'}</p>
                <p className="text-xs text-slate-500 truncate">{user?.role || 'Staff'}</p>
              </div>
            )}
          </div>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
          >
            <LogOut className="h-5 w-5 flex-shrink-0" />
            {isSidebarOpen && <span>Keluar Sistem</span>}
          </button>
        </div>
      </aside>

      {/* KONTEN UTAMA APLIKASI */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* BILAH ATAS (HEADER) */}
        <header className="h-16 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between px-6 z-10 shrink-0">
          <div className="flex items-center gap-4">
            <h1 className="text-xl font-bold capitalize text-slate-800 dark:text-slate-100">
              {activeTab === 'kasir' ? 'Mesin Kasir' : activeTab}
            </h1>
            <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${
              isOnline ? 'bg-green-100 text-green-700 dark:bg-green-950/50 dark:text-green-400' : 'bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-400'
            }`}>
              <span className={`h-1.5 w-1.5 rounded-full ${isOnline ? 'bg-green-500' : 'bg-amber-500'} animate-pulse`} />
              {isOnline ? 'Cloud Terhubung' : 'Mode Lokal (Offline)'}
            </div>

            <button
              onClick={handleSyncData}
              disabled={isSyncing}
              title="Sinkronisasi Data"
              className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors disabled:opacity-50"
            >
              <RefreshCcw size={16} className={isSyncing ? 'animate-spin' : ''} />
            </button>

            <button
              onClick={() => setShowHotkeyGuide(true)}
              title="Panduan Pintasan Keyboard"
              className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
            >
              <Keyboard size={16} />
            </button>
          </div>

          <div className="flex items-center gap-3">
            {activeTab === 'kasir' && (
              <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
                <button 
                  onClick={() => setPosSubTab('produk')}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${posSubTab === 'produk' ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
                >
                  Daftar Produk
                </button>
                <button 
                  onClick={() => setPosSubTab('riwayat')}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${posSubTab === 'riwayat' ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
                >
                  Transaksi POS
                </button>
              </div>
            )}

            <button 
              onClick={() => setShowNotifications(!showNotifications)}
              className="p-2 rounded-xl bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 relative text-slate-600 dark:text-slate-300"
            >
              <Bell className="h-5 w-5" />
              <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-blue-600" />
            </button>
          </div>
        </header>

        {/* AREA HALAMAN DINAMIS (SUSPENSE) */}
        <main className="flex-1 overflow-hidden p-6 relative bg-slate-50 dark:bg-slate-950">
          <Suspense fallback={
            <div className="absolute inset-0 flex items-center justify-center bg-slate-100/50 dark:bg-slate-950/50 backdrop-blur-xs">
              <div className="flex flex-col items-center gap-3">
                <RefreshCcw className="h-8 w-8 text-blue-600 animate-spin" />
                <p className="text-sm font-medium text-slate-500">Memuat panel halaman...</p>
              </div>
            </div>
          }>
            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.15 }}
                className="h-full"
              >
                {activeTab === 'kasir' && (
                  <div className="grid grid-cols-1 xl:grid-cols-4 gap-6 h-full items-stretch overflow-hidden">
                    <div className="xl:col-span-3 flex flex-col h-full overflow-hidden">
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

                    <div className="xl:col-span-1 h-full flex flex-col overflow-hidden bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800">
                      <Cart 
                        items={cart} 
                        taxRate={storeSettings?.taxRate || 0}
                        discount={discount}
                        vouchers={vouchers}
                        appliedVoucherCode={appliedVoucherCode}
                        onUpdateQuantity={updateCartQuantity}
                        onRemove={removeFromCart}
                        onCheckout={() => setShowPayment(true)}
                        onAddManual={handleAddManual}
                        onUpdateDiscount={setDiscount}
                        onApplyVoucher={setAppliedVoucherCode}
                      />
                    </div>
                  </div>
                )}
                
                {activeTab === 'produk' && (
                  <InventoryManager 
                    products={products}
                    categories={categories}
                    storeSettings={storeSettings!}
                    onAdd={addProduct}
                    onUpdate={updateProduct}
                    onDelete={deleteProduct}
                    onUpdateCategories={handleUpdateCategories}
                  />
                )}

                {activeTab === 'laporan' && (
                  <TransactionHistory 
                    transactions={transactions} 
                    storeSettings={storeSettings!}
                    isOnline={isOnline}
                    onUpdateTransaction={(t) => syncEntity('transactions', t)}
                  />
                )}

                {activeTab === 'qr' && (
                  <QRManager 
                    initialQrs={paymentQrs}
                    onSave={async (q) => { await syncEntity('qris', q); }}
                    onNotify={(msg, type) => {
                      if (type === 'error') toast.error(msg);
                      else toast.success(msg);
                    }}
                  />
                )}

                {activeTab === 'promosi' && <PromotionManager />}
                {activeTab === 'laporan_voucher' && <VoucherReports />}
                {activeTab === 'karyawan' && <StaffManager />}
                
                {activeTab === 'pengaturan' && (
                  <StoreSettings 
                    settings={storeSettings!}
                    onSave={(s) => syncEntity('store_settings', s)}
                    onOpenQRManager={() => setActiveTab('qr')}
                    isOnline={isOnline}
                  />
                )}
              </motion.div>
            </AnimatePresence>
          </Suspense>
        </main>
      </div>

      {/* MODAL TRANSAKSI KASIR DAN DETAIL NOTA */}
      <AnimatePresence>
        {showPayment && (
          <PaymentModal 
            total={(Math.max(0, cart.reduce((acc, item) => acc + item.price * item.quantity, 0) - discount)) * (1 + (storeSettings?.taxRate || 0) / 100)}
            subtotal={cart.reduce((acc, item) => acc + item.price * item.quantity, 0)}
            discount={discount}
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
            storeSettings={storeSettings!}
            customer={selectedCustomer}
            onClose={() => {
              setSelectedInvoice(null);
              setSelectedCustomer(undefined);
            }}
          />
        )}

        {showHotkeyGuide && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowHotkeyGuide(false)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-md"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="relative w-full max-w-lg bg-white dark:bg-slate-950 rounded-3xl p-6 sm:p-8 shadow-2xl overflow-hidden border border-slate-100 dark:border-slate-800"
            >
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 sm:p-2.5 bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 rounded-2xl">
                    <Keyboard size={24} />
                  </div>
                  <div>
                    <h3 className="text-lg font-black uppercase tracking-tight text-slate-800 dark:text-slate-100 leading-none">Pintasan Keyboard</h3>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500 mt-1">Metode Kasir Ultra Cepat</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowHotkeyGuide(false)}
                  className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full text-slate-400 hover:text-slate-650 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-4">
                <div className="p-4 bg-slate-50 dark:bg-slate-900/50 rounded-2xl space-y-3">
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-1">Kasir & Transaksi</p>
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">Fokus Pencarian Produk</span>
                    <kbd className="px-2.5 py-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md text-[10px] font-black shadow-sm text-slate-600 dark:text-slate-200">/</kbd>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">Bayar / Selesaikan Sesi</span>
                    <kbd className="px-2.5 py-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md text-[10px] font-black shadow-sm text-slate-600 dark:text-slate-200">F9</kbd>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">Tutup Pop Up / Dialog</span>
                    <kbd className="px-2.5 py-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md text-[10px] font-black shadow-sm text-slate-600 dark:text-slate-200">ESC</kbd>
                  </div>
                </div>

                <div className="p-4 bg-slate-50 dark:bg-slate-900/50 rounded-2xl space-y-3">
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-1">Navigasi Halaman Utama (Alt + Tombol)</p>
                  <div className="grid grid-cols-2 gap-x-6 gap-y-3 pt-1">
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-slate-500 dark:text-slate-400">Kasir</span>
                      <kbd className="px-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded text-[9px] font-black text-slate-600 dark:text-slate-200">Alt + K / 1</kbd>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-slate-500 dark:text-slate-400">Inventory</span>
                      <kbd className="px-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded text-[9px] font-black text-slate-600 dark:text-slate-200">Alt + P / 2</kbd>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-slate-500 dark:text-slate-400">Laporan</span>
                      <kbd className="px-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded text-[9px] font-black text-slate-600 dark:text-slate-200">Alt + L / 3</kbd>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-slate-500 dark:text-slate-400">QRIS</span>
                      <kbd className="px-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded text-[9px] font-black text-slate-600 dark:text-slate-200">Alt + Q / 4</kbd>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-slate-500 dark:text-slate-400">Promosi</span>
                      <kbd className="px-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded text-[9px] font-black text-slate-600 dark:text-slate-200">Alt + M / 5</kbd>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-slate-500 dark:text-slate-400">Voucher</span>
                      <kbd className="px-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded text-[9px] font-black text-slate-600 dark:text-slate-200">Alt + V / 6</kbd>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-slate-500 dark:text-slate-400">Karyawan</span>
                      <kbd className="px-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded text-[9px] font-black text-slate-600 dark:text-slate-200">Alt + S / 7</kbd>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-slate-500 dark:text-slate-400">Toko</span>
                      <kbd className="px-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded text-[9px] font-black text-slate-600 dark:text-slate-200">Alt + A / 8</kbd>
                    </div>
                  </div>
                </div>
              </div>

              <button
                onClick={() => setShowHotkeyGuide(false)}
                className="w-full mt-6 py-3.5 bg-slate-900 hover:bg-slate-800 text-white dark:bg-slate-800 dark:hover:bg-slate-700 rounded-2xl font-black text-xs uppercase tracking-widest transition-all"
              >
                Paham, Lanjutkan Kerja
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
