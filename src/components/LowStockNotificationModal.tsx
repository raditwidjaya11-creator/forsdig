import React, { useState, useEffect, useMemo } from 'react';
import { X, AlertTriangle, Search, Plus, Save, Package, Bell, RefreshCw, CheckCircle, Smartphone } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Product } from '../types';
import { formatCurrency } from '../lib/utils';
import { toast } from 'sonner';

interface LowStockNotificationModalProps {
  products: Product[];
  isOpen: boolean;
  onClose: () => void;
  updateProduct: (product: Product) => Promise<void>;
  isProactiveAlert?: boolean;
}

export default function LowStockNotificationModal({
  products,
  isOpen,
  onClose,
  updateProduct,
  isProactiveAlert = false,
}: LowStockNotificationModalProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [customStockAdd, setCustomStockAdd] = useState<{ [id: string]: number }>({});
  const [justRestocked, setJustRestocked] = useState<string | null>(null);

  // Play subtle warning beep when proactively showing warning
  useEffect(() => {
    if (isOpen && isProactiveAlert) {
      try {
        const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
        
        // Low stock chime - 3 beautiful ascending notes
        const playNote = (freq: number, startTime: number, duration: number) => {
          const osc = audioCtx.createOscillator();
          const gain = audioCtx.createGain();
          osc.connect(gain);
          gain.connect(audioCtx.destination);
          
          osc.type = 'sine';
          osc.frequency.setValueAtTime(freq, startTime);
          
          gain.gain.setValueAtTime(0, startTime);
          gain.gain.linearRampToValueAtTime(0.04, startTime + 0.03);
          gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);
          
          osc.start(startTime);
          osc.stop(startTime + duration);
        };

        const now = audioCtx.currentTime;
        playNote(523.25, now, 0.4);       // C5
        playNote(659.25, now + 0.15, 0.4); // E5
        playNote(783.99, now + 0.3, 0.6);  // G5
      } catch (err) {
        console.warn('Audio Context blocked by browser permission.', err);
      }
    }
  }, [isOpen, isProactiveAlert]);

  // Compute low stock items: active, and current stock <= minStock
  const lowStockItems = useMemo(() => {
    return products.filter(p => p.isActive && p.stock <= (p.minStock || 0));
  }, [products]);

  // Filter low stock items by search term
  const filteredItems = useMemo(() => {
    return lowStockItems.filter(p => 
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (p.sku && p.sku.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (p.category && p.category.toLowerCase().includes(searchTerm.toLowerCase()))
    );
  }, [lowStockItems, searchTerm]);

  // Handle instant restock update
  const handleRestock = async (product: Product, additionalQty: number) => {
    if (additionalQty <= 0) {
      toast.error('Jumlah restok harus lebih besar dari 0!');
      return;
    }

    setUpdatingId(product.id);
    const updatedProduct: Product = {
      ...product,
      stock: product.stock + additionalQty
    };

    try {
      await updateProduct(updatedProduct);
      setJustRestocked(product.id);
      
      // Clear custom text field input
      setCustomStockAdd(prev => ({ ...prev, [product.id]: 0 }));
      
      // Beautiful chime of restock success
      try {
        const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.frequency.setValueAtTime(1046.5, audioCtx.currentTime); // C6 Note
        gain.gain.setValueAtTime(0.03, audioCtx.currentTime);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.12);
      } catch {}

      toast.success(`Berhasil menambah stok ${product.name}!`, {
        description: `Stok bertambah +${additionalQty} ${product.unit || 'pcs'}. Stok sekarang: ${updatedProduct.stock}.`,
        icon: '📦',
        id: `restocked-${product.id}`
      });

      // Clear the "just restocked" animation highlight after a moment
      setTimeout(() => {
        setJustRestocked(null);
      }, 2000);

    } catch (err) {
      console.error(err);
      toast.error(`Gagal merestok ${product.name}. Silakan coba lagi.`);
    } finally {
      setUpdatingId(null);
    }
  };

  const handleCustomStockValueChange = (id: string, val: string) => {
    const num = parseInt(val) || 0;
    setCustomStockAdd(prev => ({ ...prev, [id]: num }));
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4">
        {/* Backdrop glass */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-slate-950/80 backdrop-blur-md"
          onClick={onClose}
        />

        {/* Modal Content */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          className="relative w-full max-w-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl flex flex-col max-h-[85vh] overflow-hidden"
          id="low-stock-notification-modal-container"
        >
          {/* Accent colored top bar decoration */}
          <div className="h-2 w-full bg-gradient-to-r from-amber-500 via-orange-500 to-red-500" />

          {/* Header */}
          <div className="p-5 border-b border-slate-100 dark:border-slate-800/80 flex items-start justify-between bg-slate-50 dark:bg-slate-900/60">
            <div className="flex gap-3">
              <div className="p-3 bg-amber-500/10 dark:bg-amber-500/15 text-amber-600 dark:text-amber-400 rounded-2xl border border-amber-500/10 dark:border-amber-500/20 shrink-0 self-center">
                <AlertTriangle className="w-6 h-6 animate-pulse" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base sm:text-lg font-black tracking-wider text-slate-850 dark:text-white uppercase">
                    {isProactiveAlert ? 'Peringatan Proaktif Stok' : 'Notifikasi Menipis'}
                  </h3>
                  <span className="bg-red-500/15 text-red-600 dark:text-red-400 border border-red-500/10 dark:border-red-500/20 text-[9.5px] font-black tracking-widest uppercase px-2 py-0.5 rounded-md leading-none">
                    {lowStockItems.length} Produk
                  </span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-0.5">
                  Produk di bawah ini telah mencapai atau melewati limit batas minimum stok (<span className="font-bold text-amber-500">minStock</span>). Ambil tindakan restok demi kelancaran penjualan.
                </p>
              </div>
            </div>
            
            <button
              onClick={onClose}
              className="p-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-750 text-slate-400 hover:text-slate-700 dark:hover:text-white rounded-full transition-all"
              id="close-low-stock-modal"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Search bar inside low stock warning */}
          {lowStockItems.length > 0 && (
            <div className="px-5 py-3 border-b border-slate-100 dark:border-slate-800/60 bg-white dark:bg-slate-900 flex items-center gap-2.5">
              <Search className="w-4 h-4 text-slate-400 shrink-0" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Cari produk rentan atau kategori..."
                className="w-full text-xs font-bold text-slate-700 dark:text-slate-200 bg-transparent focus:outline-none placeholder-slate-400"
              />
              {searchTerm && (
                <button 
                  onClick={() => setSearchTerm('')}
                  className="text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-500 rounded px-1.5 py-0.5 hover:bg-slate-200"
                >
                  Clear
                </button>
              )}
            </div>
          )}

          {/* List Section */}
          <div className="flex-1 overflow-y-auto p-5 space-y-4 bg-slate-50/50 dark:bg-slate-950/20">
            {lowStockItems.length === 0 ? (
              <div className="py-12 text-center flex flex-col items-center justify-center">
                <div className="w-14 h-14 bg-emerald-500/10 dark:bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 rounded-full flex items-center justify-center mb-4 border border-emerald-500/20">
                  <CheckCircle className="w-7 h-7" />
                </div>
                <h4 className="text-sm font-black text-slate-850 dark:text-white uppercase tracking-wider">Semua Stok Aman!</h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mt-1 leading-relaxed">
                  Luar biasa! Tidak ada satu pun produk aktif yang berada di bawah limit minimum stok saat ini. Toko berjalan prima.
                </p>
              </div>
            ) : filteredItems.length === 0 ? (
              <div className="py-10 text-center flex flex-col items-center justify-center">
                <p className="text-xs font-bold text-slate-400 dark:text-slate-500">Tidak ada produk low-stock yang cocok dengan kata pencarian.</p>
              </div>
            ) : (
              <div className="space-y-3.5">
                {filteredItems.map((item) => {
                  const isHighlighted = justRestocked === item.id;
                  const currentCustomInput = customStockAdd[item.id] || 0;
                  
                  return (
                    <motion.div
                      key={item.id}
                      layout
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ 
                        opacity: 1, 
                        y: 0,
                        backgroundColor: isHighlighted ? 'rgba(16, 185, 129, 0.08)' : undefined,
                        borderColor: isHighlighted ? '#10b981' : undefined
                      }}
                      className={`p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl transition-all shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4`}
                    >
                      {/* Left: Product Info */}
                      <div className="flex items-start gap-3 min-w-0 flex-1">
                        <div className="w-12 h-12 rounded-xl bg-slate-100 dark:bg-slate-800 overflow-hidden shrink-0 border border-slate-200/50 dark:border-slate-700/50 flex items-center justify-center">
                          <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                        </div>
                        
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <h4 className="text-xs font-black text-slate-850 dark:text-white uppercase truncate tracking-wide">
                              {item.name}
                            </h4>
                            <span className="bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 text-[8.5px] font-bold px-1.5 py-0.5 rounded uppercase font-semibold">
                              {item.category}
                            </span>
                          </div>
                          
                          <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 mt-1 font-mono text-[9px] text-slate-400">
                            <span>SKU: {item.sku || '-'}</span>
                            <span className="text-slate-300 dark:text-slate-700">|</span>
                            <span>Harga: {formatCurrency(item.price)}</span>
                          </div>

                          {/* Stocks Display with elegant warning colors */}
                          <div className="flex items-center gap-3 mt-1.5">
                            <div className="flex items-center gap-1">
                              <span className="text-[10px] text-slate-400 font-bold uppercase">Stok:</span>
                              <span className={`text-xs font-black font-mono border-b-2 ${item.stock <= 0 ? 'text-red-500 border-red-500/30' : 'text-amber-500 border-amber-500/30'}`}>
                                {item.stock} {item.unit || 'pcs'}
                              </span>
                            </div>
                            
                            <span className="h-1.5 w-1.5 bg-slate-300 dark:bg-slate-700 rounded-full" />

                            <div className="flex items-center gap-1">
                              <span className="text-[10px] text-slate-400 font-medium">Batas Min:</span>
                              <span className="text-[11px] font-bold font-mono text-slate-500 dark:text-slate-400">
                                {item.minStock} {item.unit || 'pcs'}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Right: Smart Instant Restock */}
                      <div className="flex flex-wrap items-center gap-2 border-t md:border-t-0 border-slate-100 dark:border-slate-800/60 pt-3 md:pt-0 shrink-0">
                        <span className="text-[9.5px] font-black text-slate-400 dark:text-slate-500 uppercase block md:hidden w-full mb-1">
                          ⚡ Restok Cepat:
                        </span>
                        
                        {/* Preset quick buttons */}
                        <div className="flex gap-1.5">
                          {[10, 50, 100].map((qty) => (
                            <button
                              key={qty}
                              disabled={updatingId === item.id}
                              onClick={() => handleRestock(item, qty)}
                              className="px-2 py-1 bg-slate-150 hover:bg-amber-500 hover:text-slate-950 dark:bg-slate-800 dark:hover:bg-amber-500 text-slate-600 dark:text-slate-300 hover:border-amber-400 dark:hover:text-slate-950 text-[10px] font-black tracking-wide rounded-md border border-slate-200 dark:border-slate-700/60 transition-all font-mono disabled:opacity-40"
                              title={`Restok +${qty}`}
                            >
                              +{qty}
                            </button>
                          ))}
                        </div>

                        {/* Input custom additional quantity */}
                        <div className="flex items-center gap-1 bg-slate-50 dark:bg-slate-950 p-1 rounded-xl border border-slate-200 dark:border-slate-800 h-8">
                          <input
                            type="number"
                            min="1"
                            disabled={updatingId === item.id}
                            value={currentCustomInput === 0 ? '' : currentCustomInput}
                            onChange={(e) => handleCustomStockValueChange(item.id, e.target.value)}
                            placeholder="Qty"
                            className="w-12 bg-transparent text-center text-xs font-black font-mono text-slate-800 dark:text-slate-200 placeholder-slate-400 focus:outline-none h-full"
                          />
                          <button
                            disabled={updatingId === item.id || currentCustomInput <= 0}
                            onClick={() => handleRestock(item, currentCustomInput)}
                            className="bg-emerald-500 hover:bg-emerald-600 text-slate-950 disabled:bg-slate-250 dark:disabled:bg-slate-800 disabled:text-slate-400 rounded-lg p-1.5 transition-all text-xs flex items-center justify-center shrink-0 self-center h-6 w-6"
                            title="Simpan jumlah restok"
                          >
                            <Save size={12} className="text-white" />
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="p-4 border-t border-slate-100 dark:border-slate-800/80 bg-slate-50 dark:bg-slate-900/40 flex items-center justify-between gap-3 flex-wrap">
            <span className="text-[10px] font-medium text-slate-400 dark:text-slate-500">
              💡 Tips: Tambahkan stok menggunakan tombol cepat jika barang dari supplier baru tiba.
            </span>
            
            <button
              onClick={onClose}
              className="px-6 py-2 bg-slate-800 hover:bg-slate-700 dark:bg-slate-800 dark:hover:bg-slate-705 text-white text-xs font-black rounded-xl transition-all shadow-md active:scale-97 uppercase tracking-wider"
              id="confirm-low-stock-modal"
            >
              Tutup Peringatan
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
