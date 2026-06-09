import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, CreditCard, Banknote, QrCode, Wallet, CheckCircle2, ScanLine, ArrowLeftRight, ChevronRight, Check, Activity, Users, Globe } from 'lucide-react';
import { formatCurrency, cn } from '../lib/utils';
import confetti from 'canvas-confetti';
import { CartItem, PaymentQR, Staff, Reseller, Client } from '../types';
import { useStaffResellerStore } from '../services/staffResellerStore';

interface PaymentModalProps {
  total: number;
  subtotal: number;
  discount: number;
  items: CartItem[];
  paymentQrs: PaymentQR[];
  storeSettings: any;
  onClose: () => void;
  onSuccess: (method: string, amountPaid: number, details?: any, status?: 'success' | 'pending', staffId?: string, resellerId?: string) => void;
  selectedClientId?: string | null;
  clients?: Client[];
}

export default function PaymentModal({ 
  total, 
  subtotal, 
  discount, 
  items, 
  paymentQrs, 
  storeSettings, 
  onClose, 
  onSuccess,
  selectedClientId = null,
  clients = []
}: PaymentModalProps) {
  const staffs = useStaffResellerStore(state => state.staffs);
  const resellers = useStaffResellerStore(state => state.resellers);
  const [method, setMethod] = useState<'Tunai' | 'QRIS' | 'E-wallet' | 'Transfer' | 'Kartu' | 'Lainnya'>('Tunai');
  const [selectedQR, setSelectedQR] = useState<PaymentQR | null>(null);
  const [paymentMode, setPaymentMode] = useState<'Manual' | 'Semi-Otomatik' | 'Otomatis'>('Otomatis');
  const [amountPaid, setAmountPaid] = useState<string>('');
  const [isSuccess, setIsSuccess] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [scanProgress, setScanProgress] = useState(0);
  const [paymentDetected, setPaymentDetected] = useState<boolean>(false);
  const [isWaitingForPayment, setIsWaitingForPayment] = useState(false);
  const [selectedStaffId, setSelectedStaffId] = useState<string | undefined>();
  const [selectedResellerId, setSelectedResellerId] = useState<string | undefined>();
  const [activeRightTab, setActiveRightTab] = useState<'pembayaran' | 'komisi'>('pembayaran');

  // Customer Loyalty Points States/Computations
  const [pointsRedeemed, setPointsRedeemed] = useState<number>(0);

  const selectedClient = useMemo(() => {
    if (!selectedClientId || !clients) return null;
    return clients.find(c => c.id === selectedClientId) || null;
  }, [selectedClientId, clients]);

  const maxRedeemablePoints = useMemo(() => {
    if (!selectedClient) return 0;
    const clientPoints = selectedClient.points || 0;
    return Math.min(clientPoints, Math.ceil(total / 100)); // 1 Poin = Rp 100
  }, [selectedClient, total]);

  const pointsRedeemedValue = pointsRedeemed * 100;
  const finalTotal = Math.max(0, total - pointsRedeemedValue);

  useEffect(() => {
    if (!storeSettings) return;
    
    const channel = new BroadcastChannel('pos_customer_display');
    const commonData = {
      config: storeSettings?.displayConfig,
      storeName: storeSettings?.name,
      storeLogo: storeSettings?.logo
    };

    if (isSuccess) {
      channel.postMessage({ type: 'success', ...commonData });
    } else {
      channel.postMessage({
        type: 'payment',
        total: finalTotal,
        items: items,
        qrUrl: selectedQR?.imageUrl,
        qrName: selectedQR?.name,
        method: method,
        ...commonData
      });
    }
    return () => channel.close();
  }, [method, selectedQR, finalTotal, isSuccess, storeSettings]);

  useEffect(() => {
    let timeout: any;
    if (['QRIS', 'Transfer', 'E-wallet'].includes(method) && !isSuccess && !isScanning && paymentMode === 'Otomatis') {
      setIsWaitingForPayment(true);
      // Simulate payment detection after 5-8 seconds
      timeout = setTimeout(() => {
        setPaymentDetected(true);
        // Play notification sound
        const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
        audio.play().catch(e => console.log('Audio play failed:', e));
        
        // Auto approve after 2.5 seconds of detection
        setTimeout(() => {
          handlePay();
        }, 2500);
      }, 6000);
    } else {
      setIsWaitingForPayment(false);
      setPaymentDetected(false);
    }
    return () => clearTimeout(timeout);
  }, [method, isSuccess, isScanning, paymentMode]);

  useEffect(() => {
    const defaultQR = paymentQrs.find(q => q.isDefault && q.isActive);
    if (defaultQR) setSelectedQR(defaultQR);
    else if (paymentQrs.length > 0) setSelectedQR(paymentQrs.find(q => q.isActive) || null);
  }, [paymentQrs]);

  const change = Math.max(0, (Number(amountPaid) || 0) - finalTotal);
  const isPayable = method === 'Tunai' ? Number(amountPaid) >= finalTotal : true;

  const handleNumpad = (value: string) => {
    if (value === 'C') {
      setAmountPaid('');
    } else if (value === '000') {
      setAmountPaid(prev => prev + '000');
    } else {
      setAmountPaid(prev => prev + value);
    }
  };

  const handleQuickCash = (amount: number) => {
    setAmountPaid(amount.toString());
  };

  const cashSuggestions = useMemo(() => {
    const list = new Set<number>();
    const standardNotes = [2000, 5000, 10000, 20000, 50000, 100000];
    
    // Add standard single note values if higher than finalTotal
    standardNotes.forEach(note => {
      if (note > finalTotal) {
        list.add(note);
      }
    });

    // Add round ups of common intervals
    const roundups = [5000, 10000, 20000, 50000, 100000];
    roundups.forEach(interval => {
      const rounded = Math.ceil(finalTotal / interval) * interval;
      if (rounded > finalTotal) {
        list.add(rounded);
      }
    });

    // Sort ascending, remove duplicates, filter out values <= finalTotal, and select top 3
    return Array.from(list)
      .filter(val => val > finalTotal)
      .sort((a, b) => a - b)
      .slice(0, 3);
  }, [finalTotal]);

  useEffect(() => {
    let interval: any;
    if (isScanning) {
      setScanProgress(0);
      interval = setInterval(() => {
        setScanProgress(prev => {
          if (prev >= 100) {
            clearInterval(interval);
            setTimeout(() => {
              setIsScanning(false);
              handlePay();
            }, 500);
            return 100;
          }
          return prev + 5;
        });
      }, 100);
    }
    return () => clearInterval(interval);
  }, [isScanning]);

  const handlePay = () => {
    if (!isPayable) return;
    
    setIsSuccess(true);
    confetti({
      particleCount: 100,
      spread: 70,
      origin: { y: 0.6 }
    });

    const baseDetails = (['QRIS', 'Transfer', 'E-wallet'].includes(method)) ? {
      qrId: selectedQR?.id,
      qrName: selectedQR?.name,
      qrProvider: selectedQR?.provider,
      paymentTime: Date.now(),
      walletProvider: method === 'E-wallet' ? selectedQR?.provider : undefined,
      bankName: method === 'Transfer' ? selectedQR?.provider : undefined
    } : {};

    const paymentDetails = {
      ...baseDetails,
      pointsRedeemed: pointsRedeemed,
      pointsRedeemedValue: pointsRedeemedValue,
      pointsEarned: Math.floor(finalTotal / 10000) * 10
    };

    const status = paymentMode === 'Semi-Otomatik' ? 'pending' : 'success';

    setTimeout(() => {
      onSuccess(
        method, 
        Number(method === 'Tunai' ? amountPaid : finalTotal), 
        paymentDetails, 
        status,
        selectedStaffId,
        selectedResellerId
      );
    }, 2000);
  };

  const methods = [
    { id: 'Tunai', icon: Banknote, label: 'Tunai', color: 'text-green-600 bg-green-50' },
    { id: 'QRIS', icon: QrCode, label: 'QRIS', color: 'text-blue-600 bg-blue-50' },
    { id: 'E-wallet', icon: Wallet, label: 'E-Wallet', color: 'text-purple-600 bg-purple-50' },
    { id: 'Transfer', icon: ArrowLeftRight, label: 'Transfer', color: 'text-orange-600 bg-orange-50' },
    { id: 'Kartu', icon: CreditCard, label: 'Kartu', color: 'text-indigo-600 bg-indigo-50' },
    { id: 'Lainnya', icon: ChevronRight, label: 'Lainnya', color: 'text-slate-600 bg-slate-50' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
      />
      
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="relative w-full max-w-4xl bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col md:flex-row"
      >
        <AnimatePresence mode="wait">
          {isScanning && (
            <motion.div 
              key="scanner"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 z-50 bg-slate-900/90 flex flex-col items-center justify-center p-8 backdrop-blur-md"
            >
              <div className="relative w-64 h-64 bg-slate-800 rounded-3xl border-4 border-slate-700 flex items-center justify-center overflow-hidden">
                <QrCode size={120} className="text-slate-600" />
                <motion.div 
                  animate={{ top: ['0%', '100%', '0%'] }}
                  transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                  className="absolute left-0 right-0 h-1 bg-red-500 shadow-[0_0_15px_rgba(239,68,68,0.5)] z-10"
                />
                <div 
                  className="absolute inset-x-0 bottom-0 bg-red-500 opacity-20 transition-all duration-300" 
                  style={{ height: `${scanProgress}%` }} 
                />
              </div>
              <div className="mt-8 text-center space-y-4">
                <h3 className="text-2xl font-black text-white flex items-center gap-3">
                  <ScanLine className="text-red-500 animate-pulse" />
                  MENDETEKSI QRIS...
                </h3>
                <p className="text-slate-400 font-bold uppercase tracking-widest text-xs">Arahkan Kode QR ke Kamera</p>
                <div className="w-48 h-1.5 bg-slate-800 rounded-full overflow-hidden mx-auto">
                   <motion.div 
                    className="h-full bg-red-500"
                    initial={{ width: 0 }}
                    animate={{ width: `${scanProgress}%` }}
                   />
                </div>
                <button 
                  onClick={() => setIsScanning(false)}
                  className="mt-8 px-8 py-3 bg-white/10 hover:bg-white/20 text-white rounded-xl font-bold transition-all text-sm"
                >
                  BATALKAN SCAN
                </button>
              </div>
            </motion.div>
          )}

          {!isSuccess ? (
            <div className="flex flex-col md:flex-row w-full">
              {/* Left Side: Order Summary */}
              <div className="w-full md:w-80 bg-slate-50 p-8 border-r border-slate-100 max-h-[40vh] md:max-h-none overflow-y-auto scrollbar-hide">
                <div className="flex justify-between items-center mb-8">
                  <h2 className="text-xl font-bold text-slate-800">Ringkasan</h2>
                  <button onClick={onClose} className="md:hidden p-2 hover:bg-slate-200 rounded-full">
                    <X className="w-5 h-5" />
                  </button>
                </div>
                
                <div className="space-y-4">
                  <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-sm space-y-2">
                    <div className="flex justify-between items-center text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                      <span>Subtotal</span>
                      <span>{formatCurrency(subtotal)}</span>
                    </div>
                    {discount > 0 && (
                      <div className="flex justify-between items-center text-[10px] font-black text-orange-600 uppercase tracking-widest">
                        <span>Diskon</span>
                        <span>-{formatCurrency(discount)}</span>
                      </div>
                    )}
                    <div className="pt-2 border-t border-slate-100">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Total Tagihan</p>
                      {pointsRedeemedValue > 0 ? (
                        <div className="space-y-1">
                          <p className="text-sm font-bold text-slate-400 line-through">{formatCurrency(total)}</p>
                          <p className="text-xs font-extrabold text-amber-600">Diskon Poin: -{formatCurrency(pointsRedeemedValue)}</p>
                          <p className="text-2xl font-black text-red-600">{formatCurrency(finalTotal)}</p>
                        </div>
                      ) : (
                        <p className="text-2xl font-black text-red-600">{formatCurrency(total)}</p>
                      )}
                    </div>
                  </div>

                  {selectedClient && (
                    <div className="p-4 bg-amber-50/60 rounded-2xl border border-amber-200 shadow-sm space-y-3">
                      <div className="flex justify-between items-center">
                        <div className="flex items-center gap-1.5 text-amber-800">
                          <Users size={16} className="text-amber-600 animate-pulse" />
                          <span className="text-[10px] font-black uppercase tracking-widest">Loyalty: {selectedClient.name}</span>
                        </div>
                        <span className="text-xs font-black text-amber-700 bg-amber-100 px-2 py-0.5 rounded-lg border border-amber-200">{selectedClient.points || 0} Poin</span>
                      </div>

                      {maxRedeemablePoints > 0 ? (
                        <div className="space-y-2">
                          <div className="flex justify-between items-center text-xs text-amber-800 font-bold">
                            <span>Tukarkan Poin:</span>
                            <span>{pointsRedeemed} Poin (-{formatCurrency(pointsRedeemedValue)})</span>
                          </div>
                          
                          <input 
                            type="range"
                            min="0"
                            max={maxRedeemablePoints}
                            value={pointsRedeemed}
                            onChange={(e) => setPointsRedeemed(Number(e.target.value))}
                            className="w-full h-1.5 bg-amber-200 rounded-lg appearance-none cursor-pointer accent-amber-600 focus:outline-none"
                          />
                          
                          <div className="flex justify-between text-[9px] text-amber-600/80 font-bold">
                            <span>0 Poin</span>
                            <span>Maks: {maxRedeemablePoints} Poin</span>
                          </div>
                        </div>
                      ) : (
                        <p className="text-[10px] text-amber-700 font-bold">Pelanggan belum memiliki saldo poin untuk ditukarkan.</p>
                      )}
                      
                      <div className="pt-2 border-t border-amber-200/50 flex justify-between items-center text-[10px] text-amber-800 font-bold">
                        <span>Poin didapat transaksi ini:</span>
                        <span className="text-emerald-700 font-extrabold">+{Math.floor(finalTotal / 10000) * 10} Poin</span>
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-1 gap-3">
                    {methods.map((m) => {
                      const Icon = m.icon;
                      return (
                        <button
                          key={m.id}
                          onClick={() => {
                            setMethod(m.id as any);
                            if (m.id === 'QRIS') setIsScanning(true);
                          }}
                          className={`flex items-center gap-4 p-4 rounded-2xl border-2 transition-all ${
                            method === m.id
                              ? 'border-red-600 bg-red-50 shadow-md ring-2 ring-red-100'
                              : 'border-transparent bg-white text-slate-500 hover:bg-slate-100'
                          }`}
                        >
                          <div className={`p-2 rounded-xl ${m.color}`}>
                            <Icon className="w-5 h-5" />
                          </div>
                          <span className="text-sm font-bold uppercase tracking-tight">{m.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="mt-auto pt-8 hidden md:block">
                   <button onClick={onClose} className="text-sm font-bold text-slate-400 hover:text-slate-600 flex items-center gap-2">
                     <X className="w-4 h-4" /> Batal Transaksi
                   </button>
                </div>
              </div>

              {/* Right Side: Payment Input */}
              <div className="flex-1 p-8 overflow-y-auto max-h-[60vh] md:max-h-none scrollbar-hide flex flex-col">
                <div className="flex items-center gap-1 mb-6 bg-slate-100 p-1 rounded-2xl w-fit">
                  <button 
                    onClick={() => setActiveRightTab('pembayaran')}
                    className={cn(
                      "px-6 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all",
                      activeRightTab === 'pembayaran' ? "bg-white text-red-600 shadow-sm" : "text-slate-400 hover:text-slate-600"
                    )}
                  >
                    Input Bayar
                  </button>
                  <button 
                    onClick={() => setActiveRightTab('komisi')}
                    className={cn(
                      "px-6 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all flex items-center gap-2",
                      activeRightTab === 'komisi' ? "bg-white text-red-600 shadow-sm" : "text-slate-400 hover:text-slate-600"
                    )}
                  >
                    Mitra & Staf
                    {(selectedStaffId || selectedResellerId) && <div className="w-2 h-2 bg-red-600 rounded-full" />}
                  </button>
                </div>

                {activeRightTab === 'komisi' ? (
                  <div className="flex-1 space-y-8 animate-in fade-in slide-in-from-right-4 duration-300">
                    <div>
                      <div className="flex items-center justify-between mb-4">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Pilih Staf (Komisi Internal)</label>
                        {selectedStaffId && (
                          <button onClick={() => setSelectedStaffId(undefined)} className="text-[10px] font-bold text-red-600 uppercase">Hapus</button>
                        )}
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        {staffs.filter(s => s.status === 'active').map(staff => (
                          <button
                            key={staff.id}
                            onClick={() => setSelectedStaffId(staff.id)}
                            className={cn(
                              "flex flex-col items-start p-4 rounded-2xl border-2 transition-all text-left",
                              selectedStaffId === staff.id
                                ? "border-red-600 bg-red-50 ring-4 ring-red-50 shadow-sm"
                                : "border-slate-100 bg-white hover:border-slate-200"
                            )}
                          >
                            <Users size={16} className={selectedStaffId === staff.id ? "text-red-600 mb-2" : "text-slate-400 mb-2"} />
                            <p className="text-sm font-black text-slate-800 uppercase leading-tight truncate w-full">{staff.name}</p>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">{staff.role || 'Staf'}</p>
                            <div className="mt-2 text-[10px] font-black text-red-600 bg-red-50 px-2 py-0.5 rounded-md">
                              {staff.commissionRate}% Komisi
                            </div>
                          </button>
                        ))}
                      </div>
                      {staffs.length === 0 && <p className="text-sm text-slate-400 italic text-center py-4 bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200">Belum ada staf aktif</p>}
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-4">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Pilih Reseller (Komisi Online)</label>
                        {selectedResellerId && (
                          <button onClick={() => setSelectedResellerId(undefined)} className="text-[10px] font-bold text-red-600 uppercase">Hapus</button>
                        )}
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        {resellers.filter(r => r.status === 'active').map(reseller => (
                          <button
                            key={reseller.id}
                            onClick={() => setSelectedResellerId(reseller.id)}
                            className={cn(
                              "flex flex-col items-start p-4 rounded-2xl border-2 transition-all text-left",
                              selectedResellerId === reseller.id
                                ? "border-red-600 bg-red-50 ring-4 ring-red-50 shadow-sm"
                                : "border-slate-100 bg-white hover:border-slate-200"
                            )}
                          >
                            <Globe size={16} className={selectedResellerId === reseller.id ? "text-red-600 mb-2" : "text-slate-400 mb-2"} />
                            <p className="text-sm font-black text-slate-800 uppercase leading-tight truncate w-full">{reseller.name}</p>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">{reseller.platform || 'Online'}</p>
                            <div className="mt-2 text-[10px] font-black text-purple-600 bg-purple-50 px-2 py-0.5 rounded-md">
                              {reseller.commissionRate}% Komisi
                            </div>
                          </button>
                        ))}
                      </div>
                      {resellers.length === 0 && <p className="text-sm text-slate-400 italic text-center py-4 bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200">Belum ada reseller aktif</p>}
                    </div>

                    <button 
                      onClick={() => setActiveRightTab('pembayaran')}
                      className="w-full py-4 bg-slate-900 text-white rounded-2xl font-bold text-sm uppercase tracking-widest shadow-xl shadow-slate-200"
                    >
                      Kembali ke Pembayaran
                    </button>
                  </div>
                ) : method === 'Tunai' ? (
                  <div className="h-full flex flex-col">
                    <div className="mb-8">
                      <label className="text-xs font-bold text-slate-400 uppercase tracking-widest block mb-4">Input Uang Tunai</label>
                      <div className="relative">
                        <div className="absolute left-6 top-1/2 -translate-y-1/2 text-2xl font-black text-slate-400">Rp</div>
                        <input
                          type="text"
                          readOnly
                          value={Number(amountPaid).toLocaleString('id-ID')}
                          className="w-full pl-16 pr-8 py-6 bg-slate-50 rounded-3xl text-4xl font-black text-slate-800 focus:outline-none border-4 border-transparent focus:border-red-100 transition-all text-right"
                          placeholder="0"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-8 mb-8">
                      {/* NumPad */}
                      <div className="grid grid-cols-3 gap-2 sm:gap-3">
                        {['1', '2', '3', '4', '5', '6', '7', '8', '9', '000', '0', 'C'].map((key) => (
                          <button
                            key={key}
                            onClick={() => handleNumpad(key)}
                            className={`h-14 sm:h-16 rounded-2xl text-lg sm:text-xl font-bold transition-all shadow-sm ${
                              key === 'C' 
                                ? 'bg-red-50 text-red-600 hover:bg-red-100' 
                                : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 active:scale-95'
                            }`}
                          >
                            {key}
                          </button>
                        ))}
                      </div>

                      {/* Quick Cash & Change */}
                      <div className="flex flex-col gap-4">
                        <div className="grid grid-cols-2 lg:grid-cols-1 gap-2 flex-1">
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest col-span-2 lg:col-span-1">Uang Cepat</p>
                          <button 
                            onClick={() => handleQuickCash(finalTotal)} 
                            className="py-3 bg-red-50 text-red-700 rounded-xl font-bold text-xs sm:text-sm border border-red-100 hover:bg-red-100 transition-all active:scale-95"
                          >
                            Pas ({formatCurrency(finalTotal)})
                          </button>
                          {cashSuggestions.map((amount) => (
                            <button 
                              key={amount}
                              onClick={() => handleQuickCash(amount)} 
                              className="py-3 bg-slate-50 text-slate-700 rounded-xl font-bold text-xs sm:text-sm border border-slate-200 hover:bg-slate-100 transition-all active:scale-95"
                            >
                              {amount >= 1000 ? `${(amount / 1000).toLocaleString('id-ID')}k` : amount.toLocaleString('id-ID')} ({formatCurrency(amount)})
                            </button>
                          ))}
                        </div>
                        
                        <div className="p-4 sm:p-6 bg-green-50 rounded-3xl border border-green-100">
                          <p className="text-[10px] font-bold text-green-600 uppercase tracking-widest mb-1">Kembalian</p>
                          <p className="text-xl sm:text-2xl font-black text-green-700 leading-none">{formatCurrency(change)}</p>
                        </div>
                      </div>
                    </div>

                    <button
                      disabled={!isPayable}
                      onClick={handlePay}
                      className="w-full py-6 bg-red-600 text-white rounded-[2rem] font-black text-xl hover:bg-red-700 transition-all disabled:opacity-50 shadow-2xl shadow-red-200 flex items-center justify-center gap-4 active:scale-[0.98]"
                    >
                      SELESAIKAN PEMBAYARAN
                      <CheckCircle2 className="w-8 h-8" />
                    </button>
                  </div>
                ) : (['QRIS', 'Transfer', 'E-wallet', 'Kartu', 'Lainnya'].includes(method)) ? (
                  <div className="h-full flex flex-col">
                    <div className="flex-1 flex flex-col md:flex-row gap-8">
                       {/* QR Display or Payment Info */}
                       <div className="flex-1 flex flex-col items-center justify-center space-y-6 relative">
                          {paymentDetected && (
                            <motion.div
                              initial={{ opacity: 0, y: 20, scale: 0.8 }}
                              animate={{ opacity: 1, y: 0, scale: 1 }}
                              className="absolute top-0 z-10 bg-green-600 text-white px-6 py-3 rounded-2xl shadow-2xl flex items-center gap-3 border-4 border-white"
                            >
                              <div className="bg-white/20 p-1.5 rounded-full">
                                <Check size={20} className="text-white" />
                              </div>
                              <div className="text-left">
                                <p className="text-[10px] font-black uppercase tracking-widest opacity-80 leading-none mb-1">Berhasil!</p>
                                <p className="text-sm font-black whitespace-nowrap uppercase tracking-tight">Pembayaran {formatCurrency(finalTotal)} Terdeteksi</p>
                              </div>
                            </motion.div>
                          )}

                          {['QRIS', 'Transfer', 'E-wallet'].includes(method) ? (
                            <div className="relative group">
                              <div className={`w-64 h-64 bg-white p-4 rounded-3xl shadow-xl border-4 transition-all duration-500 flex items-center justify-center overflow-hidden ${paymentDetected ? 'border-green-500 scale-105' : 'border-slate-100'}`}>
                                {selectedQR?.imageUrl ? (
                                  <img src={selectedQR.imageUrl} alt={selectedQR.name} className="w-full h-full object-contain" />
                                ) : (
                                  <QrCode size={120} className="text-slate-200" />
                                )}
                                
                                {isWaitingForPayment && !paymentDetected && (
                                  <div className="absolute inset-0 bg-white/60 backdrop-blur-sm flex flex-col items-center justify-center space-y-4">
                                     <div className="relative">
                                       <Activity className="w-12 h-12 text-red-600 animate-pulse" />
                                       <motion.div 
                                         animate={{ rotate: 360 }}
                                         transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                                         className="absolute inset-0 border-4 border-red-100 border-t-red-600 rounded-full"
                                       />
                                     </div>
                                     <p className="text-[10px] font-black text-red-600 uppercase tracking-widest animate-pulse italic">Menunggu Pembayaran...</p>
                                  </div>
                                )}
                              </div>
                              <div className="absolute inset-0 bg-slate-900/5 backdrop-blur-[2px] opacity-0 group-hover:opacity-100 transition-all rounded-3xl flex items-center justify-center">
                                 <button 
                                   type="button"
                                   className="px-4 py-2 bg-white rounded-full text-xs font-bold shadow-lg"
                                 >
                                   Lihat Detail
                                 </button>
                              </div>
                            </div>
                          ) : (
                            <div className="w-64 h-64 bg-slate-50 p-8 rounded-3xl border-2 border-dashed border-slate-200 flex flex-col items-center justify-center text-center space-y-4">
                               <div className={`p-6 rounded-3xl ${method === 'Kartu' ? 'bg-indigo-100 text-indigo-600' : 'bg-slate-200 text-slate-500'}`}>
                                  {method === 'Kartu' ? <CreditCard size={48} /> : <X size={48} />}
                               </div>
                               <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                                  {method === 'Kartu' ? 'Gunakan EDC untuk memproses kartu' : 'Pembayaran lainnya'}
                                </p>
                            </div>
                          )}
                          
                          <div className="text-center space-y-1">
                             <h3 className="text-2xl font-black text-slate-800 uppercase tracking-tight">{storeSettings?.name}</h3>
                             <p className="text-slate-400 font-bold text-xs tracking-widest uppercase">
                               {['QRIS', 'Transfer', 'E-wallet'].includes(method) ? (selectedQR?.name || 'PILIH METODE QR') : method}
                             </p>
                             <p className="text-red-500 font-black text-xl tracking-tight">{formatCurrency(finalTotal)}</p>
                          </div>
                       </div>

                       {/* QR Selector & Status */}
                       <div className="w-full md:w-72 flex flex-col gap-6">
                          {['QRIS', 'Transfer', 'E-wallet'].includes(method) && (
                            <div className="space-y-4">
                              <div className="flex justify-between items-center">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Pilih {method === 'Transfer' ? 'Bank' : 'QR'}</label>
                              </div>
                              <div className="grid grid-cols-1 gap-2 max-h-48 overflow-y-auto pr-2 custom-scrollbar">
                                 {paymentQrs.filter(q => q.isActive).map(qr => (
                                   <button
                                     key={qr.id}
                                     onClick={() => setSelectedQR(qr)}
                                     className={`flex items-center gap-3 p-3 rounded-xl border-2 transition-all ${
                                       selectedQR?.id === qr.id 
                                         ? 'border-red-600 bg-red-50 shadow-sm' 
                                         : 'border-slate-100 bg-slate-50 hover:bg-slate-100'
                                     }`}
                                   >
                                      <div className="w-10 h-10 bg-white rounded-lg border border-slate-200 flex items-center justify-center overflow-hidden shrink-0">
                                        <img src={qr.imageUrl} className="w-full h-full object-contain" alt={qr.name} />
                                      </div>
                                      <div className="flex-1 text-left min-w-0">
                                         <p className="text-[10px] font-black text-slate-800 truncate uppercase leading-none mb-1">{qr.name}</p>
                                         <p className="text-[9px] font-bold text-slate-400 truncate uppercase tracking-tighter">{qr.provider} - {qr.accountName}</p>
                                      </div>
                                      {selectedQR?.id === qr.id && <Check className="text-red-600" size={14} />}
                                   </button>
                                 ))}
                              </div>
                            </div>
                          )}

                          <div className="space-y-3 pt-6 border-t border-slate-100">
                             <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Status Pembayaran</label>
                             <div className="flex flex-col gap-2">
                                <button 
                                  onClick={() => setPaymentMode('Otomatis')}
                                  className={`flex items-center justify-between px-4 py-3 rounded-xl border transition-all ${paymentMode === 'Otomatis' ? 'border-red-600 bg-red-50 text-red-700 shadow-md ring-2 ring-red-100' : 'border-slate-100 bg-slate-50 text-slate-500 hover:bg-slate-100'}`}
                                >
                                   <div className="flex items-center gap-3">
                                      <Activity size={16} className={paymentMode === 'Otomatis' ? 'animate-pulse text-red-600' : ''} />
                                      <span className="text-[10px] font-black uppercase tracking-widest text-left">Pemeriksaan Otomatis (Live)</span>
                                   </div>
                                   {paymentMode === 'Otomatis' && <CheckCircle2 size={14} />}
                                </button>
                                <button 
                                  onClick={() => setPaymentMode('Manual')}
                                  className={`flex items-center justify-between px-4 py-3 rounded-xl border transition-all ${paymentMode === 'Manual' ? 'border-green-600 bg-green-50 text-green-700 shadow-md ring-2 ring-green-100' : 'border-slate-100 bg-slate-50 text-slate-500 hover:bg-slate-100'}`}
                                >
                                   <div className="flex items-center gap-3">
                                      <CheckCircle2 size={16} />
                                      <span className="text-[10px] font-black uppercase tracking-widest">Konfirmasi Manual</span>
                                   </div>
                                   {paymentMode === 'Manual' && <CheckCircle2 size={14} />}
                                </button>
                             </div>
                          </div>
                       </div>
                    </div>

                    <button
                      onClick={handlePay}
                      className="w-full py-6 mt-8 bg-red-600 text-white rounded-[2rem] font-black text-xl hover:bg-red-700 transition-all shadow-2xl shadow-red-200 flex items-center justify-center gap-4 active:scale-[0.98]"
                    >
                      KONFIRMASI BAYAR
                      <CheckCircle2 className="w-8 h-8" />
                    </button>
                  </div>
                ) : (
                  <div className="h-full flex flex-col items-center justify-center p-12">
                    <div className="w-full max-w-sm flex flex-col items-center gap-8">
                       <div className="w-64 h-64 bg-white p-4 rounded-3xl shadow-xl border border-slate-100 flex items-center justify-center">
                         <img src="https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=POS-TRANSACTION" alt="QRIS" className="w-full h-full" />
                       </div>
                       <div className="text-center space-y-2">
                          <h3 className="text-2xl font-bold text-slate-800">Scan QR untuk Bayar</h3>
                          <p className="text-slate-400 font-medium">Pelanggan dapat melakukan scan pada kode QR di atas melalui aplikasi {method}</p>
                       </div>
                       
                       <button
                         onClick={handlePay}
                         className="w-full py-6 bg-red-600 text-white rounded-[2rem] font-black text-xl hover:bg-red-700 transition-all shadow-2xl shadow-red-200 flex items-center justify-center gap-4 mt-8"
                       >
                         KONFIRMASI BERHASIL
                         <CheckCircle2 className="w-8 h-8" />
                       </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <motion.div
              key="success"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="p-20 text-center w-full"
            >
              <div className="inline-flex items-center justify-center w-32 h-32 bg-green-50 text-green-600 rounded-full mb-8 shadow-inner">
                <CheckCircle2 className="w-16 h-16" />
              </div>
              <h2 className="text-4xl font-black text-slate-800 mb-2">PEMBAYARAN SUKSES</h2>
              <p className="text-slate-500 mb-12 font-bold text-lg uppercase tracking-wide">Transaksi telah tercatat di sistem</p>
              <div className="flex flex-col items-center gap-4">
                 <div className="w-16 h-1 bg-slate-100 rounded-full overflow-hidden">
                    <motion.div 
                      initial={{ x: '-100%' }}
                      animate={{ x: '100%' }}
                      transition={{ repeat: Infinity, duration: 1.5, ease: "linear" }}
                      className="w-full h-full bg-red-600" 
                    />
                 </div>
                 <p className="text-red-600 font-black text-xs tracking-widest">MENCETAK STRUK DIGITAL...</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );

}
