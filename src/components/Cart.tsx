import React, { useState, memo, useMemo } from 'react';
import { Product, Voucher, Client } from '../types';
import { Plus, Minus, Trash2, ShoppingCart, CreditCard, Keyboard, Ticket, Tag, User, Users } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { formatCurrency } from '../lib/utils';
import { toast } from 'sonner';

interface CartProps {
  items: (Product & { quantity: number })[];
  taxRate: number;
  discount: number;
  vouchers?: Voucher[];
  appliedVoucherCode?: string | null;
  onUpdateQuantity: (id: string, delta: number) => void;
  onRemove: (id: string) => void;
  onCheckout: () => void;
  onAddManual: (price: number) => void;
  onUpdateDiscount: (value: number) => void;
  onApplyVoucher: (code: string | null) => void;
  clients?: Client[];
  selectedClientId?: string | null;
  onSelectClient?: (id: string | null) => void;
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

export default function Cart({ 
  items, 
  taxRate, 
  discount, 
  vouchers = [], 
  appliedVoucherCode = null,
  onUpdateQuantity, 
  onRemove, 
  onCheckout, 
  onAddManual, 
  onUpdateDiscount,
  onApplyVoucher,
  clients = [],
  selectedClientId = null,
  onSelectClient
}: CartProps) {
  const [manualPrice, setManualPrice] = useState('');
  const [showManual, setShowManual] = useState(false);
  const [showDiscount, setShowDiscount] = useState(false);
  const [showVoucher, setShowVoucher] = useState(false);
  const [tempDiscount, setTempDiscount] = useState(discount.toString());
  const [voucherCode, setVoucherCode] = useState('');

  const appliedVoucher = useMemo(() => 
    appliedVoucherCode ? vouchers.find(v => v.code.toUpperCase() === appliedVoucherCode.toUpperCase()) : null
  , [appliedVoucherCode, vouchers]);

  const subtotal = useMemo(() => items.reduce((acc, item) => acc + item.price * item.quantity, 0), [items]);
  
  const handleUpdateQuantity = React.useCallback((id: string, delta: number) => onUpdateQuantity(id, delta), [onUpdateQuantity]);
  const handleRemove = React.useCallback((id: string) => onRemove(id), [onRemove]);

  const handleApplyVoucher = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!voucherCode) return;

    const voucher = vouchers.find(v => v.code.toUpperCase() === voucherCode.toUpperCase());
    
    if (!voucher) {
      toast.error('Voucher tidak ditemukan');
      return;
    }

    if (voucher.status !== 'active') {
      toast.error('Voucher sudah tidak aktif');
      return;
    }

    if (voucher.expiryDate && new Date(voucher.expiryDate).getTime() < Date.now()) {
      toast.error('Voucher sudah kadaluarsa');
      return;
    }

    if (voucher.usageCount >= voucher.usageLimit) {
      toast.error('Limit penggunaan voucher telah habis');
      return;
    }

    if (subtotal < voucher.minPurchase) {
      toast.error(`Minimal belanja ${formatCurrency(voucher.minPurchase)} untuk menggunakan voucher ini`);
      return;
    }

    let discountAmount = 0;
    if (voucher.type === 'percentage') {
      discountAmount = (subtotal * voucher.value) / 100;
      if (voucher.maxDiscount && discountAmount > voucher.maxDiscount) {
        discountAmount = voucher.maxDiscount;
      }
    } else {
      discountAmount = voucher.value;
    }

    onUpdateDiscount(Math.min(discountAmount, subtotal));
    onApplyVoucher(voucher.code);
    setTempDiscount(discountAmount.toString());
    toast.success(`Voucher ${voucher.code} berhasil digunakan!`);
  };

  const handleManualAdd = (e: React.FormEvent) => {
    e.preventDefault();
    const price = Number(manualPrice);
    if (price > 0) {
      onAddManual(price);
      setManualPrice('');
      setShowManual(false);
    }
  };

  const discountedSubtotal = useMemo(() => Math.max(0, subtotal - discount), [subtotal, discount]);
  const tax = useMemo(() => discountedSubtotal * (taxRate / 100), [discountedSubtotal, taxRate]);
  const total = useMemo(() => discountedSubtotal + tax, [discountedSubtotal, tax]);

  return (
    <div className="h-full flex flex-col bg-white border-l border-slate-200 shadow-lg">
      <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
        <h2 className="font-bold text-slate-700 flex items-center gap-2">
          Keranjang Belanja
        </h2>
        <div className="flex items-center gap-2">
          <button 
            onClick={() => {
              setShowDiscount(!showDiscount);
              if (showManual) setShowManual(false);
              if (showVoucher) setShowVoucher(false);
            }}
            className={`p-1.5 rounded-lg transition-colors border border-transparent ${discount > 0 ? 'bg-orange-50 text-orange-600 border-orange-100' : 'hover:bg-orange-50 text-orange-600 hover:border-orange-100'}`}
            title="Tambah Diskon Manual"
          >
            <div className="flex items-center gap-1">
              <span className="text-[14px] font-bold">%</span>
            </div>
          </button>
          <button 
            onClick={() => {
              setShowVoucher(!showVoucher);
              if (showManual) setShowManual(false);
              if (showDiscount) setShowDiscount(false);
            }}
            className={`p-1.5 rounded-lg transition-colors border border-transparent ${appliedVoucher ? 'bg-blue-50 text-blue-600 border-blue-100' : 'hover:bg-blue-50 text-blue-600 hover:border-blue-100'}`}
            title="Gunakan Voucher"
          >
            <Ticket size={18} />
          </button>
          <button 
            onClick={() => {
              setShowManual(!showManual);
              if (showDiscount) setShowDiscount(false);
              if (showVoucher) setShowVoucher(false);
            }}
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

      {showDiscount && (
        <motion.div 
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          className="p-4 bg-orange-50/50 border-b border-orange-100 space-y-2 overflow-hidden"
        >
          <label className="text-[10px] font-bold text-orange-400 uppercase tracking-widest">Diskon Manual (Rp)</label>
          <div className="flex gap-2">
            <input
              autoFocus
              type="number"
              value={tempDiscount}
              onChange={(e) => {
                setTempDiscount(e.target.value);
                const val = Number(e.target.value);
                if (!isNaN(val) && val >= 0) {
                  onUpdateDiscount(val);
                }
                onApplyVoucher(null);
              }}
              placeholder="0"
              className="flex-1 px-3 py-2 bg-white border border-orange-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 font-bold"
            />
            <button 
              onClick={() => {
                onUpdateDiscount(0);
                setTempDiscount('0');
                onApplyVoucher(null);
                setShowDiscount(false);
              }}
              className="px-3 text-orange-600 font-bold text-xs"
            >
              Reset
            </button>
          </div>
        </motion.div>
      )}

      {showVoucher && (
        <motion.div 
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          className="p-4 bg-blue-50/50 border-b border-blue-100 space-y-2 overflow-hidden"
        >
          <label className="text-[10px] font-bold text-blue-400 uppercase tracking-widest">Kode Voucher</label>
          <form onSubmit={handleApplyVoucher} className="flex gap-2">
            <div className="flex-1 relative">
              <Tag className="absolute left-3 top-1/2 -translate-y-1/2 text-blue-300" size={14} />
              <input
                autoFocus
                type="text"
                value={voucherCode}
                onChange={(e) => setVoucherCode(e.target.value.toUpperCase())}
                placeholder="PROMO2024"
                className="w-full pl-9 pr-3 py-2 bg-white border border-blue-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono font-bold tracking-widest uppercase"
              />
            </div>
            <button 
              type="submit"
              className="px-4 bg-blue-600 text-white rounded-lg font-bold text-sm"
            >
              Gunakan
            </button>
          </form>
          {appliedVoucher && (
            <div className="flex items-center justify-between mt-1 px-1">
              <span className="text-[10px] font-bold text-blue-600 uppercase tracking-wider">Voucher: {appliedVoucher.code}</span>
              <button 
                onClick={() => {
                  onApplyVoucher(null);
                  onUpdateDiscount(0);
                  setTempDiscount('0');
                  setVoucherCode('');
                }}
                className="text-[10px] font-black text-red-500 uppercase"
              >
                Hapus
              </button>
            </div>
          )}
        </motion.div>
      )}

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

      {/* Client / CRM Selector */}
      <div className="px-4 py-3 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between gap-2 shrink-0">
        <div className="flex items-center gap-1.5 text-slate-500">
          <User size={14} className="text-red-500" />
          <span className="text-[10px] font-black uppercase tracking-wider text-slate-500">Pelanggan POS</span>
        </div>
        <select
          value={selectedClientId || ''}
          onChange={(e) => onSelectClient?.(e.target.value || null)}
          className="bg-transparent border-0 text-xs font-bold text-slate-800 focus:outline-none focus:ring-0 max-w-[150px] cursor-pointer text-right appearance-none"
        >
          <option value="">Umum (Pelanggan)</option>
          {clients?.map(c => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
      </div>

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
          {discount > 0 && (
            <div className="flex justify-between text-xs text-orange-600 font-medium">
              <span>Diskon</span>
              <span>-{formatCurrency(discount)}</span>
            </div>
          )}
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
