import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Plus, 
  Trash2, 
  Edit2, 
  Search, 
  QrCode, 
  Check, 
  X, 
  AlertCircle,
  Smartphone,
  CreditCard,
  Target,
  Image as ImageIcon
} from 'lucide-react';
import { PaymentQR } from '../types';
import { fetchData, saveData, deleteData } from '../services/supabaseService';

interface QRManagerProps {
  initialQrs: PaymentQR[];
  onSave: (qrs: PaymentQR[]) => Promise<void>;
  onNotify?: (message: string, type: 'success' | 'error') => void;
}

export default function QRManager({ initialQrs, onSave, onNotify }: QRManagerProps) {
  const [qrs, setQrs] = useState<PaymentQR[]>(initialQrs);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentQR, setCurrentQR] = useState<Partial<PaymentQR>>({
    name: '',
    provider: 'QRIS',
    imageUrl: '',
    accountName: '',
    accountNumber: '',
    isDefault: false,
    isActive: true
  });
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    setQrs(initialQrs);
  }, [initialQrs]);

  const generateId = () => {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
      return crypto.randomUUID();
    }
    // Fallback UUID v4 generator
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentQR.name || !currentQR.imageUrl || !currentQR.accountName) {
      onNotify?.('Mohon lengkapi data yang wajib diisi', 'error');
      return;
    }

    setIsLoading(true);
    try {
      const qrId = isEditing && currentQR.id ? currentQR.id : generateId();
      
      const qrToSave: PaymentQR = {
        id: qrId,
        name: currentQR.name || '',
        provider: currentQR.provider || 'QRIS',
        imageUrl: currentQR.imageUrl || '',
        accountName: currentQR.accountName || '',
        accountNumber: currentQR.accountNumber || '',
        isDefault: !!currentQR.isDefault,
        isActive: !!currentQR.isActive
      };

      // If this is set as default, unset others locally
      let updatedQrs = [...qrs];
      if (qrToSave.isDefault) {
        updatedQrs = updatedQrs.map(q => ({ ...q, isDefault: false }));
      }

      if (isEditing) {
        updatedQrs = updatedQrs.map(q => q.id === qrToSave.id ? qrToSave : q);
      } else {
        updatedQrs.push(qrToSave);
      }

      await onSave(updatedQrs);
      setIsModalOpen(false);
      onNotify?.(`QR ${isEditing ? 'diperbarui' : 'ditambahkan'} berhasil!`, 'success');
      resetForm();
    } catch (error: any) {
      console.error('Failed to save QR:', error);
      onNotify?.(`Gagal menyimpan QR: ${error.message || 'Error tidak diketahui'}`, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Apakah Anda yakin ingin menghapus QR ini?')) return;
    
    setIsLoading(true);
    try {
      const updatedQrs = qrs.filter(q => q.id !== id);
      await onSave(updatedQrs);
      onNotify?.('QR dihapus berhasil!', 'success');
    } catch (error: any) {
      console.error('Failed to delete QR:', error);
      onNotify?.(`Gagal menghapus QR: ${error.message || 'Error tidak diketahui'}`, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) { // 2MB limit
        onNotify?.('Ukuran gambar terlalu besar (maks 2MB)', 'error');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setCurrentQR({ ...currentQR, imageUrl: reader.result as string });
      };
      reader.readAsDataURL(file);
    }
  };

  const resetForm = () => {
    setCurrentQR({
      name: '',
      provider: 'QRIS',
      imageUrl: '',
      accountName: '',
      accountNumber: '',
      isDefault: false,
      isActive: true
    });
    setIsEditing(false);
  };

  const providers = [
    { value: 'QRIS', label: 'QRIS', icon: QrCode },
    { value: 'Dana', label: 'DANA', icon: Smartphone },
    { value: 'OVO', label: 'OVO', icon: Smartphone },
    { value: 'Gopay', label: 'GoPay', icon: Smartphone },
    { value: 'ShopeePay', label: 'ShopeePay', icon: Smartphone },
    { value: 'Bank', label: 'Bank QR / Transfer', icon: CreditCard },
  ];

  const filteredQrs = qrs.filter(q => 
    q.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    q.provider.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 text-center md:text-left">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-800 tracking-tight flex items-center justify-center md:justify-start gap-2">
            <QrCode className="text-red-600 sm:w-6 sm:h-6" size={20} />
            KELOLA QR PEMBAYARAN
          </h2>
          <p className="text-slate-500 font-bold text-[10px] sm:text-xs uppercase tracking-widest mt-1">Atur QR Code Toko Anda</p>
        </div>
        <button 
          onClick={() => { resetForm(); setIsModalOpen(true); }}
          className="flex items-center justify-center gap-2 px-6 py-4 sm:py-3 bg-red-600 text-white rounded-2xl font-black text-xs sm:text-sm hover:bg-red-700 transition-all shadow-lg shadow-red-200 active:scale-95"
        >
          <Plus size={18} />
          TAMBAH QR BARU
        </button>
      </div>

      <div className="flex flex-col md:flex-row gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input 
            type="text"
            placeholder="Cari QR..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-12 pr-4 py-4 bg-white border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all font-bold text-slate-700 text-sm"
          />
        </div>
      </div>

      {isLoading && qrs.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 bg-white rounded-3xl sm:rounded-[2.5rem] border border-slate-100">
          <div className="w-12 h-12 sm:w-16 sm:h-16 border-4 border-red-100 border-t-red-600 rounded-full animate-spin mb-4" />
          <p className="text-slate-400 font-black text-[10px] sm:text-xs uppercase tracking-widest">Memuat data QR...</p>
        </div>
      ) : filteredQrs.length > 0 ? (
        <div className="grid grid-cols-1 xs:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          {filteredQrs.map((qr) => (
            <motion.div 
              layout
              key={qr.id}
              className={`bg-white p-5 sm:p-6 rounded-2xl sm:rounded-[2rem] border border-slate-100 shadow-xl shadow-slate-200/40 relative overflow-hidden group transition-all hover:translate-y-[-4px] ${!qr.isActive ? 'opacity-60' : ''}`}
            >
              {qr.isDefault && (
                <div className="absolute top-0 right-0 bg-red-600 text-white px-4 sm:px-6 py-1 sm:py-1.5 rounded-bl-2xl sm:rounded-bl-3xl font-black text-[8px] sm:text-[10px] uppercase tracking-widest shadow-lg z-10">
                  <div className="flex items-center gap-1.5">
                    <Target size={10} className="sm:w-3 sm:h-3" />
                    Default
                  </div>
                </div>
              )}
              
              <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 sm:gap-5 text-center sm:text-left">
                <div className="w-20 h-20 sm:w-24 sm:h-24 bg-slate-50 border border-slate-100 rounded-2xl flex items-center justify-center overflow-hidden shrink-0 group-hover:scale-105 transition-transform">
                  {qr.imageUrl ? (
                    <img src={qr.imageUrl} alt={qr.name} className="w-full h-full object-contain" />
                  ) : (
                    <QrCode size={32} className="text-slate-300 sm:w-10 sm:h-10" />
                  )}
                </div>
                
                <div className="flex-1 min-w-0 w-full">
                  <div className="flex items-center justify-center sm:justify-start gap-2 mb-1">
                    <span className="px-2 py-0.5 bg-slate-100 text-slate-500 rounded text-[8px] sm:text-[9px] font-black uppercase tracking-tighter">
                      {qr.provider}
                    </span>
                    {!qr.isActive && (
                      <span className="px-2 py-0.5 bg-amber-50 text-amber-600 rounded text-[8px] sm:text-[9px] font-black uppercase tracking-tighter">
                        Nonaktif
                      </span>
                    )}
                  </div>
                  <h3 className="text-base sm:text-lg font-black text-slate-800 truncate leading-tight uppercase tracking-tight">{qr.name}</h3>
                  <p className="text-slate-500 font-bold text-[10px] sm:text-xs mt-1 truncate">{qr.accountName}</p>
                  {qr.accountNumber && (
                    <p className="text-slate-400 font-medium text-[9px] sm:text-[10px] mt-0.5 font-mono truncate">{qr.accountNumber}</p>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2 mt-4 sm:mt-6 pt-4 sm:pt-6 border-t border-slate-50">
                <button 
                  onClick={() => { setCurrentQR(qr); setIsEditing(true); setIsModalOpen(true); }}
                  className="flex-1 h-10 sm:h-11 flex items-center justify-center gap-2 bg-slate-50 text-slate-600 rounded-xl font-black text-[10px] sm:text-xs uppercase tracking-widest hover:bg-slate-100 transition-all active:scale-95"
                >
                  <Edit2 size={12} className="sm:w-3.5 sm:h-3.5" />
                  Edit
                </button>
                <button 
                  onClick={() => handleDelete(qr.id)}
                  className="h-10 w-10 sm:h-11 sm:w-11 flex items-center justify-center text-red-600 bg-red-50 rounded-xl hover:bg-red-100 transition-all active:scale-95 shrink-0"
                >
                  <Trash2 size={16} className="sm:w-4.5 sm:h-4.5" />
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-20 sm:py-32 bg-white rounded-3xl sm:rounded-[2.5rem] border border-dashed border-slate-200 p-6 text-center">
          <div className="w-16 h-16 sm:w-20 sm:h-20 bg-slate-50 rounded-full flex items-center justify-center text-slate-300 mb-6 group-hover:scale-110 transition-transform">
            <QrCode size={32} className="sm:w-10 sm:h-10" />
          </div>
          <h3 className="text-lg sm:text-xl font-black text-slate-800">BELUM ADA QR PEMBAYARAN</h3>
          <p className="text-slate-400 font-bold text-xs sm:text-sm mt-1 mb-6 sm:mb-8 uppercase tracking-widest">Mulai dengan menambahkan QR Code pertama Anda</p>
          <button 
            onClick={() => { resetForm(); setIsModalOpen(true); }}
            className="px-8 py-3.5 sm:py-3 bg-red-600 text-white rounded-2xl font-black text-xs sm:text-sm hover:bg-red-700 transition-all shadow-lg shadow-red-200 active:scale-95"
          >
            TAMBAH QR SEKARANG
          </button>
        </div>
      )}

      {/* QR Editor Modal */}
      <AnimatePresence mode="wait">
        {isModalOpen && (
          <div key="qr-modal-wrapper" className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsModalOpen(false)}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
            />
            <motion.form 
              key="qr-modal-content"
              onSubmit={handleSave}
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-xl bg-white rounded-3xl sm:rounded-[2.5rem] shadow-2xl overflow-hidden"
            >
              <div className="p-6 sm:p-8 border-b border-slate-50 flex items-center justify-between">
                <div>
                  <h3 className="text-lg sm:text-xl font-black text-slate-800 tracking-tight">
                    {isEditing ? 'EDIT QR PEMBAYARAN' : 'TAMBAH QR BARU'}
                  </h3>
                  <p className="text-slate-400 font-bold text-[9px] sm:text-[10px] uppercase tracking-widest mt-1">Lengkapi informasi QR Toko Anda</p>
                </div>
                <button type="button" onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-slate-50 rounded-full text-slate-400 hover:text-slate-600 transition-colors">
                  <X size={20} />
                </button>
              </div>

              <div className="p-6 sm:p-8 space-y-5 sm:space-y-6 max-h-[70vh] overflow-y-auto custom-scrollbar">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                  <div className="space-y-1.5 sm:space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Nama QR / Alias *</label>
                    <input 
                      required
                      type="text"
                      placeholder="Misal: Kasir Utama"
                      value={currentQR.name}
                      onChange={(e) => setCurrentQR({...currentQR, name: e.target.value})}
                      className="w-full px-5 py-3 sm:py-3.5 bg-slate-50 border border-slate-100 rounded-xl sm:rounded-2xl focus:outline-none focus:ring-2 focus:ring-red-500 font-bold text-slate-700 transition-all text-sm"
                    />
                  </div>
                  <div className="space-y-1.5 sm:space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Penyedia *</label>
                    <select 
                      value={currentQR.provider}
                      onChange={(e) => setCurrentQR({...currentQR, provider: e.target.value})}
                      className="w-full px-5 py-3 sm:py-3.5 bg-slate-50 border border-slate-100 rounded-xl sm:rounded-2xl focus:outline-none focus:ring-2 focus:ring-red-500 font-bold text-slate-700 transition-all appearance-none text-sm"
                    >
                      {providers.map(p => (
                        <option key={p.value} value={p.value}>{p.label}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                  <div className="space-y-1.5 sm:space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Nama Pemilik Akun *</label>
                    <input 
                      required
                      type="text"
                      placeholder="Atas Nama"
                      value={currentQR.accountName}
                      onChange={(e) => setCurrentQR({...currentQR, accountName: e.target.value})}
                      className="w-full px-5 py-3 sm:py-3.5 bg-slate-50 border border-slate-100 rounded-xl sm:rounded-2xl focus:outline-none focus:ring-2 focus:ring-red-500 font-bold text-slate-700 transition-all text-sm"
                    />
                  </div>
                  <div className="space-y-1.5 sm:space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Nomor Rekening/HP (Opsional)</label>
                    <input 
                      type="text"
                      placeholder="08123xxxx atau Rek Bank"
                      value={currentQR.accountNumber}
                      onChange={(e) => setCurrentQR({...currentQR, accountNumber: e.target.value})}
                      className="w-full px-5 py-3 sm:py-3.5 bg-slate-50 border border-slate-100 rounded-xl sm:rounded-2xl focus:outline-none focus:ring-2 focus:ring-red-500 font-bold text-slate-700 transition-all text-sm"
                    />
                  </div>
                </div>

                <div className="space-y-3">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-2">
                    <ImageIcon size={12} className="text-red-500" />
                    GAMBAR QR CODE *
                  </label>
                  
                  <div className="flex flex-col sm:flex-row gap-6 items-center">
                    <div className="relative group shrink-0">
                      <div className="w-24 h-24 sm:w-28 sm:h-28 bg-slate-50 border-2 border-dashed border-slate-200 rounded-2xl sm:rounded-3xl flex items-center justify-center overflow-hidden relative group-hover:border-red-200 transition-colors">
                        {currentQR.imageUrl ? (
                          <>
                            <img src={currentQR.imageUrl} alt="QR Preview" className="w-full h-full object-contain p-2" />
                            <button 
                              type="button"
                              onClick={() => setCurrentQR({ ...currentQR, imageUrl: '' })}
                              className="absolute top-1 right-1 p-1 bg-white/90 rounded-full text-red-500 shadow-sm z-20 hover:bg-red-50 transition-colors"
                            >
                              <X size={12} />
                            </button>
                            <div className="absolute inset-0 bg-slate-900/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                              <p className="text-[8px] font-black text-white uppercase tracking-widest">Ganti Gambar</p>
                            </div>
                          </>
                        ) : (
                          <div className="flex flex-col items-center gap-1">
                            <Plus size={16} className="text-slate-300" />
                            <p className="text-[8px] font-black text-slate-300 uppercase tracking-widest">Upload</p>
                          </div>
                        )}
                        <input 
                          type="file" 
                          accept="image/*"
                          onChange={handleImageUpload}
                          className="absolute inset-0 opacity-0 cursor-pointer z-10"
                        />
                      </div>
                    </div>

                    <div className="flex-1 w-full space-y-3">
                      <div className="relative">
                        <ImageIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                        <input 
                          required
                          type="text"
                          placeholder="Link gambar (https://...) atau upload file"
                          value={currentQR.imageUrl?.startsWith('data:') ? 'File Gambar Terunggah' : currentQR.imageUrl}
                          readOnly={currentQR.imageUrl?.startsWith('data:')}
                          onChange={(e) => setCurrentQR({...currentQR, imageUrl: e.target.value})}
                          className={`w-full pl-11 pr-12 py-3 sm:py-3.5 bg-slate-50 border border-slate-100 rounded-xl sm:rounded-2xl focus:outline-none focus:ring-2 focus:ring-red-500 font-bold transition-all text-xs ${currentQR.imageUrl?.startsWith('data:') ? 'text-green-600 bg-green-50/30' : 'text-slate-700'}`}
                        />
                        {currentQR.imageUrl?.startsWith('data:') && (
                          <button 
                            type="button"
                            onClick={() => setCurrentQR({ ...currentQR, imageUrl: '' })}
                            className="absolute right-4 top-1/2 -translate-y-1/2 text-red-500 hover:text-red-700"
                          >
                            <X size={14} />
                          </button>
                        )}
                      </div>
                      <p className="text-[9px] font-medium text-slate-400 ml-1 italic leading-relaxed">
                        * {currentQR.imageUrl?.startsWith('data:') ? 'Gambar terunggah sebagai file lokal. Klik ikon X untuk mereset.' : 'Anda bisa mengunggah file gambar (maks 2MB) atau menempelkan link (URL) gambar.'}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row items-center gap-6 sm:gap-8 pt-2">
                  <label className="w-full sm:w-auto flex items-center justify-between sm:justify-start gap-4 cursor-pointer group">
                    <div className={`w-11 sm:w-12 h-5 sm:h-6 rounded-full transition-all relative shrink-0 ${currentQR.isDefault ? 'bg-red-600' : 'bg-slate-200'}`}>
                      <div className={`absolute top-0.5 sm:top-1 w-4 h-4 bg-white rounded-full transition-all ${currentQR.isDefault ? 'left-6 sm:left-7' : 'left-1'}`} />
                      <input 
                        type="checkbox"
                        className="hidden"
                        checked={currentQR.isDefault}
                        onChange={(e) => setCurrentQR({...currentQR, isDefault: e.target.checked})}
                      />
                    </div>
                    <div>
                      <p className="text-[11px] sm:text-xs font-black text-slate-700 uppercase tracking-tight">Set Default</p>
                      <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">QR Utama</p>
                    </div>
                  </label>

                  <label className="w-full sm:w-auto flex items-center justify-between sm:justify-start gap-4 cursor-pointer group">
                    <div className={`w-11 sm:w-12 h-5 sm:h-6 rounded-full transition-all relative shrink-0 ${currentQR.isActive ? 'bg-green-600' : 'bg-slate-200'}`}>
                      <div className={`absolute top-0.5 sm:top-1 w-4 h-4 bg-white rounded-full transition-all ${currentQR.isActive ? 'left-6 sm:left-7' : 'left-1'}`} />
                      <input 
                        type="checkbox"
                        className="hidden"
                        checked={currentQR.isActive}
                        onChange={(e) => setCurrentQR({...currentQR, isActive: e.target.checked})}
                      />
                    </div>
                    <div>
                      <p className="text-[11px] sm:text-xs font-black text-slate-700 uppercase tracking-tight">Status Aktif</p>
                      <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Muncul di pilihan</p>
                    </div>
                  </label>
                </div>
              </div>

              <div className="p-6 sm:p-8 bg-slate-50 border-t border-slate-100 flex flex-col sm:flex-row items-center gap-3 sm:gap-4">
                <button 
                  type="button" 
                  onClick={() => setIsModalOpen(false)}
                  className="w-full sm:flex-1 py-4 bg-white border border-slate-200 text-slate-600 rounded-xl sm:rounded-2xl font-black text-xs sm:text-sm hover:bg-slate-100 transition-all uppercase tracking-widest"
                >
                  BATAL
                </button>
                <button 
                  type="submit"
                  disabled={isLoading}
                  className="w-full sm:flex-[2] py-4 bg-red-600 text-white rounded-xl sm:rounded-2xl font-black text-xs sm:text-sm hover:bg-red-700 transition-all shadow-lg shadow-red-200 flex items-center justify-center gap-2 uppercase tracking-widest"
                >
                  {isLoading ? (
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : <Check size={18} />}
                  {isEditing ? 'SIMPAN PERUBAHAN' : 'TAMBAH SEKARANG'}
                </button>
              </div>
            </motion.form>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
