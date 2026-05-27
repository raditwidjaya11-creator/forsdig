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
const PartnerManager = lazy(() => import('./components/PartnerManager'));
const CustomerDisplay = lazy(() => import('./components/CustomerDisplay'));

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
  X,
  Truck,
  Monitor
} from 'lucide-react';
import { useAuth } from './hooks/useAuth';
import { generateUUID } from './lib/utils';
import LoadingScreen from './components/LoadingScreen';

import { usePOSStore } from './services/posStore';
import { useUserStore } from './services/userStore';

export default function App() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [lastSync, setLastSync] = useState<number | null>(null);
  const isMounted = useRef(true);

  const [hash, setHash] = useState(window.location.hash);
  useEffect(() => {
    const handleHashChange = () => setHash(window.location.hash);
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  const isCustomerDisplayRoute = hash === '#/customer-display' || hash === '#customer-display';
  
  // Stores
  const {
    products, categories, transactions, paymentQrs, storeSettings, vouchers,
    suppliers, customers, purchaseOrders, debts,
    fetchInitialData, addTransaction, updateProduct, deleteProduct,
    addProduct, addCategory, updateCategory, deleteCategory, syncEntity,
    setCategories
  } = usePOSStore();
  
  const {
    userProfile: user,
    fetchUserProfile,
    fetchMutations
  } = useUserStore();

  const [activeTab, setActiveTab] = useState<'kasir' | 'produk' | 'laporan' | 'pengaturan' | 'qr' | 'promosi' | 'karyawan' | 'laporan_voucher' | 'mitra'>('kasir');

  // Callback handlers for Supplier and Client Partner Manager
  const handleAddSupplier = useCallback(async (s: any) => {
    try {
      await syncEntity('suppliers', s);
      await fetchInitialData();
      toast.success('Supplier berhasil ditambahkan');
    } catch (err) {
      toast.error('Gagal menambahkan supplier');
    }
  }, [syncEntity, fetchInitialData]);

  const handleAddClient = useCallback(async (c: any) => {
    try {
      await syncEntity('customers', c);
      await fetchInitialData();
      toast.success('Pelanggan berhasil ditambahkan');
    } catch (err) {
      toast.error('Gagal menambahkan pelanggan');
    }
  }, [syncEntity, fetchInitialData]);

  const handleAddPurchase = useCallback(async (p: any) => {
    try {
      await syncEntity('purchase_orders', p);
      if (p.paymentStatus === 'Hutang') {
        const debt = {
          id: generateUUID(),
          partnerId: p.supplierId,
          partnerType: 'Supplier' as const,
          type: 'Hutang' as const,
          amount: p.total,
          remainingAmount: p.total,
          dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          status: 'Belum Lunas' as const,
          referenceId: p.id,
          timestamp: new Date().toISOString(),
          payments: []
        };
        await syncEntity('debts', debt);
      }
      await fetchInitialData();
      toast.success('PO Pembelian Berhasil Dibuat');
    } catch (err) {
      toast.error('Gagal membuat PO Pembelian');
    }
  }, [syncEntity, fetchInitialData]);

  const handleReceivePurchase = useCallback(async (p: any) => {
    try {
      const updatedPO = {
        ...p,
        status: 'Diterima' as const,
        receivedAt: new Date().toISOString()
      };
      await syncEntity('purchase_orders', updatedPO);

      for (const item of p.items) {
        const product = products.find(pr => pr.id === item.productId);
        if (product) {
          const updatedProduct = {
            ...product,
            stock: (product.stock || 0) + item.quantity
          };
          await syncEntity('products', updatedProduct);
        }
      }

      await fetchInitialData();
      toast.success('Pesanan berhasil diterima dan stok telah ditambahkan');
    } catch (err) {
      toast.error('Gagal memproses penerimaan pesanan');
    }
  }, [products, syncEntity, fetchInitialData]);

  const handleUpdateDebt = useCallback(async (d: any) => {
    try {
      await syncEntity('debts', d);
      await fetchInitialData();
      toast.success('Status hutang/piutang berhasil diperbarui');
    } catch (err) {
      toast.error('Gagal memperbarui status');
    }
  }, [syncEntity, fetchInitialData]);

  const handlePartnerInvoice = useCallback((t: any, custNamePhone?: any) => {
    setSelectedInvoice(t);
    setSelectedCustomer(custNamePhone);
  }, []);
  const [posSubTab, setPosSubTab] = useState<'produk' | 'riwayat'>('produk');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [showPayment, setShowPayment] = useState(false);
  const [showHotkeyGuide, setShowHotkeyGuide] = useState(false);
  const [lastTransaction, setLastTransaction] = useState<Transaction | null>(null);
  const [selectedInvoice, setSelectedInvoice] = useState<Transaction | null>(null);
  const [selectedCustomer, setSelectedCustomer] = useState<{ name: string; address?: string; phone?: string; email?: string; type?: string } | undefined>(undefined);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [showNotifications, setShowNotifications] = useState(false);
  
  // Use our centralized authentication provider state and operations
  const { authState, isSyncing: isAuthSyncing, logout } = useAuth();
  const [isLocalSyncing, setIsLocalSyncing] = useState(false);
  const isSyncing = isAuthSyncing || isLocalSyncing;

  const [discount, setDiscount] = useState(0);
  const [appliedVoucherCode, setAppliedVoucherCode] = useState<string | null>(null);

  // Sync cashier workspace state (cart, total) with Customer Secondary Display in real-time
  useEffect(() => {
    if (!storeSettings) return;

    const channel = new BroadcastChannel('pos_customer_display');
    const commonData = {
      config: storeSettings?.displayConfig,
      storeName: storeSettings?.name,
      storeLogo: storeSettings?.logo
    };

    if (cart.length === 0) {
      channel.postMessage({ type: 'idle', ...commonData });
    } else {
      // Only broadcast if checkout screen is not open (since PaymentModal handles payment screen state)
      if (!showPayment) {
        const subtotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
        const tax = Math.round(subtotal * ((storeSettings.taxRate || 10) / 100));
        const calculatedTotal = subtotal + tax - discount;
        channel.postMessage({
          type: 'cart',
          items: cart,
          total: Math.max(0, calculatedTotal),
          ...commonData
        });
      }
    }

    return () => {
      channel.close();
    };
  }, [cart, showPayment, storeSettings, discount]);

  const handleLogout = useCallback(async () => {
    await logout();
    setCart([]);
  }, [logout]);

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
          case '9':
          case 'u':
          case 'n':
            e.preventDefault();
            setActiveTab('mitra');
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
    setIsLocalSyncing(true);
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
      setIsLocalSyncing(false);
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
    if (product.stock <= 0) {
      toast.error(`Stok ${product.name} telah habis!`, { icon: '🚫' });
      return;
    }

    setCart((prev) => {
      const existing = prev.find((item) => item.id === product.id);
      const currentQty = existing ? existing.quantity : 0;
      
      if (currentQty + 1 > product.stock) {
        toast.error(`Gagal menambah: Stok ${product.name} tidak mencukupi (Maksimal ${product.stock} ${product.unit || 'pcs'}).`, { icon: '⚠️' });
        return prev;
      }

      const remainingStock = product.stock - (currentQty + 1);
      if (remainingStock <= (product.minStock || 0)) {
        if (remainingStock === 0) {
          toast.warning(`Peringatan: Stok ${product.name} akan habis sepenuhnya jika transaksi ini selesai!`, { id: `low-stock-${product.id}`, icon: '🚫' });
        } else {
          toast.warning(`Stok Menipis: ${product.name} tersisa ${remainingStock} ${product.unit || 'pcs'} (Batas minimum: ${product.minStock || 0})`, { id: `low-stock-${product.id}`, icon: '⚠️' });
        }
      } else if (currentQty === 0) {
        toast.success(`Ditambahkan ke keranjang: ${product.name}`, { id: `add-${product.id}`, icon: '📥' });
      }

      if (existing) {
        return prev.map((item) =>
          item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
        );
      }
      return [...prev, { ...product, quantity: 1 }];
    });
  };

  const updateCartQuantity = (id: string, delta: number) => {
    setCart((prev) => {
      let isExceeded = false;
      const updated = prev.map((item) => {
        if (item.id === id) {
          const newQty = Math.max(1, item.quantity + delta);
          
          if (newQty > item.stock) {
            isExceeded = true;
            toast.error(`Gagal menambah: Stok ${item.name} hanya tersisa ${item.stock} ${item.unit || 'pcs'}.`, { icon: '⚠️' });
            return item;
          }
          
          const remainingStock = item.stock - newQty;
          if (remainingStock <= (item.minStock || 0)) {
            if (remainingStock === 0) {
              toast.warning(`Stok ${item.name} akan habis jika terjual!`, { id: `low-stock-${item.id}`, icon: '🚫' });
            } else {
              toast.warning(`Peringatan: Stok ${item.name} menipis (Sisa ${remainingStock} ${item.unit || 'pcs'})`, { id: `low-stock-${item.id}`, icon: '⚠️' });
            }
          }

          return { ...item, quantity: newQty };
        }
        return item;
      });

      return updated;
    });
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

  // Fast-path Customer Display Bypass (Unauthenticated receiver)
  if (isCustomerDisplayRoute) {
    return (
      <div className="fixed inset-0 z-[9999] bg-slate-950 font-sans overflow-hidden">
        <Suspense fallback={<LoadingScreen message="Menyiapkan Monitor Pelanggan..." />}>
          <CustomerDisplay />
        </Suspense>
      </div>
    );
  }

  // Render Layar Memuat Sistem Utama
  if (authState === 'loading') {
    return <LoadingScreen message="Menyiapkan Sistem Kasir ForsDig..." />;
  }

  // Render Layar Autentikasi Login/Register
  if (authState === 'unauthenticated') {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex items-center justify-center p-4">
        <Auth />
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
    { id: 'mitra', label: 'Suplier & Pelanggan', icon: Truck },
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
              {activeTab === 'kasir' ? 'Mesin Kasir' : 
               activeTab === 'mitra' ? 'Suplier & Pelanggan' : 
               activeTab === 'laporan_voucher' ? 'Laporan Voucher' : 
               activeTab === 'promosi' ? 'Promo & Banner' : 
               activeTab === 'qr' ? 'Kelola QRIS' : 
               activeTab === 'karyawan' ? 'Manajemen Staf' : activeTab}
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

            {/* Quick access button to Customer Display Screen */}
            <button
              onClick={() => {
                const url = window.location.origin + window.location.pathname + '#/customer-display';
                const win = window.open(url, '_blank', 'width=1280,height=720,menubar=no,status=no,toolbar=no');
                if (!win) {
                  toast.warning('Pop-up terblokir! Silakan izinkan pop-up di browser Anda, atau kunjungi langsung: ' + url, {
                    duration: 7000,
                    id: 'pop-blocked'
                  });
                } else {
                  toast.success('Layar sekunder pelanggan berhasil dibuka!');
                }
              }}
              title="Mulai Monitor Pelanggan (Dual Display)"
              className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-705 dark:text-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-all hover:shadow-sm active:scale-95"
            >
              <Monitor size={14} className="text-red-600 animate-pulse" />
              <span className="hidden md:inline">Layar Pelanggan</span>
            </button>

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
                
                {activeTab === 'mitra' && (
                  <PartnerManager 
                    suppliers={suppliers}
                    clients={customers}
                    purchaseOrders={purchaseOrders}
                    debts={debts}
                    products={products}
                    transactions={transactions}
                    storeSettings={storeSettings!}
                    onAddSupplier={handleAddSupplier}
                    onAddClient={handleAddClient}
                    onAddPurchase={handleAddPurchase}
                    onReceivePurchase={handleReceivePurchase}
                    onUpdateDebt={handleUpdateDebt}
                    onViewInvoice={handlePartnerInvoice}
                  />
                )}
                
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
