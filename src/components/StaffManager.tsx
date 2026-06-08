import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Users, 
  UserPlus, 
  Trash2, 
  Edit2, 
  Search, 
  MoreVertical,
  CheckCircle2,
  XCircle,
  Briefcase,
  Phone,
  Mail,
  DollarSign,
  TrendingUp,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { Staff, Commission } from '../types';
import { formatCurrency, generateUUID } from '../lib/utils';
import { usePOSStore } from '../services/posStore';
import { toast } from 'sonner';

const StaffManager = () => {
  const { 
    staff: staffList, 
    commissions, 
    syncEntity, 
    deleteEntity, 
    fetchInitialData,
    isLoading: isStoreLoading 
  } = usePOSStore();

  const [isLoading, setIsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentStaff, setCurrentStaff] = useState<Partial<Staff> | null>(null);

  useEffect(() => {
    fetchInitialData();
  }, []);

  const handleSaveStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentStaff?.name) return;

    try {
      const staffData = {
        ...currentStaff,
        id: currentStaff.id || generateUUID(),
        createdAt: currentStaff.createdAt || new Date().toISOString()
      } as Staff;
      
      await syncEntity('staff', staffData);
      await fetchInitialData();
      
      setIsModalOpen(false);
      setCurrentStaff(null);
      toast.success('Staf berhasil disimpan');
    } catch (error) {
      console.error('Error saving staff:', error);
      toast.error('Gagal menyimpan staf');
    }
  };

  const handleDeleteStaff = async (id: string) => {
    if (!confirm('Hapus staf ini?')) return;
    try {
      await deleteEntity('staff', id);
      await fetchInitialData();
      toast.success('Staf berhasil dihapus');
    } catch (error) {
      console.error('Error deleting staff:', error);
      toast.error('Gagal menghapus staf');
    }
  };

  const filteredStaff = staffList.filter(s => 
    s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.role?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getStaffStats = (staffId: string) => {
    const staffCommissions = commissions.filter(c => c.staffId === staffId);
    const totalEarned = staffCommissions.reduce((sum, c) => sum + (Number(c.amount) || 0), 0);
    const pendingCount = staffCommissions.filter(c => c.status === 'pending').length;
    return { totalEarned, pendingCount };
  };

  const handleUpdateCommissionStatus = async (id: string, status: 'paid' | 'cancelled') => {
    try {
      await syncEntity('commissions', { id, status });
      await fetchInitialData();
      toast.success('Status komisi diperbarui');
    } catch (err) {
      console.error('Error updating commission status:', err);
    }
  };

  const [activeTab, setActiveTab] = useState<'staf' | 'riwayat'>('staf');

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <Users className="text-blue-600" />
            Manajemen Karyawan
          </h2>
          <p className="text-slate-500">Kelola data staf dan pengaturan komisi mereka.</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="bg-slate-100 p-1 rounded-xl flex items-center">
            <button
              onClick={() => setActiveTab('staf')}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${activeTab === 'staf' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500'}`}
            >
              Daftar Staf
            </button>
            <button
              onClick={() => setActiveTab('riwayat')}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${activeTab === 'riwayat' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500'}`}
            >
              Riwayat Komisi
            </button>
          </div>
          {activeTab === 'staf' && (
            <button
              onClick={() => {
                setCurrentStaff({ 
                  status: 'active', 
                  baseSalary: 0, 
                  commissionRate: 0 
                });
                setIsModalOpen(true);
              }}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl transition-colors shadow-lg shadow-blue-200"
            >
              <UserPlus size={20} />
              Tambah Staf
            </button>
          )}
        </div>
      </div>

      {activeTab === 'staf' ? (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-4">
          <div className="relative mb-6">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
            <input
              type="text"
              placeholder="Cari nama atau jabatan..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-11 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all"
            />
          </div>

          {isLoading ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredStaff.map((staff) => {
                const stats = getStaffStats(staff.id);
                return (
                  <motion.div
                    key={staff.id}
                    layout
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="bg-white border border-slate-100 rounded-2xl p-5 hover:shadow-md transition-shadow relative group"
                  >
                    <div className="flex justify-between items-start mb-4">
                      <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600">
                        <Briefcase size={24} />
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => {
                            setCurrentStaff(staff);
                            setIsModalOpen(true);
                          }}
                          className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        >
                          <Edit2 size={16} />
                        </button>
                        <button
                          onClick={() => handleDeleteStaff(staff.id)}
                          className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>

                    <div>
                      <h3 className="font-bold text-slate-800 text-lg mb-1">{staff.name}</h3>
                      <p className="text-slate-500 text-sm flex items-center gap-1.5 mb-3">
                        <span className="px-2 py-0.5 bg-slate-100 rounded-md text-xs font-medium uppercase tracking-wider">
                          {staff.role || 'Staf'}
                        </span>
                        <span className={`w-2 h-2 rounded-full ${staff.status === 'active' ? 'bg-green-500' : 'bg-slate-300'}`}></span>
                        <span className="text-xs">{staff.status === 'active' ? 'Aktif' : 'Nonaktif'}</span>
                      </p>

                      <div className="space-y-2 mb-4">
                        {staff.phone && (
                          <div className="flex items-center gap-2 text-slate-600 text-sm">
                            <Phone size={14} className="text-slate-400" />
                            {staff.phone}
                          </div>
                        )}
                        {staff.email && (
                          <div className="flex items-center gap-2 text-slate-600 text-sm">
                            <Mail size={14} className="text-slate-400" />
                            {staff.email}
                          </div>
                        )}
                      </div>

                      <div className="grid grid-cols-2 gap-3 pt-4 border-t border-slate-50">
                        <div>
                          <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider mb-1">Gaji Pokok</p>
                          <p className="text-sm font-bold text-slate-700">{formatCurrency(staff.baseSalary)}</p>
                        </div>
                        <div>
                          <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider mb-1">Komisi</p>
                          <p className="text-sm font-bold text-blue-600">{staff.commissionRate}%</p>
                        </div>
                      </div>

                      <div className="mt-4 p-3 bg-blue-50/50 rounded-xl">
                        <div className="flex justify-between items-center mb-1">
                          <p className="text-xs font-medium text-blue-800">Total Komisi</p>
                          <div className="flex items-center gap-1 text-blue-600">
                            <TrendingUp size={12} />
                            <span className="text-[10px] font-bold">Earned</span>
                          </div>
                        </div>
                        <p className="text-lg font-black text-blue-600">{formatCurrency(stats.totalEarned)}</p>
                        {stats.pendingCount > 0 && (
                          <p className="text-[10px] text-amber-600 font-bold mt-1">
                            {stats.pendingCount} komisi menunggu verifikasi
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
      ) : (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
          <div className="p-4 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
            <h3 className="font-bold text-slate-800 text-sm">Daftar Transaksi Komisi</h3>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{commissions.filter(c => c.staffId).length} Log Terdeteksi</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-50/50">
                  <th className="px-6 py-4 text-xs font-black text-slate-400 uppercase tracking-widest">Staf</th>
                  <th className="px-6 py-4 text-xs font-black text-slate-400 uppercase tracking-widest">ID Transaksi</th>
                  <th className="px-6 py-4 text-xs font-black text-slate-400 uppercase tracking-widest">Waktu</th>
                  <th className="px-6 py-4 text-xs font-black text-slate-400 uppercase tracking-widest">Jumlah</th>
                  <th className="px-6 py-4 text-xs font-black text-slate-400 uppercase tracking-widest">Status</th>
                  <th className="px-6 py-4 text-xs font-black text-slate-400 uppercase tracking-widest">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {commissions.filter(c => c.staffId).map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4">
                      <p className="text-sm font-bold text-slate-800">{c.staffName || 'Unknown Staff'}</p>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-xs font-mono text-slate-500">{c.transactionId}</p>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-xs text-slate-500">{new Date(c.createdAt).toLocaleString()}</p>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-sm font-black text-blue-600">{formatCurrency(c.amount)}</p>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 rounded-md text-[10px] font-black uppercase tracking-widest ${
                        c.status === 'paid' ? 'bg-green-100 text-green-600' : 
                        c.status === 'cancelled' ? 'bg-red-100 text-red-600' : 
                        'bg-amber-100 text-amber-600'
                      }`}>
                        {c.status}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        {c.status === 'pending' && (
                          <>
                            <button
                              onClick={() => handleUpdateCommissionStatus(c.id, 'paid')}
                              className="p-1 text-green-600 hover:bg-green-50 rounded"
                              title="Tandai Sudah Dibayar"
                            >
                              <CheckCircle2 size={16} />
                            </button>
                            <button
                              onClick={() => handleUpdateCommissionStatus(c.id, 'cancelled')}
                              className="p-1 text-red-600 hover:bg-red-50 rounded"
                              title="Batalkan"
                            >
                              <XCircle size={16} />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
                {commissions.filter(c => c.staffId).length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-slate-400 italic">Belum ada riwayat komisi staf</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal for Add/Edit Staff */}
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
                  <div className="w-12 h-12 rounded-2xl bg-blue-600 flex items-center justify-center text-white shadow-lg shadow-blue-200">
                    <UserPlus size={24} />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-slate-800">
                      {currentStaff?.id ? 'Edit Data Staf' : 'Tambah Staf Baru'}
                    </h3>
                    <p className="text-slate-500 text-sm">Lengkapi informasi staf Anda.</p>
                  </div>
                </div>

                <form onSubmit={handleSaveStaff} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="col-span-2">
                       <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2 px-1">Nama Lengkap</label>
                      <input
                        required
                        type="text"
                        value={currentStaff?.name || ''}
                        onChange={(e) => setCurrentStaff(prev => ({ ...prev!, name: e.target.value }))}
                        className="w-full px-5 py-3 bg-slate-50 border border-slate-100 rounded-2xl focus:outline-none focus:ring-4 focus:ring-blue-500/10 transition-all font-medium"
                        placeholder="Nama Staff"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2 px-1">Jabatan</label>
                      <input
                        type="text"
                        value={currentStaff?.role || ''}
                        onChange={(e) => setCurrentStaff(prev => ({ ...prev!, role: e.target.value }))}
                        className="w-full px-5 py-3 bg-slate-50 border border-slate-100 rounded-2xl focus:outline-none focus:ring-4 focus:ring-blue-500/10 transition-all font-medium"
                        placeholder="e.g. Kasir Utama"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2 px-1">Status</label>
                      <select
                        value={currentStaff?.status}
                        onChange={(e) => setCurrentStaff(prev => ({ ...prev!, status: e.target.value as any }))}
                        className="w-full px-5 py-3 bg-slate-50 border border-slate-100 rounded-2xl focus:outline-none focus:ring-4 focus:ring-blue-500/10 transition-all font-medium"
                      >
                        <option value="active">Aktif</option>
                        <option value="inactive">Nonaktif</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2 px-1">Telepon</label>
                      <input
                        type="tel"
                        value={currentStaff?.phone || ''}
                        onChange={(e) => setCurrentStaff(prev => ({ ...prev!, phone: e.target.value }))}
                        className="w-full px-5 py-3 bg-slate-50 border border-slate-100 rounded-2xl focus:outline-none focus:ring-4 focus:ring-blue-500/10 transition-all font-medium"
                        placeholder="0812..."
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2 px-1">Email</label>
                      <input
                        type="email"
                        value={currentStaff?.email || ''}
                        onChange={(e) => setCurrentStaff(prev => ({ ...prev!, email: e.target.value }))}
                        className="w-full px-5 py-3 bg-slate-50 border border-slate-100 rounded-2xl focus:outline-none focus:ring-4 focus:ring-blue-500/10 transition-all font-medium"
                        placeholder="email@address.com"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2 px-1">Gaji Pokok</label>
                      <input
                        type="number"
                        value={currentStaff?.baseSalary || 0}
                        onChange={(e) => setCurrentStaff(prev => ({ ...prev!, baseSalary: Number(e.target.value) }))}
                        className="w-full px-5 py-3 bg-slate-50 border border-slate-100 rounded-2xl focus:outline-none focus:ring-4 focus:ring-blue-500/10 transition-all font-medium"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2 px-1">Rate Komisi (%)</label>
                      <input
                        type="number"
                        step="0.01"
                        value={currentStaff?.commissionRate || 0}
                        onChange={(e) => setCurrentStaff(prev => ({ ...prev!, commissionRate: Number(e.target.value) }))}
                        className="w-full px-5 py-3 bg-slate-50 border border-slate-100 rounded-2xl focus:outline-none focus:ring-4 focus:ring-blue-500/10 transition-all font-medium"
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
                      className="flex-1 px-8 py-4 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-2xl shadow-xl shadow-blue-200 transition-all"
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

export default StaffManager;
