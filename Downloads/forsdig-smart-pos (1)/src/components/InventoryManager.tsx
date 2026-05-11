import React, { useState, useRef, memo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Plus, Edit2, Trash2, Save, X, Search, Package, AlertTriangle, CheckCircle2, XCircle, Upload, Download, FileText, Info, Scan, Printer, Check } from 'lucide-react';
import { Product, StoreSettings, Category } from '../types';
import { formatCurrency } from '../lib/utils';
import { CATEGORIES } from '../constants';
import Papa from 'papaparse';
import BarcodeScanner from './BarcodeScanner';
import BarcodePrintModal from './BarcodePrintModal';
import Barcode from 'react-barcode';

const PRODUCT_UNITS = [
  'unit', 'pcs', 'kg', 'gram', 'liter', 'ml', 'dus', 'box', 'pack', 'lembar', 'ikat', 
  'meter', 'cm', 'lusin', 'botol', 'kaleng', 'karung', 'sak', 'roll', 'pasang', 'set', 'kodi', 'rim', 'buah'
];

interface InventoryManagerProps {
  products: Product[];
  categories: Category[];
  storeSettings: StoreSettings;
  onAdd: (product: Product) => void;
  onUpdate: (product: Product) => void;
  onDelete: (id: string) => void;
  onUpdateCategories: (categories: Category[]) => void;
}

const ProductCard = memo(({ 
  product, 
  selectedForBarcode, 
  onToggleBarcode, 
  onOpenForm, 
  onDelete 
}: { 
  product: Product, 
  selectedForBarcode: Product[], 
  onToggleBarcode: (p: Product) => void, 
  onOpenForm: (p: Product) => void, 
  onDelete: (id: string) => void 
}) => (
  <motion.div
    layout
    initial={{ opacity: 0, scale: 0.9 }}
    animate={{ opacity: 1, scale: 1 }}
    exit={{ opacity: 0, scale: 0.9 }}
    className={`bg-white p-3 sm:p-6 rounded-2xl shadow-sm border border-slate-100 hover:shadow-md transition-all group relative ${!product.isActive ? 'opacity-75 grayscale' : ''}`}
  >
    <div 
      className={`absolute top-2 right-2 sm:top-4 sm:right-4 z-10 w-5 h-5 sm:w-6 sm:h-6 rounded-full border-2 flex items-center justify-center cursor-pointer transition-all ${
        selectedForBarcode.some(p => p.id === product.id) 
          ? 'bg-red-600 border-red-600 text-white' 
          : 'bg-white/80 border-slate-200 text-transparent opacity-0 group-hover:opacity-100'
      }`}
      onClick={(e) => {
        e.stopPropagation();
        onToggleBarcode(product);
      }}
    >
      <Check size={10} className={selectedForBarcode.some(p => p.id === product.id) ? 'opacity-100' : 'opacity-0'} />
    </div>

    <div className="relative aspect-square mb-3 sm:mb-4 overflow-hidden rounded-xl bg-slate-50">
      <img
        src={product.image}
        alt={product.name}
        className="w-full h-full object-cover transition-transform group-hover:scale-110 duration-500"
        loading="lazy"
      />
      <div className="absolute top-1.5 left-1.5 sm:top-2 sm:left-2 flex gap-1">
        <div className="bg-white/90 backdrop-blur-sm px-1.5 py-0.5 sm:px-2 sm:py-1 rounded-lg text-[8px] sm:text-[10px] font-bold uppercase text-red-600 border border-red-100">
          {product.category}
        </div>
      </div>
      {product.sku && (
        <div className="absolute bottom-1.5 left-1.5 sm:bottom-2 sm:left-2 bg-black/50 backdrop-blur-sm px-1.5 py-0.5 sm:px-2 sm:py-1 rounded-lg text-[7px] sm:text-[9px] font-bold text-white uppercase">
          SKU: {product.sku}
        </div>
      )}
    </div>
    
    <div className="space-y-0.5 sm:space-y-1 mb-3 sm:mb-4">
      <h3 className="font-bold text-xs sm:text-lg leading-tight text-slate-800 line-clamp-2 min-h-[2.5rem] sm:min-h-0 uppercase">{product.name}</h3>
      
      <div className="flex flex-col sm:flex-row sm:gap-4">
        <div className="flex flex-col">
          <span className="text-[8px] sm:text-[10px] font-bold text-slate-400 uppercase">Jual</span>
          <p className="text-red-600 font-black text-sm sm:text-base leading-none">{formatCurrency(product.price)}</p>
        </div>
        <div className="hidden sm:flex flex-col opacity-60">
          <span className="text-[10px] font-bold text-slate-400 uppercase">Beli</span>
          <p className="text-slate-600 font-bold text-xs leading-none">{formatCurrency(product.costPrice || 0)}</p>
        </div>
      </div>

      <div className="flex items-center justify-between mt-2 pt-2 sm:mt-3 sm:pt-3 border-t border-slate-50">
        <div className="flex flex-col">
          <span className="text-[8px] sm:text-[10px] font-bold text-slate-400 uppercase">STOK</span>
          <p className={`font-black text-xs sm:text-sm ${product.stock <= (product.minStock || 0) ? 'text-red-600' : 'text-slate-800'}`}>
            {product.stock} <span className="text-[8px] sm:text-[10px] uppercase font-bold text-slate-400">{product.unit}</span>
          </p>
        </div>
        {product.stock <= (product.minStock || 0) && (
          <motion.span 
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            className="inline-flex items-center gap-0.5 sm:gap-1 px-1.5 py-0.5 sm:px-2 sm:py-1 bg-red-50 text-red-600 rounded-lg text-[7px] sm:text-[9px] font-black uppercase tracking-tighter"
          >
            <AlertTriangle size={8} />
            <span className="hidden xs:inline">Stok</span> Menipis
          </motion.span>
        )}
      </div>
    </div>

    <div className="flex gap-1.5 sm:gap-2">
      <button
        onClick={() => onToggleBarcode(product)}
        className="p-2 sm:p-2.5 bg-slate-900 text-white rounded-xl hover:bg-slate-800 transition-colors"
        title="Print Barcode"
      >
        <Printer className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
      </button>
      <button
        onClick={() => onOpenForm(product)}
        className="flex-1 flex items-center justify-center gap-1.5 sm:gap-2 p-2 sm:p-2.5 bg-slate-50 text-slate-700 rounded-xl hover:bg-slate-100 transition-colors text-[10px] sm:text-sm font-bold uppercase tracking-widest"
      >
        <Edit2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
        Edit
      </button>
      <button
        onClick={() => onDelete(product.id)}
        className="p-2 sm:p-2.5 bg-red-50 text-red-600 rounded-xl hover:bg-red-100 transition-colors"
      >
        <Trash2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
      </button>
    </div>
  </motion.div>
));

export default function InventoryManager({ 
  products, 
  categories, 
  storeSettings, 
  onAdd, 
  onUpdate, 
  onDelete,
  onUpdateCategories
}: InventoryManagerProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [selectedUnit, setSelectedUnit] = useState('');
  const [customUnit, setCustomUnit] = useState('');
  const [isCustomUnit, setIsCustomUnit] = useState(false);
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [scannerTarget, setScannerTarget] = useState<'search' | 'sku'>('search');
  const [selectedForBarcode, setSelectedForBarcode] = useState<Product[]>([]);
  const [showBarcodeModal, setShowBarcodeModal] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const skuInputRef = useRef<HTMLInputElement>(null);

  const filteredProducts = products.filter(p => 
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (p.sku && p.sku.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const handleToggleBarcode = React.useCallback((product: Product) => {
    setSelectedForBarcode(prev => {
      if (prev.some(p => p.id === product.id)) {
        return prev.filter(p => p.id !== product.id);
      } else {
        return [...prev, product];
      }
    });
  }, []);

  const handleOpenForm = React.useCallback((product: Product) => {
    openForm(product);
  }, []);

  const handleDelete = React.useCallback((id: string) => {
    onDelete(id);
  }, [onDelete]);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const formData = new FormData(e.target as HTMLFormElement);
    const finalUnit = isCustomUnit ? customUnit : selectedUnit;

    const productData: Product = {
      id: editingProduct?.id || Date.now().toString(),
      sku: formData.get('sku') as string,
      name: formData.get('name') as string,
      price: Number(formData.get('price')),
      costPrice: Number(formData.get('costPrice')),
      category: formData.get('category') as string,
      image: previewImage || (formData.get('image') as string) || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=200&h=200&fit=crop',
      stock: Number(formData.get('stock')),
      minStock: Number(formData.get('minStock')),
      unit: finalUnit,
      description: formData.get('description') as string,
      isActive: formData.get('isActive') === 'on',
    };

    if (editingProduct) {
      onUpdate(productData);
    } else {
      onAdd(productData);
    }
    setEditingProduct(null);
    setIsAdding(false);
    setPreviewImage(null);
    setSelectedUnit('');
    setCustomUnit('');
    setIsCustomUnit(false);
  };

  const handleCsvImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const importedProducts = results.data.map((row: any) => ({
          id: Date.now().toString() + Math.random().toString(36).substring(2, 7),
          sku: row.sku || '',
          name: row.name || 'Produk Tanpa Nama',
          category: row.category || 'Umum',
          price: Number(row.price) || 0,
          costPrice: Number(row.costPrice) || 0,
          stock: Number(row.stock) || 0,
          minStock: Number(row.minStock) || 0,
          unit: row.unit || 'pcs',
          description: row.description || '',
          isActive: row.isActive === 'false' ? false : true,
          image: row.image || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=200&h=200&fit=crop'
        }));

        importedProducts.forEach(p => onAdd(p as Product));
        setShowImportModal(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
      },
      error: (error) => {
        console.error('CSV parse error:', error);
        alert('Gagal memproses file CSV. Pastikan format sudah benar.');
      }
    });
  };

  const downloadCsvTemplate = () => {
    const csvContent = "name,category,sku,costPrice,price,stock,minStock,unit,description,isActive,image\nProduk Contoh,Makanan,SKU-001,10000,15000,100,10,pcs,Deskripsi produk ini,true,https://url-gambar.com/image.jpg";
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", "template_produk.csv");
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleScan = (sku: string) => {
    if (scannerTarget === 'search') {
      setSearchTerm(sku);
    } else if (scannerTarget === 'sku') {
      if (skuInputRef.current) {
        skuInputRef.current.value = sku;
      }
    }
    setIsScannerOpen(false);
  };

  const openForm = (product?: Product) => {
    if (product) {
      setEditingProduct(product);
      setPreviewImage(product.image);
      if (PRODUCT_UNITS.includes(product.unit)) {
        setSelectedUnit(product.unit);
        setIsCustomUnit(false);
      } else {
        setSelectedUnit('custom');
        setCustomUnit(product.unit);
        setIsCustomUnit(true);
      }
    } else {
      setIsAdding(true);
      setPreviewImage(null);
      setSelectedUnit('pcs');
      setIsCustomUnit(false);
    }
  };

  return (
    <div className="p-4 md:p-8 pb-32 md:pb-8">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 md:gap-6 mb-8">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-2">
            <Package className="w-6 h-6 md:w-8 md:h-8 text-red-600" />
            Inventory Produk
          </h1>
          <p className="text-xs md:text-sm text-slate-500 font-medium">Kelola stok dan menu Anda dengan satu sentuhan</p>
        </div>
        <div className="flex flex-wrap gap-3">
          {selectedForBarcode.length > 0 && (
            <button
              onClick={() => setShowBarcodeModal(true)}
              className="flex items-center justify-center gap-2 px-6 py-3 bg-slate-900 text-white rounded-xl font-bold hover:bg-slate-800 transition-all shadow-lg text-sm"
            >
              <Printer className="w-4 h-4" />
              Cetak Barcode ({selectedForBarcode.length})
            </button>
          )}
          <button
            onClick={() => setShowImportModal(true)}
            className="flex items-center justify-center gap-2 px-6 py-3 bg-white border border-slate-200 text-slate-700 rounded-xl font-bold hover:bg-slate-50 transition-all shadow-sm text-sm"
          >
            <Upload className="w-4 h-4" />
            Import CSV
          </button>
          <button
            onClick={() => setShowCategoryModal(true)}
            className="flex items-center justify-center gap-2 px-6 py-3 bg-white border border-slate-200 text-slate-700 rounded-xl font-bold hover:bg-slate-50 transition-all shadow-sm text-sm"
          >
            <Info className="w-4 h-4" />
            Kategori
          </button>
          <button
            onClick={() => openForm()}
            className="flex items-center justify-center gap-2 px-6 py-3 bg-red-600 text-white rounded-xl font-bold hover:bg-red-700 transition-all shadow-lg shadow-red-100 text-sm flex-1 lg:flex-none"
          >
            <Plus className="w-4 h-4" />
            Produk Baru
          </button>
        </div>
      </div>

      <div className="relative mb-8 flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Cari produk berdasarkan nama atau SKU..."
            className="w-full pl-12 pr-4 py-4 bg-white border border-slate-200 rounded-2xl focus:outline-none focus:ring-4 focus:ring-indigo-50 transition-all shadow-sm"
          />
        </div>
        <button
          onClick={() => {
            setScannerTarget('search');
            setIsScannerOpen(true);
          }}
          className="px-6 py-4 bg-white border border-slate-200 rounded-2xl text-slate-600 hover:text-red-600 hover:bg-red-50 transition-all shadow-sm flex items-center gap-2"
          title="Scan SKU untuk mencari"
        >
          <Scan size={20} />
          <span className="hidden sm:inline font-bold">Scan</span>
        </button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 md:gap-6">
        <AnimatePresence mode="popLayout">
          {filteredProducts.map((product) => (
            <ProductCard 
              key={product.id} 
              product={product} 
              selectedForBarcode={selectedForBarcode}
              onToggleBarcode={handleToggleBarcode}
              onOpenForm={handleOpenForm}
              onDelete={handleDelete}
            />
          ))}
        </AnimatePresence>
      </div>

      {/* Modal Form */}
      <AnimatePresence mode="wait">
        {(isAdding || editingProduct) && (
          <div key="product-modal-wrapper" className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
              onClick={() => {
                setEditingProduct(null);
                setIsAdding(false);
              }}
            />
            <motion.div
              key="product-modal-content"
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl p-5 sm:p-8 max-h-[90vh] overflow-y-auto"
            >
            <div className="flex justify-between items-center mb-5 sm:mb-6 sticky top-0 bg-white z-10 pb-2">
              <h2 className="text-xl sm:text-2xl font-bold">
                {editingProduct ? 'Edit Produk' : 'Tambah Produk Baru'}
              </h2>
              <button 
                onClick={() => { setEditingProduct(null); setIsAdding(false); }}
                className="p-2 hover:bg-slate-100 rounded-full transition-colors"
              >
                <X className="w-5 h-5 sm:w-6 sm:h-6 text-slate-400" />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-5 sm:space-y-6 pb-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5">
                <div className="space-y-2 col-span-1 md:col-span-2">
                  <label className="text-xs sm:text-sm font-bold text-slate-700 uppercase tracking-wider">Nama Produk</label>
                  <input
                    name="name"
                    defaultValue={editingProduct?.name}
                    required
                    placeholder="Contoh: Es Kopi Gula Aren"
                    className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-red-500 transition-all text-sm font-medium"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs sm:text-sm font-bold text-slate-700 uppercase tracking-wider">Kategori</label>
                  <select
                    name="category"
                    defaultValue={editingProduct?.category || ''}
                    required
                    className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-red-500 transition-all text-sm font-medium"
                  >
                    <option value="" disabled>Pilih Kategori</option>
                    {categories.map(c => (
                      <option key={c.id} value={c.name}>{c.name}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-xs sm:text-sm font-bold text-slate-700 uppercase tracking-wider">Barcode / SKU</label>
                  <div className="flex gap-2">
                    <input
                      name="sku"
                      ref={skuInputRef}
                      defaultValue={editingProduct?.sku}
                      placeholder="SKU-001"
                      className="flex-1 p-3.5 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-red-500 transition-all text-sm font-medium"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        setScannerTarget('sku');
                        setIsScannerOpen(true);
                      }}
                      className="px-4 bg-slate-50 border border-slate-200 rounded-2xl text-slate-400 hover:text-red-600 hover:bg-red-50 transition-all active:scale-95"
                      title="Scan Barcode"
                    >
                      <Scan size={20} />
                    </button>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs sm:text-sm font-bold text-slate-700 uppercase tracking-wider">Harga Beli</label>
                  <input
                    name="costPrice"
                    type="number"
                    min="0"
                    step="1"
                    defaultValue={editingProduct?.costPrice}
                    required
                    className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-red-500 transition-all text-sm font-bold"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs sm:text-sm font-bold text-slate-700 uppercase tracking-wider">Harga Jual</label>
                  <input
                    name="price"
                    type="number"
                    min="0"
                    step="1"
                    defaultValue={editingProduct?.price}
                    required
                    className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-red-500 transition-all text-sm font-bold"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs sm:text-sm font-bold text-slate-700 uppercase tracking-wider">Stok Awal</label>
                  <input
                    name="stock"
                    type="number"
                    min="0"
                    step="0.01"
                    defaultValue={editingProduct?.stock}
                    required
                    className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-red-500 transition-all text-sm font-bold"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs sm:text-sm font-bold text-slate-700 uppercase tracking-wider">Minimal Stok</label>
                  <input
                    name="minStock"
                    type="number"
                    min="0"
                    step="0.01"
                    defaultValue={editingProduct?.minStock || 0}
                    required
                    className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-red-500 transition-all text-sm font-bold"
                  />
                </div>

                <div className="space-y-2 col-span-1 md:col-span-2">
                  <label className="text-xs sm:text-sm font-bold text-slate-700 uppercase tracking-wider">Satuan</label>
                  <div className="flex flex-col sm:flex-row gap-2">
                    <select
                      value={selectedUnit}
                      onChange={(e) => {
                        const val = e.target.value;
                        setSelectedUnit(val);
                        setIsCustomUnit(val === 'custom');
                      }}
                      className="flex-1 p-3.5 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-red-500 transition-all text-sm font-medium"
                    >
                      <option value="" disabled>Pilih Satuan</option>
                      {PRODUCT_UNITS.map(unit => (
                        <option key={unit} value={unit}>{unit}</option>
                      ))}
                      <option value="custom">+ Satuan Lainnya</option>
                    </select>
                    {isCustomUnit && (
                      <input
                        value={customUnit}
                        onChange={(e) => setCustomUnit(e.target.value)}
                        placeholder="Ketik satuan..."
                        className="flex-1 p-3.5 bg-red-50 border border-red-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-red-500 transition-all text-sm font-bold text-red-700"
                        required
                      />
                    )}
                  </div>
                </div>

                <div className="space-y-2 col-span-1 md:col-span-2">
                  <label className="text-xs sm:text-sm font-bold text-slate-700 uppercase tracking-wider">Deskripsi</label>
                  <textarea
                    name="description"
                    rows={2}
                    defaultValue={editingProduct?.description}
                    placeholder="Info tambahan produk..."
                    className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-red-500 transition-all text-sm font-medium resize-none"
                  />
                </div>

                <div className="space-y-2 col-span-1 md:col-span-2">
                  <label className="flex items-center gap-3 p-4 bg-slate-50 border border-slate-200 rounded-2xl cursor-pointer hover:bg-slate-100 transition-all select-none">
                    <input
                      type="checkbox"
                      name="isActive"
                      defaultChecked={editingProduct ? editingProduct.isActive : true}
                      className="w-5 h-5 accent-red-600 rounded bg-white"
                    />
                    <div>
                      <p className="text-sm font-bold text-slate-800">Status Aktif</p>
                      <p className="text-[10px] text-slate-400 font-bold uppercase">Produk dapat dibeli di kasir</p>
                    </div>
                  </label>
                </div>

                <div className="space-y-2 col-span-1 md:col-span-2">
                  <label className="text-xs sm:text-sm font-bold text-slate-700 uppercase tracking-wider">Foto Produk</label>
                  <div className="flex flex-col sm:flex-row gap-4 sm:items-center p-4 bg-slate-50 border border-dashed border-slate-300 rounded-3xl">
                    <div className="w-full sm:w-24 h-48 sm:h-24 bg-white rounded-2xl overflow-hidden border border-slate-200 flex-shrink-0 shadow-sm relative">
                      {previewImage ? (
                        <img src={previewImage} alt="Preview" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center text-slate-300">
                          <Package className="w-10 h-10" />
                          <span className="text-[8px] font-bold uppercase mt-1">No Image</span>
                        </div>
                      )}
                    </div>
                    <div className="flex-1 space-y-3">
                      <div className="relative">
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleImageChange}
                          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                        />
                        <div className="w-full py-2.5 px-4 bg-red-600 text-white rounded-xl text-xs font-black uppercase tracking-widest text-center flex items-center justify-center gap-2">
                          <Upload size={14} />
                          Unggah Foto
                        </div>
                      </div>
                      <input
                        name="image"
                        defaultValue={editingProduct?.image}
                        placeholder="Atau URL gambar..."
                        className="w-full p-3 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500 transition-all text-[10px] font-bold text-slate-500"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-3 pt-6 sticky bottom-0 bg-white z-10 border-t border-slate-100 mt-4 pb-2">
                <button
                  type="button"
                  onClick={() => { setEditingProduct(null); setIsAdding(false); }}
                  className="w-full sm:flex-1 py-4 bg-slate-100 text-slate-700 rounded-2xl font-black uppercase tracking-widest hover:bg-slate-200 transition-colors order-2 sm:order-1"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="w-full sm:flex-1 py-4 bg-red-600 text-white rounded-2xl font-black uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-red-700 transition-all shadow-xl shadow-red-100 order-1 sm:order-2"
                >
                  <Save className="w-5 h-5" />
                  Simpan
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>

      {/* Import Modal */}
      <AnimatePresence mode="wait">
        {showImportModal && (
          <div key="import-modal-wrapper" className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
              onClick={() => setShowImportModal(false)}
            />
            <motion.div
              key="import-modal-content"
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl p-8"
            >
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold flex items-center gap-2">
                <Upload className="w-5 h-5 text-red-600" />
                Import Produk dari CSV
              </h2>
              <button 
                onClick={() => setShowImportModal(false)}
                className="p-2 hover:bg-slate-100 rounded-full transition-colors"
              >
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>

            <div className="space-y-6">
              <div className="p-4 bg-blue-50 border border-blue-100 rounded-2xl flex gap-3 text-blue-700">
                <Info className="w-5 h-5 flex-shrink-0" />
                <div className="text-xs font-medium space-y-1">
                  <p className="font-bold">Panduan Format CSV:</p>
                  <p>Pastikan file CSV Anda memiliki header kolom berikut:</p>
                  <p className="bg-white/50 p-2 rounded-lg font-mono">name, category, sku, costPrice, price, stock, minStock, unit, description, isActive, image</p>
                </div>
              </div>

              <div className="flex flex-col items-center justify-center p-8 border-2 border-dashed border-slate-200 rounded-3xl space-y-4 hover:border-red-300 transition-colors group">
                <div className="w-12 h-12 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-400 group-hover:text-red-500 transition-colors">
                  <FileText className="w-6 h-6" />
                </div>
                <div className="text-center">
                  <p className="text-sm font-bold text-slate-700">Pilih file CSV Produk</p>
                  <p className="text-[10px] text-slate-400">Pastikan format sudah sesuai panduan di atas</p>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv"
                  onChange={handleCsvImport}
                  className="hidden"
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="px-6 py-2.5 bg-slate-900 text-white rounded-xl font-bold text-xs"
                >
                  Pilih File
                </button>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={downloadCsvTemplate}
                  className="flex-1 py-3 bg-slate-100 text-slate-700 rounded-xl font-bold text-xs flex items-center justify-center gap-2 hover:bg-slate-200 transition-all"
                >
                  <Download className="w-4 h-4" />
                  Download Template
                </button>
                <button
                  onClick={() => setShowImportModal(false)}
                  className="flex-1 py-3 border border-slate-200 text-slate-600 rounded-xl font-bold text-xs transition-all"
                >
                  Batal
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>

      <BarcodeScanner 
        isOpen={isScannerOpen} 
        onClose={() => setIsScannerOpen(false)} 
        onScan={handleScan} 
      />

      {showBarcodeModal && (
        <BarcodePrintModal 
          products={selectedForBarcode} 
          storeSettings={storeSettings}
          onClose={() => {
            setShowBarcodeModal(false);
            setSelectedForBarcode([]);
          }} 
        />
      )}

      {/* Category Manager Modal */}
      <AnimatePresence mode="wait">
        {showCategoryModal && (
          <div key="category-modal-wrapper" className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
              onClick={() => {
                setShowCategoryModal(false);
                setEditingCategory(null);
                setNewCategoryName('');
              }}
            />
            <motion.div
              key="category-modal-content"
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[80vh]"
            >
            <div className="p-6 bg-slate-50 border-b border-slate-100 flex justify-between items-center shrink-0">
              <h2 className="text-xl font-bold flex items-center gap-2">
                <Info className="w-5 h-5 text-red-600" />
                Manajemen Kategori
              </h2>
              <button 
                onClick={() => {
                  setShowCategoryModal(false);
                  setEditingCategory(null);
                  setNewCategoryName('');
                }}
                className="p-2 hover:bg-slate-200 rounded-full transition-colors"
              >
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto custom-scrollbar flex-1 space-y-6">
              {/* Add/Edit Form */}
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-3">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                  {editingCategory ? 'Edit Kategori' : 'Tambah Kategori Baru'}
                </label>
                <div className="flex gap-2">
                  <input 
                    type="text"
                    value={newCategoryName}
                    onChange={(e) => setNewCategoryName(e.target.value)}
                    placeholder="Nama kategori..."
                    className="flex-1 p-3 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500 transition-all text-sm font-bold"
                  />
                  <button
                    onClick={() => {
                      if (!newCategoryName.trim()) return;
                      
                      if (editingCategory) {
                        const updated = categories.map(c => 
                          c.id === editingCategory.id ? { ...c, name: newCategoryName } : c
                        );
                        onUpdateCategories(updated);
                        setEditingCategory(null);
                      } else {
                        const newCategory: Category = {
                          id: `CAT-${Date.now()}`,
                          name: newCategoryName
                        };
                        onUpdateCategories([...categories, newCategory]);
                      }
                      setNewCategoryName('');
                    }}
                    className="px-4 py-3 bg-red-600 text-white rounded-xl font-bold text-xs flex items-center justify-center gap-2 hover:bg-red-700 transition-all"
                  >
                    <Save size={16} />
                    {editingCategory ? 'Update' : 'Simpan'}
                  </button>
                  {editingCategory && (
                    <button
                      onClick={() => {
                        setEditingCategory(null);
                        setNewCategoryName('');
                      }}
                      className="p-3 bg-slate-200 text-slate-600 rounded-xl hover:bg-slate-300 transition-all"
                    >
                      <X size={16} />
                    </button>
                  )}
                </div>
              </div>

              {/* List Categories */}
              <div className="space-y-2">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Daftar Kategori</p>
                <div className="divide-y divide-slate-50">
                  {categories.map(c => (
                    <div key={c.id} className="flex items-center justify-between py-3 group">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-400 font-bold text-xs">
                          {c.name[0].toUpperCase()}
                        </div>
                        <div>
                          <p className="text-sm font-bold text-slate-800">{c.name}</p>
                          <p className="text-[10px] text-slate-400 font-medium">
                            {products.filter(p => p.category === c.name).length} Produk
                          </p>
                        </div>
                      </div>
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => {
                            setEditingCategory(c);
                            setNewCategoryName(c.name);
                          }}
                          className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                        >
                          <Edit2 size={14} />
                        </button>
                        <button
                          onClick={() => {
                            if (products.some(p => p.category === c.name)) {
                              alert('Tidak dapat menghapus kategori yang masih digunakan oleh produk.');
                              return;
                            }
                            if (confirm(`Hapus kategori "${c.name}"?`)) {
                              onUpdateCategories(categories.filter(cat => cat.id !== c.id));
                            }
                          }}
                          className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            
            <div className="p-4 bg-slate-50 border-t border-slate-100 shrink-0">
               <button 
                 onClick={() => {
                   setShowCategoryModal(false);
                   setEditingCategory(null);
                   setNewCategoryName('');
                 }}
                 className="w-full py-3 bg-white border border-slate-200 rounded-xl text-xs font-black text-slate-600 uppercase tracking-widest hover:bg-slate-100 transition-all"
               >
                 Tutup
               </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
    </div>
  );
}
