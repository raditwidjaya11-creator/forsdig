import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, CreditCard, Landmark, Smartphone, CheckCircle2, ChevronRight, Copy, AlertTriangle, ArrowRight } from 'lucide-react';
import { usePPOBStore } from '../../services/ppobStore';
import { formatCurrency } from '../../lib/utils';
import { toast } from 'sonner';

interface TopupModalProps {
  userId: string;
  onClose: () => void;
}

export default function TopupModal({ userId, onClose }: TopupModalProps) {
  const [step, setStep] = useState<'methods' | 'amount' | 'confirmation'>('methods');
  const [method, setMethod] = useState<string | null>(null);
  const [amount, setAmount] = useState<number>(0);
  const { userProfile } = usePPOBStore();

  const methods = [
    { id: 'transfer', name: 'Transfer Bank', icon: Landmark, color: 'bg-blue-100 text-blue-600', description: 'BCA, Mandiri, BNI, BRI' },
    { id: 'qris', name: 'QRIS', icon: Smartphone, color: 'text-pink-600 bg-pink-100', description: 'Dana, OVO, GoPay, LinkAja' },
    { id: 'admin', name: 'Admin / Kasir', icon: CreditCard, color: 'text-purple-600 bg-purple-100', description: 'Topup langsung di outlet' },
  ];

  const quickAmounts = [50000, 100000, 200000, 500000, 1000000];

  const handleNext = () => {
    if (step === 'methods' && method) setStep('amount');
    else if (step === 'amount' && amount >= 10000) setStep('confirmation');
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Disalin ke clipboard');
  };

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-slate-900/90 backdrop-blur-md">
      <motion.div 
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="bg-white rounded-[2.5rem] w-full max-w-md overflow-hidden shadow-2xl"
      >
        <div className="p-8 bg-slate-50 border-b border-slate-100 flex justify-between items-center text-slate-900">
          <div>
            <h3 className="text-xl font-black uppercase tracking-tighter">Isi Saldo</h3>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Saldo Saat Ini: {formatCurrency(userProfile?.balance || 0)}</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full transition-colors">
            <X className="text-slate-400" />
          </button>
        </div>

        <div className="p-8 space-y-6 max-h-[60vh] overflow-y-auto custom-scrollbar">
          {step === 'methods' && (
            <div className="space-y-3">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Pilih Metode Pembayaran</label>
              {methods.map((m) => (
                <button
                  key={m.id}
                  onClick={() => setMethod(m.id)}
                  className={`w-full flex items-center justify-between p-5 rounded-3xl border-2 transition-all ${
                    method === m.id ? 'border-blue-600 bg-blue-50 shadow-lg' : 'border-slate-50 bg-white hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center gap-4 text-left">
                    <div className={`p-3 rounded-2xl ${m.color}`}>
                      <m.icon className="w-6 h-6" />
                    </div>
                    <div>
                      <div className="font-black text-slate-900">{m.name}</div>
                      <div className="text-[10px] text-slate-400 font-bold uppercase">{m.description}</div>
                    </div>
                  </div>
                  <ChevronRight className={`w-5 h-5 ${method === m.id ? 'text-blue-600' : 'text-slate-300'}`} />
                </button>
              ))}
            </div>
          )}

          {step === 'amount' && (
            <div className="space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2 text-slate-900">Masukkan Nominal (Min. Rp 10.000)</label>
                <div className="relative">
                  <span className="absolute left-6 top-1/2 -translate-y-1/2 font-black text-xl text-slate-300">Rp</span>
                  <input 
                    type="number" 
                    value={amount || ''}
                    onChange={(e) => setAmount(Number(e.target.value))}
                    placeholder="0"
                    className="w-full bg-slate-50 border-none rounded-3xl py-6 pl-16 pr-6 focus:ring-4 focus:ring-blue-100 font-black text-2xl text-blue-600"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {quickAmounts.map((q) => (
                  <button
                    key={q}
                    onClick={() => setAmount(q)}
                    className={`py-3 rounded-2xl font-black text-xs transition-all ${
                      amount === q ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {formatCurrency(q)}
                  </button>
                ))}
              </div>
            </div>
          )}

          {step === 'confirmation' && (
            <div className="space-y-6">
              <div className="bg-blue-50 p-6 rounded-3xl border border-blue-100 text-center space-y-2">
                <p className="text-[10px] font-black text-blue-400 uppercase tracking-widest">Total Bayar</p>
                <div className="text-3xl font-black text-blue-600 font-mono tracking-tighter">
                  {formatCurrency(amount + Math.floor(Math.random() * 999))}
                </div>
                <p className="text-[9px] text-blue-400 font-bold uppercase leading-relaxed px-4">*Gunakan nominal persis hingga 3 digit terakhir untuk verifikasi otomatis</p>
              </div>

              <div className="space-y-3">
                <div className="p-4 bg-white border border-slate-100 rounded-2xl flex justify-between items-center group">
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase">Rekening BCA</p>
                    <p className="font-black text-slate-900">8830-123-4567</p>
                    <p className="text-[10px] text-slate-400">A/N FORSDIG POS DIGITAL</p>
                  </div>
                  <button onClick={() => copyToClipboard('88301234567')} className="p-2 text-slate-300 hover:text-blue-600 transition-colors">
                    <Copy size={18} />
                  </button>
                </div>

                <div className="p-6 rounded-2xl border-2 border-dashed border-amber-200 bg-amber-50 text-amber-600 flex gap-3 text-xs">
                  <AlertTriangle className="w-5 h-5 shrink-0" />
                  <p className="font-bold leading-relaxed">Setelah transfer, saldo akan masuk otomatis dalam 5-10 menit. Simpan bukti transfer jika perlu bantuan.</p>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="p-8 bg-white border-t border-slate-100">
          <button 
            onClick={step === 'confirmation' ? onClose : handleNext}
            disabled={(step === 'methods' && !method) || (step === 'amount' && amount < 10000)}
            className="w-full py-5 bg-slate-900 disabled:bg-slate-200 text-white rounded-[2rem] font-black uppercase tracking-widest shadow-xl transition-all active:scale-[0.98] flex items-center justify-center gap-3"
          >
            {step === 'confirmation' ? 'Saya Sudah Bayar' : 'Lanjutkan'}
            <ArrowRight className="w-5 h-5" />
          </button>
        </div>
      </motion.div>
    </div>
  );
}
