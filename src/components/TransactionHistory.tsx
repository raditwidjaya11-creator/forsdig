import { useState, useMemo } from 'react';
import { Transaction, StoreSettings } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { History, TrendingUp, DollarSign, Calendar, Search, Download, FileText, ChevronRight, Activity, Percent, QrCode, Target, Printer } from 'lucide-react';
import { formatCurrency } from '../lib/utils';
import InvoiceModal from './InvoiceModal';
import DashboardCard from './DashboardCard';
import { 
  format, 
  startOfDay, 
  endOfDay, 
  startOfWeek, 
  endOfWeek, 
  startOfMonth, 
  endOfMonth, 
  isWithinInterval,
  subDays,
  eachDayOfInterval,
  isSameDay,
  eachHourOfInterval,
  isSameHour
} from 'date-fns';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  Cell, 
  AreaChart, 
  Area,
  LineChart,
  Line,
  Legend
} from 'recharts';
import { exportTransactionsToCSV, exportTransactionsToPDF } from '../lib/exportUtils';

interface TransactionHistoryProps {
  transactions: Transaction[];
  storeSettings: StoreSettings;
  isOnline: boolean;
  onUpdateTransaction?: (t: Transaction) => void;
}

export default function TransactionHistory({ transactions, storeSettings, isOnline, onUpdateTransaction }: TransactionHistoryProps) {
  const [period, setPeriod] = useState<'daily' | 'weekly' | 'monthly'>('daily');
  const [selectedInvoice, setSelectedInvoice] = useState<Transaction | null>(null);

  const filteredTransactions = useMemo(() => {
    const now = new Date();
    let interval: { start: Date; end: Date };

    if (period === 'daily') {
      interval = { start: startOfDay(now), end: endOfDay(now) };
    } else if (period === 'weekly') {
      interval = { start: startOfWeek(now), end: endOfWeek(now) };
    } else {
      interval = { start: startOfMonth(now), end: endOfMonth(now) };
    }

    return transactions.filter(t => 
      isWithinInterval(new Date(t.timestamp), interval)
    );
  }, [transactions, period]);

  const stats = useMemo(() => {
    const totalSales = filteredTransactions.reduce((acc, t) => acc + t.total, 0);
    const totalCost = filteredTransactions.reduce((acc, t) => {
      return acc + t.items.reduce((itemAcc, item) => itemAcc + ((item.costPrice || 0) * item.quantity), 0);
    }, 0);
    const grossProfit = totalSales - totalCost;
    const totalTax = filteredTransactions.reduce((acc, t) => acc + (t.tax || 0), 0);
    const netProfit = grossProfit - totalTax;
    const averageTicket = filteredTransactions.length > 0 ? totalSales / filteredTransactions.length : 0;

    return { totalSales, totalCost, grossProfit, netProfit, averageTicket, totalTax };
  }, [filteredTransactions]);

  const qrStats = useMemo(() => {
    const qrTxs = filteredTransactions.filter(t => t.paymentMethod === 'QR Payment' || t.paymentMethod === 'QRIS');
    const totalQR = qrTxs.reduce((acc, t) => acc + t.total, 0);
    const countQR = qrTxs.length;
    
    // Group by provider if metadata exists
    const byProvider: Record<string, number> = {};
    qrTxs.forEach(t => {
      const provider = t.paymentDetails?.qrProvider || 'Lainnya';
      byProvider[provider] = (byProvider[provider] || 0) + t.total;
    });

    return { totalQR, countQR, byProvider };
  }, [filteredTransactions]);

  const chartData = useMemo(() => {
    const now = new Date();
    
    const calculateData = (txs: Transaction[]) => {
      const sales = txs.reduce((sum, t) => sum + t.total, 0);
      const cost = txs.reduce((sum, t) => sum + t.items.reduce((iSum, i) => iSum + ((i.costPrice || 0) * i.quantity), 0), 0);
      const tax = txs.reduce((sum, t) => sum + (t.tax || 0), 0);
      const grossProfit = sales - cost;
      const netProfit = grossProfit - tax;
      return { sales, grossProfit, netProfit };
    };

    if (period === 'daily') {
      const hours = eachHourOfInterval({
        start: startOfDay(now),
        end: endOfDay(now)
      });

      return hours.map(hour => {
        const hourTxs = filteredTransactions.filter(t => isSameHour(new Date(t.timestamp), hour));
        const res = calculateData(hourTxs);
        return {
          name: format(hour, 'HH:00'),
          ...res
        };
      }).filter(d => d.sales > 0 || parseInt(d.name) % 4 === 0);
    }

    if (period === 'weekly') {
      const days = eachDayOfInterval({
        start: startOfWeek(now),
        end: endOfWeek(now)
      });

      return days.map(day => {
        const dayTxs = filteredTransactions.filter(t => isSameDay(new Date(t.timestamp), day));
        const res = calculateData(dayTxs);
        return {
          name: format(day, 'EEE'),
          ...res
        };
      });
    }

    // Monthly
    const days = eachDayOfInterval({
      start: startOfMonth(now),
      end: endOfMonth(now)
    });

    return days.map(day => {
      const dayTxs = filteredTransactions.filter(t => isSameDay(new Date(t.timestamp), day));
      const res = calculateData(dayTxs);
      return {
        name: format(day, 'dd'),
        ...res
      };
    }).filter((_, i) => i % (now.getDate() > 15 ? 2 : 1) === 0);
  }, [filteredTransactions, period]);

  return (
    <div className="p-4 sm:p-8 pb-40 md:pb-12">
      <div className="mb-8 md:mb-12 flex flex-col lg:flex-row lg:items-end justify-between gap-6">
        <div>
          <h1 className="text-xl sm:text-2xl md:text-3xl font-bold flex items-center gap-2 uppercase tracking-tight">
            <TrendingUp className="w-5 h-5 sm:w-6 sm:h-6 md:w-8 md:h-8 text-red-600" />
            Laporan Keuntungan
          </h1>
          <p className="text-[10px] sm:text-xs md:text-sm text-slate-500 font-bold uppercase tracking-widest mt-1">Analisis Performa Bisnis Berkala</p>
        </div>
        
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
          <div className="bg-slate-100 p-1 rounded-2xl flex gap-1 justify-center sm:justify-start">
            <button 
              onClick={() => setPeriod('daily')}
              className={`flex-1 sm:flex-none px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${period === 'daily' ? 'bg-white text-red-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
            >
              Harian
            </button>
            <button 
              onClick={() => setPeriod('weekly')}
              className={`flex-1 sm:flex-none px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${period === 'weekly' ? 'bg-white text-red-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
            >
              Mingguan
            </button>
            <button 
              onClick={() => setPeriod('monthly')}
              className={`flex-1 sm:flex-none px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${period === 'monthly' ? 'bg-white text-red-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
            >
              Bulanan
            </button>
          </div>

          <div className="flex gap-2">
            <button 
              onClick={() => exportTransactionsToCSV(filteredTransactions)}
              disabled={filteredTransactions.length === 0}
              className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-6 py-3 bg-slate-800 text-white rounded-2xl font-bold hover:bg-slate-900 transition-all text-sm shadow-xl shadow-slate-100 disabled:opacity-50 disabled:bg-slate-400 disabled:shadow-none"
            >
              <Download className="w-4 h-4" />
              CSV
            </button>
            <button 
              onClick={() => exportTransactionsToPDF(filteredTransactions, storeSettings, period)}
              disabled={filteredTransactions.length === 0}
              className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-6 py-3 bg-red-600 text-white rounded-2xl font-bold hover:bg-red-700 transition-all text-sm shadow-xl shadow-red-100 disabled:opacity-50 disabled:bg-slate-400 disabled:shadow-none"
            >
              <FileText className="w-4 h-4" />
              PDF
            </button>
          </div>
        </div>
      </div>

      <div className="flex flex-row overflow-x-auto gap-3 md:gap-4 pb-4 mb-8 md:mb-12 scrollbar-hide -mx-4 px-4 sm:mx-0 sm:px-0 lg:grid lg:grid-cols-5 lg:gap-4">
        <DashboardCard 
          title="Sales" 
          value={formatCurrency(stats.totalSales)} 
          icon={DollarSign} 
          variant="white"
        />
        <DashboardCard 
          title="Laba Kotor" 
          value={formatCurrency(stats.grossProfit)} 
          icon={Activity} 
          variant="orange"
        />
        <DashboardCard 
          title="Laba Bersih" 
          value={formatCurrency(stats.netProfit)} 
          icon={TrendingUp} 
          variant="green"
        />
        <DashboardCard 
          title="Rata-rata" 
          value={formatCurrency(stats.averageTicket)} 
          icon={Target} 
          variant="blue"
        />
        <DashboardCard 
          title="Pajak" 
          value={formatCurrency(stats.totalTax)} 
          icon={Percent} 
          variant="purple"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8 mb-8">
        <div className="lg:col-span-2 bg-white p-5 sm:p-8 rounded-[1.5rem] md:rounded-[2.5rem] shadow-sm border border-slate-100">
          <div className="flex items-center justify-between mb-6 sm:mb-8 text-center sm:text-left">
            <div>
              <h2 className="text-lg sm:text-xl font-bold">Analisis Keuntungan</h2>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Laba Kotor vs Bersih ({period})</p>
            </div>
          </div>
          <div className="h-48 sm:h-80 w-full overflow-hidden">
            {chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="colorGross" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#f97316" stopOpacity={0.1}/>
                      <stop offset="95%" stopColor="#f97316" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorNet" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#22c55e" stopOpacity={0.1}/>
                      <stop offset="95%" stopColor="#22c55e" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#94a3b8' }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#94a3b8' }} />
                  <Tooltip 
                    contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                    formatter={(value: number) => [formatCurrency(value), '']}
                  />
                  <Legend iconType="circle" />
                  <Area 
                    type="monotone" 
                    dataKey="grossProfit" 
                    name="Laba Kotor" 
                    stroke="#f97316" 
                    fillOpacity={1} 
                    fill="url(#colorGross)" 
                    strokeWidth={3}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="netProfit" 
                    name="Laba Bersih" 
                    stroke="#22c55e" 
                    fillOpacity={1} 
                    fill="url(#colorNet)" 
                    strokeWidth={3}
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center text-slate-300">
                <Activity className="w-12 h-12 mb-2 opacity-20" />
                <p className="text-[10px] font-bold uppercase tracking-widest">Belum ada data visual</p>
              </div>
            )}
          </div>
        </div>

        <div className="bg-white p-5 sm:p-8 rounded-[2rem] sm:rounded-[2.5rem] shadow-sm border border-slate-100 flex flex-col">
          <div className="mb-5 sm:mb-6 text-center lg:text-left">
            <h2 className="text-lg sm:text-xl font-bold">Ringkasan QR</h2>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Performa Pembayaran QR</p>
          </div>
          
          <div className="flex-1 space-y-5 sm:space-y-6">
             <div className="p-5 sm:p-6 bg-blue-50 rounded-[2rem] border border-blue-100 text-center lg:text-left">
                <div className="flex flex-col lg:flex-row items-center gap-2 sm:gap-3 mb-2">
                   <div className="p-2 bg-white rounded-lg text-blue-600 hidden lg:block">
                      <QrCode size={16} />
                   </div>
                   <span className="text-[9px] sm:text-[10px] font-black text-blue-400 uppercase tracking-widest">Total Transaksi QR</span>
                </div>
                <p className="text-xl sm:text-2xl font-black text-blue-700">{formatCurrency(qrStats.totalQR)}</p>
                <p className="text-[9px] sm:text-[10px] font-bold text-blue-400 mt-1 uppercase tracking-tight">{qrStats.countQR} Transaksi Sukses</p>
             </div>

             <div className="space-y-3 sm:space-y-4">
                <p className="text-[9px] sm:text-[10px] font-black text-slate-400 uppercase tracking-widest px-1 text-center lg:text-left">Berdasarkan Penyedia</p>
                <div className="grid grid-cols-2 lg:grid-cols-1 gap-2 sm:gap-3 lg:overflow-visible scrollbar-hide pr-1 pb-2">
                   {Object.entries(qrStats.byProvider).map(([provider, amount]) => (
                     <div key={provider} className="flex flex-col lg:flex-row items-center lg:justify-between p-2.5 sm:p-3 bg-slate-50 rounded-2xl border border-transparent hover:border-slate-100 text-center lg:text-left">
                        <div className="flex flex-col lg:flex-row items-center gap-1.5 lg:gap-3 mb-1.5 lg:mb-0">
                           <div className="w-7 h-7 rounded-lg bg-white flex items-center justify-center text-slate-400 hidden lg:flex">
                              <Target size={12} />
                           </div>
                           <span className="text-[10px] font-black text-slate-600 uppercase tracking-tight truncate max-w-full">{provider}</span>
                        </div>
                        <span className="text-[10px] sm:text-xs font-black text-slate-800">{formatCurrency(amount as number)}</span>
                     </div>
                   ))}
                   {Object.keys(qrStats.byProvider).length === 0 && (
                     <div className="col-span-2 lg:col-span-1 py-8 text-center bg-slate-50 rounded-[2rem] border border-dashed border-slate-200">
                        <p className="text-[9px] sm:text-[10px] font-bold text-slate-400 uppercase tracking-widest">Belum ada transaksi QR</p>
                     </div>
                   )}
                </div>
             </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        <div className="bg-white p-5 sm:p-8 rounded-[2rem] sm:rounded-[2.5rem] shadow-sm border border-slate-100">
          <div className="flex items-center justify-between mb-6 sm:mb-8 text-center sm:text-left">
            <div>
              <h2 className="text-lg sm:text-xl font-bold">Grafik Penjualan</h2>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest leading-tight">Total Transaksi {period}</p>
            </div>
          </div>
          <div className="h-64 w-full">
            {chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#94a3b8' }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#94a3b8' }} />
                  <Tooltip 
                    cursor={{ fill: 'transparent' }} 
                    contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                    formatter={(value: number) => [formatCurrency(value), 'Sales']}
                  />
                  <Bar dataKey="sales" name="Sales" radius={[4, 4, 0, 0]} fill="#ef4444" barSize={period === 'monthly' ? 8 : 20} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="w-full h-full flex items-center justify-center text-slate-300">
                <p className="text-[10px] font-bold uppercase tracking-widest">Tidak ada data penjualan</p>
              </div>
            )}
          </div>
        </div>

        <div className="bg-white p-5 sm:p-8 rounded-[1.5rem] md:rounded-[2.5rem] shadow-sm border border-slate-100">
          <div className="flex items-center justify-between mb-6 sm:mb-8 text-center sm:text-left">
            <div>
              <h2 className="text-lg sm:text-xl font-bold">Riwayat {period === 'daily' ? 'Hari Ini' : 'Periode Ini'}</h2>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest leading-tight">Transaksi sukses ({period})</p>
            </div>
            <div className="hidden sm:block p-2 bg-slate-50 border border-slate-100 rounded-xl">
              <Calendar className="w-5 h-5 text-slate-400" />
            </div>
          </div>
          
          <div className="space-y-3 lg:overflow-visible scrollbar-hide pr-1">
            {[...filteredTransactions].reverse().map((t) => (
              <div key={t.id} className="flex items-center justify-between p-3 md:p-4 rounded-xl md:rounded-2xl bg-slate-50 border border-transparent hover:border-slate-100 transition-all group">
                <div className="flex items-center gap-2 md:gap-4">
                  <div className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-white flex items-center justify-center font-bold text-[10px] md:text-xs shadow-sm group-hover:scale-110 transition-transform shrink-0">
                    {t.paymentMethod?.[0] || 'P'}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1 md:gap-2">
                      <div className="font-bold text-xs md:text-sm truncate">#{t.id.slice(-6)}</div>
                      <span className={`px-1 py-0.5 rounded text-[7px] md:text-[8px] font-black uppercase tracking-tighter shrink-0 ${
                        t.status === 'success' ? 'bg-green-50 text-green-600' :
                        t.status === 'pending' ? 'bg-amber-50 text-amber-600' :
                        'bg-red-50 text-red-600'
                      }`}>
                        {t.status}
                      </span>
                    </div>
                    <div className="text-[9px] md:text-[10px] text-slate-400 font-medium truncate">
                      {format(new Date(t.timestamp), 'dd MMM, HH:mm')}
                    </div>
                  </div>
                </div>
                <div className="text-right flex items-center gap-2 md:gap-4 shrink-0">
                  <div className="text-right">
                    <div className="font-bold text-xs md:text-base text-red-600 truncate">{formatCurrency(t.total)}</div>
                    <div className="flex items-center justify-end gap-1 mt-0.5">
                      <div className={`w-1 h-1 md:w-1.5 md:h-1.5 rounded-full ${isOnline ? 'bg-green-500' : 'bg-slate-300'}`} />
                      <span className={`text-[8px] md:text-[9px] font-bold uppercase tracking-tighter ${isOnline ? 'text-green-600' : 'text-slate-400'}`}>
                        {isOnline ? 'On' : 'Off'}
                      </span>
                    </div>
                  </div>
                  <button 
                    onClick={() => setSelectedInvoice(t)}
                    className="p-1.5 md:p-2.5 bg-white border border-slate-200 rounded-lg md:rounded-xl text-slate-400 hover:text-red-600 hover:border-red-100 transition-all shadow-sm"
                    title="Cetak Invoice A4"
                  >
                    <FileText size={14} className="md:w-4 md:h-4" />
                  </button>
                </div>
              </div>
            ))}
            {filteredTransactions.length === 0 && (
              <div className="py-12 text-center text-slate-400 space-y-2">
                <History className="w-12 h-12 mx-auto opacity-20" />
                <p className="text-xs font-bold uppercase tracking-widest">Tidak ada transaksi di periode ini</p>
              </div>
            )}
          </div>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {selectedInvoice && (
          <InvoiceModal 
            transaction={selectedInvoice}
            storeSettings={storeSettings}
            onClose={() => setSelectedInvoice(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
