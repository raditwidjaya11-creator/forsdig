import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Printer, Download, Copy, Check, Layout, Columns, Grid, Bluetooth } from 'lucide-react';
import Barcode from 'react-barcode';
import { Product, StoreSettings } from '../types';
import { printerService } from '../lib/printerService';

interface BarcodePrintModalProps {
  products: Product[];
  storeSettings: StoreSettings;
  onClose: () => void;
}

export default function BarcodePrintModal({ products, storeSettings, onClose }: BarcodePrintModalProps) {
  const [printStatus, setPrintStatus] = useState<'idle' | 'printing' | 'success' | 'error'>('idle');
  const [layout, setLayout] = useState<'single' | 'grid' | 'label'>('grid');
  const [paperSize, setPaperSize] = useState<'a4' | '50x30' | '40x30' | '30x20'>('a4');
  const [quantity, setQuantity] = useState<number>(1);
  const [showPrice, setShowPrice] = useState(true);
  const [showName, setShowName] = useState(true);

  const handlePrint = () => {
    window.print();
  };

  const handleBluetoothPrint = async () => {
    setPrintStatus('printing');
    try {
      const paperWidth: '48' | '58' | '80' = paperSize === 'a4' ? '58' : paperSize.split('x')[0] as any;
      await printerService.printBarcodes(products, quantity, storeSettings, paperWidth);
      setPrintStatus('success');
      setTimeout(() => setPrintStatus('idle'), 3000);
    } catch (error) {
      console.error(error);
      setPrintStatus('error');
      setTimeout(() => setPrintStatus('idle'), 3000);
    }
  };

  const getBarcodeData = (product: Product) => {
    return product.sku || product.id;
  };

  // Generate an array of items based on quantity
  const printItems = products.flatMap(p => 
    Array(quantity).fill(p)
  );

  const getLabelStyle = () => {
    switch(paperSize) {
      case '50x30': return 'w-[50mm] h-[30mm]';
      case '40x30': return 'w-[40mm] h-[30mm]';
      case '30x20': return 'w-[30mm] h-[20mm]';
      default: return '';
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-0 sm:p-4">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="absolute inset-0 bg-slate-900/80 backdrop-blur-sm print:hidden"
        onClick={onClose}
      />
      
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="relative w-full max-w-5xl h-full sm:h-[90vh] bg-slate-100 sm:rounded-3xl shadow-2xl overflow-hidden flex flex-col md:flex-row print:bg-white print:shadow-none print:max-w-none print:w-auto"
      >
        <style>
          {`
            @media print {
              @page {
                size: ${paperSize === 'a4' ? 'A4' : 'auto'};
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
              .barcode-page {
                display: ${paperSize === 'a4' ? 'grid' : 'block'} !important;
                padding: 0 !important;
                box-shadow: none !important;
                background: white !important;
                width: 100% !important;
              }
              .barcode-item {
                break-inside: avoid;
                page-break-inside: avoid;
                border: none !important;
                margin: 0 !important;
                padding: 2mm !important;
                ${paperSize !== 'a4' ? `width: ${paperSize.split('x')[0]}mm !important; height: ${paperSize.split('x')[1]}mm !important;` : ''}
                display: flex !important;
                flex-direction: column !important;
                align-items: center !important;
                justify-content: center !important;
              }
            }
          `}
        </style>

        {/* Left Side: Preview area */}
        <div className="flex-1 bg-slate-200/50 p-2 sm:p-8 overflow-y-auto custom-scrollbar flex flex-col items-center print:bg-white print:p-0 print:overflow-visible">
          <div className="print:hidden w-full flex flex-col sm:flex-row items-center justify-between gap-4 mb-6">
            <div className="flex bg-white/80 backdrop-blur-sm p-1 rounded-xl border border-slate-300 shadow-sm overflow-x-auto max-w-full">
              {[
                { id: 'a4', label: 'Grid A4' },
                { id: '50x30', label: '50x30mm' },
                { id: '40x30', label: '40x30mm' },
                { id: '30x20', label: '30x20mm' }
              ].map(size => (
                <button 
                  key={size.id}
                  onClick={() => {
                    setPaperSize(size.id as any);
                    setLayout(size.id === 'a4' ? 'grid' : 'single');
                  }}
                  className={`whitespace-nowrap px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${paperSize === size.id ? 'bg-slate-900 text-white shadow-md' : 'text-slate-500 hover:text-slate-700'}`}
                >
                  {size.label}
                </button>
              ))}
            </div>
            
            <button
               onClick={handlePrint}
               className="sm:hidden w-full py-4 bg-slate-900 text-white rounded-2xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2"
            >
               <Printer size={16} /> CETAK SEKARANG
            </button>
          </div>

          <div 
            className={`barcode-page bg-white shadow-xl p-4 sm:p-8 print:shadow-none print:p-0 transition-all duration-300 ${
              paperSize === 'a4' 
                ? 'grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 print:grid-cols-4 w-full max-w-[210mm]' 
                : 'flex flex-col gap-4 items-center bg-slate-50'
            }`}
          >
            {printItems.map((product, idx) => (
              <div 
                key={`${product.id}-${idx}`} 
                className={`barcode-item flex flex-col items-center justify-center p-3 sm:p-4 border border-slate-100 rounded-xl bg-white print:bg-white print:border-none ${getLabelStyle()}`}
              >
                {showName && (
                  <p className="text-[9px] font-black text-slate-800 uppercase tracking-tight mb-1 text-center line-clamp-1 w-full overflow-hidden">
                    {product.name}
                  </p>
                )}
                <div className="flex justify-center w-full overflow-hidden scale-90 sm:scale-100">
                  <Barcode 
                    value={getBarcodeData(product)} 
                    width={paperSize === '30x20' ? 0.8 : 1.2}
                    height={paperSize === '30x20' ? 30 : 45}
                    fontSize={paperSize === '30x20' ? 8 : 10}
                    margin={0}
                    displayValue={true}
                  />
                </div>
                {showPrice && (
                  <p className="text-[11px] font-black text-red-600 mt-1">
                    Rp {product.price.toLocaleString('id-ID')}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Right Side: Print Control (Mobile Friendly) */}
        <div className="w-full md:w-[320px] bg-white border-l border-slate-200 flex flex-col print:hidden shrink-0 h-auto md:h-full">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h3 className="font-black text-slate-800 uppercase tracking-widest text-sm">Label Barcode</h3>
              <p className="text-[10px] text-slate-400 font-bold uppercase">{products.length} Produk • {printItems.length} Total</p>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-slate-100 rounded-full transition-colors"
            >
              <X className="w-5 h-5 text-slate-400" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-6 sm:space-y-8 custom-scrollbar">
            {/* Options */}
            <div className="space-y-6">
              <div className="space-y-3">
                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Jumlah Label per Produk</h4>
                <div className="flex items-center gap-3">
                  <button 
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center font-black text-slate-600 hover:bg-slate-200 transition-colors"
                  >
                    -
                  </button>
                  <input 
                    type="number"
                    value={quantity}
                    onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                    className="flex-1 h-10 bg-slate-50 border border-slate-200 rounded-xl text-center font-black text-slate-800 focus:ring-2 focus:ring-slate-900 focus:outline-none"
                  />
                  <button 
                    onClick={() => setQuantity(quantity + 1)}
                    className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center font-black text-slate-600 hover:bg-slate-200 transition-colors"
                  >
                    +
                  </button>
                </div>
              </div>

              <div className="space-y-4">
                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Visual Label</h4>
                
                <div className="grid grid-cols-2 gap-3">
                  <button 
                    onClick={() => setShowName(!showName)}
                    className={`flex flex-col items-center gap-2 p-3 rounded-2xl border-2 transition-all ${showName ? 'border-slate-900 bg-slate-900 text-white' : 'border-slate-100 text-slate-400 opacity-60'}`}
                  >
                    <Layout size={18} />
                    <span className="text-[9px] font-black uppercase">Nama</span>
                  </button>
                  <button 
                    onClick={() => setShowPrice(!showPrice)}
                    className={`flex flex-col items-center gap-2 p-3 rounded-2xl border-2 transition-all ${showPrice ? 'border-red-600 bg-red-600 text-white' : 'border-slate-100 text-slate-400 opacity-60'}`}
                  >
                    <Check size={18} />
                    <span className="text-[9px] font-black uppercase">Harga</span>
                  </button>
                </div>
              </div>
            </div>

            <div className="pt-6 border-t border-slate-100 flex flex-col gap-3">
              <button
                onClick={handleBluetoothPrint}
                disabled={printStatus === 'printing'}
                className={`w-full flex items-center gap-4 p-4 rounded-2xl border-2 transition-all group ${
                  printStatus === 'success' ? 'border-green-500 bg-green-50' : 
                  printStatus === 'error' ? 'border-orange-500 bg-orange-50' :
                  'border-slate-100 hover:border-blue-500 hover:bg-blue-50/50'
                }`}
              >
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors shrink-0 ${
                  printStatus === 'success' ? 'bg-green-500 text-white' : 
                  printStatus === 'error' ? 'bg-orange-500 text-white' :
                  'bg-blue-100 text-blue-600 group-hover:bg-blue-600 group-hover:text-white'
                }`}>
                  {printStatus === 'printing' ? (
                    <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: "linear" }}>
                      <Bluetooth size={20} />
                    </motion.div>
                  ) : printStatus === 'success' ? (
                    <Check size={20} />
                  ) : (
                    <Bluetooth size={20} />
                  )}
                </div>
                <div className="text-left overflow-hidden">
                  <p className={`text-xs font-black uppercase tracking-widest leading-none mb-1 ${printStatus === 'success' ? 'text-green-700' : 'text-slate-800'}`}>
                    {printStatus === 'printing' ? 'Menghubungkan...' : 
                     printStatus === 'success' ? 'Cetak Berhasil' :
                     printStatus === 'error' ? 'Cetak Gagal' : 'Cetak Bluetooth'}
                  </p>
                  <p className="text-[9px] font-bold text-slate-400 uppercase truncate">Thermal Printer {paperSize !== 'a4' ? paperSize : '58mm'}</p>
                </div>
              </button>

              <button
                onClick={handlePrint}
                className="w-full flex items-center gap-4 p-4 rounded-2xl bg-slate-900 text-white hover:bg-slate-800 transition-all shadow-xl shadow-slate-300/50 active:scale-95"
              >
                <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center shrink-0">
                  <Printer size={20} />
                </div>
                <div className="text-left overflow-hidden">
                  <p className="text-xs font-black uppercase tracking-widest leading-none mb-1">Standard / PDF</p>
                  <p className="text-[9px] font-bold text-slate-400 uppercase truncate">Gunakan Dialog Print</p>
                </div>
              </button>

              <button
                onClick={onClose}
                className="w-full py-4 bg-slate-100 text-slate-600 rounded-2xl font-black text-xs uppercase tracking-[0.2em] hover:bg-slate-200 transition-all md:inline-block hidden"
              >
                Tutup Preview
              </button>
              
              <button
                onClick={onClose}
                className="md:hidden w-full py-4 text-red-600 font-black text-xs uppercase tracking-widest"
              >
                Batalkan
              </button>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
