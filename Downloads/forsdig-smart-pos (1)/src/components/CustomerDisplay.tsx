import React, { useState, useEffect, memo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ShoppingBag, CreditCard, CheckCircle2, QrCode, Monitor } from 'lucide-react';
import { formatCurrency } from '../lib/utils';
import { CartItem } from '../types';

interface DisplayState {
  type: 'idle' | 'cart' | 'payment' | 'success';
  items?: CartItem[];
  total?: number;
  qrUrl?: string;
  qrName?: string;
  method?: string;
  config?: {
    welcomeText?: string;
    promoTexts?: string[];
    displayLogo?: string;
  };
  storeName?: string;
  storeLogo?: string;
}

const CustomerDisplay = memo(() => {
  const [state, setState] = useState<DisplayState>({ type: 'idle' });
  const [promoIndex, setPromoIndex] = useState(0);

  const defaultPromos = [
    "Selamat Datang di Toko Kami!",
    "Dapatkan Promo Menarik Setiap Hari",
    "Terima Kasih Telah Berbelanja"
  ];

  const promos = state.config?.promoTexts?.length ? state.config.promoTexts : defaultPromos;

  useEffect(() => {
    const channel = new BroadcastChannel('pos_customer_display');
    channel.onmessage = (event) => {
      setState(event.data);
    };

    return () => {
      channel.close();
    };
  }, []);

  useEffect(() => {
    if (promos.length === 0) return;
    
    const promoInterval = setInterval(() => {
      setPromoIndex(prev => (prev + 1) % promos.length);
    }, 5000);

    return () => clearInterval(promoInterval);
  }, [promos.length]);

  const renderIdle = () => (
    <div className="h-full flex flex-col items-center justify-center bg-slate-950 text-white p-12 relative overflow-hidden">
      {/* Abstract Background Decoration */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-red-600/10 blur-[120px] rounded-full -translate-y-1/2 translate-x-1/2" />
      <div className="absolute bottom-0 left-0 w-96 h-96 bg-blue-600/10 blur-[120px] rounded-full translate-y-1/2 -translate-x-1/2" />
      
      <motion.div 
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="text-center z-10 w-full max-w-4xl"
      >
        <div className="w-48 h-48 bg-white rounded-[48px] flex items-center justify-center mx-auto mb-12 border border-white/10 shadow-2xl overflow-hidden p-4">
          <AnimatePresence mode="wait">
            {state.config?.displayLogo || state.storeLogo ? (
              <motion.img 
                key={state.config?.displayLogo || state.storeLogo}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                src={state.config?.displayLogo || state.storeLogo} 
                className="w-full h-full object-contain" 
              />
            ) : (
              <ShoppingBag size={80} className="text-red-500" />
            )}
          </AnimatePresence>
        </div>
        <h1 className="text-7xl font-black tracking-tighter mb-6 uppercase">
          {state.config?.welcomeText || state.storeName || 'Ready to Serve'}
        </h1>
        <div className="h-12 overflow-hidden">
          <AnimatePresence mode="wait">
            <motion.p 
              key={promoIndex}
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -20, opacity: 0 }}
              className="text-2xl font-medium text-slate-400 uppercase tracking-[0.3em] px-4"
            >
              {promos[promoIndex % promos.length]}
            </motion.p>
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );

  const renderCart = () => (
    <div className="h-full grid grid-cols-12 bg-slate-50">
      <div className="col-span-8 p-12 flex flex-col h-full bg-white shadow-2xl z-10">
        <div className="flex items-center justify-between mb-12">
          <div className="flex items-center gap-4">
            <ShoppingBag className="text-red-600" size={40} />
            <h2 className="text-3xl font-black uppercase tracking-tighter">Your Purchase</h2>
          </div>
          {(state.config?.displayLogo || state.storeLogo) && (
            <img src={state.config?.displayLogo || state.storeLogo} alt="Logo" className="h-12 w-auto object-contain" />
          )}
        </div>
        <div className="flex-1 overflow-y-auto space-y-6 pr-4">
          {state.items?.map((item, i) => (
            <motion.div 
              initial={{ x: -20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ delay: i * 0.05 }}
              key={item.id} 
              className="flex items-center justify-between p-6 bg-slate-50 rounded-3xl border border-slate-100"
            >
              <div className="flex items-center gap-6">
                <div className="w-20 h-20 bg-white rounded-2xl flex items-center justify-center font-black text-2xl text-slate-300 border border-slate-100">
                  {item.quantity}x
                </div>
                <div>
                  <p className="text-2xl font-black text-slate-800">{item.name}</p>
                  <p className="text-lg font-bold text-slate-400">{formatCurrency(item.price)}</p>
                </div>
              </div>
              <p className="text-3xl font-black text-slate-800">{formatCurrency(item.price * item.quantity)}</p>
            </motion.div>
          ))}
        </div>
      </div>
      <div className="col-span-4 p-12 bg-slate-900 text-white flex flex-col justify-end">
        <div className="space-y-2 mb-8">
           <p className="text-xl font-bold text-slate-400 uppercase tracking-widest">Total Amount</p>
           <h3 className="text-7xl font-black tracking-tighter text-red-500">
             {formatCurrency(state.total || 0)}
           </h3>
        </div>
        <div className="p-8 bg-white/5 rounded-[32px] border border-white/10 backdrop-blur-xl">
          <p className="text-sm font-black uppercase tracking-widest text-slate-400 mb-2">Notice</p>
          <p className="text-lg font-medium">Please verify your items and total before proceeding to payment.</p>
        </div>
      </div>
    </div>
  );

  const renderPayment = () => (
    <div className="h-full flex flex-col bg-slate-950 text-white p-8 lg:p-12 overflow-hidden">
      <div className="flex-shrink-0 flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
           <div className="w-12 h-12 bg-red-600 rounded-2xl flex items-center justify-center shrink-0">
             <CreditCard size={24} className="text-white" />
           </div>
           <div>
             <h2 className="text-3xl font-black uppercase tracking-tighter">Payment Required</h2>
             <p className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em]">{state.storeName}</p>
           </div>
        </div>
        
        {(state.config?.displayLogo || state.storeLogo) && (
          <img src={state.config?.displayLogo || state.storeLogo} alt="Logo" className="h-16 w-auto object-contain" />
        )}

        <div className="text-right">
           <p className="text-sm font-bold text-slate-400 uppercase tracking-widest leading-none mb-1">Total to Pay</p>
           <p className="text-5xl font-black text-red-500 tracking-tight">{formatCurrency(state.total || 0)}</p>
        </div>
      </div>

      <div className="flex-1 min-h-0 grid grid-cols-12 gap-8 lg:gap-12">
        {/* Left: Product List */}
        <div className="col-span-12 lg:col-span-7 flex flex-col min-h-0">
          <div className="bg-white/5 border border-white/10 rounded-[40px] flex-1 flex flex-col p-8 min-h-0 overflow-hidden shadow-2xl backdrop-blur-xl">
             <div className="flex items-center justify-between mb-6">
                <p className="text-sm font-black uppercase tracking-widest text-slate-400">Order Summary</p>
                <p className="text-sm font-black uppercase tracking-widest text-slate-400">{state.items?.length || 0} Items</p>
             </div>
             <div className="flex-1 overflow-y-auto space-y-4 pr-2 custom-scrollbar">
               {state.items?.map((item, i) => (
                 <motion.div 
                   initial={{ x: -20, opacity: 0 }}
                   animate={{ x: 0, opacity: 1 }}
                   transition={{ delay: i * 0.05 }}
                   key={item.id} 
                   className="flex items-center justify-between p-5 bg-white/5 rounded-3xl border border-white/5"
                 >
                   <div className="flex items-center gap-5">
                     <div className="w-14 h-14 bg-red-600/10 text-red-500 rounded-xl flex items-center justify-center font-black text-xl border border-red-500/20">
                       {item.quantity}x
                     </div>
                     <div>
                       <p className="text-xl font-black text-white">{item.name}</p>
                       <p className="text-sm font-bold text-slate-500">{formatCurrency(item.price)}</p>
                     </div>
                   </div>
                   <p className="text-2xl font-black text-white">{formatCurrency(item.price * item.quantity)}</p>
                 </motion.div>
               ))}
             </div>
             <div className="mt-6 pt-6 border-t border-white/10 space-y-2">
                <div className="flex justify-between text-slate-400">
                   <p className="text-sm font-bold uppercase tracking-widest">Method</p>
                   <p className="text-sm font-black text-white uppercase tracking-widest">{state.method || 'Processing'}</p>
                </div>
                <div className="flex justify-between text-slate-400">
                   <p className="text-sm font-bold uppercase tracking-widest">Terminal</p>
                   <p className="text-sm font-black text-emerald-500 uppercase tracking-widest">Validated (Live)</p>
                </div>
             </div>
          </div>
        </div>

        {/* Right: QR & Instructions */}
        <div className="col-span-12 lg:col-span-5 flex flex-col gap-8">
          <div className="relative group">
            <div className="absolute -inset-4 bg-red-600/30 blur-2xl rounded-full opacity-50 group-hover:opacity-100 transition duration-1000"></div>
            <div className="relative w-full aspect-square bg-white p-8 rounded-[48px] shadow-2xl border-8 border-white ring-4 ring-red-600/20">
              {state.qrUrl ? (
                <img src={state.qrUrl} alt="Quick Response Code" className="w-full h-full object-contain" />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-slate-50 rounded-[32px]">
                   <div className="text-center space-y-4">
                      <QrCode size={120} className="text-slate-200 mx-auto" />
                      <p className="text-slate-400 font-black text-xs uppercase tracking-[0.2em] animate-pulse">Generating QR...</p>
                   </div>
                </div>
              )}
            </div>
          </div>

          <div className="bg-red-600 rounded-[40px] p-8 space-y-6 shadow-2xl shadow-red-900/20">
             <div className="flex items-center gap-4">
               <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center shrink-0">
                 <Monitor className="text-white" />
               </div>
               <p className="text-xl font-black leading-tight uppercase tracking-tight">Scan QR untuk Bayar Otomatis</p>
             </div>
             <div className="space-y-3">
                <div className="flex items-center gap-3 text-red-100 font-bold">
                   <CheckCircle2 size={18} />
                   <span className="text-sm uppercase tracking-wide">Validasi Real-time</span>
                </div>
                <p className="text-xs font-medium text-red-200 uppercase leading-relaxed">Sistem kami akan mendeteksi pembayaran secara otomatis setelah Anda selesai melakukan scan dan konfirmasi pada aplikasi Anda.</p>
             </div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderSuccess = () => (
    <div className="h-full flex flex-col items-center justify-center bg-emerald-600 text-white p-12 text-center relative overflow-hidden">
      {(state.config?.displayLogo || state.storeLogo) && (
        <div className="absolute top-12 right-12 opacity-20">
          <img src={state.config?.displayLogo || state.storeLogo} alt="Logo" className="h-24 w-auto object-contain grayscale brightness-0 invert" />
        </div>
      )}
      <motion.div
        initial={{ scale: 0.5, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", damping: 10 }}
      >
        <div className="w-48 h-48 bg-white rounded-full flex items-center justify-center mx-auto mb-12 shadow-2xl">
          <CheckCircle2 size={120} className="text-emerald-600" />
        </div>
        <h2 className="text-8xl font-black tracking-tighter mb-4 uppercase">Payment Success!</h2>
        <p className="text-3xl font-black text-emerald-100 uppercase tracking-widest">Thank you for your purchase</p>
      </motion.div>
    </div>
  );

  return (
    <div className="fixed inset-0 z-[9999] bg-white font-sans overflow-hidden">
      <AnimatePresence mode="wait">
        <motion.div
          key={state.type}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="h-full"
        >
          {state.type === 'idle' && renderIdle()}
          {state.type === 'cart' && renderCart()}
          {state.type === 'payment' && renderPayment()}
          {state.type === 'success' && renderSuccess()}
        </motion.div>
      </AnimatePresence>
    </div>
  );
});

CustomerDisplay.displayName = 'CustomerDisplay';

export default CustomerDisplay;
