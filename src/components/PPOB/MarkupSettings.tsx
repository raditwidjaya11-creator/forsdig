import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { TrendingUp, Save, Trash2, Plus, AlertCircle, Info, Calculator } from 'lucide-react';
import { UserMarkup, UserProfile, PPOBService } from '../../types';
import { usePPOBStore } from '../../services/ppobStore';
import { generateUUID } from '../../lib/utils';
import { toast } from 'sonner';

export default function MarkupSettings({ user }: { user: UserProfile }) {
  const { 
    userMarkups: markups, 
    services: products, 
    updateUserProfile,
    addMarkup,
    deleteMarkup,
    isLoading: isStoreLoading 
  } = usePPOBStore();

  const [isSaving, setIsSaving] = useState(false);
  const [globalMarkup, setGlobalMarkup] = useState(user.defaultMarkup || 0);

  const [newMarkup, setNewMarkup] = useState<Partial<UserMarkup>>({
    markup: 0,
    productId: '',
    categoryId: ''
  });

  const handleSaveGlobal = async () => {
    if (globalMarkup < user.minMarkup || globalMarkup > user.maxMarkup) {
      toast.error(`Markup melebihi batas yang ditentukan admin (${user.minMarkup} - ${user.maxMarkup})`);
      return;
    }

    setIsSaving(true);
    try {
      await updateUserProfile({ defaultMarkup: globalMarkup });
      toast.success('Markup global berhasil disimpan');
    } catch (err) {
      toast.error('Gagal menyimpan markup global');
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddMarkup = async () => {
    if (!newMarkup.markup || (!newMarkup.productId && !newMarkup.categoryId)) {
      toast.error('Lengkapi data markup');
      return;
    }

    if (newMarkup.markup < user.minMarkup || newMarkup.markup > user.maxMarkup) {
      toast.error(`Markup melebihi batas yang ditentukan admin (${user.minMarkup} - ${user.maxMarkup})`);
      return;
    }

    setIsSaving(true);
    try {
      const id = generateUUID();
      const data: UserMarkup = {
        id,
        userId: user.id,
        markup: newMarkup.markup || 0,
        productId: newMarkup.productId,
        categoryId: newMarkup.categoryId,
        createdAt: new Date().toISOString()
      };
      await addMarkup(data);
      setNewMarkup({ markup: 0, productId: '', categoryId: '' });
      toast.success('Markup khusus berhasil ditambahkan');
    } catch (err) {
      toast.error('Gagal menambahkan markup');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteMarkup = async (id: string) => {
    if (!confirm('Hapus markup khusus ini?')) return;
    try {
      await deleteMarkup(id);
      toast.success('Markup dihapus');
    } catch (err) {
      toast.error('Gagal menghapus markup');
    }
  };

  if (isStoreLoading) return <div className="p-10 text-center uppercase font-black text-slate-400 animate-pulse">Memuat Pengaturan...</div>;

  return (
    <div className="p-4 md:p-8 space-y-8 max-w-5xl mx-auto">
      <div className="flex items-center gap-4 mb-8">
        <div className="w-14 h-14 bg-red-600 rounded-2xl flex items-center justify-center text-white shadow-xl shadow-red-100">
           <TrendingUp size={28} />
        </div>
        <div>
           <h2 className="text-2xl font-black text-slate-800 uppercase tracking-tight">Pengaturan Profit</h2>
           <p className="text-slate-500 font-bold uppercase tracking-widest text-xs">Kelola Keuntungan Reseller Anda</p>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-8">
        {/* Global Markup */}
        <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-xl shadow-slate-200/50 space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest flex items-center gap-2">
              <TrendingUp size={16} className="text-red-600" />
              Markup Global
            </h3>
            <Info size={14} className="text-slate-300" />
          </div>
          
          <div className="space-y-4">
            <p className="text-[10px] text-slate-400 font-bold uppercase leading-relaxed">
              Markup ini akan diterapkan ke semua produk PPOB kecuali ada markup khusus per produk atau kategori.
            </p>
            
            <div className="relative">
              <span className="absolute left-5 top-1/2 -translate-y-1/2 text-xs font-black text-slate-400">Rp</span>
              <input 
                type="number"
                value={globalMarkup}
                onChange={(e) => setGlobalMarkup(Number(e.target.value))}
                className="w-full pl-12 pr-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:outline-none focus:ring-4 focus:ring-red-500/10 transition-all font-bold text-lg"
              />
            </div>

            <div className="flex items-center gap-2 p-3 bg-blue-50 text-blue-600 rounded-xl">
               <AlertCircle size={14} className="shrink-0" />
               <p className="text-[9px] font-bold uppercase tracking-tighter">
                 Batas Admin: Rp {user.minMarkup.toLocaleString()} - Rp {user.maxMarkup.toLocaleString()}
               </p>
            </div>

            <button 
              onClick={handleSaveGlobal}
              disabled={isSaving}
              className="w-full py-4 bg-slate-900 text-white rounded-2xl font-black uppercase tracking-widest hover:bg-slate-800 transition-all shadow-lg flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {isSaving ? <TrendingUp className="animate-spin" size={16} /> : <Save size={16} />}
              Simpan Perubahan
            </button>
          </div>
        </div>

        {/* Price Preview */}
        <div className="bg-slate-900 p-6 rounded-[2rem] text-white space-y-6 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-red-600/10 rounded-full blur-3xl -mr-10 -mt-10" />
          
          <h3 className="text-sm font-black uppercase tracking-widest flex items-center gap-2">
            <Calculator size={16} className="text-red-500" />
            Simulasi Harga Jual
          </h3>

          <div className="space-y-4 relative z-10">
            <div className="flex justify-between items-center text-[10px] font-black text-white/40 uppercase">
               <span>Komponen</span>
               <span>Nominal</span>
            </div>
            
            <div className="space-y-3">
              <div className="flex justify-between items-center p-3 bg-white/5 rounded-xl">
                <span className="text-[10px] font-bold text-white/60 uppercase">Harga Modal + Admin</span>
                <span className="font-mono font-bold">Rp 12.500</span>
              </div>
              <div className="flex justify-between items-center p-3 bg-red-500/10 border border-red-500/20 rounded-xl">
                <span className="text-[10px] font-bold text-red-400 uppercase">Profit Anda (+ Markup)</span>
                <span className="font-mono font-bold text-red-400 text-lg">+ Rp {globalMarkup.toLocaleString()}</span>
              </div>
              <div className="h-px bg-white/10 my-2" />
              <div className="flex justify-between items-center p-4 bg-white/10 rounded-2xl">
                <span className="text-xs font-black uppercase tracking-widest">Harga Tampilan User</span>
                <span className="text-2xl font-black text-red-500">Rp {(12500 + globalMarkup).toLocaleString()}</span>
              </div>
            </div>
            
            <p className="text-[9px] text-white/30 font-bold uppercase italic text-center">
              * Harga di atas hanyalah ilustrasi simulasi realtime
            </p>
          </div>
        </div>
      </div>

      {/* Special Markups */}
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-black text-slate-800 uppercase tracking-tight">Markup Khusus</h3>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{markups.length} Aturan Aktif</p>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Add Form */}
          <div className="bg-white p-6 rounded-[2rem] border-2 border-dashed border-slate-200 hover:border-red-200 transition-colors space-y-4">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Tambah Aturan Baru</p>
            
            <div className="space-y-3">
              <select 
                value={newMarkup.productId}
                onChange={(e) => setNewMarkup({ ...newMarkup, productId: e.target.value, categoryId: '' })}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl focus:outline-none font-bold text-xs"
              >
                <option value="">Pilih Produk (Opsional)</option>
                {products.map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>

              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[10px] font-black text-slate-400">Rp</span>
                <input 
                  type="number"
                  placeholder="Markup Produk"
                  value={newMarkup.markup || ''}
                  onChange={(e) => setNewMarkup({ ...newMarkup, markup: Number(e.target.value) })}
                  className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-100 rounded-xl focus:outline-none font-bold text-xs"
                />
              </div>

              <button 
                onClick={handleAddMarkup}
                className="w-full py-3 bg-red-600 text-white rounded-xl font-black uppercase tracking-widest text-[10px] hover:bg-red-700 transition-all flex items-center justify-center gap-2"
              >
                <Plus size={14} />
                Tambah Aturan
              </button>
            </div>
          </div>

          {/* List */}
          {markups.map(m => {
            const product = products.find(p => p.id === m.productId);
            return (
              <div key={m.id} className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-lg shadow-slate-200/30 flex flex-col justify-between group">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="px-2 py-0.5 bg-slate-100 text-slate-500 text-[8px] font-black uppercase rounded-lg">Product Rule</span>
                    <button 
                      onClick={() => handleDeleteMarkup(m.id)}
                      className="text-slate-300 hover:text-red-500 transition-colors p-1"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                  <h4 className="text-sm font-black text-slate-800 line-clamp-1">{product?.name || 'Produk Tidak Ditemukan'}</h4>
                </div>

                <div className="mt-4 pt-4 border-t border-slate-50 flex items-center justify-between">
                   <p className="text-[10px] font-bold text-slate-400 uppercase">Profit</p>
                   <p className="text-lg font-black text-red-600">Rp {m.markup.toLocaleString()}</p>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  );
}
