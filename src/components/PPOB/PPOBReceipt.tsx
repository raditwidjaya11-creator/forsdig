import React, { useRef } from 'react';
import { motion } from 'motion/react';
import { Printer, X, CheckCircle2, Download, Smartphone, Zap, Wallet } from 'lucide-react';
import { PPOBTransaction, StoreSettings } from '../../types';
import { formatCurrency } from '../../lib/utils';
import { format } from 'date-fns';

interface PPOBReceiptProps {
  transaction: PPOBTransaction;
  storeSettings: StoreSettings;
  onClose: () => void;
}

export default function PPOBReceipt({ transaction, storeSettings, onClose }: PPOBReceiptProps) {
  const receiptRef = useRef<HTMLDivElement>(null);

  const handlePrint = () => {
    const printContent = receiptRef.current;
    if (!printContent) return;

    const windowUrl = 'about:blank';
    const uniqueName = new Date().getTime();
    const windowName = 'Print' + uniqueName;
    const printWindow = window.open(windowUrl, windowName, 'left=50000,top=50000,width=0,height=0');
    
    if (printWindow) {
      printWindow.document.write(`
        <html>
          <head>
            <title>Cetak Struk PPOB</title>
            <style>
              @page { size: 58mm auto; margin: 0; }
              body { 
                font-family: 'Courier New', Courier, monospace; 
                width: 58mm; 
                margin: 0; 
                padding: 10px; 
                font-size: 12px; 
                line-height: 1.2;
              }
              .center { text-align: center; }
              .bold { font-weight: bold; }
              .divider { border-top: 1px dashed #000; margin: 5px 0; }
              .flex { display: flex; justify-content: space-between; }
            </style>
          </head>
          <body>${printContent.innerHTML}</body>
        </html>
      `);
      printWindow.document.close();
      printWindow.focus();
      printWindow.print();
      printWindow.close();
    }
  };

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-900/90 backdrop-blur-md">
      <motion.div 
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="bg-white rounded-[2.5rem] w-full max-w-lg overflow-hidden shadow-2xl flex flex-col max-h-[90vh]"
      >
        <div className="p-8 bg-slate-50 border-b border-slate-100 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-green-100 text-green-600 rounded-2xl flex items-center justify-center">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-xl font-black uppercase tracking-tighter">Struk Transaksi</h3>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest leading-none mt-1">Status Berhasil</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full transition-colors">
            <X className="text-slate-400" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-8 bg-slate-50/50">
          <div 
            ref={receiptRef}
            className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100 mx-auto w-[300px] font-mono text-[11px] leading-relaxed"
          >
            <div className="text-center mb-4">
              <div className="font-extrabold text-sm uppercase">{storeSettings.name}</div>
              <div className="text-[9px] text-slate-500">{storeSettings.address}</div>
              <div className="text-[9px] text-slate-500">Telp: {storeSettings.phone}</div>
            </div>

            <div className="border-t border-dashed border-slate-300 my-4" />

            <div className="space-y-1">
              <div className="flex justify-between">
                <span>Waktu:</span>
                <span className="text-right">{format(transaction.timestamp, 'dd/MM/yy HH:mm')}</span>
              </div>
              <div className="flex justify-between">
                <span>No. Ref:</span>
                <span className="text-right">{transaction.reference}</span>
              </div>
            </div>

            <div className="border-t border-dashed border-slate-300 my-4" />

            <div className="space-y-2">
              <div className="font-bold text-center uppercase tracking-wider bg-slate-50 py-2 rounded-xl mb-2">
                {transaction.productName}
              </div>
              <div className="flex justify-between">
                <span>No. Tujuan:</span>
                <span className="font-bold">{transaction.customerNumber}</span>
              </div>
              
              {transaction.sn && (
                <div className="bg-slate-900 text-white p-3 rounded-xl text-center mt-3">
                  <div className="text-[8px] uppercase font-bold opacity-60 mb-1">SN / TOKEN</div>
                  <div className="text-sm font-black tracking-widest">{transaction.sn}</div>
                </div>
              )}
            </div>

            <div className="border-t border-dashed border-slate-300 my-4" />

            <div className="space-y-1">
              <div className="flex justify-between">
                <span>Harga:</span>
                <span>{formatCurrency(transaction.amount + transaction.markup)}</span>
              </div>
              <div className="flex justify-between">
                <span>Biaya Admin:</span>
                <span>{formatCurrency(transaction.adminFee)}</span>
              </div>
              <div className="flex justify-between font-extrabold text-[13px] pt-1">
                <span>TOTAL:</span>
                <span>{formatCurrency(transaction.total)}</span>
              </div>
            </div>

            <div className="border-t border-dashed border-slate-300 my-4" />

            <div className="text-center space-y-1">
              <div className="text-[10px] font-bold uppercase tracking-widest">TERIMA KASIH</div>
              <div className="text-[8px] text-slate-400 capitalize italic">{storeSettings.footerMessage}</div>
              <div className="text-[8px] text-slate-300 font-bold mt-2">www.forsdig.com</div>
            </div>
          </div>
        </div>

        <div className="p-8 bg-white border-t border-slate-100 flex gap-4">
          <button 
            onClick={onClose}
            className="flex-1 py-4 bg-slate-100 text-slate-600 rounded-2xl font-black uppercase tracking-widest hover:bg-slate-200 transition-all text-sm"
          >
            Selesai
          </button>
          <button 
            onClick={handlePrint}
            className="flex-1 py-4 bg-blue-600 text-white rounded-2xl font-black uppercase tracking-widest hover:bg-blue-700 transition-all shadow-xl shadow-blue-100 text-sm flex items-center justify-center gap-2"
          >
            <Printer className="w-5 h-5" />
            Cetak Struk
          </button>
        </div>
      </motion.div>
    </div>
  );
}
