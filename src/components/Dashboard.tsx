import React, { useState, useMemo, memo, useRef, useEffect } from 'react';
import { Product, Category } from '../types';
import { Search, Filter, Grid, List as ListIcon, ShoppingBag, Plus, Scan, AlertTriangle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { formatCurrency } from '../lib/utils';
import BarcodeScanner from './BarcodeScanner';
import { toast } from 'sonner';

interface DashboardProps {
  products: Product[];
  categories: Category[];
  onAddToCart: (p: Product) => void;
}

const ProductCard = memo(({ product, onAddToCart }: { product: Product, onAddToCart: (p: Product) => void }) => {
  const isOutOfStock = product.stock <= 0;
  const isLowStock = !isOutOfStock && product.stock <= (product.minStock || 0);

  const handleClick = () => {
    if (isOutOfStock) {
      toast.error(`Stok ${product.name} habis! Hubungi admin/supplier untuk re-order.`, { icon: '🚫' });
      return;
    }
    onAddToCart(product);
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      whileTap={isOutOfStock ? {} : { scale: 0.98 }}
      onClick={handleClick}
      className={`product-card p-2.5 sm:p-4 rounded-xl border shadow-sm flex flex-col group transition-all relative ${
        isOutOfStock
          ? 'bg-slate-50 border-slate-200 select-none cursor-not-allowed opacity-60'
          : isLowStock
            ? 'bg-amber-50/10 border-amber-300 dark:border-amber-700/50 hover:border-amber-400 hover:shadow-md cursor-pointer'
            : 'bg-white border-slate-200 hover:border-red-250 hover:shadow-md cursor-pointer active:bg-slate-50'
      }`}
    >
      <div className="relative aspect-square rounded-lg overflow-hidden bg-slate-100 mb-2 sm:mb-4 flex items-center justify-center">
        <img
          src={product.image}
          alt={product.name}
          className={`w-full h-full object-cover transition-transform duration-500 ${isOutOfStock ? '' : 'group-hover:scale-110'}`}
          loading="lazy"
        />
        <div className="absolute inset-0 bg-red-900/0 transition-all group-hover:bg-red-900/5" />
        
        {/* Out of Stock Overlay */}
        {isOutOfStock && (
          <div className="absolute inset-0 bg-black/60 backdrop-blur-[1px] flex items-center justify-center p-2">
            <span className="bg-red-600 text-white text-[9px] sm:text-[11px] font-black tracking-widest px-2.5 py-1 rounded-md uppercase shadow-lg border border-red-500 whitespace-nowrap">
              Stok Habis
            </span>
          </div>
        )}

        {/* Low Stock Indicator Badge */}
        {!isOutOfStock && isLowStock && (
          <div className="absolute top-1 left-1 sm:top-2 sm:left-2 bg-amber-500 text-white text-[8px] sm:text-[9px] font-black px-2 py-0.5 sm:py-1 rounded-md uppercase tracking-wider shadow-md border border-amber-400 flex items-center gap-1.5 z-10 animate-pulse">
            <span className="w-1.5 h-1.5 rounded-full bg-white block animate-ping"></span>
            Stok Kritis: {product.stock}
          </div>
        )}

        {/* Regular Stock Badge */}
        {!isOutOfStock && !isLowStock && product.stock <= (product.minStock || 0) * 1.5 && (
          <div className="absolute top-1 left-1 sm:top-2 sm:left-2 bg-slate-100 text-slate-700 text-[8px] sm:text-[10px] font-bold px-1.5 py-0.5 rounded shadow-sm border border-slate-200">
            Sisa: {product.stock}
          </div>
        )}

        {product.sku && (
          <div className="absolute bottom-1 left-1 sm:bottom-2 sm:left-2 bg-black/50 text-white text-[7px] sm:text-[8px] font-bold px-1.5 py-0.5 rounded backdrop-blur-sm">
            {product.sku}
          </div>
        )}
      </div>
      
      <div className="flex-1 flex flex-col pt-0 sm:pt-1">
        <h3 className="text-[11px] sm:text-sm font-bold text-slate-800 line-clamp-2 leading-tight mb-1 uppercase flex items-start gap-1">
          {isLowStock && <AlertTriangle className="w-3.5 h-3.5 text-amber-500 shrink-0 self-center" />}
          {product.name}
        </h3>
        <div className="mt-auto">
          <p className="text-[9px] sm:text-xs text-slate-500 mb-1.5 sm:mb-2">{product.category}</p>
          <div className="flex items-center justify-between">
            <div className="flex flex-col">
              <span className="text-red-600 font-bold text-xs sm:text-sm tracking-tight">{formatCurrency(product.price)}</span>
              {isLowStock && (
                <span className="text-[9px] font-semibold text-amber-600 dark:text-amber-400 mt-0.5">Min Stok: {product.minStock}</span>
              )}
            </div>
            
            {!isOutOfStock && (
              <div className={`w-6 h-6 sm:w-8 sm:h-8 rounded-lg flex items-center justify-center transition-all shadow-sm ${
                isLowStock 
                  ? 'bg-amber-100 text-amber-700 hover:bg-amber-600 hover:text-white' 
                  : 'bg-red-50 text-red-600 group-hover:bg-red-600 group-hover:text-white'
              }`}>
                <Plus className="w-3 h-3 sm:w-4 sm:h-4" />
              </div>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
});

export default function Dashboard({ products, categories, onAddToCart }: DashboardProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [activeCategory, setActiveCategory] = useState('Semua');
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const hasShownToast = useRef(false);

  // Auto trigger alert on page load if there are low stock items
  useEffect(() => {
    if (!hasShownToast.current && products.length > 0) {
      const lowStockList = products.filter(p => p.isActive && p.stock <= (p.minStock || 0));
      if (lowStockList.length > 0) {
        toast.warning(
          `Terdeteksi ${lowStockList.length} produk dengan stok kritis atau habis!`, 
          { 
            description: 'Segera cek tabel peringatan stok di atas daftar produk atau hubungi supplier.',
            icon: '⚠️',
            duration: 8000,
            id: 'low-stock-global-alert'
          }
        );
        hasShownToast.current = true;
      }
    }
  }, [products]);

  // Compute low stock items for dashboard alert notification banner
  const lowStockProducts = useMemo(() => {
    return products.filter(p => p.isActive && p.stock <= (p.minStock || 0));
  }, [products]);

  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      if (!p.isActive) return false;
      const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                           (p.sku && p.sku.toLowerCase().includes(searchTerm.toLowerCase()));
      const matchesCategory = activeCategory === 'Semua' || p.category === activeCategory;
      return matchesSearch && matchesCategory;
    });
  }, [products, searchTerm, activeCategory]);

  const handleAddToCart = useMemo(() => (p: Product) => onAddToCart(p), [onAddToCart]);

  const handleScan = (sku: string) => {
    const product = products.find(p => p.sku === sku && p.isActive);
    if (product) {
      onAddToCart(product);
      setIsScannerOpen(false);
    } else {
      setSearchTerm(sku);
      setIsScannerOpen(false);
    }
  };

  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && searchTerm.trim() !== '') {
      // 1. Check dry matches
      const term = searchTerm.toLowerCase().trim();
      const exactMatch = products.find(p => p.isActive && (
        p.name.toLowerCase() === term || (p.sku && p.sku.toLowerCase() === term)
      ));
      
      if (exactMatch) {
        onAddToCart(exactMatch);
        setSearchTerm('');
        e.preventDefault();
      } else if (filteredProducts.length === 1) {
        onAddToCart(filteredProducts[0]);
        setSearchTerm('');
        e.preventDefault();
      }
    }
  };

  return (
    <div className="flex-1 overflow-y-auto bg-slate-50 p-4 md:p-6 pb-24 md:pb-6">
      <div className="max-w-7xl mx-auto space-y-4 md:space-y-6">
        
        {/* Search & Filter Header - Professional Polish Theme */}
        <div className="flex flex-col lg:flex-row gap-4 items-stretch lg:items-center">
          <div className="relative flex-1 group flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 sm:w-5 sm:h-5 text-slate-400 group-focus-within:text-red-600 transition-colors" />
              <input
                ref={searchInputRef}
                type="text"
                placeholder="Cari produk atau scan barcode... (Tekan [/] untuk cari)"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyDown={handleSearchKeyDown}
                className="block w-full pl-10 pr-4 py-3 sm:py-3.5 border border-slate-200 rounded-2xl bg-white text-xs sm:text-sm focus:ring-4 focus:ring-red-50 focus:border-red-500 focus:outline-none transition-all shadow-sm"
              />
            </div>
            <button
              onClick={() => setIsScannerOpen(true)}
              className="px-4 py-3 sm:py-3.5 bg-white border border-slate-200 rounded-2xl text-slate-600 hover:text-red-600 hover:bg-red-50 hover:border-red-200 transition-all shadow-sm flex items-center gap-2 active:scale-95 shrink-0"
              title="Scan Barcode"
            >
              <Scan size={18} />
              <span className="hidden sm:inline font-bold text-xs uppercase tracking-widest">Scan</span>
            </button>
          </div>
          <div className="flex gap-2 overflow-x-auto pb-2 -mx-4 px-4 sm:mx-0 sm:px-0 lg:pb-0 w-auto scrollbar-hide">
            {['Semua', ...categories.map(c => c.name)].map((cat) => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`px-4 py-2.5 sm:px-6 sm:py-3 rounded-xl sm:rounded-2xl text-[10px] sm:text-xs font-black uppercase tracking-widest whitespace-nowrap transition-all ${
                  activeCategory === cat
                    ? 'bg-red-600 text-white shadow-lg shadow-red-200 active:scale-95'
                    : 'bg-white text-slate-500 border border-slate-200 hover:bg-slate-50 active:scale-95'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Low Stock Warning Banner */}
        {lowStockProducts.length > 0 && (
          <motion.div 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            id="low-stock-banner"
            className="bg-amber-50 dark:bg-amber-950/20 border border-amber-250 dark:border-amber-900/50 rounded-2xl p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-sm"
          >
            <div className="flex items-center gap-3">
              <div className="p-2 bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-400 rounded-xl relative shrink-0">
                <AlertTriangle size={20} className="relative z-10 animate-bounce" />
                <span className="absolute inset-0 bg-amber-400 rounded-xl filter blur-sm opacity-30 animate-pulse"></span>
              </div>
              <div>
                <h4 className="text-sm font-bold text-amber-800 dark:text-amber-300 font-sans tracking-tight">
                  Peringatan: {lowStockProducts.length} Produk Menyentuh Batas Stok Minimum!
                </h4>
                <p className="text-xs text-amber-600 dark:text-amber-400 mt-0.5">
                  Persediaan hampir habis. Pastikan untuk segera memesan ulang barang ke supplier agar operasional tidak terganggu.
                </p>
              </div>
            </div>
            
            <div className="flex gap-2 w-full md:w-auto overflow-x-auto pb-1.5 md:pb-0 scrollbar-hide py-1 shrink-0">
              {lowStockProducts.slice(0, 4).map(p => (
                <div 
                  key={p.id}
                  onClick={() => {
                    setSearchTerm(p.name);
                    searchInputRef.current?.focus();
                  }}
                  className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider bg-white dark:bg-slate-900 border border-amber-200 hover:border-amber-400 dark:border-amber-800 hover:shadow-sm py-1.5 px-3 rounded-xl text-amber-800 dark:text-amber-300 cursor-pointer transition-all"
                  title="Klik untuk menyaring produk"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-red-500 block"></span>
                  {p.name} ({p.stock} {p.unit || 'pcs'})
                </div>
              ))}
              {lowStockProducts.length > 4 && (
                <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400 bg-amber-100/50 hover:bg-amber-100/80 dark:bg-amber-950/30 py-1.5 px-3 rounded-xl align-middle self-center">
                  +{lowStockProducts.length - 4} Lainnya
                </span>
              )}
            </div>
          </motion.div>
        )}

        {/* Product Grid - Professional Polish Theme */}
        <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-2 sm:gap-4 md:gap-4">
          <AnimatePresence mode="popLayout">
            {filteredProducts.map((p) => (
              <ProductCard key={p.id} product={p} onAddToCart={handleAddToCart} />
            ))}
          </AnimatePresence>
        </div>

        {filteredProducts.length === 0 && (
          <div className="py-20 text-center animate-pulse">
            <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Search className="w-10 h-10 text-gray-300" />
            </div>
            <h3 className="text-xl font-bold text-gray-400">Produk tidak ditemukan</h3>
            <p className="text-gray-300">Coba kata kunci lain atau ubah kategori</p>
          </div>
        )}

        <BarcodeScanner 
          isOpen={isScannerOpen} 
          onClose={() => setIsScannerOpen(false)} 
          onScan={handleScan} 
        />
      </div>
    </div>
  );
}
