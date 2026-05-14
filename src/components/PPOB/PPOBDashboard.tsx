import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  CreditCard, 
  Smartphone, 
  Zap, 
  Droplets, 
  ShieldCheck, 
  Gamepad, 
  Tv, 
  History, 
  TrendingUp, 
  Wallet,
  Search,
  ChevronRight,
  ArrowRight,
  Plus,
  RefreshCw,
  Printer,
  CheckCircle2,
  XCircle,
  Clock
} from 'lucide-react';
import { usePPOBStore } from '../../services/ppobStore';
import { formatCurrency } from '../../lib/utils';
import PPOBReceipt from './PPOBReceipt';
import TopupModal from './TopupModal';
import { PPOBService, PPOBCategory, StoreSettings as StoreSettingsType, PPOBTransaction } from '../../types';
import DashboardCard from '../DashboardCard';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const categories: { id: PPOBCategory; name: string; icon: any; color: string }[] = [
  { id: 'Pulsa', name: 'Pulsa', icon: Smartphone, color: 'text-blue-600 bg-blue-100' },
  { id: 'Paket Data', name: 'Paket Data', icon: TrendingUp, color: 'text-green-600 bg-green-100' },
  { id: 'PLN', name: 'PLN', icon: Zap, color: 'text-yellow-600 bg-yellow-100' },
  { id: 'E-Wallet', name: 'E-Wallet', icon: Wallet, color: 'text-purple-600 bg-purple-100' },
  { id: 'PDAM', name: 'PDAM', icon: Droplets, color: 'text-cyan-600 bg-cyan-100' },
  { id: 'BPJS', name: 'BPJS', icon: ShieldCheck, color: 'text-red-600 bg-red-100' },
  { id: 'Game', name: 'Game', icon: Gamepad, color: 'text-pink-600 bg-pink-100' },
  { id: 'TV', name: 'TV', icon: Tv, color: 'text-indigo-600 bg-indigo-100' },
];

export default function PPOBDashboard({ userId, storeSettings }: { userId: string, storeSettings: StoreSettingsType }) {
  const { 
    services, 
    transactions, 
    userProfile, 
    isLoading, 
    fetchServices, 
    fetchTransactions, 
    fetchUserProfile,
    createTransaction,
    syncTransactionStatus
  } = usePPOBStore();

  const [selectedCategory, setSelectedCategory] = useState<PPOBCategory | null>(null);
  const [customerNumber, setCustomerNumber] = useState('');
  const [selectedProduct, setSelectedProduct] = useState<PPOBService | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showReceipt, setShowReceipt] = useState(false);
  const [showTopup, setShowTopup] = useState(false);
  const [lastTx, setLastTx] = useState<PPOBTransaction | null>(null);
  const [isSyncingAll, setIsSyncAll] = useState(false);

  useEffect(() => {
    fetchServices();
    fetchTransactions(userId);
    fetchUserProfile(userId);
  }, [userId, fetchServices, fetchTransactions, fetchUserProfile]);

  const handleSyncAll = async () => {
    setIsSyncAll(true);
    const pending = transactions.filter(t => t.status === 'pending');
    for (const tx of pending) {
      await syncTransactionStatus(tx.id);
    }
    setIsSyncAll(false);
  };

  const stats = {
    totalSales: transactions.reduce((acc, t) => acc + (t.status === 'success' ? t.total : 0), 0),
    totalTransactions: transactions.length,
    successTransactions: transactions.filter(t => t.status === 'success').length,
    totalProfit: transactions.reduce((acc, t) => acc + (t.status === 'success' ? (t.markup + t.adminFee) : 0), 0),
  };

  const chartData = transactions
    .filter(t => t.status === 'success')
    .slice(0, 7)
    .reverse()
    .map(t => ({
      time: new Date(t.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      amount: t.total,
    }));

  const filteredServices = services.filter(s => 
    (!selectedCategory || s.category === selectedCategory) &&
    (s.name.toLowerCase().includes(searchQuery.toLowerCase()) || s.code.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const handleProcessTransaction = async () => {
    if (!selectedProduct || !customerNumber) return;
    
    const res = await createTransaction({
      service: selectedProduct,
      customerNumber,
      userId,
      outletId: 'default-outlet'
    });

    if (res) {
      setLastTx(res);
      setShowReceipt(true);
      setCustomerNumber('');
      setSelectedProduct(null);
    }
  };

  return (
    <div className="flex-1 p-4 md:p-8 overflow-y-auto bg-slate-50 relative">
      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* Header with Balance */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div>
            <h1 className="text-3xl font-black text-slate-900 tracking-tight">PPOB Multi-Payment</h1>
            <p className="text-slate-500 font-medium">Isi pulsa, token listrik, dan tagihan lainnya.</p>
          </div>
          
          <div className="bg-white p-2 rounded-[2rem] shadow-xl shadow-slate-200/50 border border-slate-100 flex items-center gap-4">
            <div className="px-6 py-3">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Saldo Akun</span>
              <div className="text-2xl font-black text-blue-600">{formatCurrency(userProfile?.balance || 0)}</div>
            </div>
            <button 
              onClick={() => setShowTopup(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white p-4 rounded-3xl transition-all shadow-lg active:scale-95"
            >
              <Plus className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <DashboardCard title="Penjualan" value={formatCurrency(stats.totalSales)} icon={TrendingUp} variant="white" />
          <DashboardCard title="Total Transaksi" value={stats.totalTransactions} icon={History} variant="blue" />
          <DashboardCard title="Profit Bersih" value={formatCurrency(stats.totalProfit)} icon={ShieldCheck} variant="green" />
          <DashboardCard title="Status System" value="Ready" icon={CheckCircle2} variant="purple" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Main Transaction Area */}
          <div className="lg:col-span-2 space-y-8">
            
            {/* Categories */}
            <div className="bg-white p-6 rounded-[2.5rem] shadow-sm border border-slate-100 overflow-x-auto scrollbar-hide">
              <div className="flex gap-4">
                {categories.map((cat) => (
                  <button
                    key={cat.id}
                    onClick={() => setSelectedCategory(selectedCategory === cat.id ? null : cat.id)}
                    className={`flex-shrink-0 flex flex-col items-center gap-3 p-4 min-w-[100px] rounded-3xl transition-all ${
                      selectedCategory === cat.id ? 'bg-blue-600 text-white shadow-xl shadow-blue-200' : 'bg-slate-50 hover:bg-slate-100 text-slate-600'
                    }`}
                  >
                    <cat.icon className={`w-6 h-6 ${selectedCategory === cat.id ? 'text-white' : ''}`} />
                    <span className="text-xs font-bold">{cat.name}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Service Selection */}
            {selectedCategory && (
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100 space-y-6"
              >
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">Nomor Pelanggan / HP</label>
                    <div className="relative">
                      <Smartphone className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                      <input 
                        type="text" 
                        value={customerNumber}
                        onChange={(e) => setCustomerNumber(e.target.value)}
                        placeholder="Contoh: 081234567890"
                        className="w-full bg-slate-50 border-none rounded-2xl py-4 pl-12 pr-4 focus:ring-2 focus:ring-blue-500 font-bold transition-all"
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">Cari Produk</label>
                    <div className="relative">
                      <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                      <input 
                        type="text" 
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Cari pulsa, data, dll..."
                        className="w-full bg-slate-50 border-none rounded-2xl py-4 pl-12 pr-4 focus:ring-2 focus:ring-blue-500 font-bold transition-all"
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                  {filteredServices.map(service => (
                    <button
                      key={service.id}
                      onClick={() => setSelectedProduct(service)}
                      className={`p-4 rounded-3xl text-left transition-all border-2 ${
                        selectedProduct?.id === service.id 
                          ? 'bg-blue-600 border-blue-600 text-white shadow-xl shadow-blue-100' 
                          : 'bg-white border-slate-100 hover:border-blue-200'
                      }`}
                    >
                      <div className={`text-[9px] font-black uppercase mb-1 ${selectedProduct?.id === service.id ? 'text-blue-100' : 'text-slate-400'}`}>
                        {service.provider}
                      </div>
                      <div className="font-black text-sm mb-2">{service.name}</div>
                      <div className={`text-lg font-black ${selectedProduct?.id === service.id ? 'text-white' : 'text-blue-600'}`}>
                        {formatCurrency(service.basePrice + service.markupPrice + service.adminFee)}
                      </div>
                    </button>
                  ))}
                </div>

                {selectedProduct && (
                  <motion.button
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    onClick={handleProcessTransaction}
                    disabled={isLoading || !customerNumber}
                    className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-slate-200 text-white py-5 rounded-[2rem] font-black text-lg shadow-xl shadow-blue-200 transition-all active:scale-[0.98] flex items-center justify-center gap-3"
                  >
                    {isLoading ? (
                      <RefreshCw className="w-6 h-6 animate-spin" />
                    ) : (
                      <>
                        <RefreshCw className="w-6 h-6" />
                        Bayar Sekarang
                      </>
                    )}
                  </motion.button>
                )}
              </motion.div>
            )}

            {/* Recent Transactions List */}
            <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100">
              <div className="flex justify-between items-center mb-8">
                <h3 className="text-xl font-black text-slate-900 tracking-tight px-2">Transaksi Terbaru</h3>
                <div className="flex gap-2">
                  {transactions.some(t => t.status === 'pending') && (
                    <button 
                      onClick={handleSyncAll}
                      disabled={isSyncingAll}
                      className="text-yellow-600 text-sm font-black flex items-center gap-2 hover:bg-yellow-50 px-4 py-2 rounded-2xl transition-all disabled:opacity-50"
                    >
                      <RefreshCw className={`w-4 h-4 ${isSyncingAll ? 'animate-spin' : ''}`} />
                      Sync Pending
                    </button>
                  )}
                  <button className="text-blue-600 text-sm font-black flex items-center gap-2 hover:bg-blue-50 px-4 py-2 rounded-2xl transition-all">
                    Lihat Semua <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
              
              <div className="space-y-4">
                {transactions.slice(0, 5).map((tx) => (
                  <div key={tx.id} className="flex items-center justify-between p-4 bg-slate-50 hover:bg-white border border-transparent hover:border-slate-100 rounded-[2rem] transition-all group">
                    <div className="flex items-center gap-4">
                      <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${
                        tx.status === 'success' ? 'bg-green-100 text-green-600' : 
                        tx.status === 'pending' ? 'bg-yellow-100 text-yellow-600' : 'bg-red-100 text-red-600'
                      }`}>
                        {tx.status === 'success' ? <CheckCircle2 className="w-6 h-6" /> : 
                         tx.status === 'pending' ? <Clock className="w-6 h-6" /> : <XCircle className="w-6 h-6" />}
                      </div>
                      <div>
                        <div className="font-black text-slate-900 group-hover:text-blue-600 transition-colors uppercase text-sm tracking-tight">{tx.productName}</div>
                        <div className="text-xs font-bold text-slate-400">{tx.customerNumber} • {new Date(tx.timestamp).toLocaleString()}</div>
                      </div>
                    </div>
                    <div className="text-right flex items-center gap-4">
                      {tx.status === 'pending' && (
                        <button 
                          onClick={() => syncTransactionStatus(tx.id)}
                          className="p-2 hover:bg-yellow-100 rounded-full text-yellow-600 transition-all"
                          title="Perbarui Status"
                        >
                          <RefreshCw className="w-5 h-5" />
                        </button>
                      )}
                      <div>
                        <div className="font-black text-slate-900">{formatCurrency(tx.total)}</div>
                        <div className={`text-[10px] font-black uppercase tracking-widest ${
                          tx.status === 'success' ? 'text-green-600' : 
                          tx.status === 'pending' ? 'text-yellow-600' : 'text-red-600'
                        }`}>{tx.status}</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Sidebar Area */}
          <div className="space-y-8">
            
            {/* Sales Chart */}
            <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100">
              <h3 className="text-lg font-black text-slate-900 mb-6 px-2">Trend Transaksi</h3>
              <div className="h-[200px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData}>
                    <defs>
                      <linearGradient id="colorAmount" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.1}/>
                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="time" hide />
                    <YAxis hide />
                    <Tooltip 
                      contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                      itemStyle={{ fontWeight: 'black', color: '#3b82f6' }}
                    />
                    <Area type="monotone" dataKey="amount" stroke="#3b82f6" strokeWidth={3} fillOpacity={1} fill="url(#colorAmount)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="bg-blue-600 p-8 rounded-[2.5rem] shadow-xl shadow-blue-200 text-white space-y-6">
              <h3 className="text-lg font-black tracking-tight">Butuh Saldo?</h3>
              <p className="text-blue-100 text-sm font-medium leading-relaxed">Topup saldo Anda untuk melanjutkan jualan pulsa dan bayar tagihan.</p>
            <button 
                onClick={() => setShowTopup(true)}
                className="w-full bg-white text-blue-600 py-4 rounded-2xl font-black shadow-lg hover:shadow-xl transition-all active:scale-95 flex items-center justify-center gap-2"
              >
                Topup Saldo <ArrowRight className="w-4 h-4" />
              </button>
            </div>

            {/* Notifications */}
            <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100">
              <h3 className="text-lg font-black text-slate-900 mb-6 px-2">Informasi</h3>
              <div className="space-y-6">
                <div className="flex gap-4">
                  <div className="w-10 h-10 bg-yellow-100 text-yellow-600 rounded-2xl flex-shrink-0 flex items-center justify-center">
                    <Zap className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-black text-slate-800">Gangguan PLN</h4>
                    <p className="text-xs text-slate-500 mt-1">Pembayaran PLN sedang dalam maintenance oleh provider.</p>
                  </div>
                </div>
                <div className="flex gap-4">
                  <div className="w-10 h-10 bg-blue-100 text-blue-600 rounded-2xl flex-shrink-0 flex items-center justify-center">
                    <Smartphone className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-black text-slate-800">Promo Telkomsel</h4>
                    <p className="text-xs text-slate-500 mt-1">Dapatkan diskon untuk paket data Telkomsel hari ini.</p>
                  </div>
                </div>
              </div>
            </div>

          </div>
        </div>
      </div>

      <AnimatePresence>
        {showReceipt && lastTx && (
          <PPOBReceipt 
            transaction={lastTx} 
            storeSettings={storeSettings} 
            onClose={() => setShowReceipt(false)} 
          />
        )}
        {showTopup && (
          <TopupModal
            userId={userId}
            onClose={() => setShowTopup(false)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
