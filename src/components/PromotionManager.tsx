import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Tag, 
  Ticket, 
  Plus, 
  Trash2, 
  Edit2, 
  Calendar, 
  Zap, 
  Clock,
  AlertTriangle,
  CheckCircle,
  Copy,
  Hash,
  ArrowRight
} from 'lucide-react';
import { Voucher } from '../types';
import { formatCurrency, generateUUID } from '../lib/utils';
import { usePOSStore } from '../services/posStore';
import { toast } from 'sonner';

interface PromotionManagerProps {}

const PromotionManager = () => {
  const { vouchers, syncEntity, deleteEntity, fetchInitialData } = usePOSStore();
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentVoucher, setCurrentVoucher] = useState<Partial<Voucher> | null>(null);

  useEffect(() => {
    fetchInitialData();
  }, []);

  const handleSaveVoucher = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentVoucher?.code) {
      toast.error('Kode voucher wajib diisi');
      return;
    }

    // Check for duplicate code
    const isDuplicate = vouchers.some(v => 
      v.code.toUpperCase() === currentVoucher.code?.toUpperCase() && 
      v.id !== currentVoucher.id
    );

    if (isDuplicate) {
      toast.error('Kode voucher sudah digunakan');
      return;
    }

    setIsSaving(true);
    try {
      const voucherData = {
        ...currentVoucher,
        id: currentVoucher.id || generateUUID(),
        type: currentVoucher.type || 'percentage',
        value: currentVoucher.value || 0,
        minPurchase: currentVoucher.minPurchase || 0,
        usageLimit: currentVoucher.usageLimit || 0,
        usageCount: currentVoucher.usageCount || 0,
        status: currentVoucher.status || 'active',
        createdAt: currentVoucher.createdAt || new Date().toISOString()
      } as Voucher;

      await syncEntity('vouchers', voucherData);
      await fetchInitialData();
      
      setIsModalOpen(false);
      setCurrentVoucher(null);
      toast.success('Voucher berhasil disimpan');
    } catch (error: any) {
      console.error('Error saving voucher:', error);
      toast.error('Gagal menyimpan voucher');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteVoucher = async (id: string) => {
    if (!confirm('Hapus voucher ini?')) return;
    try {
      await deleteEntity('vouchers', id);
      await fetchInitialData();
      toast.success('Voucher berhasil dihapus');
    } catch (error) {
      console.error('Error deleting voucher:', error);
      toast.error('Gagal menghapus voucher');
    }
  };

  const generateVoucherCode = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    for (let i = 0; i < 8; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setCurrentVoucher(prev => ({ ...prev!, code }));
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <Zap className="text-orange-500" />
            Promosi & Voucher
          </h2>
          <p className="text-slate-500">Buat kampanye diskon untuk menarik pelanggan.</p>
        </div>
        <button
          onClick={() => {
            setCurrentVoucher({ 
              status: 'active', 
              type: 'percentage', 
              value: 10,
              minPurchase: 0,
              usageLimit: 100
            });
            setIsModalOpen(true);
          }}
          className="flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-xl transition-colors shadow-lg shadow-orange-200"
        >
          <Plus size={20} />
          Buat Voucher
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-2xl p-6 text-white shadow-xl shadow-orange-100">
           <Tag className="mb-4 opacity-70" size={24} />
           <p className="text-sm opacity-80 font-medium">Diskon Reguler</p>
           <h3 className="text-2xl font-black mt-1">Global Active</h3>
           <p className="text-xs mt-2 opacity-60 italic">Diskon toko diatur di pengaturan utama.</p>
        </div>
        <div className="bg-white rounded-2xl border border-slate-100 p-6 flex flex-col justify-between">
            <div>
                <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mb-1">Voucher Aktif</p>
                <h3 className="text-2xl font-black text-slate-800">{vouchers.filter(v => v.status === 'active').length}</h3>
            </div>
            <Ticket className="text-blue-500 mt-4" size={24} />
        </div>
        <div className="bg-white rounded-2xl border border-slate-100 p-6 flex flex-col justify-between">
            <div>
                <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mb-1">Total Penggunaan</p>
                <h3 className="text-2xl font-black text-slate-800">{vouchers.reduce((acc, v) => acc + (v.usageCount || 0), 0)}</h3>
            </div>
            <Zap className="text-orange-500 mt-4" size={24} />
        </div>
        <div className="bg-white rounded-2xl border border-slate-100 p-6 flex flex-col justify-between">
            <div>
                <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mb-1">Expired Soon</p>
                <h3 className="text-2xl font-black text-slate-800">
                    {vouchers.filter(v => v.expiryDate && new Date(v.expiryDate).getTime() < Date.now() + 86400000 * 3).length}
                </h3>
            </div>
            <Clock className="text-amber-500 mt-4" size={24} />
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-50 flex items-center justify-between">
          <h3 className="font-bold text-slate-800">Daftar Voucher Kode</h3>
          <div className="text-xs text-slate-400 font-medium">Click to edit or delete vouchers</div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-50/50 text-[10px] uppercase font-black text-slate-400 tracking-widest">
              <tr>
                <th className="px-6 py-4">Kode Voucher</th>
                <th className="px-6 py-4">Tipe & Nilai</th>
                <th className="px-6 py-4">S&K</th>
                <th className="px-6 py-4">Masa Berlaku</th>
                <th className="px-6 py-4">Penggunaan</th>
                <th className="px-6 py-4 text-center">Status</th>
                <th className="px-6 py-4"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="text-center py-8">
                    <div className="flex justify-center">
                       <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-orange-500"></div>
                    </div>
                  </td>
                </tr>
              ) : vouchers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-12">
                    <Ticket size={48} className="mx-auto text-slate-100 mb-4" />
                    <p className="text-slate-400 font-medium italic">Belum ada voucher yang dibuat.</p>
                  </td>
                </tr>
              ) : vouchers.map((v) => (
                <tr key={v.id} className="hover:bg-slate-50/50 transition-colors group">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-orange-50 text-orange-600 rounded-lg">
                        <Tag size={16} />
                      </div>
                      <span className="font-mono font-bold text-slate-800 text-sm tracking-tighter uppercase">{v.code}</span>
                      <button 
                        onClick={() => {
                           navigator.clipboard.writeText(v.code);
                           toast.success('Kode disalin!');
                        }}
                        className="text-slate-300 hover:text-slate-500 transition-colors opacity-0 group-hover:opacity-100"
                      >
                        <Copy size={12} />
                      </button>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="space-y-1">
                       <p className="text-xs font-bold text-slate-800">
                         {v.type === 'percentage' ? `${v.value}% Off` : `Potongan ${formatCurrency(v.value)}`}
                       </p>
                       {v.maxDiscount && (
                         <p className="text-[10px] text-slate-400 font-medium italic">Maks. {formatCurrency(v.maxDiscount)}</p>
                       )}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-tight">Min. Belanja</p>
                    <p className="text-xs font-medium text-slate-800">{formatCurrency(v.minPurchase)}</p>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2 text-xs text-slate-600">
                       <Calendar size={14} className="text-slate-400" />
                       {v.expiryDate ? new Date(v.expiryDate).toLocaleDateString('id-ID') : 'Tidak Terbatas'}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-col gap-1 w-24">
                       <div className="flex justify-between text-[10px] font-bold text-slate-500">
                          <span>{v.usageCount || 0}</span>
                          <span>/ {v.usageLimit}</span>
                       </div>
                       <div className="h-1 bg-slate-100 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-orange-500" 
                            style={{ width: `${v.usageLimit > 0 ? Math.min(((v.usageCount || 0) / v.usageLimit) * 100, 100) : 0}%` }}
                          ></div>
                       </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex justify-center">
                       <span className={`px-2 py-1 rounded text-[10px] font-black uppercase tracking-wider ${
                         v.status === 'active' ? 'bg-green-50 text-green-600' : 
                         v.status === 'expired' ? 'bg-amber-50 text-amber-600' : 'bg-slate-50 text-slate-400'
                       }`}>
                         {v.status}
                       </span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center justify-end gap-2">
                       <button
                         onClick={() => {
                           setCurrentVoucher(v);
                           setIsModalOpen(true);
                         }}
                         className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                       >
                         <Edit2 size={16} />
                       </button>
                       <button
                         onClick={() => handleDeleteVoucher(v.id)}
                         className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                       >
                         <Trash2 size={16} />
                       </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal for Add/Edit Voucher */}
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
              className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-xl relative overflow-hidden"
            >
              <div className="p-8">
                <div className="flex items-center gap-3 mb-8">
                  <div className="w-12 h-12 rounded-2xl bg-orange-500 flex items-center justify-center text-white shadow-lg shadow-orange-200">
                    <Ticket size={24} />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-slate-800">
                      {currentVoucher?.id ? 'Edit Voucher' : 'Buat Voucher Baru'}
                    </h3>
                    <p className="text-slate-500 text-sm">Konfigurasi detail promo Anda.</p>
                  </div>
                </div>

                <form onSubmit={handleSaveVoucher} className="space-y-6">
                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2 px-1">Kode Voucher</label>
                      <div className="relative group">
                        <Hash className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-orange-500 transition-colors" size={18} />
                        <input
                          required
                          type="text"
                          value={currentVoucher?.code || ''}
                          onChange={(e) => setCurrentVoucher(prev => ({ ...prev!, code: e.target.value.toUpperCase() }))}
                          className="w-full pl-12 pr-32 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:outline-none focus:ring-4 focus:ring-orange-500/10 transition-all font-mono font-bold tracking-widest uppercase"
                          placeholder="PROMO2024"
                        />
                        <button
                          type="button"
                          onClick={generateVoucherCode}
                          className="absolute right-2 top-1/2 -translate-y-1/2 px-4 py-2 bg-white border border-slate-100 text-slate-600 rounded-xl text-xs font-black shadow-sm hover:bg-slate-50 transition-all"
                        >
                          AUTO GEN
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2 px-1">Tipe Diskon</label>
                        <select
                          value={currentVoucher?.type}
                          onChange={(e) => setCurrentVoucher(prev => ({ ...prev!, type: e.target.value as any }))}
                          className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:outline-none focus:ring-4 focus:ring-orange-500/10 transition-all font-bold"
                        >
                          <option value="percentage">Persentase (%)</option>
                          <option value="fixed">Nominal Tetap (Rp)</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2 px-1">Nilai Diskon</label>
                        <input
                          type="number"
                          required
                          value={currentVoucher?.value || 0}
                          onChange={(e) => setCurrentVoucher(prev => ({ ...prev!, value: Number(e.target.value) }))}
                          className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:outline-none focus:ring-4 focus:ring-orange-500/10 transition-all font-bold"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2 px-1">Maks. Potongan</label>
                        <input
                          type="number"
                          value={currentVoucher?.maxDiscount || ''}
                          onChange={(e) => setCurrentVoucher(prev => ({ ...prev!, maxDiscount: e.target.value ? Number(e.target.value) : undefined }))}
                          className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:outline-none focus:ring-4 focus:ring-orange-500/10 transition-all font-bold"
                          placeholder="Tanpa Batas"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2 px-1">Min. Belanja</label>
                        <input
                          type="number"
                          value={currentVoucher?.minPurchase || 0}
                          onChange={(e) => setCurrentVoucher(prev => ({ ...prev!, minPurchase: Number(e.target.value) }))}
                          className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:outline-none focus:ring-4 focus:ring-orange-500/10 transition-all font-bold"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2 px-1">Limit Penggunaan</label>
                        <input
                          type="number"
                          value={currentVoucher?.usageLimit || 1}
                          onChange={(e) => setCurrentVoucher(prev => ({ ...prev!, usageLimit: Number(e.target.value) }))}
                          className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:outline-none focus:ring-4 focus:ring-orange-500/10 transition-all font-bold"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2 px-1">Masa Berlaku</label>
                        <input
                          type="date"
                          value={currentVoucher?.expiryDate ? new Date(currentVoucher.expiryDate).toISOString().split('T')[0] : ''}
                          onChange={(e) => setCurrentVoucher(prev => ({ ...prev!, expiryDate: e.target.value }))}
                          className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:outline-none focus:ring-4 focus:ring-orange-500/10 transition-all font-bold"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-4 pt-4 border-t border-slate-50">
                    <button
                      type="button"
                      onClick={() => setIsModalOpen(false)}
                      className="flex-1 px-8 py-4 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold rounded-2xl transition-all"
                    >
                      Batal
                    </button>
                    <button
                      type="submit"
                      disabled={isSaving}
                      className="flex-1 px-8 py-4 bg-orange-500 hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold rounded-2xl shadow-xl shadow-orange-100 transition-all flex items-center justify-center gap-2"
                    >
                      {isSaving ? (
                        <div className="h-5 w-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                      ) : (
                        <>
                          <span>Simpan Voucher</span>
                          <ArrowRight size={18} />
                        </>
                      )}
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

export default PromotionManager;
