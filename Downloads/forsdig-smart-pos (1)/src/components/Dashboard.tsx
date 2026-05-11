import { useState, useMemo, memo } from 'react';
import { Product, Category } from '../types';
import { Search, Filter, Grid, List as ListIcon, ShoppingBag, Plus, Scan } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { formatCurrency } from '../lib/utils';
import BarcodeScanner from './BarcodeScanner';

interface DashboardProps {
  products: Product[];
  categories: Category[];
  onAddToCart: (p: Product) => void;
}

const ProductCard = memo(({ product, onAddToCart }: { product: Product, onAddToCart: (p: Product) => void }) => (
  <motion.div
    layout
    initial={{ opacity: 0, scale: 0.9 }}
    animate={{ opacity: 1, scale: 1 }}
    exit={{ opacity: 0, scale: 0.9 }}
    whileTap={{ scale: 0.98 }}
    onClick={() => onAddToCart(product)}
    className="product-card bg-white p-2.5 sm:p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col group cursor-pointer active:bg-slate-50 transition-colors"
  >
    <div className="relative aspect-square rounded-lg overflow-hidden bg-slate-100 mb-2 sm:mb-4 flex items-center justify-center">
      <img
        src={product.image}
        alt={product.name}
        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
        loading="lazy"
      />
      <div className="absolute inset-0 bg-red-900/0 group-hover:bg-red-900/10 transition-all" />
      {product.stock <= (product.minStock || 0) && (
        <div className="absolute top-1 left-1 sm:top-2 sm:left-2 bg-red-100 text-red-600 text-[8px] sm:text-[10px] font-black px-1.5 sm:px-2 py-0.5 rounded-md uppercase tracking-wider shadow-sm border border-red-200">
          Stok: {product.stock}
        </div>
      )}
      {product.sku && (
        <div className="absolute bottom-1 left-1 sm:bottom-2 sm:left-2 bg-black/50 text-white text-[7px] sm:text-[8px] font-bold px-1.5 py-0.5 rounded backdrop-blur-sm">
          {product.sku}
        </div>
      )}
    </div>
    
    <div className="flex-1 flex flex-col pt-0 sm:pt-1">
      <h3 className="text-[11px] sm:text-sm font-bold text-slate-800 line-clamp-2 leading-tight mb-1 uppercase">
        {product.name}
      </h3>
      <div className="mt-auto">
        <p className="text-[9px] sm:text-xs text-slate-500 mb-1.5 sm:mb-2">{product.category}</p>
        <div className="flex items-center justify-between">
          <span className="text-red-600 font-bold text-xs sm:text-sm tracking-tight">{formatCurrency(product.price)}</span>
          <div className="w-6 h-6 sm:w-8 sm:h-8 bg-red-50 text-red-600 rounded-lg flex items-center justify-center group-hover:bg-red-600 group-hover:text-white transition-all shadow-sm">
            <Plus className="w-3 h-3 sm:w-4 sm:h-4" />
          </div>
        </div>
      </div>
    </div>
  </motion.div>
));

export default function Dashboard({ products, categories, onAddToCart }: DashboardProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [activeCategory, setActiveCategory] = useState('Semua');
  const [isScannerOpen, setIsScannerOpen] = useState(false);

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

  return (
    <div className="flex-1 overflow-y-auto bg-slate-50 p-4 md:p-6 pb-24 md:pb-6">
      <div className="max-w-7xl mx-auto space-y-4 md:space-y-6">
        
        {/* Search & Filter Header - Professional Polish Theme */}
        <div className="flex flex-col lg:flex-row gap-4 items-stretch lg:items-center">
          <div className="relative flex-1 group flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 sm:w-5 sm:h-5 text-slate-400 group-focus-within:text-red-600 transition-colors" />
              <input
                type="text"
                placeholder="Cari produk atau scan..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
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
