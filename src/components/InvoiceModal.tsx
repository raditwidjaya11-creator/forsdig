import React from 'react';
import { motion } from 'motion/react';
import { X, Printer, Download, Share2, Mail, Phone, MapPin } from 'lucide-react';
import { Transaction, StoreSettings } from '../types';
import { formatCurrency } from '../lib/utils';
import { format } from 'date-fns';

interface InvoiceModalProps {
  transaction: Transaction;
  storeSettings: StoreSettings;
  customer?: {
    name: string;
    address?: string;
    phone?: string;
    email?: string;
    type?: string;
  };
  onClose: () => void;
}

export default function InvoiceModal({ transaction, storeSettings, customer, onClose }: InvoiceModalProps) {
  const handlePrint = () => {
    window.print();
  };

  const handleShare = async () => {
    const shareText = `Invoice ${transaction.id}\nTotal: ${formatCurrency(transaction.total)}\nStatus: ${transaction.status}\n\nTerima kasih telah berbelanja di ${storeSettings.name}`;
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Invoice ${transaction.id}`,
          text: shareText,
          url: window.location.href,
        });
      } catch (err) {
        console.log('Error sharing:', err);
      }
    } else {
      // Fallback: Copy to clipboard
      try {
        await navigator.clipboard.writeText(shareText);
        alert('Invoice info copied to clipboard!');
      } catch (err) {
        console.error('Failed to copy text: ', err);
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-0 sm:p-4 overflow-hidden">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="absolute inset-0 bg-slate-900/80 backdrop-blur-sm print:hidden"
        onClick={onClose}
      />
      
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="relative w-full max-w-5xl h-full sm:h-[95vh] bg-slate-100 sm:rounded-3xl shadow-2xl overflow-hidden flex flex-col md:flex-row print:bg-white print:shadow-none print:max-w-none print:w-auto"
      >
        <style>
          {`
            @media print {
              @page {
                size: A4;
                margin: 0;
              }
              body {
                background: white;
                margin: 0;
                padding: 0;
              }
              .print-hidden {
                display: none !important;
              }
              .invoice-container {
                width: 210mm !important;
                height: 297mm !important;
                padding: 20mm !important;
                box-shadow: none !important;
                background: white !important;
                margin: 0 !important;
                overflow: hidden;
              }
              .custom-scrollbar {
                overflow: visible !important;
              }
            }
          `}
        </style>

        {/* Left Side: Preview area */}
        <div className="flex-1 bg-slate-200/50 p-4 sm:p-8 overflow-y-auto custom-scrollbar flex flex-col items-center print:bg-white print:p-0 print:overflow-visible">
          <div className="invoice-container bg-white shadow-2xl p-8 sm:p-16 print:shadow-none print:p-12 mb-8 transition-all duration-300 w-full max-w-[210mm] min-h-[297mm] flex flex-col">
            {/* Header */}
            <div className="flex justify-between items-start mb-12">
              <div>
                {storeSettings.logo ? (
                  <img src={storeSettings.logo} alt="Logo" className="h-16 w-auto mb-4 object-contain" />
                ) : (
                  <div className="h-16 w-16 bg-slate-900 rounded-2xl flex items-center justify-center text-white font-black text-2xl mb-4">
                    {storeSettings.name.charAt(0)}
                  </div>
                )}
                <h1 className="text-3xl font-black text-slate-900 uppercase tracking-tighter mb-2">INVOICE</h1>
                <p className="text-slate-500 font-bold text-xs uppercase tracking-widest">#{transaction.id.slice(-12).toUpperCase()}</p>
              </div>
              <div className="text-right space-y-1">
                <h2 className="font-black text-xl text-slate-900 uppercase">{storeSettings.name}</h2>
                <div className="flex items-center justify-end gap-2 text-slate-500 text-sm font-medium">
                  <MapPin size={14} />
                  <span>{storeSettings.address}</span>
                </div>
                <div className="flex items-center justify-end gap-2 text-slate-500 text-sm font-medium">
                  <Phone size={14} />
                  <span>{storeSettings.phone}</span>
                </div>
                <div className="flex items-center justify-end gap-2 text-slate-500 text-sm font-medium">
                  <Mail size={14} />
                  <span>{storeSettings.email}</span>
                </div>
              </div>
            </div>

            {/* Bill To & Details */}
            <div className="grid grid-cols-2 gap-12 mb-12 pt-8 border-t border-slate-100">
              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">
                  {customer?.type === 'Supplier' ? 'Ditagihkan Oleh' : 'Ditagihkan Kepada'}
                </p>
                <div className="space-y-1">
                  <p className="font-black text-slate-900">{customer?.name || 'Pelanggan Umum'}</p>
                  {customer?.address && <p className="text-slate-500 text-xs">{customer.address}</p>}
                  {customer?.phone && <p className="text-slate-500 text-xs">{customer.phone}</p>}
                  <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest mt-2">{transaction.paymentMethod} / {transaction.status === 'success' ? 'Selesai' : 'Tertunda'}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Detail Invoice</p>
                <div className="space-y-1">
                  <div className="flex justify-end gap-4 text-sm">
                    <span className="text-slate-400 font-bold uppercase text-[10px]">Tanggal Terbit:</span>
                    <span className="font-bold text-slate-900">{format(transaction.timestamp, 'dd MMMM yyyy')}</span>
                  </div>
                  <div className="flex justify-end gap-4 text-sm">
                    <span className="text-slate-400 font-bold uppercase text-[10px]">Metode Bayar:</span>
                    <span className="font-bold text-slate-900">{transaction.paymentMethod}</span>
                  </div>
                  <div className="flex justify-end gap-4 text-sm">
                    <span className="text-slate-400 font-bold uppercase text-[10px]">Status:</span>
                    <span className={`font-black uppercase text-[10px] px-2 py-0.5 rounded-full ${transaction.status === 'success' ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-600'}`}>
                      {transaction.status}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Items Table */}
            <div className="flex-1">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b-2 border-slate-900">
                    <th className="py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Deskripsi Produk</th>
                    <th className="py-4 px-4 text-right text-[10px] font-black text-slate-400 uppercase tracking-widest">Harga</th>
                    <th className="py-4 px-4 text-center text-[10px] font-black text-slate-400 uppercase tracking-widest">Jumlah</th>
                    <th className="py-4 text-right text-[10px] font-black text-slate-400 uppercase tracking-widest">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {transaction.items.map((item, idx) => (
                    <tr key={idx} className="group">
                      <td className="py-5">
                        <p className="font-black text-slate-900 uppercase text-sm mb-1">{item.name}</p>
                        <p className="text-xs text-slate-400 font-medium">SKU: {item.sku || 'N/A'}</p>
                      </td>
                      <td className="py-5 px-4 text-right font-medium text-slate-900 text-sm">
                        {formatCurrency(item.price)}
                      </td>
                      <td className="py-5 px-4 text-center">
                        <span className="bg-slate-50 px-3 py-1 rounded-lg font-black text-slate-900 text-xs">
                          {item.quantity}
                        </span>
                      </td>
                      <td className="py-5 text-right font-black text-slate-900 text-sm">
                        {formatCurrency(item.price * item.quantity)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Summary */}
            <div className="mt-12 pt-8 border-t-2 border-slate-900">
              <div className="flex justify-end">
                <div className="w-full max-w-[300px] space-y-3">
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-slate-400 font-bold uppercase text-[10px]">Subtotal:</span>
                    <span className="font-bold text-slate-900">{formatCurrency(transaction.subtotal)}</span>
                  </div>
                  {transaction.discount && transaction.discount > 0 && (
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-orange-600 font-bold uppercase text-[10px]">DISKON:</span>
                      <span className="font-bold text-orange-600">-{formatCurrency(transaction.discount)}</span>
                    </div>
                  )}
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-slate-400 font-bold uppercase text-[10px]">Pajak ({storeSettings.taxRate}%):</span>
                    <span className="font-bold text-slate-900">{formatCurrency(transaction.tax)}</span>
                  </div>
                  {transaction.adminFee && (
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-slate-400 font-bold uppercase text-[10px]">Biaya Admin:</span>
                      <span className="font-bold text-slate-900">{formatCurrency(transaction.adminFee)}</span>
                    </div>
                  )}
                  <div className="flex justify-between items-center py-4 border-y border-slate-100">
                    <span className="text-slate-900 font-black uppercase text-xs tracking-widest">Total Tagihan:</span>
                    <span className="text-2xl font-black text-red-600 italic">
                      {formatCurrency(transaction.total)}
                    </span>
                  </div>
                  <div className="space-y-2 pt-2">
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-slate-400 font-medium">Dibayar:</span>
                      <span className="font-bold text-slate-900">{formatCurrency(transaction.amountPaid)}</span>
                    </div>
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-slate-400 font-medium">Kembalian:</span>
                      <span className="font-black text-green-600">{formatCurrency(transaction.change)}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="mt-12 text-center">
              <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2">Terima Kasih</p>
                <p className="text-xs font-bold text-slate-600 leading-relaxed italic">{storeSettings.footerMessage}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Right Side: Controls */}
        <div className="w-full md:w-[320px] bg-white border-l border-slate-200 flex flex-col print:hidden">
          <div className="p-6 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h3 className="font-black text-slate-800 uppercase tracking-widest text-sm">Invoice PDF</h3>
              <p className="text-[10px] text-slate-400 font-bold uppercase">Format A4 Standard</p>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-slate-100 rounded-full transition-colors"
            >
              <X className="w-5 h-5 text-slate-400" />
            </button>
          </div>

          <div className="flex-1 p-6 space-y-6">
            <div className="space-y-4">
              <button
                onClick={handlePrint}
                className="w-full flex items-center gap-4 p-4 rounded-2x bg-slate-900 text-white hover:bg-slate-800 transition-all shadow-xl shadow-slate-300/50"
              >
                <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center">
                  <Printer size={20} />
                </div>
                <div className="text-left">
                  <p className="text-xs font-black uppercase tracking-widest">Cetak / Simpan PDF</p>
                  <p className="text-[9px] font-bold text-slate-400 uppercase">Gunakan Ukuran Kertas A4</p>
                </div>
              </button>

              <button
                onClick={handleShare}
                className="w-full flex items-center gap-4 p-4 rounded-2xl border-2 border-slate-100 hover:border-blue-500 hover:bg-blue-50 transition-all font-bold text-slate-800"
              >
                <div className="w-10 h-10 bg-blue-100 text-blue-600 rounded-xl flex items-center justify-center group-hover:bg-blue-600 group-hover:text-white transition-colors">
                  <Share2 size={20} />
                </div>
                <div className="text-left">
                  <p className="text-xs font-black uppercase tracking-widest">Bagikan Invoice</p>
                  <p className="text-[9px] font-bold text-slate-400 uppercase">WhatsApp / Email / Lainnya</p>
                </div>
              </button>
            </div>

            <div className="bg-blue-50 p-4 rounded-2xl border border-blue-100">
               <p className="text-[9px] font-bold text-blue-600 uppercase leading-relaxed text-center">
                * Gunakan fitur "Save as PDF" pada dialog printer browser untuk menyimpan invoice ke penyimpanan lokal.
              </p>
            </div>
          </div>

          <div className="p-6 bg-slate-50 border-t border-slate-100">
            <button
              onClick={onClose}
              className="w-full py-4 bg-white text-slate-600 border border-slate-200 rounded-2xl font-black text-xs uppercase tracking-[0.2em] hover:bg-slate-50 transition-all"
            >
              Kembali
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
