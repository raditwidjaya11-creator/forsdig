import React, { useState } from 'react';
import { usePOSStore } from '../services/posStore';
import { Shift, Staff } from '../types';
import { 
  Clock, Coins, UserCheck, CheckCircle2, AlertCircle, FileText, 
  Trash2, Search, ArrowUpRight, ArrowDownRight, Printer, List, Play, Lock, AlertTriangle
} from 'lucide-react';
import { toast } from 'sonner';

export default function ShiftManager() {
  const { shifts, staff, startShift, endShift, transactions, storeSettings } = usePOSStore();
  
  // States
  const [selectedStaffId, setSelectedStaffId] = useState('');
  const [customStaffName, setCustomStaffName] = useState('');
  const [initialCashInput, setInitialCashInput] = useState('100000');
  
  // For shift closing form
  const [actualCashInput, setActualCashInput] = useState('');
  const [closingNotes, setClosingNotes] = useState('');
  const [isClosingNow, setIsClosingNow] = useState(false);
  
  // Search history
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedHistoryShift, setSelectedHistoryShift] = useState<Shift | null>(null);

  // Active shift
  const activeShift = shifts.find(s => s.status === 'active');

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(amount);
  };

  const formatDate = (timestamp: string | number) => {
    return new Date(Number(timestamp)).toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const handleStartShift = async (e: React.FormEvent) => {
    e.preventDefault();
    
    let staffName = '';
    let staffId = '';

    if (selectedStaffId === 'custom') {
      if (!customStaffName.trim()) {
        toast.error('Silakan isi nama staf kasir manual!');
        return;
      }
      staffName = customStaffName.trim();
      staffId = 'custom-' + Date.now();
    } else {
      const selectedStaff = staff.find(st => st.id === selectedStaffId);
      if (!selectedStaff) {
        toast.error('Silakan pilih staf kasir yang bertugas!');
        return;
      }
      staffName = selectedStaff.name;
      staffId = selectedStaff.id;
    }

    const initialCash = parseFloat(initialCashInput) || 0;
    if (initialCash < 0) {
      toast.error('Modal awal tidak boleh negatif!');
      return;
    }

    try {
      await startShift(staffId, staffName, initialCash);
      toast.success(`Shift berhasil dibuka untuk ${staffName}`);
      // Reset form states
      setSelectedStaffId('');
      setCustomStaffName('');
      setInitialCashInput('100000');
    } catch (err) {
      toast.error('Gagal membuka shift!');
    }
  };

  const handleEndShift = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeShift) return;

    if (!actualCashInput) {
      toast.error('Silakan isi jumlah uang fisik laci uang saat ini!');
      return;
    }

    const actualCash = parseFloat(actualCashInput) || 0;
    try {
      await endShift(activeShift.id, actualCash, closingNotes);
      toast.success('Shift berhasil diselesaikan dan laporan kas ditutup');
      setActualCashInput('');
      setClosingNotes('');
      setIsClosingNow(false);
    } catch (err) {
      toast.error('Gagal menyelesaikan shift!');
    }
  };

  // Filter history
  const filteredHistory = shifts
    .filter(s => s.status === 'closed')
    .filter(s => 
      s.staffName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (s.notes && s.notes.toLowerCase().includes(searchQuery.toLowerCase()))
    );

  const handlePrintReport = (shift: Shift) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      toast.error('Pop-up printer diblokir oleh browser!');
      return;
    }

    const durationHrs = shift.endedAt 
      ? ((Number(shift.endedAt) - Number(shift.startedAt)) / 3600000).toFixed(1)
      : 'Berjalan';

    const cleanSettings = storeSettings || {
      name: 'ForsDig POS',
      address: 'Kawasan Bisnis Digital, Jakarta Selatan',
      phone: '021-555-0123',
      footerMessage: 'Software oleh FordsDig'
    };

    printWindow.document.write(`
      <html>
        <head>
          <title>Laporan Penutupan Kasir (Shift) - ${shift.staffName}</title>
          <style>
            body { font-family: 'Courier New', Courier, monospace; font-size: 13px; color: #000; padding: 20px; max-width: 380px; margin: 0 auto; }
            .text-center { text-align: center; }
            .header { margin-bottom: 20px; font-weight: bold; }
            .divider { border-top: 1px dashed #000; margin: 10px 0; }
            .row { display: flex; justify-content: space-between; margin-bottom: 5px; }
            .total { font-weight: bold; font-size: 15px; }
            .footer { margin-top: 25px; font-size: 11px; text-align: center; }
          </style>
        </head>
        <body>
          <div class="text-center header">
            <div style="font-size: 16px; text-transform: uppercase;">${cleanSettings.name}</div>
            <div style="font-size: 11px; font-weight: normal; margin-top: 2px;">${cleanSettings.address}</div>
            <div style="font-size: 11px; font-weight: normal;">Telp: ${cleanSettings.phone}</div>
          </div>
          
          <div class="divider"></div>
          <div class="text-center" style="font-weight: bold; margin-bottom: 10px;">LAPORAN PENUTUPAN SHIFT</div>
          
          <div class="row"><span>Kasir:</span> <span>${shift.staffName}</span></div>
          <div class="row"><span>Buka:</span> <span>${formatDate(shift.startedAt)}</span></div>
          <div class="row"><span>Tutup:</span> <span>${shift.endedAt ? formatDate(shift.endedAt) : '-'}</span></div>
          <div class="row"><span>Durasi:</span> <span>${durationHrs} jam</span></div>
          
          <div class="divider"></div>
          
          <div class="row"><span>1. Modal Awal Kas:</span> <span>${formatCurrency(shift.initialCash)}</span></div>
          <div class="row"><span>2. Total Penjualan Tunai:</span> <span>+ ${formatCurrency(shift.totalCashTransactions)}</span></div>
          <div class="divider" style="margin: 5px 0;"></div>
          <div class="row" style="font-weight: bold;"><span>Estimasi Saldo Laci:</span> <span>${formatCurrency(shift.expectedCash)}</span></div>
          
          <div class="divider"></div>
          
          <div class="row"><span>Uang Fisik Aktual:</span> <span>${shift.actualCash !== undefined ? formatCurrency(shift.actualCash) : '-'}</span></div>
          <div class="divider" style="margin: 5px 0;"></div>
          
          <div class="row total">
            <span>SELISIH KAS:</span>
            <span>
              ${shift.difference !== undefined 
                ? (shift.difference === 0 
                  ? 'PAS (Rapi)' 
                  : shift.difference > 0 
                    ? `SURPLUS (+${formatCurrency(shift.difference)})`
                    : `MINUS (${formatCurrency(shift.difference)})`)
                : '-'
              }
            </span>
          </div>

          ${shift.notes ? `
            <div class="divider"></div>
            <div style="font-weight: bold; margin-bottom: 4px;">Catatan Penutupan:</div>
            <div style="font-style: italic;">"${shift.notes}"</div>
          ` : ''}

          <div class="divider"></div>
          <div class="footer">
            <p>Terima kasih atas disiplin & tanggung jawab Anda!</p>
            <p style="margin-top: 15px; font-size: 8px;">ForsDig POS Cloud v1.0.0</p>
          </div>
          <script>
            window.onload = function() { window.print(); window.close(); }
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12 animate-fade-in" id="shift-manager-root">
      
      {/* HEADER SECTION */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-xl md:text-2xl font-black text-slate-900 uppercase tracking-tight flex items-center gap-2">
            <Clock className="w-6 h-6 text-blue-600" />
            Manajemen Shift &amp; Tutup Kasir
          </h2>
          <p className="text-sm text-slate-500 font-medium">
            Kelola modal awal register, monitoring transaksi tunai riil, dan lakukan cash closing audit secara transparan.
          </p>
        </div>
        
        {activeShift && (
          <div className="flex items-center gap-2 bg-green-50 text-green-700 dark:bg-green-950/40 dark:text-green-400 border border-green-200 dark:border-green-900 rounded-xl px-4 py-2 text-sm font-semibold">
            <span className="w-2.5 h-2.5 rounded-full bg-green-500 animate-ping"></span>
            Shift Aktif: {activeShift.staffName}
          </div>
        )}
      </div>

      {/* ACTIVE SHIFT SUMMARY BOARD / START SHIFT */}
      {!activeShift ? (
        /* NO ACTIVE SHIFT: START SHIFT FORM */
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-white dark:bg-slate-900 rounded-2xl border border-slate-205 dark:border-slate-800 p-6 shadow-sm flex flex-col justify-between">
            <div className="space-y-4">
              <div className="w-12 h-12 rounded-xl bg-red-100 flex items-center justify-center text-red-600 mb-4">
                <Lock className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-black text-slate-800 dark:text-slate-100 uppercase tracking-wide">
                Laci Kasir Berstatus Dikunci
              </h3>
              <p className="text-slate-500 text-sm leading-relaxed">
                Sebelum memulai transaksi tunai di aplikasi ForsDig POS, Anda diwajibkan untuk mengaktifkan Shift bertugas dan mengonfirmasi nominal modal kas awal (uang kembalian) sebagai acuan rekonsiliasi akhir.
              </p>
              
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex gap-3 text-amber-800 text-sm">
                <AlertTriangle className="w-5 h-5 shrink-0 text-amber-600" />
                <div>
                  <h4 className="font-bold mb-0.5">Peringatan Audit Akuntansi</h4>
                  <p className="text-[13px] text-amber-700">
                    Sistem akan memantau seluruh transaksi ber-metode <strong>"Tunai (Cash)"</strong> secara otomatis. Segala ketidaksinkronan kas aktual di akhir kerja wajib dipertanggungjawabkan.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-205 dark:border-slate-800 p-6 shadow-sm">
            <h3 className="text-md font-bold text-slate-800 dark:text-slate-100 uppercase tracking-wider border-b border-slate-100 dark:border-slate-800 pb-3 mb-4">
              Mulai Shift Kasir Baru
            </h3>
            
            <form onSubmit={handleStartShift} className="space-y-4">
              <div>
                <label className="block text-xs font-black uppercase text-slate-500 mb-1.5">
                  1. Pilih Petugas Kasir (Staff)
                </label>
                <select
                  value={selectedStaffId}
                  onChange={(e) => setSelectedStaffId(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 dark:bg-slate-900 focus:ring-2 focus:ring-blue-500 font-medium text-slate-800 dark:text-slate-100 text-sm"
                  required
                >
                  <option value="">-- Pilih Staf --</option>
                  {staff.filter(st => st.status === 'active').map(st => (
                    <option key={st.id} value={st.id}>
                      {st.name} ({st.role || 'Staf Kasir'})
                    </option>
                  ))}
                  <option value="custom">-- Kasir Manual (Input Nama Lain) --</option>
                </select>
              </div>

              {selectedStaffId === 'custom' && (
                <div className="animate-fade-in">
                  <label className="block text-xs font-black uppercase text-slate-500 mb-1.5">
                    Nama Kasir Manual
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Contoh: Raditya Wijaya"
                    value={customStaffName}
                    onChange={(e) => setCustomStaffName(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 dark:bg-slate-900 focus:ring-2 focus:ring-blue-500 font-medium text-sm text-slate-100"
                  />
                </div>
              )}

              {staff.filter(st => st.status === 'active').length === 0 && (
                <p className="text-[11px] text-slate-400 font-medium leading-tight">
                  💡 Belum ada staf terdaftar? Anda bisa menambahkan nama di tab <strong className="text-slate-600">Manajemen Staf</strong>, atau gunakan menu Kasir Manual di atas.
                </p>
              )}

              <div>
                <label className="block text-xs font-black uppercase text-slate-500 mb-1.5">
                  2. Kas Awal Modal (Uang Kembalian)
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-black text-slate-400">Rp</span>
                  <input
                    type="number"
                    min="0"
                    step="500"
                    required
                    value={initialCashInput}
                    onChange={(e) => setInitialCashInput(e.target.value)}
                    className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 dark:bg-slate-900 focus:ring-2 focus:ring-red-500 font-extrabold text-slate-800 dark:text-slate-100"
                  />
                </div>
                
                {/* Quick Presets */}
                <div className="grid grid-cols-3 gap-1.5 mt-2">
                  {['50000', '100000', '200000'].map(val => (
                    <button
                      key={val}
                      type="button"
                      onClick={() => setInitialCashInput(val)}
                      className="px-2 py-1 text-[11px] font-bold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 hover:dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-lg transition-colors border border-slate-200 dark:border-slate-700"
                    >
                      {formatCurrency(parseFloat(val))}
                    </button>
                  ))}
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-3 bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold flex items-center justify-center gap-2 shadow-md hover:shadow-lg hover:shadow-red-500/10 active:scale-98 transition-all text-sm uppercase tracking-wider"
              >
                <Play className="w-4 h-4 fill-white" />
                Aktifkan Shift Sekarang
              </button>
            </form>
          </div>
        </div>
      ) : (
        /* ACTIVE SHIFT: LIVE METRICS & END SHIFT CONTROLS */
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            
            {/* Live Metrics Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              
              {/* Modal Awal */}
              <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 p-5 shadow-sm flex items-center gap-4">
                <div className="w-11 h-11 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-600 dark:text-slate-300 shrink-0">
                  <Coins className="w-5 h-5 text-indigo-500" />
                </div>
                <div>
                  <span className="block text-[10px] font-black uppercase text-slate-400 leading-tight">Modal Kas Awal</span>
                  <span className="block text-lg font-black text-slate-850 dark:text-slate-50 mt-0.5">{formatCurrency(activeShift.initialCash)}</span>
                </div>
              </div>

              {/* Total Cash Collections */}
              <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 p-5 shadow-sm flex items-center gap-4">
                <div className="w-11 h-11 rounded-xl bg-green-50 dark:bg-green-950/40 flex items-center justify-center text-green-600 dark:text-green-400 shrink-0">
                  <ArrowUpRight className="w-6 h-6 text-green-500" />
                </div>
                <div>
                  <span className="block text-[10px] font-black uppercase text-slate-400 leading-tight">Penjualan Tunai</span>
                  <span className="block text-lg font-black text-green-600 mt-0.5">{formatCurrency(activeShift.totalCashTransactions)}</span>
                </div>
              </div>

              {/* Expected Total */}
              <div className="bg-white dark:bg-slate-900 rounded-2xl border border-red-100 dark:border-red-900/40 p-5 shadow-md flex items-center gap-4 relative overflow-hidden">
                <div className="absolute right-0 top-0 bottom-0 w-1 bg-red-500"></div>
                <div className="w-11 h-11 rounded-xl bg-red-50 dark:bg-red-950/40 flex items-center justify-center text-red-600 dark:text-red-400 shrink-0">
                  <CheckCircle2 className="w-5 h-5 text-red-500" />
                </div>
                <div>
                  <span className="block text-[10px] font-black uppercase text-red-550 leading-tight">Estimasi Laci</span>
                  <span className="block text-lg font-black text-red-600 dark:text-red-400 mt-0.5">{formatCurrency(activeShift.expectedCash)}</span>
                </div>
              </div>

            </div>

            {/* Active Shift Info & Realtime Journal */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 p-6 shadow-sm">
              <h3 className="text-md font-bold text-slate-800 dark:text-slate-100 uppercase tracking-wider mb-4 pb-3 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
                <span>Detail Aktivitas Shift</span>
                <span className="text-xs normal-case text-slate-400">Diaktifkan sejak {formatDate(activeShift.startedAt)}</span>
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 leading-relaxed">
                <div>
                  <h4 className="text-xs font-bold uppercase text-slate-400 mb-2">Kasir Bertugas</h4>
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-600 font-extrabold text-sm uppercase">
                      {activeShift.staffName.slice(0, 2)}
                    </div>
                    <div>
                      <span className="block font-bold text-slate-800 dark:text-slate-100 text-sm">{activeShift.staffName}</span>
                      <span className="block text-[11px] text-slate-400 font-medium">Petugas Terotorisasi</span>
                    </div>
                  </div>
                </div>

                <div className="bg-slate-50 dark:bg-slate-900/50 p-4 rounded-xl space-y-1.5 text-xs text-slate-600 dark:text-slate-300">
                  <div className="flex justify-between">
                    <span>Kas Awal:</span>
                    <span className="font-bold text-slate-800 dark:text-slate-200">{formatCurrency(activeShift.initialCash)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Penjualan Tunai:</span>
                    <span className="font-bold text-green-600">+{formatCurrency(activeShift.totalCashTransactions)}</span>
                  </div>
                  <div className="border-t border-slate-200 dark:border-slate-800 my-1 pt-1.5 flex justify-between font-bold">
                    <span className="text-red-650">Estimasi Terakhir Laci:</span>
                    <span className="text-red-650">{formatCurrency(activeShift.expectedCash)}</span>
                  </div>
                </div>
              </div>

              {/* Tips */}
              <div className="mt-6 p-4 bg-slate-50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800 rounded-xl flex gap-3 text-xs leading-relaxed text-slate-500">
                <FileText className="w-5 h-5 text-slate-400 shrink-0" />
                <p>
                  Setiap transaksi tunai yang diselesaikan oleh kasir di halaman <strong>Mesin Kasir</strong> akan ditambahkan secara instan ke total transaksi kas shift ini. Tidak memerlukan penyegaran manual.
                </p>
              </div>
            </div>
          </div>

          {/* CASH CLOSING & REPORTING SIDEBAR PANEL */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-red-200 dark:border-red-900 shadow-md p-6 flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2 text-red-605 font-black text-sm uppercase tracking-wider border-b border-slate-100 dark:border-slate-800 pb-3 mb-4">
                <Lock className="w-4 h-4 text-red-600" />
                Prosedur Cash Closing
              </div>
              
              {!isClosingNow ? (
                <div className="space-y-4">
                  <p className="text-xs text-slate-500 leading-relaxed">
                    Siap untuk menyelesaikan giliran kerja kasir Anda? Lakukan audit fisik laci kasir dan buat laporan rekonsiliasi kas secara final.
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setIsClosingNow(true);
                      setActualCashInput('');
                    }}
                    className="w-full py-3 bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold uppercase tracking-wider text-xs transition-all active:scale-95 shadow-sm"
                  >
                    Tutup Shift &amp; Keluar Laci
                  </button>
                </div>
              ) : (
                <form onSubmit={handleEndShift} className="space-y-4">
                  <div>
                    <label className="block text-xs font-black uppercase text-slate-500 mb-1.5">
                      Uang Fisik Kas Laci (Aktual)
                    </label>
                    <div className="relative">
                      <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-black text-slate-400">Rp</span>
                      <input
                        type="number"
                        min="0"
                        step="500"
                        required
                        placeholder="Masukkan total uang cash di laci"
                        value={actualCashInput}
                        onChange={(e) => setActualCashInput(e.target.value)}
                        className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-slate-205 dark:border-slate-800 dark:bg-slate-900 font-black text-slate-800 dark:text-slate-100"
                      />
                    </div>
                  </div>

                  {/* Summary Comparison on the Fly */}
                  {actualCashInput && (
                    <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800 space-y-1.5 text-xs animate-fade-in animate-duration-150">
                      <div className="flex justify-between">
                        <span>Estimasi Laci Aplikasi:</span>
                        <span className="font-extrabold text-red-600">{formatCurrency(activeShift.expectedCash)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Fisik Laci Anda:</span>
                        <span className="font-extrabold text-amber-600">{formatCurrency(parseFloat(actualCashInput) || 0)}</span>
                      </div>
                      
                      <div className="border-t border-slate-200 dark:border-slate-800 my-1 pt-1.5 flex justify-between items-center font-black">
                        <span>Selisih Rekonsiliasi:</span>
                        {(() => {
                          const val = (parseFloat(actualCashInput) || 0) - activeShift.expectedCash;
                          if (val === 0) return <span className="text-green-600 font-extrabold">Rp 0 (SINKRON/PAS)</span>;
                          if (val > 0) return <span className="text-indigo-600 font-extrabold">Overplus (+{formatCurrency(val)})</span>;
                          return <span className="text-red-600 font-extrabold flex items-center gap-1"><AlertCircle className="w-3.5 h-3.5" /> Defisit ({formatCurrency(val)})</span>;
                        })()}
                      </div>
                    </div>
                  )}

                  <div>
                    <label className="block text-xs font-black uppercase text-slate-500 mb-1.5">
                      Catatan Audit / Selisih (Opsional)
                    </label>
                    <textarea
                      placeholder="Contoh: Selisih Rp5.000 karena uang kembalian permen / uang fisik lecek tidak diterima."
                      value={closingNotes}
                      onChange={(e) => setClosingNotes(e.target.value)}
                      rows={3}
                      className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-800 dark:bg-slate-900 focus:ring-2 focus:ring-red-500 text-slate-800 dark:text-slate-100"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setIsClosingNow(false)}
                      className="py-2.5 bg-slate-100 hover:bg-slate-205 dark:bg-slate-800 text-slate-750 dark:text-slate-250 font-bold rounded-xl text-xs uppercase"
                    >
                      Batal
                    </button>
                    <button
                      type="submit"
                      className="py-2.5 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl text-xs uppercase tracking-wider"
                    >
                      Kunci &amp; Selesai
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      )}

      {/* SHIFT HISTORY REPORTS SECTION */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6 border-b border-slate-100 dark:border-slate-800 pb-4">
          <div>
            <h3 className="text-md font-black text-slate-900 dark:text-slate-100 uppercase tracking-widest flex items-center gap-2">
              <FileText className="w-5 h-5 text-indigo-500" />
              Arsip &amp; Riwayat Tutup Kasir (Audit Shift)
            </h3>
            <p className="text-xs text-slate-450 font-semibold mt-0.5">
              Seluruh riwayat selisih kasier, modal kas awal, dan tutup buku terekam secara kronologis.
            </p>
          </div>

          <div className="relative group w-full md:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-red-500 transition-colors" />
            <input
              type="text"
              placeholder="Cari nama kasir..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-slate-800 dark:bg-slate-900 focus:ring-1 focus:ring-red-500 focus:border-red-500"
            />
          </div>
        </div>

        {filteredHistory.length === 0 ? (
          <div className="text-center py-10">
            <List className="w-10 h-10 text-slate-300 mx-auto mb-2" />
            <p className="text-sm font-bold text-slate-400">Belum ada riwayat shift tertutup.</p>
            <p className="text-xs text-slate-450 mt-1">Lakukan penutupan shift kasir pertama kali untuk melihat laporan arsip lengkap.</p>
          </div>
        ) : (
          <div className="overflow-x-auto relative">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 dark:border-slate-800 text-[10px] font-black uppercase tracking-wider text-slate-400">
                  <th className="py-3 px-4">Kasir Bertugas</th>
                  <th className="py-3 px-4">Waktu Kerja</th>
                  <th className="py-3 px-4 text-right">Modal Awal</th>
                  <th className="py-3 px-4 text-right">Tunai Masuk</th>
                  <th className="py-3 px-4 text-right">Estimasi Laci</th>
                  <th className="py-3 px-4 text-right">Kas Fisik</th>
                  <th className="py-3 px-4 text-center">Selisih (Rekonsii)</th>
                  <th className="py-3 px-4 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 dark:divide-slate-800/50 text-xs">
                {filteredHistory.map((sh) => {
                  const diff = sh.difference || 0;
                  return (
                    <tr key={sh.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/10 transition-colors">
                      <td className="py-3.5 px-4 font-extrabold text-slate-800 dark:text-slate-150">
                        {sh.staffName}
                      </td>
                      <td className="py-3.5 px-4 text-slate-500">
                        <div className="leading-tight">
                          <span className="block font-medium">{formatDate(sh.startedAt)} s/d</span>
                          <span className="block text-[10px] text-slate-400 font-bold mt-0.5">
                            {sh.endedAt ? formatDate(sh.endedAt) : '-'}
                          </span>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-right font-semibold text-slate-600 dark:text-slate-300">
                        {formatCurrency(sh.initialCash)}
                      </td>
                      <td className="py-3.5 px-4 text-right font-semibold text-slate-600 dark:text-slate-300">
                        {formatCurrency(sh.totalCashTransactions)}
                      </td>
                      <td className="py-3.5 px-4 text-right font-semibold text-blue-600 dark:text-blue-400">
                        {formatCurrency(sh.expectedCash)}
                      </td>
                      <td className="py-3.5 px-4 text-right font-black text-slate-805 dark:text-slate-200">
                        {sh.actualCash !== undefined ? formatCurrency(sh.actualCash) : '-'}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <span className={`inline-flex px-2 py-1 rounded-lg text-[10px] font-black tracking-wide border uppercase ${
                          diff === 0 
                            ? 'bg-green-50 text-green-700 border-green-200' 
                            : diff > 0 
                              ? 'bg-indigo-50 text-indigo-700 border-indigo-200'
                              : 'bg-red-50 text-red-700 border-red-200'
                        }`}>
                          {diff === 0 
                            ? 'SINKRON (PAS)' 
                            : diff > 0 
                              ? `SURPLUS (+${diff})`
                              : `MINUS (${diff})`
                          }
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex gap-1.5 justify-end">
                          <button
                            onClick={() => handlePrintReport(sh)}
                            title="Cetak Kertas Laporan Penutupan"
                            className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-205 dark:bg-slate-800 text-slate-600 hover:dark:bg-slate-705 dark:text-slate-300 transition-all flex items-center justify-center"
                          >
                            <Printer className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

    </div>
  );
}
