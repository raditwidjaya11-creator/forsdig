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
      className={`product-card p-3 md:p-4 rounded-2xl border shadow-sm flex flex-col group transition-all relative ${
        isOutOfStock
          ? 'bg-slate-50 border-slate-200 select-none cursor-not-allowed opacity-60'
          : isLowStock
            ? 'bg-amber-50/10 border-amber-300 dark:border-amber-700/50 hover:border-amber-400 hover:shadow-md cursor-pointer'
            : 'bg-white border-slate-200 hover:border-red-250 hover:shadow-md cursor-pointer active:bg-slate-50'
      }`}
    >
      <div className="relative aspect-square rounded-xl overflow-hidden bg-slate-100 mb-2 md:mb-3.5 flex items-center justify-center">
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
            <span className="bg-red-600 text-white text-[9px] md:text-[11px] font-black tracking-widest px-2.5 py-1 rounded-md uppercase shadow-lg border border-red-500 whitespace-nowrap">
              Stok Habis
            </span>
          </div>
        )}

        {/* Low Stock Indicator Badge */}
        {!isOutOfStock && isLowStock && (
          <div className="absolute top-1 left-1 md:top-2 md:left-2 bg-amber-500 text-white text-[8px] md:text-[9px] font-black px-2 py-0.5 md:py-1 rounded-md uppercase tracking-wider shadow-md border border-amber-400 flex items-center gap-1.5 z-10 animate-pulse">
            <span className="w-1.5 h-1.5 rounded-full bg-white block animate-ping"></span>
            Stok Kritis: {product.stock}
          </div>
        )}

        {/* Regular Stock Badge */}
        {!isOutOfStock && !isLowStock && product.stock <= (product.minStock || 0) * 1.5 && (
          <div className="absolute top-1 left-1 md:top-2 md:left-2 bg-slate-100 text-slate-700 text-[8px] md:text-[10px] font-bold px-1.5 py-0.5 rounded shadow-sm border border-slate-200">
            Sisa: {product.stock}
          </div>
        )}

        {product.sku && (
          <div className="absolute bottom-1 left-1 md:bottom-2 md:left-2 bg-black/50 text-white text-[7px] md:text-[8px] font-bold px-1.5 py-0.5 rounded backdrop-blur-sm">
            {product.sku}
          </div>
        )}
      </div>
      
      <div className="flex-1 flex flex-col pt-0 md:pt-0.5">
        <h3 className="text-xs md:text-sm font-extrabold text-slate-900 line-clamp-2 leading-tight mb-1 uppercase flex items-start gap-1 tracking-tight">
          {isLowStock && <AlertTriangle className="w-3.5 h-3.5 text-amber-500 shrink-0 self-center" />}
          {product.name}
        </h3>
        <div className="mt-auto">
          <p className="text-[10px] md:text-xs text-slate-500 mb-1 md:mb-1.5">{product.category}</p>
          <div className="flex items-center justify-between">
            <div className="flex flex-col">
              <span className="text-red-600 font-extrabold text-[13px] md:text-base tracking-tight">{formatCurrency(product.price)}</span>
              {isLowStock && (
                <span className="text-[9px] font-semibold text-amber-600 dark:text-amber-400 mt-0.5">Min Stok: {product.minStock}</span>
              )}
            </div>
            
            {!isOutOfStock && (
              <div className={`w-7 h-7 md:w-8 md:h-8 rounded-xl flex items-center justify-center transition-all shadow-sm ${
                isLowStock 
                  ? 'bg-amber-100 text-amber-700 hover:bg-amber-600 hover:text-white' 
                  : 'bg-red-50 text-red-600 group-hover:bg-red-600 group-hover:text-white'
              }`}>
                <Plus className="w-3.5 h-3.5 md:w-4 md:h-4" />
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
  const [isLowStockExpanded, setIsLowStockExpanded] = useState(false);
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
        <div className="flex flex-col xl:flex-row gap-4 items-stretch xl:items-center">
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
          <div className="flex gap-2 overflow-x-auto pb-2 -mx-4 px-4 sm:mx-0 sm:px-0 xl:pb-0 w-auto scrollbar-hide">
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

        {/* Low Stock Warning Banner & Interactive Widget */}
        {lowStockProducts.length > 0 && (
          <motion.div 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            id="low-stock-widget"
            className="bg-white border-2 border-amber-300 rounded-3xl p-4 md:p-5 flex flex-col gap-4 shadow-xl shadow-amber-500/5 overflow-hidden relative"
          >
            {/* Top Glow Accent */}
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-400 via-yellow-550 to-amber-500" />
            
            <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
              <div className="flex items-start gap-3">
                <div className="p-3 bg-amber-50 text-amber-600 rounded-2xl shrink-0 border border-amber-100 flex items-center justify-center">
                  <AlertTriangle size={24} className="animate-pulse" />
                </div>
                <div>
                  <h4 className="text-sm sm:text-base font-extrabold text-slate-900 tracking-tight flex flex-wrap items-center gap-2">
                    Sistem Kontrol Stok Kritis 
                    <span className="bg-amber-100 text-amber-800 px-2.5 py-0.5 rounded-full text-xs font-black border border-amber-200 animate-pulse">
                      {lowStockProducts.length} Produk
                    </span>
                  </h4>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Terdapat beberapa produk yang menyentuh atau berada di bawah batas stok minimum (<code className="font-mono text-[10px] bg-slate-100 px-1 py-0.5 rounded">minStock</code>). Segera isi ulang untuk mencegah kehabisan barang.
                  </p>
                </div>
              </div>
              
              <div className="flex items-center gap-2 self-start md:self-auto min-w-fit">
                <button
                  type="button"
                  onClick={() => {
                    const draftText = `Daftar Produk Stok Kritis / Re-order (FORSDIG POS):\n\n` +
                      lowStockProducts.map((p, idx) => `${idx + 1}. ${p.name} (SKU: ${p.sku || '-'}) - Sisa Stok: ${p.stock} ${p.unit || 'pcs'} (Batas Min: ${p.minStock || 0})`).join('\n') +
                      `\n\nMohon untuk memproses pemesanan ulang produk-produk di atas secepatnya. Terima kasih.`;
                    
                    try {
                      navigator.clipboard.writeText(draftText);
                      toast.success("Draft re-order berhasil disalin!", {
                        description: "Kirim daftar belanja ini ke distributor atau supplier Anda.",
                        id: "copy-draft-success"
                      });
                    } catch (err) {
                      toast.error("Gagal menyalin draft otomatis.");
                    }
                  }}
                  className="px-3 py-2 text-xs font-bold text-slate-700 bg-slate-100 border border-slate-200 rounded-xl hover:bg-slate-200 transition-all flex items-center gap-1.5 active:scale-95"
                  title="Salin daftar belanja re-order ke clipboard"
                >
                  <span className="text-xs">📋</span> Salin Draft Re-order
                </button>
                
                <button
                  onClick={() => setIsLowStockExpanded(!isLowStockExpanded)}
                  className={`px-3 py-2 text-xs font-black uppercase tracking-wider rounded-xl transition-all flex items-center gap-1.5 shadow-sm border ${
                    isLowStockExpanded
                      ? 'bg-amber-600 text-white border-amber-600 hover:bg-amber-700'
                      : 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100'
                  }`}
                >
                  {isLowStockExpanded ? 'Tutup Detail' : 'Buka Detail'}
                  <span className="text-[10px]">{isLowStockExpanded ? '▲' : '▼'}</span>
                </button>
              </div>
            </div>

            {/* Quick Chips space visible when collapsed */}
            {!isLowStockExpanded && (
              <div className="flex gap-2 w-full overflow-x-auto pb-1 scrollbar-hide py-1 border-t border-slate-100 pt-3 shrink-0">
                {lowStockProducts.slice(0, 5).map(p => (
                  <div 
                    key={p.id}
                    onClick={() => {
                      setSearchTerm(p.name);
                      searchInputRef.current?.focus();
                      toast.info(`Mencari produk "${p.name}"`);
                    }}
                    className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider bg-slate-50 border border-amber-200 hover:border-amber-400 hover:shadow-xs py-1.5 px-3 rounded-xl text-amber-800 cursor-pointer transition-all shrink-0"
                    title="Klik untuk menyaring produk ini di kasir"
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-red-600 block animate-ping"></span>
                    <span>{p.name}</span>
                    <span className="opacity-30">|</span>
                    <span className="font-extrabold text-red-600">{p.stock}</span>
                    <span className="text-slate-400 font-normal">/ {p.minStock} {p.unit}</span>
                  </div>
                ))}
                {lowStockProducts.length > 5 && (
                  <button 
                    onClick={() => setIsLowStockExpanded(true)}
                    className="text-[10px] font-black text-amber-700 hover:text-amber-800 uppercase tracking-widest bg-amber-50 py-1.5 px-3 rounded-xl self-center whitespace-nowrap"
                  >
                    +{lowStockProducts.length - 5} Lainnya
                  </button>
                )}
              </div>
            )}

            {/* Slide open view detailing each low-stock item */}
            {isLowStockExpanded && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="border-t border-slate-150 pt-4 flex flex-col gap-4"
              >
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                  {lowStockProducts.map(p => {
                    const isOutOfStock = p.stock <= 0;
                    const fillPercent = isOutOfStock ? 0 : Math.min(100, Math.round((p.stock / (p.minStock || 1)) * 100));
                    
                    return (
                      <div 
                        key={p.id}
                        className={`p-3 rounded-2xl border flex flex-col justify-between gap-3 transition-colors ${
                          isOutOfStock 
                            ? 'bg-red-50/50 border-red-200' 
                            : 'bg-amber-50/30 border-amber-200'
                        }`}
                      >
                        <div className="flex items-start gap-2.5">
                          <div className="w-10 h-10 rounded-lg overflow-hidden border border-slate-200 bg-white flex-shrink-0">
                            <img 
                              src={p.image} 
                              alt={p.name} 
                              className="w-full h-full object-cover"
                            />
                          </div>
                          <div className="flex-1 min-w-0">
                            <h5 className="font-extrabold text-xs text-slate-800 truncate uppercase" title={p.name}>
                              {p.name}
                            </h5>
                            <p className="text-[10px] text-slate-400 uppercase tracking-wide font-medium">
                              Sisa Stok: <strong className={isOutOfStock ? 'text-red-650 text-red-600' : 'text-slate-700'}>{p.stock}</strong> / {p.minStock} {p.unit}
                            </p>
                          </div>
                        </div>

                        {/* Stock Progress Bar */}
                        <div className="space-y-1">
                          <div className="flex justify-between items-center text-[9px] font-black tracking-wider uppercase">
                            <span className={isOutOfStock ? 'text-red-600 font-extrabold' : 'text-amber-700'}>
                              {isOutOfStock ? 'STOK KOSONG!' : 'STOK KRITIS'}
                            </span>
                            <span className="text-slate-400 font-bold">{fillPercent}%</span>
                          </div>
                          <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                            <div 
                              className={`h-full rounded-full transition-all duration-300 ${
                                isOutOfStock ? 'bg-red-600' : 'bg-amber-500'
                              }`}
                              style={{ width: `${fillPercent}%` }}
                            />
                          </div>
                        </div>

                        <div className="flex gap-1.5 border-t border-slate-100 pt-2.5 mt-1 shrink-0">
                          <button
                            onClick={() => {
                              setSearchTerm(p.name);
                              searchInputRef.current?.focus();
                              toast.success(`Filter produk di POS: ${p.name}`);
                            }}
                            className="flex-1 py-1.5 bg-white border border-slate-200 rounded-lg text-[9px] font-black uppercase tracking-wider text-slate-700 hover:text-red-600 hover:bg-slate-50 transition-all text-center"
                          >
                            Cari di POS
                          </button>
                          
                          <a
                            href={`https://wa.me/?text=${encodeURIComponent(`Halo Supplier,\nKami membutuhkan restok dari produk berikut secepatnya:\n\nProduk: ${p.name}\nSKU: ${p.sku || '-'}\nKategori: ${p.category}\nSisa Stok Saat Ini: ${p.stock} ${p.unit}\n\nMohon mengirimkan surat penawaran dan estimasi pengiriman. Terima kasih.`)}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-2.5 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg text-[9px] font-black uppercase tracking-wider text-center flex items-center justify-center transition-all active:scale-95 shrink-0"
                            title="Hubungi Supplier via WhatsApp"
                          >
                            WA
                          </a>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Protective guidance notification to keep it architecturally transparent & informative */}
                <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3 flex gap-2.5 items-start mt-1">
                  <span className="text-sm">🛡️</span>
                  <p className="text-[10px] sm:text-xs text-slate-500 leading-relaxed font-semibold">
                    <strong className="text-slate-700 block mb-0.5">Mencegah Transaksi Overselling & Selisih Kas:</strong>
                    Sistem secara otomatis memberikan tanda peringatan oranye ke produk yang mendekati ambang batas minimum. Apabila stok menyentuh angka 0 (nol), transaksi di kasir POS akan ter-block sepenuhnya dan tidak dapat diklaim masuk ke keranjang belanja demi perlindungan akurasi data finansial Anda.
                  </p>
                </div>
              </motion.div>
            )}
          </motion.div>
        )}

        {/* Product Grid - Professional Polish Theme */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-3 sm:gap-4 md:gap-4">
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
