import { Transaction } from '../types';
import { motion } from 'motion/react';
import { History, Calendar, Clock, ShoppingBag, ChevronRight, TrendingUp, ClipboardList, Package } from 'lucide-react';
import { formatCurrency } from '../lib/utils';
import { format } from 'date-fns';

interface RecentTransactionsPOSProps {
  transactions: Transaction[];
  onViewReceipt: (t: Transaction) => void;
  onViewInvoice: (t: Transaction) => void;
}

export default function RecentTransactionsPOS({ transactions, onViewReceipt, onViewInvoice }: RecentTransactionsPOSProps) {
  const recentTransactions = [...transactions].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()).slice(0, 20);

  // Calculate Daily Summary Metrics
  const todayStr = format(new Date(), 'yyyy-MM-dd');
  const todayTransactions = transactions.filter(t => {
    try {
      return format(new Date(t.timestamp), 'yyyy-MM-dd') === todayStr;
    } catch {
      return false;
    }
  });

  const todaySuccessTransactions = todayTransactions.filter(t => t.status === 'success');
  const totalRevenue = todaySuccessTransactions.reduce((sum, t) => sum + t.total, 0);
  const transactionCount = todayTransactions.length;
  const itemCount = todayTransactions.reduce((sum, t) => {
    return sum + t.items.reduce((itemSum, item) => itemSum + (item.quantity || 0), 0);
  }, 0);

  return (
    <div className="flex-1 overflow-y-auto bg-slate-50 p-4 md:p-6 pb-24 md:pb-6">
      <div className="max-w-3xl mx-auto space-y-6">
        
        {/* Daily Summary Cards */}
        <motion.div 
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="grid grid-cols-1 sm:grid-cols-3 gap-4"
        >
          {/* Revenue Card */}
          <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm relative overflow-hidden group hover:border-emerald-100 transition-all">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Pendapatan Hari Ini</span>
              <div className="w-8 h-8 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600">
                <TrendingUp size={16} />
              </div>
            </div>
            <div className="text-xl font-black text-slate-900 tracking-tight leading-none">
              {formatCurrency(totalRevenue)}
            </div>
            <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider mt-1.5">
              Dari {todaySuccessTransactions.length} transaksi sukses
            </p>
            <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/5 rounded-full blur-2xl -mr-6 -mt-6 group-hover:bg-emerald-500/10 transition-colors" />
          </div>

          {/* Transaction Count Card */}
          <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm relative overflow-hidden group hover:border-blue-100 transition-all">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Total Transaksi</span>
              <div className="w-8 h-8 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600">
                <ClipboardList size={16} />
              </div>
            </div>
            <div className="text-2xl font-black text-slate-900 tracking-tight leading-none">
              {transactionCount}
            </div>
            <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider mt-1.5">
              Semua status transaksi hari ini
            </p>
            <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/5 rounded-full blur-2xl -mr-6 -mt-6 group-hover:bg-blue-500/10 transition-colors" />
          </div>

          {/* Item Count Card */}
          <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm relative overflow-hidden group hover:border-rose-100 transition-all">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Barang Terjual</span>
              <div className="w-8 h-8 rounded-xl bg-rose-50 flex items-center justify-center text-rose-600">
                <Package size={16} />
              </div>
            </div>
            <div className="text-2xl font-black text-slate-900 tracking-tight leading-none">
              {itemCount}
            </div>
            <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider mt-1.5">
              Total kuantitas item terjual
            </p>
            <div className="absolute top-0 right-0 w-24 h-24 bg-rose-500/5 rounded-full blur-2xl -mr-6 -mt-6 group-hover:bg-rose-500/10 transition-colors" />
          </div>
        </motion.div>

        <div className="flex items-center justify-between mb-2">
          <h2 className="text-xl font-bold flex items-center gap-2 text-slate-800">
            <History className="text-red-600" />
            Riwayat Transaksi Terbaru
          </h2>
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest bg-slate-100 px-3 py-1 rounded-full">
            {recentTransactions.length} Transaksi
          </span>
        </div>

        <div className="grid gap-3">
          {recentTransactions.map((t) => (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              key={t.id}
              className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between group hover:border-red-100 transition-all"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-slate-50 flex items-center justify-center text-slate-400 group-hover:bg-red-50 group-hover:text-red-600 transition-colors">
                  <ShoppingBag size={20} />
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">#{t.id.slice(-6)}</span>
                    <span className="px-1.5 py-0.5 bg-blue-50 text-blue-600 rounded text-[8px] font-black uppercase">
                      {t.paymentMethod}
                    </span>
                    <span className={`px-1.5 py-0.5 rounded text-[8px] font-black uppercase ${
                      t.status === 'success' ? 'bg-green-50 text-green-600' :
                      t.status === 'pending' ? 'bg-amber-50 text-amber-600' :
                      'bg-red-50 text-red-600'
                    }`}>
                      {t.status}
                    </span>
                  </div>
                  <div className="text-xs font-bold text-slate-800 line-clamp-1">
                    {t.items.length} Barang • {t.items[0]?.name || 'Tanpa Item'}{t.items.length > 1 ? '...' : ''}
                  </div>
                  <div className="flex items-center gap-3 mt-1">
                    <div className="flex items-center gap-1 text-[9px] text-slate-400 font-bold">
                       <Clock size={10} />
                       {format(new Date(t.timestamp), 'HH:mm')}
                    </div>
                    <div className="flex items-center gap-1 text-[9px] text-slate-400 font-bold">
                       <Calendar size={10} />
                       {format(new Date(t.timestamp), 'dd MMM yyyy')}
                    </div>
                  </div>
                </div>
              </div>

              <div className="text-right">
                <div className="text-sm font-black text-slate-900">{formatCurrency(t.total)}</div>
                <div className="flex items-center justify-end gap-3 mt-2">
                  <button 
                    onClick={() => onViewReceipt(t)}
                    className="text-[9px] font-black text-slate-400 uppercase tracking-widest hover:text-red-600 flex items-center gap-1 transition-colors"
                  >
                     Struk
                  </button>
                  <button 
                    onClick={() => onViewInvoice(t)}
                    className="text-[9px] font-black text-blue-600 uppercase tracking-widest hover:underline flex items-center gap-1"
                  >
                     Invoice
                     <ChevronRight size={10} />
                  </button>
                </div>
              </div>
            </motion.div>
          ))}

          {recentTransactions.length === 0 && (
            <div className="py-20 text-center bg-white rounded-[2rem] border border-dashed border-slate-200">
               <History className="w-16 h-16 text-slate-200 mx-auto mb-4" />
               <h3 className="text-lg font-bold text-slate-400 uppercase">Belum ada riwayat</h3>
               <p className="text-xs text-slate-300 font-bold uppercase tracking-widest mt-1">Transaksi Anda akan muncul di sini</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
