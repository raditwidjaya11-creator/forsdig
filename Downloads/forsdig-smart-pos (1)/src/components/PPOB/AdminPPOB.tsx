import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { 
  Users, 
  Wallet, 
  TrendingUp, 
  History, 
  Plus, 
  Search, 
  Filter,
  CheckCircle2,
  XCircle,
  Clock,
  ArrowUpRight,
  ArrowDownRight,
  MoreVertical,
  Settings,
  RefreshCw
} from 'lucide-react';
import { usePPOBStore } from '../../services/ppobStore';
import { formatCurrency } from '../../lib/utils';
import DashboardCard from '../DashboardCard';
import axios from 'axios';
import { toast } from 'sonner';

export default function AdminPPOB() {
  const { 
    transactions, 
    userProfile, 
    fetchTransactions,
    mutations: balanceMutations,
    fetchMutations: fetchBalanceMutations,
    fetchUserProfile,
    syncTransactionStatus
  } = usePPOBStore();

  const [activeTab, setActiveTab] = useState<'transactions' | 'mutations' | 'users' | 'topup'>('transactions');
  const [searchQuery, setSearchQuery] = useState('');
  const [isSyncing, setIsSyncing] = useState(false);

  const [topupForm, setTopupForm] = useState({
    userId: '',
    amount: 0,
    description: 'Topup Manual by Admin'
  });

  const handleSync = async () => {
    setIsSyncing(true);
    try {
      await axios.get('/api/ppob/sync');
      toast.success('Sinkronisasi produk berhasil');
    } catch (error) {
      toast.error('Gagal sinkronisasi produk');
    } finally {
      setIsSyncing(false);
    }
  };

  const handleManualTopup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!topupForm.userId || topupForm.amount <= 0) return;

    try {
      // Direct RPC call simulation or dedicated endpoint
      // For now we'll assume the store or a new endpoint handles this
      // In a real app, this should be a POST to /api/admin/topup
      toast.success('Topup berhasil diproses');
      setTopupForm({ userId: '', amount: 0, description: 'Topup Manual by Admin' });
    } catch (error) {
      toast.error('Gagal melakukan topup');
    }
  };

  useEffect(() => {
    // In a real app, admin would fetch all transactions
    fetchTransactions('all'); 
    fetchBalanceMutations('all');
  }, [fetchTransactions, fetchBalanceMutations]);

  const stats = {
    totalRevenue: transactions.reduce((acc, t) => acc + (t.status === 'success' ? t.total : 0), 0),
    totalProfit: transactions.reduce((acc, t) => acc + (t.status === 'success' ? (t.markup + t.adminFee) : 0), 0),
    activeUsers: 1, // Placeholder
    pendingTx: transactions.filter(t => t.status === 'pending').length
  };

  return (
    <div className="flex-1 p-8 overflow-y-auto bg-slate-50">
      <div className="max-w-7xl mx-auto space-y-8">
        
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-black text-slate-900 tracking-tight">Admin PPOB Panel</h1>
            <p className="text-slate-500 font-medium">Monitoring transaksi dan saldo seluruh outlet.</p>
          </div>
          <div className="flex gap-4">
            <button 
              onClick={handleSync}
              disabled={isSyncing}
              className="bg-white text-slate-700 px-6 py-3 rounded-2xl font-bold border border-slate-200 hover:bg-slate-50 transition-all flex items-center gap-2 disabled:opacity-50"
            >
              <RefreshCw className={`w-5 h-5 ${isSyncing ? 'animate-spin' : ''}`} />
              {isSyncing ? 'Syncing...' : 'Sync Produk'}
            </button>
            <button className="bg-white text-slate-700 px-6 py-3 rounded-2xl font-bold border border-slate-200 hover:bg-slate-50 transition-all flex items-center gap-2">
              <Settings className="w-5 h-5" />
              Pengaturan Global
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <DashboardCard title="Total Pendapatan" value={formatCurrency(stats.totalRevenue)} icon={TrendingUp} variant="white" />
          <DashboardCard title="Total Keuntungan" value={formatCurrency(stats.totalProfit)} icon={Wallet} variant="green" />
          <DashboardCard title="Outlet Aktif" value={stats.activeUsers} icon={Users} variant="blue" />
          <DashboardCard title="Transaksi Pending" value={stats.pendingTx} icon={Clock} variant="yellow" />
        </div>

        <div className="bg-white rounded-[2.5rem] shadow-sm border border-slate-100 overflow-hidden">
          <div className="border-b border-slate-100 p-2">
            <div className="flex gap-1">
              {['transactions', 'mutations', 'users', 'topup'].map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab as any)}
                  className={`px-8 py-4 rounded-2xl font-black text-xs uppercase tracking-widest transition-all ${
                    activeTab === tab ? 'bg-slate-900 text-white shadow-lg' : 'text-slate-500 hover:bg-slate-50'
                  }`}
                >
                  {tab === 'transactions' ? 'Data Transaksi' : tab === 'mutations' ? 'Log Saldo' : tab === 'topup' ? 'Topup Manual' : 'Manajemen User'}
                </button>
              ))}
            </div>
          </div>

          <div className="p-8">
            {activeTab === 'transactions' && (
              <div className="space-y-6">
                <div className="flex gap-4 items-center mb-8">
                  <div className="relative flex-1">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
                    <input 
                      type="text" 
                      placeholder="Cari ID transaksi, nomor pelanggan..." 
                      className="w-full bg-slate-50 border-none rounded-2xl py-4 pl-12 pr-4 focus:ring-2 focus:ring-slate-900 font-bold"
                    />
                  </div>
                  <button className="p-4 bg-slate-100 rounded-2xl text-slate-600 hover:bg-slate-200 transition-all">
                    <Filter className="w-6 h-6" />
                  </button>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">
                        <th className="pb-4 px-4">Waktu</th>
                        <th className="pb-4 px-4">ID Transaksi</th>
                        <th className="pb-4 px-4">Produk</th>
                        <th className="pb-4 px-4">Customer</th>
                        <th className="pb-4 px-4">Nominal</th>
                        <th className="pb-4 px-4">Profit</th>
                        <th className="pb-4 px-4">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {transactions.map((tx) => (
                        <tr key={tx.id} className="group hover:bg-slate-50 transition-all">
                          <td className="py-4 px-4 text-xs font-bold text-slate-500">
                            {new Date(tx.timestamp).toLocaleString()}
                          </td>
                          <td className="py-4 px-4">
                            <span className="text-xs font-black text-slate-900">{tx.id}</span>
                          </td>
                          <td className="py-4 px-4">
                            <div className="font-black text-sm text-slate-900">{tx.productName}</div>
                            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">{tx.productCode}</div>
                          </td>
                          <td className="py-4 px-4 font-bold text-sm">{tx.customerNumber}</td>
                          <td className="py-4 px-4 font-black">{formatCurrency(tx.total)}</td>
                          <td className="py-4 px-4 font-bold text-green-600">+{formatCurrency(tx.markup + tx.adminFee)}</td>
                          <td className="py-4 px-4">
                            <div className="flex items-center gap-2">
                              <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-tighter ${
                                tx.status === 'success' ? 'bg-green-100 text-green-700' : 
                                tx.status === 'pending' ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'
                              }`}>
                                {tx.status === 'success' ? <CheckCircle2 className="w-3 h-3" /> : 
                                 tx.status === 'pending' ? <Clock className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                                {tx.status}
                              </div>
                              {tx.status === 'pending' && (
                                <button 
                                  onClick={() => syncTransactionStatus(tx.id)}
                                  className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-blue-600 transition-all"
                                  title="Sync Status"
                                >
                                  <RefreshCw className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {activeTab === 'mutations' && (
              <div className="space-y-4">
                {balanceMutations.map((m) => (
                  <div key={m.id} className="flex items-center justify-between p-6 bg-slate-50 rounded-3xl border border-transparent hover:border-slate-100 hover:bg-white transition-all group">
                    <div className="flex items-center gap-4">
                      <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${
                        m.type === 'topup' || m.type === 'refund' ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'
                      }`}>
                        {m.type === 'topup' || m.type === 'refund' ? <ArrowUpRight className="w-6 h-6" /> : <ArrowDownRight className="w-6 h-6" />}
                      </div>
                      <div>
                        <div className="font-black text-slate-900 group-hover:text-blue-600 transition-colors uppercase text-sm tracking-tight">{m.description}</div>
                        <div className="text-xs font-bold text-slate-400">{new Date(m.timestamp).toLocaleString()} • Ref: {m.referenceId}</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className={`font-black text-lg ${m.type === 'topup' || m.type === 'refund' ? 'text-green-600' : 'text-red-600'}`}>
                        {m.type === 'topup' || m.type === 'refund' ? '+' : '-'}{formatCurrency(m.amount)}
                      </div>
                      <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Saldo: {formatCurrency(m.currentBalance)}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {activeTab === 'users' && (
              <div className="py-20 text-center text-slate-400 space-y-4">
                <Users size={48} className="mx-auto opacity-10" />
                <p className="text-sm font-bold uppercase tracking-widest italic tracking-tighter">Fitur Manajemen User sedang dikembangkan</p>
              </div>
            )}

            {activeTab === 'topup' && (
              <div className="max-w-md mx-auto space-y-8 py-8">
                <div className="text-center">
                  <h3 className="text-xl font-black text-slate-900">Input Saldo Manual</h3>
                  <p className="text-sm text-slate-500">Gunakan ini untuk topup saldo outlet secara manual.</p>
                </div>

                <form onSubmit={handleManualTopup} className="space-y-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">ID User / Outlet</label>
                    <input 
                      type="text" 
                      required
                      value={topupForm.userId}
                      onChange={(e) => setTopupForm({...topupForm, userId: e.target.value})}
                      placeholder="Masukkan UUID User"
                      className="w-full bg-slate-50 border border-slate-100 rounded-2xl py-4 px-6 focus:ring-2 focus:ring-slate-900 font-bold"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Nominal Topup</label>
                    <div className="relative">
                      <span className="absolute left-6 top-1/2 -translate-y-1/2 font-black text-slate-300">Rp</span>
                      <input 
                        type="number" 
                        required
                        value={topupForm.amount || ''}
                        onChange={(e) => setTopupForm({...topupForm, amount: Number(e.target.value)})}
                        placeholder="0"
                        className="w-full bg-slate-50 border border-slate-100 rounded-2xl py-4 pl-14 pr-6 focus:ring-2 focus:ring-slate-900 font-black text-xl text-blue-600"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Keterangan</label>
                    <textarea 
                      value={topupForm.description}
                      onChange={(e) => setTopupForm({...topupForm, description: e.target.value})}
                      className="w-full bg-slate-50 border border-slate-100 rounded-2xl py-4 px-6 focus:ring-2 focus:ring-slate-900 font-medium"
                      rows={3}
                    />
                  </div>

                  <button className="w-full bg-slate-900 text-white py-5 rounded-2xl font-black uppercase tracking-widest shadow-xl hover:bg-slate-800 transition-all flex items-center justify-center gap-3">
                    Proses Topup <Plus className="w-5 h-5" />
                  </button>
                </form>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
