import React, { useState, memo, useMemo } from 'react';
import { Product } from '../types';
import { Plus, Minus, Trash2, ShoppingCart, CreditCard, Keyboard } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { formatCurrency } from '../lib/utils';

interface CartProps {
  items: (Product & { quantity: number })[];
  taxRate: number;
  onUpdateQuantity: (id: string, delta: number) => void;
  onRemove: (id: string) => void;
  onCheckout: () => void;
  onAddManual: (price: number) => void;
}

const CartItem = memo(({ item, onUpdateQuantity, onRemove }: { item: Product & { quantity: number }, onUpdateQuantity: (id: string, delta: number) => void, onRemove: (id: string) => void }) => (
  <motion.div
    layout
    initial={{ opacity: 0, x: 20 }}
    animate={{ opacity: 1, x: 0 }}
    exit={{ opacity: 0, x: 20 }}
    className="flex items-center gap-3 group"
  >
    <div className="w-12 h-12 bg-slate-100 rounded-lg shrink-0 overflow-hidden">
      <img src={item.image} alt={item.name} className="w-full h-full object-cover" loading="lazy" />
    </div>
    <div className="flex-1 min-w-0">
      <h4 className="text-sm font-semibold text-slate-800 truncate">{item.name}</h4>
      <div className="flex items-center justify-between mt-1">
        <div className="flex items-center gap-3">
          <button
            onClick={() => onUpdateQuantity(item.id, -1)}
            className="w-8 h-8 md:w-5 md:h-5 border border-slate-200 rounded-lg flex items-center justify-center text-sm md:text-[10px] hover:bg-slate-50 active:scale-95 transition-all"
          >
            <Minus size={14} className="md:w-2.5 md:h-2.5" />
          </button>
          <span className="text-sm font-bold text-slate-700 w-4 text-center">{item.quantity}</span>
          <span className="text-[10px] font-bold text-slate-400 uppercase">{item.unit}</span>
          <button
            onClick={() => onUpdateQuantity(item.id, 1)}
            className="w-8 h-8 md:w-5 md:h-5 border border-slate-200 rounded-lg flex items-center justify-center text-sm md:text-[10px] hover:bg-slate-50 active:scale-95 transition-all"
          >
            <Plus size={14} className="md:w-2.5 md:h-2.5" />
          </button>
        </div>
        <span className="text-sm font-bold text-slate-600">
          {formatCurrency(item.price * item.quantity)}
        </span>
      </div>
    </div>
    <button
      onClick={() => onRemove(item.id)}
      className="text-slate-300 hover:text-red-500 transition-colors opacity-100 lg:opacity-0 lg:group-hover:opacity-100 shrink-0"
    >
      <Trash2 className="w-4 h-4 sm:w-5 sm:h-5" />
    </button>
  </motion.div>
));

export default function Cart({ items, taxRate, onUpdateQuantity, onRemove, onCheckout, onAddManual }: CartProps) {
  const [manualPrice, setManualPrice] = useState('');
  const [showManual, setShowManual] = useState(false);

  const subtotal = useMemo(() => items.reduce((acc, item) => acc + item.price * item.quantity, 0), [items]);
  const tax = useMemo(() => subtotal * (taxRate / 100), [subtotal, taxRate]);
  const total = useMemo(() => subtotal + tax, [subtotal, tax]);

  const handleUpdateQuantity = React.useCallback((id: string, delta: number) => onUpdateQuantity(id, delta), [onUpdateQuantity]);
  const handleRemove = React.useCallback((id: string) => onRemove(id), [onRemove]);

  const handleManualAdd = (e: React.FormEvent) => {
    e.preventDefault();
    const price = Number(manualPrice);
    if (price > 0) {
      onAddManual(price);
      setManualPrice('');
      setShowManual(false);
    }
  };

  return (
    <div className="h-full flex flex-col bg-white border-l border-slate-200 shadow-lg">
      <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
        <h2 className="font-bold text-slate-700 flex items-center gap-2">
          Keranjang Belanja
        </h2>
        <div className="flex items-center gap-2">
          <button 
            onClick={() => setShowManual(!showManual)}
            className="p-1.5 hover:bg-red-50 text-red-600 rounded-lg transition-colors border border-transparent hover:border-red-100"
            title="Tambah Barang Manual"
          >
            <Keyboard size={18} />
          </button>
          <span className="px-2 py-1 bg-red-100 text-red-700 rounded text-xs font-bold">
            {items.reduce((acc, i) => acc + i.quantity, 0)} Item
          </span>
        </div>
      </div>

      {showManual && (
        <motion.form 
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          onSubmit={handleManualAdd}
          className="p-4 bg-red-50/50 border-b border-red-100 space-y-2 overflow-hidden"
        >
          <label className="text-[10px] font-bold text-red-400 uppercase tracking-widest">Input Harga Manual (Non-Menu)</label>
          <div className="flex gap-2">
            <input
              autoFocus
              type="number"
              value={manualPrice}
              onChange={(e) => setManualPrice(e.target.value)}
              placeholder="Masukkan Harga..."
              className="flex-1 px-3 py-2 bg-white border border-red-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
            />
            <button type="submit" className="px-4 bg-red-600 text-white rounded-lg font-bold text-sm">Tambah</button>
          </div>
        </motion.form>
      )}

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        <AnimatePresence initial={false}>
          {items.length === 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="h-full flex flex-col items-center justify-center text-slate-300 space-y-4"
            >
              <ShoppingCart size={48} className="opacity-10" />
              <p className="text-sm font-medium">Kosong</p>
            </motion.div>
          ) : (
            items.map((item) => (
              <CartItem
                key={item.id}
                item={item}
                onUpdateQuantity={handleUpdateQuantity}
                onRemove={handleRemove}
              />
            ))
          )}
        </AnimatePresence>
      </div>

      <div className="p-4 bg-slate-50 border-t border-slate-200 space-y-3">
        <div className="space-y-1">
          <div className="flex justify-between text-xs text-slate-500 font-medium">
            <span>Subtotal</span>
            <span>{formatCurrency(subtotal)}</span>
          </div>
          <div className="flex justify-between text-xs text-slate-500 font-medium">
            <span>Pajak (PPN {taxRate}%)</span>
            <span>{formatCurrency(tax)}</span>
          </div>
          <div className="flex justify-between text-xl font-bold text-slate-800 pt-3 border-t border-slate-200 mt-2">
            <span>Total</span>
            <span className="text-red-600">{formatCurrency(total)}</span>
          </div>
        </div>

        <button
          onClick={onCheckout}
          disabled={items.length === 0}
          className="w-full py-4 bg-red-600 text-white rounded-xl font-bold mt-4 shadow-lg shadow-red-100 flex items-center justify-center gap-2 hover:bg-red-700 transition-all disabled:opacity-50"
        >
          <span>Bayar Sekarang</span>
          <CreditCard className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}
