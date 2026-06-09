import { motion } from 'motion/react';
import { ShoppingBag, Printer, Download, X, Bluetooth, Check } from 'lucide-react';
import { Transaction, StoreSettings } from '../types';
import { formatCurrency } from '../lib/utils';
import { format } from 'date-fns';
import { printerService } from '../lib/printerService';
import React, { useState } from 'react';

interface ReceiptModalProps {
  transaction: Transaction;
  storeSettings: StoreSettings;
  onClose: () => void;
  onViewInvoice?: (t: Transaction) => void;
}

export default function ReceiptModal({ transaction, storeSettings, onClose, onViewInvoice }: ReceiptModalProps) {
  const [printStatus, setPrintStatus] = useState<'idle' | 'printing' | 'success' | 'error'>('idle');
  const [paperSize, setPaperSize] = useState<'48' | '58' | '80'>('58');

  const handlePrint = () => {
    window.print();
  };

  React.useEffect(() => {
    const handleAfterPrint = () => {
      // Optional: Auto-close or just ensure UI is responsive
      console.log('Print dialog closed');
    };
    window.addEventListener('afterprint', handleAfterPrint);
    return () => window.removeEventListener('afterprint', handleAfterPrint);
  }, []);

  const handleBluetoothPrint = async () => {
    setPrintStatus('printing');
    try {
      await printerService.printReceipt(transaction, storeSettings, paperSize);
      setPrintStatus('success');
      setTimeout(() => setPrintStatus('idle'), 3000);
    } catch (error) {
      console.error(error);
      setPrintStatus('error');
      setTimeout(() => setPrintStatus('idle'), 3000);
    }
  };

  const handleDownload = () => {
    const receiptText = `
=== ${(storeSettings?.name || 'Toko').toUpperCase()} ===
${storeSettings?.address || '-'}
Tlp: ${storeSettings?.phone || '-'}
========================
No: ${transaction.id}
Tgl: ${format(transaction.timestamp, 'dd/MM/yyyy HH:mm')}
Kasir: ${transaction.paymentDetails?.cashierName || '-'}
========================
${transaction.items.map(item => `${item.name.padEnd(15)} x${item.quantity} ${formatCurrency(item.price * item.quantity)}`).join('\n')}
========================
Subtotal:   ${formatCurrency(transaction.subtotal)}
${transaction.discount ? `Diskon:     -${formatCurrency(transaction.discount)}\n` : ''}Pajak (${storeSettings?.taxRate || 0}%): ${formatCurrency(transaction.tax)}
Total:      ${formatCurrency(transaction.total)}
Metode:     ${transaction.paymentMethod}${transaction.paymentDetails?.qrName ? ` (${transaction.paymentDetails.qrName})` : ''}
Bayar:      ${formatCurrency(transaction.amountPaid)}
Kembalian:  ${formatCurrency(transaction.change)}
========================
    ${storeSettings?.footerMessage || '-'}
    `;
    
    const element = document.createElement("a");
    const file = new Blob([receiptText], {type: 'text/plain'});
    element.href = URL.createObjectURL(file);
    element.download = `struk-${transaction.id}.txt`;
    document.body.appendChild(element);
    element.click();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 print:p-0 print:static">
      <style>
        {`
          @media print {
            @page {
              size: ${paperSize}mm auto;
              margin: 0;
            }
            body {
              width: ${paperSize}mm;
              margin: 0;
              padding: 0;
              background-color: white !important;
            }
            .print-hidden {
              display: none !important;
            }
            .receipt-container {
              width: ${paperSize}mm !important;
              padding: 4mm !important;
              box-shadow: none !important;
              border: none !important;
              margin: 0 !important;
              background-color: white !important;
            }
            .tear-edge {
              display: none !important;
            }
          }
          .tear-edge {
            background-image: 
              linear-gradient(135deg, white 25%, transparent 25%),
              linear-gradient(225deg, white 25%, transparent 25%);
            background-position: 0 0;
            background-size: 8px 8px;
            background-repeat: repeat-x;
            height: 8px;
            width: 100%;
            filter: drop-shadow(0 4px 6px rgba(0,0,0,0.05));
          }
          .custom-scrollbar::-webkit-scrollbar {
            width: 4px;
          }
          .custom-scrollbar::-webkit-scrollbar-track {
            background: transparent;
          }
          .custom-scrollbar::-webkit-scrollbar-thumb {
            background: #cbd5e1;
            border-radius: 10px;
          }
        `}
      </style>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm print:hidden"
        onClick={onClose}
      />
      
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative w-full max-w-4xl flex flex-col md:flex-row bg-slate-100 rounded-3xl shadow-2xl overflow-hidden print:bg-white print:shadow-none print:max-w-none print:w-auto"
      >
        {/* Left Side: Receipt Preview */}
        <div className="flex-1 bg-slate-800/5 p-4 md:p-8 overflow-y-auto max-h-[70vh] md:max-h-[90vh] flex flex-col items-center custom-scrollbar print:p-0 print:bg-white print:max-h-none">
          <div className="print:hidden mb-6 flex bg-white/50 backdrop-blur-sm p-1 rounded-xl border border-slate-200">
            <button 
              onClick={() => setPaperSize('48')}
              className={`px-4 py-1.5 rounded-lg text-xs font-black uppercase tracking-widest transition-all ${paperSize === '48' ? 'bg-red-600 text-white shadow-lg' : 'text-slate-400 hover:text-slate-600'}`}
            >
              48mm
            </button>
            <button 
              onClick={() => setPaperSize('58')}
              className={`px-4 py-1.5 rounded-lg text-xs font-black uppercase tracking-widest transition-all ${paperSize === '58' ? 'bg-red-600 text-white shadow-lg' : 'text-slate-400 hover:text-slate-600'}`}
            >
              58mm
            </button>
            <button 
              onClick={() => setPaperSize('80')}
              className={`px-4 py-1.5 rounded-lg text-xs font-black uppercase tracking-widest transition-all ${paperSize === '80' ? 'bg-red-600 text-white shadow-lg' : 'text-slate-400 hover:text-slate-600'}`}
            >
              80mm
            </button>
          </div>

          <div 
            className={`receipt-container bg-white shadow-2xl flex flex-col print:shadow-none transition-all duration-300 relative`}
            style={{ 
              width: paperSize === '48' ? '182px' : 
                     paperSize === '58' ? '220px' : 
                     '302px' 
            }}
          >
            <div 
              className={`flex-1 pb-2 print:p-0 print:overflow-visible font-mono ${
                paperSize === '48' ? 'p-2 text-[10px]' :
                paperSize === '58' ? 'p-3 text-[10.5px]' :
                'p-5 md:p-6 text-[11.5px]'
              }`}
            >
          <div className="text-center space-y-1 mb-4 sm:mb-6">
            {storeSettings?.logo && (
              <div className="flex justify-center mb-3">
                <img src={storeSettings.logo} alt="Logo" className="h-10 w-auto object-contain" />
              </div>
            )}
            <h1 className="text-sm font-black uppercase tracking-widest text-slate-900">{storeSettings?.name || 'ForsDig POS'}</h1>
            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-tight leading-tight">{storeSettings?.address || '-'}</p>
            <div className="flex flex-col items-center gap-0.5">
              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-tight">Tlp: {storeSettings?.phone || '-'}</p>
              {storeSettings?.email && (
                <p className="text-[10px] text-slate-500 font-bold lowercase tracking-tight">{storeSettings.email}</p>
              )}
            </div>
            <div className="flex flex-col items-center gap-1 py-3 border-y border-dashed border-slate-200 text-[10px] text-slate-500 mt-3">
              <div className="flex items-center gap-2 flex-wrap justify-center">
                <span className={`px-2 py-0.5 rounded-full font-black uppercase text-[8px] ${
                  transaction.status === 'success' ? 'bg-green-100 text-green-700' :
                  transaction.status === 'pending' ? 'bg-amber-100 text-amber-700' :
                  'bg-red-100 text-red-700'
                }`}>
                  {transaction.status}
                </span>
                <span className="text-slate-300">|</span>
                <span className="font-bold">{transaction.id.slice(-8)}</span>
                <span className="text-slate-300">|</span>
                <span>{format(transaction.timestamp, 'dd/MM/yy HH:mm')}</span>
              </div>
              <div className="uppercase font-bold">Kasir: {transaction.paymentDetails?.cashierName || '-'}</div>
            </div>
          </div>

          <div className="space-y-3 mb-4 sm:mb-6 text-slate-900">
            {transaction.items.map((item) => (
              <div key={item.id} className="flex justify-between gap-1 items-start">
                <div className="flex-1 min-w-0">
                  <div className="font-bold uppercase leading-tight line-clamp-2 break-words">{item.name}</div>
                  <div className="text-[9.5px] text-slate-500 mt-0.5 whitespace-nowrap">
                    {item.quantity} x {formatCurrency(item.price)}
                  </div>
                </div>
                <div className="font-black whitespace-nowrap pt-0.5 pl-1">{formatCurrency(item.price * item.quantity)}</div>
              </div>
            ))}
          </div>

          <div className="border-t border-dashed border-slate-200 pt-3 space-y-1.5">
            <div className="flex justify-between text-slate-600 font-bold">
              <span>SUBTOTAL</span>
              <span>{formatCurrency(transaction.subtotal)}</span>
            </div>
            {transaction.discount && transaction.discount > 0 && (
              <div className="flex justify-between text-orange-600 font-black">
                <span>DISKON</span>
                <span>-{formatCurrency(transaction.discount)}</span>
              </div>
            )}
            <div className="flex justify-between text-slate-600 font-bold">
              <span>PAJAK ({storeSettings?.taxRate || 0}%)</span>
              <span>{formatCurrency(transaction.tax)}</span>
            </div>
            <div className={`flex justify-between font-black pt-3 border-t border-slate-900 text-slate-900 ${
              paperSize === '48' ? 'text-[11px]' : 'text-xs'
            }`}>
              <span className="uppercase tracking-widest">TOTAL</span>
              <span>{formatCurrency(transaction.total)}</span>
            </div>
          </div>

          <div className="mt-4 space-y-1.5 uppercase pt-3 border-t border-dashed border-slate-200">
            <div className="flex justify-between text-slate-900 font-black">
              <span>BAYAR {transaction.paymentMethod}</span>
              <span>{formatCurrency(transaction.amountPaid)}</span>
            </div>
            {transaction.paymentDetails?.qrName && (
              <div className="flex justify-between text-slate-500 font-bold">
                <span>METODE QR</span>
                <span>{transaction.paymentDetails.qrName}</span>
              </div>
            )}
            {transaction.paymentMethod === 'Tunai' && (
              <div className="flex justify-between text-slate-500 font-black pt-1">
                <span>KEMBALI</span>
                <span>{formatCurrency(transaction.change)}</span>
              </div>
            )}
            
            {(transaction.paymentDetails?.pointsRedeemed || transaction.paymentDetails?.pointsEarned) ? (
              <div className={`mt-3 pt-3 border-t border-dashed border-slate-200 text-slate-800 space-y-1 bg-amber-50/40 rounded-xl border border-amber-100 normal-case ${
                paperSize === '48' ? 'p-1.5 text-[9px]' : 'p-2.5 text-[10px]'
              }`}>
                <p className="font-extrabold text-[9px] text-amber-800 tracking-wider uppercase mb-1">LOYALTY POINTS</p>
                {transaction.paymentDetails.pointsRedeemed ? (
                  <div className="flex justify-between items-center gap-1 text-slate-600 font-bold flex-wrap">
                    <span>Poin Ditukar</span>
                    <span className="text-amber-700 font-extrabold text-right">-{transaction.paymentDetails.pointsRedeemed} Poin (-{formatCurrency(transaction.paymentDetails.pointsRedeemedValue || 0)})</span>
                  </div>
                ) : null}
                {transaction.paymentDetails.pointsEarned ? (
                  <div className="flex justify-between items-center gap-1 text-slate-600 font-bold flex-wrap">
                    <span>Poin Didapat</span>
                    <span className="text-emerald-700 font-extrabold text-right">+{transaction.paymentDetails.pointsEarned} Poin</span>
                  </div>
                ) : null}
              </div>
            ) : null}
          </div>

          <div className="mt-6 text-center py-4 border-t border-slate-100">
             <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest leading-relaxed">{storeSettings?.footerMessage || '-'}</p>
          </div>
        </div>
        {/* Tear Edge Simulation */}
        <div className="tear-edge shrink-0 print:hidden" />
      </div>
    </div>

    {/* Right Side: Controls */}
    <div className="w-full md:w-[320px] bg-white border-l border-slate-200 flex flex-col print:hidden max-h-[90vh]">
      <div className="p-4 border-b border-slate-100 flex items-center justify-between">
        <div>
          <h3 className="font-black text-slate-800 uppercase tracking-widest text-sm">Print Control</h3>
          <p className="text-[10px] text-slate-400 font-bold uppercase">Transaction Preview</p>
        </div>
        <button
          onClick={onClose}
          className="p-2 hover:bg-slate-100 rounded-full transition-colors"
        >
          <X className="w-5 h-5 text-slate-400" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {/* Printer Options */}
        <div className="space-y-4">
          <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Metode Cetak</h4>
          
          <button
            onClick={handleBluetoothPrint}
            disabled={printStatus === 'printing'}
            className={`w-full flex items-center gap-4 p-4 rounded-2xl border-2 transition-all group ${
              printStatus === 'success' ? 'border-green-500 bg-green-50' : 
              printStatus === 'error' ? 'border-orange-500 bg-orange-50' :
              'border-slate-100 hover:border-blue-500 hover:bg-blue-50/50'
            }`}
          >
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center transition-colors ${
              printStatus === 'success' ? 'bg-green-500 text-white' : 
              printStatus === 'error' ? 'bg-orange-500 text-white' :
              'bg-blue-100 text-blue-600 group-hover:bg-blue-600 group-hover:text-white'
            }`}>
              {printStatus === 'printing' ? (
                <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: "linear" }}>
                  <Bluetooth className="w-6 h-6" />
                </motion.div>
              ) : printStatus === 'success' ? (
                <Check className="w-6 h-6" />
              ) : (
                <Bluetooth className="w-6 h-6" />
              )}
            </div>
            <div className="text-left">
              <p className={`font-black uppercase text-xs tracking-widest ${printStatus === 'success' ? 'text-green-700' : 'text-slate-800'}`}>
                {printStatus === 'printing' ? 'Menghubungkan...' : 
                 printStatus === 'success' ? 'Cetak Berhasil' :
                 printStatus === 'error' ? 'Cetak Gagal' : 'Cetak Bluetooth'}
              </p>
              <p className="text-[10px] font-bold text-slate-400 uppercase">Thermal Printer {paperSize}mm</p>
            </div>
          </button>

          <button
            onClick={handlePrint}
            className="w-full flex items-center gap-4 p-4 rounded-2xl border-2 border-slate-100 hover:border-red-500 hover:bg-red-50/50 transition-all group"
          >
            <div className="w-12 h-12 bg-red-100 text-red-600 rounded-xl flex items-center justify-center group-hover:bg-red-600 group-hover:text-white transition-colors">
              <Printer className="w-6 h-6" />
            </div>
            <div className="text-left">
              <p className="font-black uppercase text-xs tracking-widest text-slate-800">Browser Print</p>
              <p className="text-[10px] font-bold text-slate-400 uppercase">Standard & USB Printer</p>
            </div>
          </button>

          <button
            onClick={handleDownload}
            className="w-full flex items-center gap-4 p-4 rounded-2xl border-2 border-slate-100 hover:border-slate-800 hover:bg-slate-50 transition-all group"
          >
            <div className="w-12 h-12 bg-slate-100 text-slate-600 rounded-xl flex items-center justify-center group-hover:bg-slate-800 group-hover:text-white transition-colors">
              <Download className="w-6 h-6" />
            </div>
            <div className="text-left">
              <p className="font-black uppercase text-xs tracking-widest text-slate-800">Simpan Struk</p>
              <p className="text-[10px] font-bold text-slate-400 uppercase">Format .TXT / Notepad</p>
            </div>
          </button>

          {onViewInvoice && (
            <button
              onClick={() => onViewInvoice(transaction)}
              className="w-full flex items-center gap-4 p-4 rounded-2xl bg-blue-50 border-2 border-blue-100 hover:border-blue-500 hover:bg-blue-100/50 transition-all group"
            >
              <div className="w-12 h-12 bg-white text-blue-600 rounded-xl flex items-center justify-center group-hover:bg-blue-600 group-hover:text-white transition-colors shadow-sm">
                <ShoppingBag className="w-6 h-6" />
              </div>
              <div className="text-left">
                <p className="font-black uppercase text-xs tracking-widest text-blue-800">Cetak Invoice A4</p>
                <p className="text-[10px] font-bold text-blue-400 uppercase">Format PDF / Share</p>
              </div>
            </button>
          )}
        </div>

        <div className="pt-4 border-t border-slate-100">
          <p className="text-[9px] font-bold text-slate-400 uppercase leading-relaxed text-center italic">
            * Pastikan printer thermal sudah menyala dan terhubung melalui Bluetooth atau USB.
          </p>
        </div>
      </div>

      <div className="p-4 bg-slate-50 border-t border-slate-100">
        <button
          onClick={onClose}
          className="w-full py-4 bg-slate-900 text-white rounded-2xl font-black text-xs uppercase tracking-[0.2em] hover:bg-slate-800 transition-all shadow-lg active:scale-[0.98]"
        >
          Selesai & Baru
        </button>
      </div>
    </div>
      </motion.div>
    </div>
  );
}
