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
    users,
    fetchUsers,
    adjustBalance,
    syncTransactionStatus,
    syncWithTripay,
    isLoading: isStoreLoading
  } = usePPOBStore();

  const [activeTab, setActiveTab] = useState<'transactions' | 'mutations' | 'users' | 'topup' | 'settings'>('transactions');
  const [searchQuery, setSearchQuery] = useState('');

  const [topupForm, setTopupForm] = useState({
    userId: '',
    amount: 0,
    type: 'topup' as 'topup' | 'deduction',
    description: 'Topup Manual by Admin'
  });

  const handleSync = async () => {
    try {
      await syncWithTripay();
      toast.success('Sinkronisasi produk berhasil');
    } catch (error) {
      toast.error('Gagal sinkronisasi produk');
    }
  };

  const handleManualTopup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!topupForm.userId || topupForm.amount <= 0) return;

    try {
      const success = await adjustBalance({
        userId: topupForm.userId,
        amount: topupForm.type === 'topup' ? topupForm.amount : -topupForm.amount,
        type: topupForm.type,
        description: topupForm.description
      });

      if (success) {
        toast.success(`${topupForm.type === 'topup' ? 'Topup' : 'Potong Saldo'} berhasil`);
        setTopupForm({ 
          userId: '', 
          amount: 0, 
          type: 'topup',
          description: 'Topup Manual by Admin' 
        });
        setActiveTab('users');
      } else {
        toast.error('Gagal memproses perubahan saldo');
      }
    } catch (error) {
      toast.error('Gagal melakukan topup');
    }
  };

  useEffect(() => {
    fetchTransactions('all'); 
    fetchBalanceMutations('all');
    fetchUsers();
  }, [fetchTransactions, fetchBalanceMutations, fetchUsers]);

  const stats = {
    totalRevenue: transactions.reduce((acc, t) => acc + (t.status === 'success' ? (t.sellingPrice || 0) : 0), 0),
    totalProfit: transactions.reduce((acc, t) => acc + (t.status === 'success' ? ((t.profitUser || 0) + (t.profitAdmin || 0)) : 0), 0),
    activeUsers: 1, // Placeholder
    pendingTx: transactions.filter(t => t.status === 'pending').length
  };

  return (
    <div className="flex-1 p-4 md:p-8 overflow-y-auto bg-slate-50 pb-24 md:pb-8">
      <div className="max-w-7xl mx-auto space-y-6 md:space-y-8">
        
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div>
            <h1 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight">Admin PPOB Panel</h1>
            <p className="text-xs md:text-sm text-slate-500 font-medium">Monitoring transaksi dan saldo seluruh outlet.</p>
          </div>
          <div className="flex flex-wrap gap-2 sm:gap-4 w-full md:w-auto">
            <button 
              onClick={handleSync}
              disabled={isStoreLoading}
              className="flex-1 md:flex-none justify-center bg-white text-slate-700 px-4 md:px-6 py-2.5 md:py-3 rounded-xl md:rounded-2xl font-bold border border-slate-200 hover:bg-slate-50 transition-all flex items-center gap-2 disabled:opacity-50 text-xs md:text-sm"
            >
              <RefreshCw className={`w-4 h-4 md:w-5 md:h-5 ${isStoreLoading ? 'animate-spin' : ''}`} />
              {isStoreLoading ? 'Syncing...' : 'Sync Produk'}
            </button>
            <button 
              onClick={() => setActiveTab('settings')}
              className={`flex-1 md:flex-none justify-center px-4 md:px-6 py-2.5 md:py-3 rounded-xl md:rounded-2xl font-bold border transition-all flex items-center gap-2 text-xs md:text-sm ${
                activeTab === 'settings' ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
              }`}
            >
              <Settings className="w-4 h-4 md:w-5 md:h-5" />
              Pengaturan
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
          <DashboardCard title="Pendapatan" value={formatCurrency(stats.totalRevenue)} icon={TrendingUp} variant="white" />
          <DashboardCard title="Keuntungan" value={formatCurrency(stats.totalProfit)} icon={Wallet} variant="green" />
          <DashboardCard title="Outlet" value={stats.activeUsers} icon={Users} variant="blue" />
          <DashboardCard title="Pending" value={stats.pendingTx} icon={Clock} variant="yellow" />
        </div>

        <div className="bg-white rounded-3xl md:rounded-[2.5rem] shadow-sm border border-slate-100 overflow-hidden">
          <div className="border-b border-slate-100 p-1 md:p-2 overflow-x-auto scrollbar-hide">
            <div className="flex gap-1 min-w-max md:min-w-0">
              {(['transactions', 'mutations', 'users', 'topup', 'settings'] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-4 md:px-8 py-3 md:py-4 rounded-xl md:rounded-2xl font-black text-[10px] md:text-xs uppercase tracking-widest transition-all whitespace-nowrap ${
                    activeTab === tab ? 'bg-slate-900 text-white shadow-lg' : 'text-slate-500 hover:bg-slate-50'
                  }`}
                >
                  {tab === 'transactions' ? 'Transaksi' : tab === 'mutations' ? 'Log Saldo' : tab === 'topup' ? 'Topup' : tab === 'settings' ? 'Settings' : 'Users'}
                </button>
              ))}
            </div>
          </div>

          <div className="p-4 md:p-8">
            {activeTab === 'transactions' && (
              <div className="space-y-6">
                <div className="flex flex-col sm:flex-row gap-4 items-stretch sm:items-center mb-4 md:mb-8">
                  <div className="relative flex-1">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4 md:w-5 md:h-5" />
                    <input 
                      type="text" 
                      placeholder="Cari ID transaksi, nomor..." 
                      className="w-full bg-slate-50 border-none rounded-xl md:rounded-2xl py-3 md:py-4 pl-10 md:pl-12 pr-4 focus:ring-2 focus:ring-slate-900 font-bold text-xs md:text-sm"
                    />
                  </div>
                  <button className="p-3 md:p-4 bg-slate-100 rounded-xl md:rounded-2xl text-slate-600 hover:bg-slate-200 transition-all flex items-center justify-center">
                    <Filter className="w-5 h-5 md:w-6 md:h-6" />
                  </button>
                </div>

                <div className="overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0">
                  <table className="w-full text-left min-w-[600px] md:min-w-full">
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
                            {new Date(tx.createdAt || Date.now()).toLocaleString()}
                          </td>
                          <td className="py-4 px-4">
                            <span className="text-xs font-black text-slate-900">{tx.id.slice(0, 8)}...</span>
                          </td>
                          <td className="py-4 px-4">
                            <div className="font-black text-sm text-slate-900">{tx.productName || 'Transaksi PPOB'}</div>
                            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">{tx.productCode || tx.productId}</div>
                          </td>
                          <td className="py-4 px-4 font-bold text-sm">{tx.customerNumber}</td>
                          <td className="py-4 px-4 font-black">{formatCurrency(tx.sellingPrice)}</td>
                          <td className="py-4 px-4 font-bold text-green-600">+{formatCurrency((tx.profitUser || 0) + (tx.profitAdmin || 0))}</td>
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
                {balanceMutations.length === 0 ? (
                  <div className="py-20 text-center text-slate-400 space-y-4">
                    <History size={48} className="mx-auto opacity-10" />
                    <p className="text-sm font-bold uppercase tracking-widest italic">Belum ada history saldo</p>
                  </div>
                ) : (
                  balanceMutations.map((m) => (
                    <div key={m.id} className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 md:p-6 bg-slate-50 rounded-2xl md:rounded-3xl border border-transparent hover:border-slate-100 hover:bg-white transition-all group gap-4">
                      <div className="flex items-center gap-4">
                        <div className={`w-10 h-10 md:w-12 md:h-12 rounded-xl md:rounded-2xl flex items-center justify-center shrink-0 ${
                          m.type === 'topup' || m.type === 'refund' ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'
                        }`}>
                          {m.type === 'topup' || m.type === 'refund' ? <ArrowUpRight className="w-6 h-6" /> : <ArrowDownRight className="w-6 h-6" />}
                        </div>
                        <div className="min-w-0">
                          <div className="font-black text-slate-900 group-hover:text-blue-600 transition-colors uppercase text-xs md:text-sm tracking-tight truncate">{m.description}</div>
                          <div className="text-[10px] md:text-xs font-bold text-slate-400 truncate">
                            {new Date(m.timestamp).toLocaleString()} • {m.userName || 'System'}
                          </div>
                          <div className="text-[8px] md:text-[10px] font-black text-slate-300 uppercase truncate">Ref: {m.referenceId}</div>
                        </div>
                      </div>
                      <div className="text-right w-full sm:w-auto">
                        <div className={`font-black text-sm md:text-lg ${m.type === 'topup' || m.type === 'refund' ? 'text-green-600' : 'text-red-600'}`}>
                          {m.type === 'topup' || m.type === 'refund' ? '+' : '-'}{formatCurrency(Math.abs(m.amount))}
                        </div>
                        <div className="text-[8px] md:text-[10px] font-bold text-slate-400 uppercase tracking-widest">Saldo: {formatCurrency(m.currentBalance)}</div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {activeTab === 'users' && (
              <div className="space-y-6">
                <div className="overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0">
                  <table className="w-full text-left min-w-[600px] md:min-w-full">
                    <thead>
                      <tr className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">
                        <th className="pb-4 px-4">Outlet / User</th>
                        <th className="pb-4 px-4">Role</th>
                        <th className="pb-4 px-4">Kontak</th>
                        <th className="pb-4 px-4">Saldo</th>
                        <th className="pb-4 px-4">Status</th>
                        <th className="pb-4 px-4 text-right">Aksi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {users.map((user) => (
                        <tr key={user.id} className="group hover:bg-slate-50 transition-all">
                          <td className="py-4 px-4">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center font-black text-slate-400 uppercase">
                                {user.fullName?.[0] || user.username?.[0] || '?'}
                              </div>
                              <div>
                                <div className="font-black text-sm text-slate-900">{user.fullName || user.username}</div>
                                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">@{user.username}</div>
                              </div>
                            </div>
                          </td>
                          <td className="py-4 px-4">
                            <span className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-tighter ${
                              user.role === 'admin' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'
                            }`}>
                              {user.role}
                            </span>
                          </td>
                          <td className="py-4 px-4">
                            <div className="text-xs font-bold text-slate-600">{user.phone}</div>
                            <div className="text-[10px] text-slate-400">{user.email}</div>
                          </td>
                          <td className="py-4 px-4">
                            <div className="font-black text-blue-600">{formatCurrency(user.balance || 0)}</div>
                          </td>
                          <td className="py-4 px-4">
                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-tighter ${
                              user.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'
                            }`}>
                              {user.status === 'active' ? <CheckCircle2 size={10} /> : <XCircle size={10} />}
                              {user.status}
                            </span>
                          </td>
                          <td className="py-4 px-4 text-right">
                            <button 
                              onClick={() => {
                                setTopupForm({ ...topupForm, userId: user.id });
                                setActiveTab('topup');
                              }}
                              className="p-2 bg-white border border-slate-200 rounded-xl text-slate-400 hover:text-blue-600 hover:border-blue-100 transition-all shadow-sm"
                              title="Topup Saldo"
                            >
                              <Plus size={16} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {activeTab === 'topup' && (
              <div className="max-w-md mx-auto space-y-8 py-4 md:py-8">
                <div className="text-center">
                  <h3 className="text-xl font-black text-slate-900">Perubahan Saldo Manual</h3>
                  <p className="text-xs md:text-sm text-slate-500">Gunakan ini untuk topup atau potong saldo outlet secara manual.</p>
                </div>

                <form onSubmit={handleManualTopup} className="space-y-6">
                  <div className="grid grid-cols-2 gap-4">
                    <button
                      type="button"
                      onClick={() => setTopupForm({...topupForm, type: 'topup', description: 'Topup Manual by Admin'})}
                      className={`py-4 rounded-2xl font-black text-xs uppercase tracking-widest transition-all ${
                        topupForm.type === 'topup' 
                          ? 'bg-green-600 text-white shadow-lg' 
                          : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                      }`}
                    >
                      Topup (+)
                    </button>
                    <button
                      type="button"
                      onClick={() => setTopupForm({...topupForm, type: 'deduction', description: 'Potong Saldo by Admin'})}
                      className={`py-4 rounded-2xl font-black text-xs uppercase tracking-widest transition-all ${
                        topupForm.type === 'deduction' 
                          ? 'bg-red-600 text-white shadow-lg' 
                          : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                      }`}
                    >
                      Potong (-)
                    </button>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Pilih Outlet / User</label>
                    <select
                      required
                      value={topupForm.userId}
                      onChange={(e) => setTopupForm({...topupForm, userId: e.target.value})}
                      className="w-full bg-slate-50 border border-slate-100 rounded-2xl py-4 px-6 focus:ring-2 focus:ring-slate-900 font-bold"
                    >
                      <option value="">-- Pilih User --</option>
                      {users.map(u => (
                        <option key={u.id} value={u.id}>
                          {u.fullName || u.username} ({formatCurrency(u.balance)})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Nominal</label>
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
                      className="w-full bg-slate-50 border border-slate-100 rounded-2xl py-4 px-6 focus:ring-2 focus:ring-slate-900 font-medium text-sm"
                      rows={3}
                     />
                  </div>

                  <button 
                    disabled={isStoreLoading}
                    className={`w-full py-5 rounded-2xl font-black uppercase tracking-widest shadow-xl transition-all flex items-center justify-center gap-3 ${
                      topupForm.type === 'topup' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'
                    } text-white disabled:opacity-50`}
                  >
                    {isStoreLoading ? <RefreshCw className="animate-spin" /> : (
                      <>
                        Proses {topupForm.type === 'topup' ? 'Topup' : 'Potong'} <Plus className="w-5 h-5" />
                      </>
                    )}
                  </button>
                </form>
              </div>
            )}

            {activeTab === 'settings' && (
              <div className="space-y-8 py-4">
                <div className="flex flex-col md:flex-row gap-8 items-start">
                  <div className="flex-1 space-y-6 w-full">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-2xl bg-blue-50 flex items-center justify-center">
                        <Wallet className="w-5 h-5 text-blue-600" />
                      </div>
                      <div>
                        <h3 className="font-black text-slate-800 uppercase tracking-tight">Konfigurasi API Payment</h3>
                        <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Detail kredensial untuk layanan PPOB</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {/* Tripay Settings Card */}
                      <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100 space-y-4">
                        <div className="flex items-center justify-between">
                          <h4 className="font-black text-sm uppercase tracking-tight">Tripay</h4>
                          <span className="px-2 py-1 bg-green-100 text-green-700 text-[9px] font-black rounded-lg">AKTIF</span>
                        </div>
                        <div className="space-y-3">
                          <div className="space-y-1">
                            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Merchant Code</label>
                            <input 
                              type="text" 
                              value="Dikonfigurasi di Server (.env)"
                              disabled
                              className="w-full p-3 bg-white border border-slate-100 rounded-xl text-xs font-bold text-slate-400 cursor-not-allowed"
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Base Endpoint</label>
                            <input 
                              type="text" 
                              value="https://tripay.co.id/api"
                              disabled
                              className="w-full p-3 bg-white border border-slate-100 rounded-xl text-xs font-bold text-slate-400 cursor-not-allowed"
                            />
                          </div>
                        </div>
                      </div>

                      {/* Digiflazz Settings Card */}
                      <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100 space-y-4 opacity-75 grayscale hover:grayscale-0 hover:opacity-100 transition-all">
                        <div className="flex items-center justify-between">
                          <h4 className="font-black text-sm uppercase tracking-tight text-slate-400">Digiflazz</h4>
                          <span className="px-2 py-1 bg-slate-100 text-slate-400 text-[9px] font-black rounded-lg uppercase tracking-widest">Non-Aktif</span>
                        </div>
                        <div className="space-y-3">
                          <div className="space-y-1">
                            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Username</label>
                            <input 
                              type="text" 
                              value="Dikonfigurasi di Server (.env)"
                              disabled
                              className="w-full p-3 bg-white border border-slate-100 rounded-xl text-xs font-bold text-slate-400 cursor-not-allowed"
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Base Endpoint</label>
                            <input 
                              type="text" 
                              value="https://api.digiflazz.com/v1"
                              disabled
                              className="w-full p-3 bg-white border border-slate-100 rounded-xl text-xs font-bold text-slate-400 cursor-not-allowed"
                            />
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="p-6 bg-blue-50/50 rounded-3xl border border-blue-100 flex flex-col md:flex-row items-center justify-between gap-6">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-black text-blue-900 uppercase tracking-tight">Sinkronisasi Produk</p>
                          <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                        </div>
                        <p className="text-xs text-blue-700 font-medium leading-relaxed">
                          Sistem akan mengambil daftar produk terbaru dari provider terpilih. Pastikan API Key di konfigurasi server (.env) sudah valid.
                        </p>
                      </div>
                      <div className="flex flex-col sm:flex-row gap-2">
                        <button
                          onClick={() => syncWithTripay('Tripay')}
                          disabled={isStoreLoading}
                          className="px-6 py-3 bg-white text-blue-600 border border-blue-200 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-blue-50 transition-all flex items-center gap-2 whitespace-nowrap active:scale-95"
                        >
                          <RefreshCw size={14} className={isStoreLoading ? 'animate-spin' : ''} />
                          SYNC TRIPAY
                        </button>
                        <button
                          onClick={() => syncWithTripay('Digiflazz')}
                          disabled={isStoreLoading}
                          className="px-6 py-3 bg-blue-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-blue-700 transition-all flex items-center gap-2 whitespace-nowrap active:scale-95"
                        >
                          <RefreshCw size={14} className={isStoreLoading ? 'animate-spin' : ''} />
                          SYNC DIGIFLAZZ
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
