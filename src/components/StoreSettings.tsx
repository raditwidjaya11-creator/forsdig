import React, { useState, useEffect } from 'react';
import { StoreSettings as StoreSettingsType } from '../types';
import { Settings, Save, Store, MapPin, Phone, MessageSquare, Percent, Mail, Image as ImageIcon, X, Bluetooth as BluetoothIcon, QrCode, RefreshCcw, Cloud, Monitor } from 'lucide-react';
import { motion } from 'motion/react';
import CustomerDisplay from './CustomerDisplay';
import { toast } from 'sonner';

interface StoreSettingsProps {
  settings: StoreSettingsType;
  onSave: (settings: StoreSettingsType) => void;
  onOpenQRManager?: () => void;
  isOnline: boolean;
}

export default function StoreSettings({ 
  settings, 
  onSave, 
  onOpenQRManager, 
  isOnline
}: StoreSettingsProps) {
  const [logoPreview, setLogoPreview] = useState<string>(settings?.logo || '');
  const [displayLogoPreview, setDisplayLogoPreview] = useState<string>(settings?.displayConfig?.displayLogo || '');

  const [welcomeText, setWelcomeText] = useState(settings?.displayConfig?.welcomeText || 'Selamat Datang!');
  const [promoTexts, setPromoTexts] = useState(settings?.displayConfig?.promoTexts?.join(', ') || '');

  useEffect(() => {
    if (settings?.displayConfig) {
      setWelcomeText(settings.displayConfig.welcomeText || 'Selamat Datang!');
      setPromoTexts(settings.displayConfig.promoTexts?.join(', ') || '');
    }
  }, [settings]);

  useEffect(() => {
    if (!settings) return;
    const channel = new BroadcastChannel('pos_customer_display');
    channel.postMessage({
      type: 'idle',
      config: {
        welcomeText: welcomeText,
        promoTexts: promoTexts.split(',').map(t => t.trim()).filter(Boolean),
        displayLogo: displayLogoPreview,
      },
      storeName: settings?.name || 'ForsDig POS',
      storeLogo: displayLogoPreview || logoPreview || settings?.logo
    });
    return () => {
      channel.close();
    };
  }, [welcomeText, promoTexts, displayLogoPreview, logoPreview, settings]);

  if (!settings) {
    return (
      <div className="p-8 text-center">
        <RefreshCcw className="w-12 h-12 text-slate-300 animate-spin mx-auto mb-4" />
        <p className="text-slate-500 font-bold uppercase tracking-widest">Memuat Pengaturan...</p>
      </div>
    );
  }

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setLogoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const formData = new FormData(e.target as HTMLFormElement);
    
    const newSettings: StoreSettingsType = {
      id: settings.id,
      name: formData.get('name') as string,
      address: formData.get('address') as string,
      phone: formData.get('phone') as string,
      email: formData.get('email') as string,
      logo: logoPreview || (formData.get('logoUrl') as string) || '',
      footerMessage: formData.get('footerMessage') as string,
      taxRate: Number(formData.get('taxRate')),
      printerServiceUuid: formData.get('printerServiceUuid') as string,
      displayConfig: {
        welcomeText: formData.get('welcomeText') as string,
        promoTexts: (formData.get('promoTexts') as string)?.split(',').map(t => t.trim()).filter(Boolean),
        displayLogo: displayLogoPreview,
      }
    };
    
    onSave(newSettings);
  };

  return (
    <div className="p-4 md:p-8 max-w-4xl mx-auto pb-40 md:pb-12">
      <div className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-2 uppercase tracking-tight">
            <Settings className="w-6 h-6 md:w-8 md:h-8 text-red-600" />
            Pengaturan Toko
          </h1>
          <p className="text-xs md:text-sm text-slate-500 font-medium mt-1">Konfigurasi identitas toko, logo, dan struk pembayaran</p>
        </div>
        
        {onOpenQRManager && (
          <button 
            onClick={onOpenQRManager}
            className="flex items-center justify-center gap-2 px-6 py-3 bg-white border-2 border-red-600 text-red-600 rounded-2xl font-black text-sm hover:bg-red-50 transition-all shadow-lg shadow-red-100 active:scale-95"
          >
            <QrCode size={18} />
            KELOLA QR PEMBAYARAN
          </button>
        )}
      </div>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-[2.5rem] shadow-xl shadow-slate-200/60 border border-slate-100 overflow-hidden flex flex-col"
      >
        <form onSubmit={handleSubmit} className="flex flex-col h-full">
          <div className="flex-1 p-6 md:p-10 space-y-8 custom-scrollbar">
            {!isOnline && (
              <div className="p-4 bg-amber-50 border border-amber-100 rounded-2xl flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0">
                  <Settings className="w-4 h-4 text-amber-600" />
                </div>
                <div>
                  <p className="text-sm font-bold text-amber-900 uppercase tracking-tight">Mode Offline Aktif</p>
                  <p className="text-xs text-amber-700 font-medium">Perubahan Anda akan disimpan ke penyimpanan lokal browser.</p>
                </div>
              </div>
            )}

            <div className="flex flex-col md:flex-row gap-8 items-start">
            {/* Logo Upload Section */}
            <div className="w-full md:w-48 space-y-4">
              <label className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                <ImageIcon size={14} className="text-red-500" />
                Logo Toko
              </label>
              <div className="relative group">
                <div className="w-40 h-40 mx-auto bg-slate-50 rounded-3xl border-2 border-dashed border-slate-200 flex items-center justify-center overflow-hidden relative">
                  {logoPreview ? (
                    <>
                      <img src={logoPreview} alt="Store Logo" className="w-full h-full object-contain p-2" />
                      <button 
                        type="button"
                        onClick={() => setLogoPreview('')}
                        className="absolute top-2 right-2 p-1 bg-white/80 rounded-full text-red-500 opacity-0 group-hover:opacity-100 transition-opacity shadow-sm"
                      >
                        <X size={16} />
                      </button>
                    </>
                  ) : (
                    <Store className="w-12 h-12 text-slate-300" />
                  )}
                </div>
                <input 
                  type="file" 
                  accept="image/*"
                  onChange={handleLogoChange}
                  className="absolute inset-0 opacity-0 cursor-pointer"
                />
              </div>
              <p className="text-[10px] text-center text-slate-400 font-medium font-mono lowercase">Klik untuk upload file</p>
            </div>

            <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-6 w-full">
              {/* Store Name */}
              <div className="space-y-2 col-span-1 md:col-span-2">
                <label className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                  <Store size={14} className="text-red-500" />
                  Nama Toko
                </label>
                <input
                  name="name"
                  defaultValue={settings.name}
                  placeholder="Contoh: Kedai Kopi ABC"
                  required
                  className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-4 focus:ring-red-50 focus:border-red-500 transition-all font-bold text-slate-800"
                />
              </div>

              {/* Email */}
              <div className="space-y-2">
                <label className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                  <Mail size={14} className="text-red-500" />
                  Email
                </label>
                <input
                  name="email"
                  type="email"
                  defaultValue={settings.email}
                  placeholder="kontak@tokosanda.com"
                  className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-4 focus:ring-red-50 focus:border-red-500 transition-all font-bold text-slate-800"
                />
              </div>

              {/* Tax Rate */}
              <div className="space-y-2">
                <label className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2 text-nowrap">
                  <Percent size={14} className="text-red-500" />
                  Pajak (%)
                </label>
                <input
                  name="taxRate"
                  type="number"
                  step="0.1"
                  defaultValue={settings.taxRate}
                  placeholder="11"
                  required
                  className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-4 focus:ring-red-50 focus:border-red-500 transition-all font-bold text-slate-800"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Address */}
            <div className="space-y-2 md:col-span-2">
              <label className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                <MapPin size={14} className="text-red-500" />
                Alamat Lengkap
              </label>
              <textarea
                name="address"
                defaultValue={settings.address}
                placeholder="Jl. Raya Utama No. 123..."
                rows={3}
                required
                className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-4 focus:ring-red-50 focus:border-red-500 transition-all font-bold text-slate-800 resize-none"
              />
            </div>

            {/* Phone */}
            <div className="space-y-2">
              <label className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                <Phone size={14} className="text-red-500" />
                Nomor Telepon
              </label>
              <input
                name="phone"
                defaultValue={settings.phone}
                placeholder="0812-3456-7890"
                required
                className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-4 focus:ring-red-50 focus:border-red-500 transition-all font-bold text-slate-800"
              />
            </div>

            {/* Footer Message */}
            <div className="space-y-2">
              <label className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                <MessageSquare size={14} className="text-red-500" />
                Pesan Struk (Footer)
              </label>
              <input
                name="footerMessage"
                defaultValue={settings.footerMessage}
                placeholder="Terima kasih atas kunjungan Anda!"
                className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-4 focus:ring-red-50 focus:border-red-500 transition-all font-bold text-slate-800"
              />
            </div>

            {/* Printer Service UUID */}
            <div className="space-y-2">
              <label className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                <BluetoothIcon size={14} className="text-red-500" />
                Printer Service UUID (Opsional)
              </label>
              <input
                name="printerServiceUuid"
                defaultValue={settings.printerServiceUuid}
                placeholder="Contoh: 000018f0-0000-1000-..."
                className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-4 focus:ring-red-50 focus:border-red-500 transition-all font-bold text-slate-800"
              />
              <p className="text-[10px] text-slate-400">Kosongkan untuk menggunakan standar (18f0)</p>
            </div>
            </div>

            {/* Display Configuration Section */}
            <div className="pt-8 border-t border-slate-100 space-y-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-red-50 flex items-center justify-center">
                  <Monitor className="w-5 h-5 text-red-600" />
                </div>
                <div>
                  <h3 className="font-black text-slate-800 uppercase tracking-tight">Pengaturan Layar Pelanggan</h3>
                  <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Kustomisasi logo dan teks di display sekunder</p>
                </div>
              </div>

              <div className="flex flex-col md:flex-row gap-8 items-start">
                <div className="w-full md:w-48 space-y-4">
                  <label className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                    <ImageIcon size={14} className="text-red-500" />
                    Logo Display
                  </label>
                  <div className="relative group">
                    <div className="w-40 h-40 mx-auto bg-slate-50 rounded-3xl border-2 border-dashed border-slate-200 flex items-center justify-center overflow-hidden relative transition-all group-hover:border-red-200">
                      {displayLogoPreview ? (
                        <>
                          <img src={displayLogoPreview} alt="Display Logo" className="w-full h-full object-contain p-2" />
                          <button 
                            type="button"
                            onClick={() => setDisplayLogoPreview('')}
                            className="absolute top-2 right-2 p-1.5 bg-white/90 rounded-full text-red-500 shadow-md transform scale-0 group-hover:scale-100 transition-transform"
                          >
                            <X size={14} />
                          </button>
                        </>
                      ) : (
                        <Monitor className="w-12 h-12 text-slate-200" />
                      )}
                    </div>
                    <input 
                      type="file" 
                      accept="image/*"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          const reader = new FileReader();
                          reader.onloadend = () => setDisplayLogoPreview(reader.result as string);
                          reader.readAsDataURL(file);
                        }
                      }}
                      className="absolute inset-0 opacity-0 cursor-pointer"
                    />
                  </div>
                </div>

                <div className="flex-1 grid grid-cols-1 gap-6 w-full">
                  <div className="space-y-2">
                    <label className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                      <MessageSquare size={14} className="text-red-500" />
                      Teks Selamat Datang
                    </label>
                    <input
                      name="welcomeText"
                      value={welcomeText}
                      onChange={(e) => setWelcomeText(e.target.value)}
                      placeholder="Contoh: Selamat Datang di Toko Kami!"
                      className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-4 focus:ring-red-50 focus:border-red-500 transition-all font-bold text-slate-800"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                      <Percent size={14} className="text-red-500" />
                      Teks Promo (Dipisahkan koma)
                    </label>
                    <textarea
                      name="promoTexts"
                      value={promoTexts}
                      onChange={(e) => setPromoTexts(e.target.value)}
                      placeholder="Promo 1, Promo 2..."
                      rows={2}
                      className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-4 focus:ring-red-50 focus:border-red-500 transition-all font-bold text-slate-800 resize-none"
                    />
                  </div>
                </div>
              </div>

              {/* Action Buttons to launch Customer Display */}
              <div className="bg-slate-50 dark:bg-slate-900/40 border border-slate-100 dark:border-slate-800 p-6 rounded-3xl space-y-4">
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div>
                    <h4 className="text-sm font-black text-slate-800 dark:text-slate-200 uppercase tracking-tight">Opsi Aktivasi Display</h4>
                    <p className="text-xs text-slate-500">Gunakan layar sekunder/monitor kedua agar pelanggan dapat memantau pesanan dan melakukan scan QRIS secara real-time.</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      const url = window.location.origin + window.location.pathname + '#/customer-display';
                      const win = window.open(url, '_blank', 'width=1280,height=720,menubar=no,status=no,toolbar=no');
                      if (!win) {
                        toast.warning('Pop-up terblokir! Silakan izinkan pop-up di browser Anda, atau buka link ini secara manual: ' + url, {
                          duration: 8000
                        });
                      } else {
                        toast.success('Layar pelanggan berhasil dibuka di jendela baru!');
                      }
                    }}
                    className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3 bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 rounded-xl font-black text-xs hover:bg-slate-800 dark:hover:bg-white active:scale-95 transition-all shadow-md"
                  >
                    <Monitor size={16} />
                    BUKA MONITOR EKSTERNAL
                  </button>
                </div>

                {/* Live Sandbox Preview Element */}
                <div className="space-y-2 pt-2">
                  <span className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block animate-ping"></span>
                    Live Preview (Simulasi tampilan di monitor pelanggan)
                  </span>
                  <div className="w-full">
                    <CustomerDisplay isEmbed={true} />
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="p-6 md:p-10 border-t border-slate-100 bg-slate-50/50">
            <button
              type="submit"
              className="w-full md:w-auto px-10 py-5 bg-red-600 text-white rounded-[2rem] font-black text-lg hover:bg-red-700 transition-all shadow-2xl shadow-red-200 flex items-center justify-center gap-3 active:scale-[0.98]"
            >
              <Save size={24} />
              SIMPAN PENGATURAN
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}
