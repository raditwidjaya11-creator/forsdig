import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Globe, 
  Plus, 
  Trash2, 
  Edit2, 
  Search, 
  Link as LinkIcon,
  Store,
  DollarSign,
  TrendingUp,
  ExternalLink,
  MessageSquare
} from 'lucide-react';
import { Reseller, Commission } from '../types';
import { formatCurrency, generateUUID } from '../lib/utils';
import { usePOSStore } from '../services/posStore';
import { toast } from 'sonner';

const ResellerManager = () => {
  const { 
    resellers, 
    commissions, 
    syncEntity, 
    deleteEntity, 
    fetchInitialData,
    isLoading: isStoreLoading 
  } = usePOSStore();

  const [isLoading, setIsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentReseller, setCurrentReseller] = useState<Partial<Reseller> | null>(null);

  useEffect(() => {
    fetchInitialData();
  }, []);

  const handleSaveReseller = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentReseller?.name) return;

    try {
      const resellerData = {
        ...currentReseller,
        id: currentReseller.id || generateUUID(),
        createdAt: currentReseller.createdAt || new Date().toISOString()
      } as Reseller;
      
      await syncEntity('resellers', resellerData);
      await fetchInitialData();
      
      setIsModalOpen(false);
      setCurrentReseller(null);
      toast.success('Reseller berhasil disimpan');
    } catch (error) {
      console.error('Error saving reseller:', error);
      toast.error('Gagal menyimpan reseller');
    }
  };

  const handleDeleteReseller = async (id: string) => {
    if (!confirm('Hapus reseller ini?')) return;
    try {
      await deleteEntity('resellers', id);
      await fetchInitialData();
      toast.success('Reseller berhasil dihapus');
    } catch (error) {
      console.error('Error deleting reseller:', error);
      toast.error('Gagal menghapus reseller');
    }
  };

  const filteredResellers = resellers.filter(r => 
    r.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    r.platform?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getResellerStats = (resellerId: string) => {
    const resCommissions = commissions.filter(c => c.resellerId === resellerId);
    const totalEarned = resCommissions.reduce((sum, c) => sum + (Number(c.amount) || 0), 0);
    const pendingCount = resCommissions.filter(c => c.status === 'pending').length;
    return { totalEarned, pendingCount };
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <Globe className="text-purple-600" />
            Reseller Online
          </h2>
          <p className="text-slate-500">Kelola komisi untuk mitra penjualan online.</p>
        </div>
        <button
          onClick={() => {
            setCurrentReseller({ 
              status: 'active', 
              commissionRate: 0 
            });
            setIsModalOpen(true);
          }}
          className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-xl transition-colors shadow-lg shadow-purple-200"
        >
          <Plus size={20} />
          Tambah Reseller
        </button>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-4">
        <div className="relative mb-6">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
          <input
            type="text"
            placeholder="Cari nama atau platform..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-11 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500/20 transition-all"
          />
        </div>

        {isLoading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredResellers.map((reseller) => {
              const stats = getResellerStats(reseller.id);
              return (
                <motion.div
                  key={reseller.id}
                  layout
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="bg-white border border-slate-100 rounded-2xl p-5 hover:shadow-md transition-shadow relative group"
                >
                  <div className="flex justify-between items-start mb-4">
                    <div className="w-12 h-12 rounded-xl bg-purple-50 flex items-center justify-center text-purple-600">
                      <Store size={24} />
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => {
                          setCurrentReseller(reseller);
                          setIsModalOpen(true);
                        }}
                        className="p-2 text-slate-400 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
                      >
                        <Edit2 size={16} />
                      </button>
                      <button
                        onClick={() => handleDeleteReseller(reseller.id)}
                        className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>

                  <div>
                    <h3 className="font-bold text-slate-800 text-lg mb-1">{reseller.name}</h3>
                    <div className="flex items-center gap-2 mb-3">
                      <span className="px-2 py-0.5 bg-purple-50 text-purple-600 rounded-md text-[10px] font-bold uppercase tracking-wider">
                        {reseller.platform || 'General'}
                      </span>
                      <span className={`w-2 h-2 rounded-full ${reseller.status === 'active' ? 'bg-green-500' : 'bg-slate-300'}`}></span>
                      <span className="text-xs text-slate-500">{reseller.status === 'active' ? 'Aktif' : 'Nonaktif'}</span>
                    </div>

                    {reseller.contactInfo && (
                      <div className="flex items-center gap-2 text-slate-600 text-sm mb-4">
                        <MessageSquare size={14} className="text-slate-400" />
                        {reseller.contactInfo}
                      </div>
                    )}

                    <div className="pt-4 border-t border-slate-50 mb-4">
                      <div className="flex justify-between items-center">
                        <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Rate Komisi</p>
                        <p className="text-sm font-black text-purple-600 leading-none">{reseller.commissionRate}%</p>
                      </div>
                    </div>

                    <div className="p-3 bg-purple-50/50 rounded-xl">
                      <div className="flex justify-between items-center mb-1">
                        <p className="text-xs font-medium text-purple-800">Akumulasi Komisi</p>
                        <TrendingUp size={12} className="text-purple-600" />
                      </div>
                      <p className="text-lg font-black text-purple-600">{formatCurrency(stats.totalEarned)}</p>
                      {stats.pendingCount > 0 && (
                        <p className="text-[10px] text-amber-600 font-bold mt-1 uppercase tracking-tight">
                          {stats.pendingCount} Transaksi Menunggu
                        </p>
                      )}
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modal for Add/Edit Reseller */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsModalOpen(false)}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-lg relative overflow-hidden"
            >
              <div className="p-8">
                <div className="flex items-center gap-3 mb-8">
                  <div className="w-12 h-12 rounded-2xl bg-purple-600 flex items-center justify-center text-white shadow-lg shadow-purple-200">
                    <Globe size={24} />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-slate-800">
                      {currentReseller?.id ? 'Edit Data Reseller' : 'Tambah Reseller Online'}
                    </h3>
                    <p className="text-slate-500 text-sm">Mitra pemasaran dan penjualan digital.</p>
                  </div>
                </div>

                <form onSubmit={handleSaveReseller} className="space-y-4">
                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2 px-1">Nama Reseller / Store</label>
                      <input
                        required
                        type="text"
                        value={currentReseller?.name || ''}
                        onChange={(e) => setCurrentReseller(prev => ({ ...prev!, name: e.target.value }))}
                        className="w-full px-5 py-3 bg-slate-50 border border-slate-100 rounded-2xl focus:outline-none focus:ring-4 focus:ring-purple-500/10 transition-all font-medium"
                        placeholder="e.g. Toko Berkah Online"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2 px-1">Platform</label>
                        <select
                          value={currentReseller?.platform || ''}
                          onChange={(e) => setCurrentReseller(prev => ({ ...prev!, platform: e.target.value }))}
                          className="w-full px-5 py-3 bg-slate-50 border border-slate-100 rounded-2xl focus:outline-none focus:ring-4 focus:ring-purple-500/10 transition-all font-medium"
                        >
                          <option value="Shopee">Shopee</option>
                          <option value="Tokopedia">Tokopedia</option>
                          <option value="TikTok Shop">TikTok Shop</option>
                          <option value="Lazada">Lazada</option>
                          <option value="WhatsApp">WhatsApp / Manual</option>
                          <option value="Other">Lainnya</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2 px-1">Status</label>
                        <select
                          value={currentReseller?.status}
                          onChange={(e) => setCurrentReseller(prev => ({ ...prev!, status: e.target.value as any }))}
                          className="w-full px-5 py-3 bg-slate-50 border border-slate-100 rounded-2xl focus:outline-none focus:ring-4 focus:ring-purple-500/10 transition-all font-medium"
                        >
                          <option value="active">Aktif</option>
                          <option value="inactive">Nonaktif</option>
                        </select>
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2 px-1">Rate Komisi (%)</label>
                      <input
                        type="number"
                        step="0.01"
                        value={currentReseller?.commissionRate || 0}
                        onChange={(e) => setCurrentReseller(prev => ({ ...prev!, commissionRate: Number(e.target.value) }))}
                        className="w-full px-5 py-3 bg-slate-50 border border-slate-100 rounded-2xl focus:outline-none focus:ring-4 focus:ring-purple-500/10 transition-all font-medium"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2 px-1">Informasi Kontak</label>
                      <textarea
                        value={currentReseller?.contactInfo || ''}
                        onChange={(e) => setCurrentReseller(prev => ({ ...prev!, contactInfo: e.target.value }))}
                        className="w-full px-5 py-3 bg-slate-50 border border-slate-100 rounded-2xl focus:outline-none focus:ring-4 focus:ring-purple-500/10 transition-all font-medium resize-none"
                        rows={3}
                        placeholder="e.g. WA: 0812... / Link Store"
                      />
                    </div>
                  </div>

                  <div className="flex gap-4 pt-4">
                    <button
                      type="button"
                      onClick={() => setIsModalOpen(false)}
                      className="flex-1 px-8 py-4 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold rounded-2xl transition-all"
                    >
                      Batal
                    </button>
                    <button
                      type="submit"
                      className="flex-1 px-8 py-4 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-2xl shadow-xl shadow-purple-200 transition-all"
                    >
                      Simpan Data
                    </button>
                  </div>
                </form>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ResellerManager;
