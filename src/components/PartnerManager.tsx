import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Users, 
  Truck, 
  ShoppingBag, 
  Wallet, 
  Plus, 
  Search, 
  ChevronRight, 
  Calendar, 
  Phone, 
  Mail, 
  MapPin,
  AlertCircle,
  CheckCircle2,
  Clock,
  ChevronDown,
  FileText,
  X,
  DollarSign,
  History,
  Edit2,
  Trash2,
  Share2,
  Download
} from 'lucide-react';
import { Supplier, Client, PurchaseOrder, DebtReceivable, Product, StoreSettings, Transaction } from '../types';
import { formatCurrency, generateUUID } from '../lib/utils';
import { format } from 'date-fns';
import { exportPurchaseOrderToPDF } from '../lib/exportUtils';

interface PartnerManagerProps {
  suppliers: Supplier[];
  clients: Client[];
  purchaseOrders: PurchaseOrder[];
  debts: DebtReceivable[];
  products: Product[];
  transactions: Transaction[];
  storeSettings: StoreSettings;
  onAddSupplier: (s: Supplier) => void;
  onAddClient: (c: Client) => void;
  onAddPurchase: (p: PurchaseOrder) => void;
  onReceivePurchase: (p: PurchaseOrder) => void;
  onUpdateDebt: (d: DebtReceivable) => void;
  onViewInvoice: (t: Transaction, customer?: { name: string; address?: string; phone?: string; email?: string; type?: string }) => void;
}

export default function PartnerManager({
  suppliers,
  clients,
  purchaseOrders,
  debts,
  products,
  transactions,
  onAddSupplier,
  onAddClient,
  onAddPurchase,
  onReceivePurchase,
  onUpdateDebt,
  onViewInvoice,
  storeSettings
}: PartnerManagerProps) {
  const [activeSubTab, setActiveSubTab] = useState<'suppliers' | 'clients' | 'purchases' | 'debts'>('suppliers');
  const [showAddModal, setShowAddModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Form States
  const [formData, setFormData] = useState({
    name: '',
    contactName: '',
    phone: '',
    email: '',
    address: '',
    supplierId: '',
    items: [] as { productId: string; quantity: number; costPrice: number }[],
    paymentStatus: 'Lunas' as 'Lunas' | 'Hutang'
  });

  const [selectedProductId, setSelectedProductId] = useState('');
  const [selectedQty, setSelectedQty] = useState('1');
  const [selectedPrice, setSelectedPrice] = useState('0');
  const [productSearch, setProductSearch] = useState('');

  const handleProductSelect = (id: string) => {
    setSelectedProductId(id);
    const product = products.find(p => p.id === id);
    if (product) {
      setSelectedPrice(product.costPrice.toString());
    }
  };

  // Payment States
  const [selectedDebt, setSelectedDebt] = useState<DebtReceivable | null>(null);
  const [paymentAmount, setPaymentAmount] = useState<string>('');
  const [paymentNote, setPaymentNote] = useState<string>('');
  const [showPaymentModal, setShowPaymentModal] = useState(false);

  const resetForm = () => {
    setFormData({
      name: '',
      contactName: '',
      phone: '',
      email: '',
      address: '',
      supplierId: '',
      items: [],
      paymentStatus: 'Lunas'
    });
    setSelectedProductId('');
    setSelectedQty('1');
    setSelectedPrice('0');
  };

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const id = generateUUID();

    if (activeSubTab === 'suppliers') {
      onAddSupplier({
        id,
        name: formData.name,
        contactName: formData.contactName,
        phone: formData.phone,
        email: formData.email,
        address: formData.address
      });
    } else if (activeSubTab === 'clients') {
      onAddClient({
        id,
        name: formData.name,
        phone: formData.phone,
        email: formData.email,
        address: formData.address
      });
    } else if (activeSubTab === 'purchases') {
      const total = formData.items.reduce((sum, item) => sum + (item.quantity * item.costPrice), 0);
      onAddPurchase({
        id: generateUUID(),
        supplierId: formData.supplierId,
        items: formData.items,
        total,
        status: 'Pesanan',
        paymentStatus: formData.paymentStatus,
        timestamp: new Date().toISOString()
      });
    }

    setShowAddModal(false);
    resetForm();
  };

  const removeItemFromPO = (index: number) => {
    setFormData({
      ...formData,
      items: formData.items.filter((_, i) => i !== index)
    });
  };

  const handleRecordPayment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDebt) return;

    const amount = parseFloat(paymentAmount);
    if (isNaN(amount) || amount <= 0 || amount > selectedDebt.remainingAmount) return;

    const newPayment = {
      id: generateUUID(),
      amount,
      timestamp: new Date().toISOString(),
      note: paymentNote
    };

    const updatedPayments = [...(selectedDebt.payments || []), newPayment];
    const newRemainingAmount = selectedDebt.remainingAmount - amount;
    
    onUpdateDebt({
      ...selectedDebt,
      remainingAmount: newRemainingAmount,
      status: newRemainingAmount <= 0 ? 'Lunas' : 'Belum Lunas',
      payments: updatedPayments
    });

    setShowPaymentModal(false);
    setSelectedDebt(null);
    setPaymentAmount('');
    setPaymentNote('');
  };

  const renderSuppliers = () => (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
          <input 
            type="text"
            placeholder="Cari supplier..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-12 pr-4 py-3 bg-white border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-red-500 transition-all text-sm"
          />
        </div>
        <button 
          onClick={() => setShowAddModal(true)}
          className="flex items-center justify-center gap-2 px-6 py-3 bg-red-600 text-white rounded-2xl font-bold hover:bg-red-700 transition-all text-sm shadow-xl shadow-red-100"
        >
          <Plus size={18} />
          Tambah Supplier
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {suppliers.filter(s => s.name.toLowerCase().includes(searchTerm.toLowerCase())).map(s => (
          <motion.div 
            key={s.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm hover:shadow-md transition-all group"
          >
            <div className="flex justify-between items-start mb-4">
              <div className="w-12 h-12 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-400 group-hover:text-red-600 transition-colors">
                <Truck size={24} />
              </div>
              <button className="text-slate-400 hover:text-slate-600">
                <ChevronRight size={20} />
              </button>
            </div>
            <h3 className="font-bold text-slate-800 text-lg mb-1">{s.name}</h3>
            <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mb-4">{s.contactName}</p>
            
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-xs text-slate-500">
                <Phone size={14} className="text-slate-300" />
                {s.phone}
              </div>
              <div className="flex items-center gap-2 text-xs text-slate-500">
                <Mail size={14} className="text-slate-300" />
                {s.email}
              </div>
              <div className="flex items-center gap-2 text-xs text-slate-500">
                <MapPin size={14} className="text-slate-300" />
                <span className="truncate">{s.address}</span>
              </div>
            </div>

            <div className="flex gap-2 mt-6">
              <button className="flex-1 py-3 bg-slate-50 text-slate-600 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-100 transition-all border border-slate-100 flex items-center justify-center gap-2">
                <Search size={14} />
                Detail
              </button>
              <button className="flex-1 py-3 bg-white text-slate-800 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-50 transition-all border border-slate-200 flex items-center justify-center gap-2">
                <Edit2 size={14} />
                Edit
              </button>
            </div>
          </motion.div>
        ))}
        {suppliers.length === 0 && (
          <div className="col-span-full py-12 text-center text-slate-400 space-y-4">
            <Truck size={48} className="mx-auto opacity-20" />
            <p className="text-sm font-bold uppercase tracking-widest">Belum ada data supplier</p>
          </div>
        )}
      </div>
    </div>
  );

  const renderClients = () => (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
          <input 
            type="text"
            placeholder="Cari client..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-12 pr-4 py-3 bg-white border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-red-500 transition-all text-sm"
          />
        </div>
        <button 
          onClick={() => setShowAddModal(true)}
          className="flex items-center justify-center gap-2 px-6 py-3 bg-red-600 text-white rounded-2xl font-bold hover:bg-red-700 transition-all text-sm shadow-xl shadow-red-100"
        >
          <Plus size={18} />
          Tambah Client
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {clients.filter(c => c.name.toLowerCase().includes(searchTerm.toLowerCase())).map(c => (
          <motion.div 
            key={c.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm hover:shadow-md transition-all group"
          >
            <div className="flex justify-between items-start mb-4">
              <div className="w-12 h-12 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-400 group-hover:text-blue-600 transition-colors">
                <Users size={24} />
              </div>
              <button className="text-slate-400 hover:text-slate-600">
                <ChevronRight size={20} />
              </button>
            </div>
            <h3 className="font-bold text-slate-800 text-lg mb-1">{c.name}</h3>
            
            <div className="space-y-2 mt-4">
              <div className="flex items-center gap-2 text-xs text-slate-500">
                <Phone size={14} className="text-slate-300" />
                {c.phone}
              </div>
              <div className="flex items-center gap-2 text-xs text-slate-500">
                <Mail size={14} className="text-slate-300" />
                {c.email}
              </div>
              <div className="flex items-center gap-2 text-xs text-slate-500">
                <MapPin size={14} className="text-slate-300" />
                <span className="truncate">{c.address}</span>
              </div>
            </div>
          </motion.div>
        ))}
        {clients.length === 0 && (
          <div className="col-span-full py-12 text-center text-slate-400 space-y-4">
            <Users size={48} className="mx-auto opacity-20" />
            <p className="text-sm font-bold uppercase tracking-widest">Belum ada data client</p>
          </div>
        )}
      </div>
    </div>
  );

  const renderPurchases = () => (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <h2 className="text-lg font-bold uppercase tracking-tight flex items-center gap-2">
          <ShoppingBag className="text-red-600" size={20} />
          Riwayat Pembelian Barang
        </h2>
        <button 
          onClick={() => setShowAddModal(true)}
          className="flex items-center justify-center gap-2 px-6 py-3 bg-slate-900 text-white rounded-2xl font-bold hover:bg-slate-800 transition-all text-sm shadow-xl shadow-slate-100"
        >
          <Plus size={18} />
          Buat PO Baru
        </button>
      </div>

      {/* Desktop Table View */}
      <div className="hidden md:block bg-white rounded-3xl border border-slate-100 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100">
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">ID Pesanan</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Supplier</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Total</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Status</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Tanggal</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {purchaseOrders.map(po => {
                const supplier = suppliers.find(s => s.id === po.supplierId);
                return (
                  <tr key={po.id} className="hover:bg-slate-50/50 transition-colors group">
                    <td className="px-6 py-4">
                      <span className="text-xs font-black text-slate-700">{po.id}</span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm font-bold text-slate-800">{supplier?.name || 'Unknown'}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm font-black text-red-600">{formatCurrency(po.total)}</div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${
                        po.status === 'Diterima' ? 'bg-green-50 text-green-600' :
                        po.status === 'Pesanan' ? 'bg-amber-50 text-amber-600' :
                        'bg-red-50 text-red-600'
                      }`}>
                        {po.status}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-xs text-slate-500 font-medium">{format(po.timestamp, 'dd MMM yyyy')}</div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button 
                          onClick={() => {
                            const supplier = suppliers.find(s => s.id === po.supplierId);
                            exportPurchaseOrderToPDF(po, supplier, products, storeSettings);
                          }}
                          className="p-2 text-slate-400 hover:text-red-500 transition-colors"
                          title="Download PDF"
                        >
                          <Download size={18} />
                        </button>
                        
                        <button 
                          onClick={() => {
                            const supplier = suppliers.find(s => s.id === po.supplierId);
                            const text = `Halo ${supplier?.name || ''}, berikut Purchase Order ${po.id} dari ${storeSettings.name} sejumlah ${formatCurrency(po.total)}.`;
                            const whatsappUrl = `https://wa.me/${supplier?.phone?.replace(/\D/g, '')}?text=${encodeURIComponent(text)}`;
                            window.open(whatsappUrl, '_blank');
                          }}
                          className="p-2 text-slate-400 hover:text-green-500 transition-colors"
                          title="Share via WhatsApp"
                        >
                          <Share2 size={18} />
                        </button>

                        <button 
                          onClick={() => {
                            const supplier = suppliers.find(s => s.id === po.supplierId);
                            const subject = `Purchase Order ${po.id} - ${storeSettings.name}`;
                            const body = `Halo ${supplier?.name || ''},\n\nTerlampir informasi Purchase Order dengan detail:\nID PO: ${po.id}\nTotal: ${formatCurrency(po.total)}\n\nTerima kasih.`;
                            const mailtoUrl = `mailto:${supplier?.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
                            window.open(mailtoUrl, '_blank');
                          }}
                          className="p-2 text-slate-400 hover:text-blue-500 transition-colors"
                          title="Share via Email"
                        >
                          <Mail size={18} />
                        </button>

                        {po.status === 'Pesanan' && (
                          <button 
                            onClick={() => onReceivePurchase(po)}
                            className="px-4 py-2 bg-green-600 text-white text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-green-700 transition-all shadow-lg shadow-green-100"
                          >
                            Terima
                          </button>
                        )}
                        <button 
                          onClick={() => {
                            const transaction = transactions.find(t => t.id === po.id);
                            const supplier = suppliers.find(s => s.id === po.supplierId);
                            const customerInfo = supplier ? {
                              name: supplier.name,
                              address: supplier.address,
                              phone: supplier.phone,
                              email: supplier.email,
                              type: 'Supplier'
                            } : undefined;

                            if (transaction) {
                              onViewInvoice(transaction, customerInfo);
                            } else {
                              // Map PO to Transaction for Invoice View
                              const mappedTransaction: Transaction = {
                                id: po.id,
                                items: po.items.map(item => {
                                  const product = products.find(p => p.id === item.productId);
                                  return {
                                    id: item.productId,
                                    name: product?.name || 'Produk Tidak Dikenal',
                                    price: item.costPrice,
                                    costPrice: item.costPrice,
                                    category: product?.category || 'Lainnya',
                                    image: product?.image || '',
                                    stock: product?.stock || 0,
                                    minStock: product?.minStock || 0,
                                    unit: product?.unit || 'pcs',
                                    isActive: true,
                                    quantity: item.quantity
                                  };
                                }),
                                subtotal: po.total,
                                tax: 0,
                                total: po.total,
                                paymentMethod: 'Lainnya',
                                status: po.status === 'Diterima' ? 'success' : 'pending',
                                amountPaid: po.paymentStatus === 'Lunas' ? po.total : 0,
                                change: 0,
                                timestamp: po.timestamp
                              };
                              onViewInvoice(mappedTransaction, customerInfo);
                            }
                          }}
                          className="p-2 text-slate-400 hover:text-blue-600 transition-colors"
                          title="Lihat Invoice"
                        >
                          <FileText size={18} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Mobile Card View */}
      <div className="grid grid-cols-1 gap-4 md:hidden">
        {purchaseOrders.map(po => {
          const supplier = suppliers.find(s => s.id === po.supplierId);
          return (
            <motion.div 
              key={po.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm"
            >
              <div className="flex justify-between items-start mb-4">
                <div>
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{po.id}</span>
                  <h3 className="font-bold text-slate-800 text-base">{supplier?.name || 'Unknown'}</h3>
                  <div className="text-xs text-slate-500 mt-1">{format(po.timestamp, 'dd MMM yyyy, HH:mm')}</div>
                </div>
                <span className={`px-2 py-1 rounded-full text-[8px] font-black uppercase tracking-widest ${
                  po.status === 'Diterima' ? 'bg-green-50 text-green-600' :
                  po.status === 'Pesanan' ? 'bg-amber-50 text-amber-600' :
                  'bg-red-50 text-red-600'
                }`}>
                  {po.status}
                </span>
              </div>

              <div className="flex items-center justify-between py-3 border-t border-slate-50 mb-4">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">Total</span>
                <span className="text-base font-black text-red-600">{formatCurrency(po.total)}</span>
              </div>

              <div className="grid grid-cols-4 gap-2">
                <button 
                  onClick={() => {
                    const supplier = suppliers.find(s => s.id === po.supplierId);
                    exportPurchaseOrderToPDF(po, supplier, products, storeSettings);
                  }}
                  className="flex flex-col items-center justify-center p-3 bg-slate-50 rounded-2xl text-slate-600"
                >
                  <Download size={18} />
                  <span className="text-[8px] font-black uppercase mt-1">PDF</span>
                </button>
                <button 
                  onClick={() => {
                    const supplier = suppliers.find(s => s.id === po.supplierId);
                    const transaction = transactions.find(t => t.id === po.id);
                    const customerInfo = supplier ? {
                      name: supplier.name,
                      address: supplier.address,
                      phone: supplier.phone,
                      email: supplier.email,
                      type: 'Supplier'
                    } : undefined;
                    // ... same logic as desktop
                    if (transaction) {
                      onViewInvoice(transaction, customerInfo);
                    } else {
                      const mappedTransaction: Transaction = {
                        id: po.id,
                        items: po.items.map(item => {
                          const product = products.find(p => p.id === item.productId);
                          return {
                            id: item.productId,
                            name: product?.name || 'Produk Tidak Dikenal',
                            price: item.costPrice,
                            costPrice: item.costPrice,
                            category: product?.category || 'Lainnya',
                            image: product?.image || '',
                            stock: product?.stock || 0,
                            minStock: product?.minStock || 0,
                            unit: product?.unit || 'pcs',
                            isActive: true,
                            quantity: item.quantity
                          };
                        }),
                        subtotal: po.total,
                        tax: 0,
                        total: po.total,
                        paymentMethod: 'Lainnya',
                        status: po.status === 'Diterima' ? 'success' : 'pending',
                        amountPaid: po.paymentStatus === 'Lunas' ? po.total : 0,
                        change: 0,
                        timestamp: po.timestamp
                      };
                      onViewInvoice(mappedTransaction, customerInfo);
                    }
                  }}
                  className="flex flex-col items-center justify-center p-3 bg-slate-50 rounded-2xl text-blue-600"
                >
                  <FileText size={18} />
                  <span className="text-[8px] font-black uppercase mt-1">Inv</span>
                </button>
                <button 
                   onClick={() => {
                    const supplier = suppliers.find(s => s.id === po.supplierId);
                    const text = `Halo ${supplier?.name || ''}, berikut Purchase Order ${po.id} dari ${storeSettings.name} sejumlah ${formatCurrency(po.total)}.`;
                    const whatsappUrl = `https://wa.me/${supplier?.phone?.replace(/\D/g, '')}?text=${encodeURIComponent(text)}`;
                    window.open(whatsappUrl, '_blank');
                  }}
                  className="flex flex-col items-center justify-center p-3 bg-slate-50 rounded-2xl text-green-600"
                >
                  <Share2 size={18} />
                  <span className="text-[8px] font-black uppercase mt-1">WA</span>
                </button>
                {po.status === 'Pesanan' ? (
                  <button 
                    onClick={() => onReceivePurchase(po)}
                    className="flex flex-col items-center justify-center p-3 bg-green-600 rounded-2xl text-white"
                  >
                    <CheckCircle2 size={18} />
                    <span className="text-[8px] font-black uppercase mt-1">Recv</span>
                  </button>
                ) : (
                   <div className="flex flex-col items-center justify-center p-3 bg-slate-50 rounded-2xl text-slate-400 opacity-50">
                    <CheckCircle2 size={18} />
                    <span className="text-[8px] font-black uppercase mt-1">Done</span>
                  </div>
                )}
              </div>
            </motion.div>
          );
        })}
      </div>

      {purchaseOrders.length === 0 && (
        <div className="py-20 text-center text-slate-400 space-y-4">
          <ShoppingBag size={48} className="mx-auto opacity-20" />
          <p className="text-sm font-bold uppercase tracking-widest">Belum ada data pembelian</p>
        </div>
      )}
    </div>
  );

  const renderDebts = () => {
    const totalHutang = debts.filter(d => d.type === 'Hutang' && d.status === 'Belum Lunas').reduce((acc, d) => acc + d.remainingAmount, 0);
    const totalPiutang = debts.filter(d => d.type === 'Piutang' && d.status === 'Belum Lunas').reduce((acc, d) => acc + d.remainingAmount, 0);

    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="p-6 sm:p-8 bg-slate-900 text-white rounded-3xl sm:rounded-[2.5rem] shadow-xl"
          >
            <div className="flex items-center gap-3 mb-4 sm:mb-6">
              <div className="p-2 sm:p-3 bg-white/10 rounded-xl sm:rounded-2xl text-red-400">
                <Wallet className="w-5 h-5 sm:w-6 sm:h-6" />
              </div>
              <span className="text-[10px] sm:text-xs font-black text-white/60 uppercase tracking-widest">Hutang ke Supplier</span>
            </div>
            <div className="text-2xl sm:text-3xl font-black">{formatCurrency(totalHutang)}</div>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="p-6 sm:p-8 bg-red-600 text-white rounded-3xl sm:rounded-[2.5rem] shadow-xl"
          >
            <div className="flex items-center gap-3 mb-4 sm:mb-6">
              <div className="p-2 sm:p-3 bg-white/10 rounded-xl sm:rounded-2xl text-white">
                <Users className="w-5 h-5 sm:w-6 sm:h-6" />
              </div>
              <span className="text-[10px] sm:text-xs font-black text-white/80 uppercase tracking-widest">Piutang Client</span>
            </div>
            <div className="text-2xl sm:text-3xl font-black">{formatCurrency(totalPiutang)}</div>
          </motion.div>
        </div>

        <div className="bg-white rounded-3xl border border-slate-100 overflow-hidden shadow-sm">
          <div className="p-6 border-b border-slate-50 flex items-center justify-between">
            <h2 className="text-lg font-bold uppercase tracking-tight">Rincian Hutang & Piutang</h2>
            <div className="flex gap-2">
              <div className="px-3 py-1 bg-green-50 text-green-600 rounded-full text-[10px] font-black uppercase tracking-widest">Lunas</div>
              <div className="px-3 py-1 bg-amber-50 text-amber-600 rounded-full text-[10px] font-black uppercase tracking-widest">Tertunda</div>
            </div>
          </div>

          {/* Desktop View */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100">
                  <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Partner</th>
                  <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Tipe</th>
                  <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Jumlah</th>
                  <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Sisa</th>
                  <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Jatuh Tempo</th>
                  <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {debts.map(d => {
                  const partner = d.partnerType === 'Supplier' 
                    ? suppliers.find(s => s.id === d.partnerId)
                    : clients.find(c => c.id === d.partnerId);
                  
                  return (
                    <tr key={d.id} className="hover:bg-slate-50/50 transition-colors group">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${d.type === 'Hutang' ? 'bg-red-50 text-red-600' : 'bg-blue-50 text-blue-600'}`}>
                            {d.type === 'Hutang' ? <Truck size={14} /> : <Users size={14} />}
                          </div>
                          <div>
                            <div className="text-sm font-bold text-slate-800">{partner?.name || 'Unknown'}</div>
                            <div className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{d.partnerType} • {d.referenceId}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${
                          d.type === 'Hutang' ? 'bg-red-50 text-red-600' : 'bg-blue-50 text-blue-600'
                        }`}>
                          {d.type}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm font-bold text-slate-700">{formatCurrency(d.amount)}</div>
                        {d.payments && d.payments.length > 0 && (
                          <div className="text-[10px] text-green-500 font-bold mt-0.5">
                            Dibayar: {formatCurrency(d.amount - d.remainingAmount)}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <div className={`text-sm font-black ${d.remainingAmount > 0 ? 'text-red-600' : 'text-green-600'}`}>
                          {formatCurrency(d.remainingAmount)}
                        </div>
                        {d.remainingAmount > 0 && (
                          <div className="w-24 h-1 bg-slate-100 rounded-full mt-2 overflow-hidden">
                            <div 
                              className={`h-full ${d.type === 'Hutang' ? 'bg-red-500' : 'bg-blue-500'}`}
                              style={{ width: `${Math.min(100, ((d.amount - d.remainingAmount) / d.amount) * 100)}%` }}
                            />
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <div className={`text-xs font-bold ${
                          d.status === 'Belum Lunas' && new Date(d.dueDate).getTime() < Date.now() ? 'text-red-600 animate-pulse' : 'text-slate-500'
                        }`}>
                          {format(new Date(d.dueDate), 'dd MMM yyyy')}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button 
                            onClick={() => {
                              const partner = d.partnerType === 'Supplier' 
                                ? suppliers.find(s => s.id === d.partnerId)
                                : clients.find(c => c.id === d.partnerId);
                              
                              const customerInfo = partner ? {
                                name: partner.name,
                                address: partner.address,
                                phone: partner.phone,
                                email: (partner as any).email, // Clients have email too
                                type: d.partnerType
                              } : undefined;

                              // Try to find in Transactions first (for Piutang/Clients)
                              const transaction = transactions.find(t => t.id === d.referenceId);
                              if (transaction) {
                                onViewInvoice(transaction, customerInfo);
                              } else {
                                // Try to find in Purchase Orders (for Hutang/Suppliers)
                                const po = purchaseOrders.find(p => p.id === d.referenceId);
                                if (po) {
                                  const mappedTransaction: Transaction = {
                                    id: po.id,
                                    items: po.items.map(item => {
                                      const product = products.find(p => p.id === item.productId);
                                      return {
                                        id: item.productId,
                                        name: product?.name || 'Produk Tidak Dikenal',
                                        price: item.costPrice,
                                        costPrice: item.costPrice,
                                        category: product?.category || 'Lainnya',
                                        image: product?.image || '',
                                        stock: product?.stock || 0,
                                        minStock: product?.minStock || 0,
                                        unit: product?.unit || 'pcs',
                                        isActive: true,
                                        quantity: item.quantity
                                      };
                                    }),
                                    subtotal: po.total,
                                    tax: 0,
                                    total: po.total,
                                    paymentMethod: 'Lainnya',
                                    status: po.status === 'Diterima' ? 'success' : 'pending',
                                    amountPaid: po.paymentStatus === 'Lunas' ? po.total : 0,
                                    change: 0,
                                    timestamp: po.timestamp
                                  };
                                  onViewInvoice(mappedTransaction, customerInfo);
                                }
                              }
                            }}
                            className="p-2 text-slate-400 hover:text-blue-600 transition-colors"
                            title="Lihat Invoice"
                          >
                            <FileText size={18} />
                          </button>
                          <button 
                            onClick={() => {
                              setSelectedDebt(d);
                              setShowPaymentModal(true);
                            }}
                            className="p-2 text-slate-400 hover:text-slate-900 transition-colors"
                          >
                            <History size={18} />
                          </button>
                          {d.status === 'Belum Lunas' && (
                            <button 
                              onClick={() => {
                                setSelectedDebt(d);
                                setShowPaymentModal(true);
                              }}
                              className="px-4 py-2 bg-slate-900 text-white text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-slate-800 transition-all shadow-lg shadow-slate-100"
                            >
                              Bayar
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile View */}
          <div className="md:hidden divide-y divide-slate-50">
             {debts.map(d => {
                const partner = d.partnerType === 'Supplier' 
                  ? suppliers.find(s => s.id === d.partnerId)
                  : clients.find(c => c.id === d.partnerId);
                
                return (
                  <div key={d.id} className="p-4 space-y-4">
                    <div className="flex justify-between items-start">
                       <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${d.type === 'Hutang' ? 'bg-red-50 text-red-600' : 'bg-blue-50 text-blue-600'}`}>
                            {d.type === 'Hutang' ? <Truck size={14} /> : <Users size={14} />}
                          </div>
                          <div>
                            <div className="text-sm font-bold text-slate-800">{partner?.name || 'Unknown'}</div>
                            <div className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{d.partnerType} • {d.referenceId}</div>
                          </div>
                       </div>
                       <span className={`px-2 py-1 rounded-full text-[8px] font-black uppercase tracking-widest ${
                          d.type === 'Hutang' ? 'bg-red-50 text-red-600' : 'bg-blue-50 text-blue-600'
                        }`}>
                          {d.type}
                       </span>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                       <div className="space-y-1">
                          <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Sisa Tagihan</p>
                          <p className={`text-sm font-black ${d.remainingAmount > 0 ? 'text-red-600' : 'text-green-600'}`}>{formatCurrency(d.remainingAmount)}</p>
                       </div>
                       <div className="space-y-1 text-right">
                          <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Jatuh Tempo</p>
                          <p className={`text-xs font-bold ${d.status === 'Belum Lunas' && new Date(d.dueDate).getTime() < Date.now() ? 'text-red-600 animate-pulse' : 'text-slate-500'}`}>
                            {format(new Date(d.dueDate), 'dd MMM yyyy')}
                          </p>
                       </div>
                    </div>

                    <div className="flex gap-2">
                       <button 
                          onClick={() => {
                            const partner = d.partnerType === 'Supplier' 
                              ? suppliers.find(s => s.id === d.partnerId)
                              : clients.find(c => c.id === d.partnerId);
                            
                            const customerInfo = partner ? {
                              name: partner.name,
                              address: partner.address,
                              phone: partner.phone,
                              email: (partner as any).email,
                              type: d.partnerType
                            } : undefined;

                            const transaction = transactions.find(t => t.id === d.referenceId);
                            if (transaction) {
                              onViewInvoice(transaction, customerInfo);
                            } else {
                              const po = purchaseOrders.find(p => p.id === d.referenceId);
                              if (po) {
                                const mappedTransaction: Transaction = {
                                  id: po.id,
                                  items: po.items.map(item => {
                                    const product = products.find(p => p.id === item.productId);
                                    return {
                                      id: item.productId,
                                      name: product?.name || 'Produk Tidak Dikenal',
                                      price: item.costPrice,
                                      costPrice: item.costPrice,
                                      category: product?.category || 'Lainnya',
                                      image: product?.image || '',
                                      stock: product?.stock || 0,
                                      minStock: product?.minStock || 0,
                                      unit: product?.unit || 'pcs',
                                      isActive: true,
                                      quantity: item.quantity
                                    };
                                  }),
                                  subtotal: po.total,
                                  tax: 0,
                                  total: po.total,
                                  paymentMethod: 'Lainnya',
                                  status: po.status === 'Diterima' ? 'success' : 'pending',
                                  amountPaid: po.paymentStatus === 'Lunas' ? po.total : 0,
                                  change: 0,
                                  timestamp: po.timestamp
                                };
                                onViewInvoice(mappedTransaction, customerInfo);
                              }
                            }
                          }}
                          className="flex-1 py-3 bg-slate-50 text-slate-700 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2"
                       >
                          <FileText size={14} />
                          Invoice
                       </button>
                       <button 
                          onClick={() => {
                            setSelectedDebt(d);
                            setShowPaymentModal(true);
                          }}
                          className="flex-1 py-3 bg-slate-900 text-white rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2"
                       >
                          <History size={14} />
                          Bayar
                       </button>
                    </div>
                  </div>
                );
             })}
          </div>

          {debts.length === 0 && (
            <div className="py-20 text-center text-slate-400 space-y-4">
              <Wallet size={48} className="mx-auto opacity-20" />
              <p className="text-sm font-bold uppercase tracking-widest">Belum ada data hutang piutang</p>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="p-4 md:p-8 pb-32 md:pb-8">
      <div className="mb-6 md:mb-8 flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="text-center md:text-left">
          <h1 className="text-2xl sm:text-3xl font-bold flex items-center justify-center md:justify-start gap-3 uppercase tracking-tight">
            <Users className="w-6 h-6 sm:w-8 sm:h-8 text-red-600" />
            Manajemen Mitra
          </h1>
          <p className="text-[10px] sm:text-sm text-slate-500 font-bold uppercase tracking-widest mt-1">Supplier, Client, dan Hutang Piutang</p>
        </div>
      </div>

      <div className="flex flex-row overflow-x-auto gap-2 mb-8 bg-slate-100 p-1.5 rounded-[2rem] w-full lg:w-fit scrollbar-hide -mx-4 px-4 sm:mx-0 sm:px-1.5">
        {[
          { id: 'suppliers', label: 'Supplier', icon: Truck },
          { id: 'clients', label: 'Client', icon: Users },
          { id: 'purchases', label: 'Pembelian', icon: ShoppingBag },
          { id: 'debts', label: 'Hutang Piutang', icon: Wallet },
        ].map(tab => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveSubTab(tab.id as any)}
              className={`px-6 py-3 rounded-2xl flex items-center gap-2 text-xs font-black uppercase tracking-widest transition-all ${
                activeSubTab === tab.id 
                  ? 'bg-white text-red-600 shadow-md' 
                  : 'text-slate-500 hover:text-slate-700 hover:bg-white/50'
              }`}
            >
              <Icon size={16} />
              {tab.label}
            </button>
          );
        })}
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={activeSubTab}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.2 }}
        >
          {activeSubTab === 'suppliers' && renderSuppliers()}
          {activeSubTab === 'clients' && renderClients()}
          {activeSubTab === 'purchases' && renderPurchases()}
          {activeSubTab === 'debts' && renderDebts()}
        </motion.div>
      </AnimatePresence>

      {/* Add Modal Placeholder - For implementation simplicity, I'll add a minimal version */}
      {/* Payment Modal */}
      <AnimatePresence>
        {showPaymentModal && selectedDebt && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowPaymentModal(false)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-2xl bg-white rounded-[2.5rem] shadow-2xl overflow-hidden max-h-[90vh] flex flex-col"
            >
              <div className="p-8 border-b border-slate-50 flex items-center justify-between">
                <div>
                  <h3 className="text-2xl font-black uppercase tracking-tight">Catat Pembayaran</h3>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">
                    {selectedDebt.type} • {selectedDebt.referenceId}
                  </p>
                </div>
                <button onClick={() => setShowPaymentModal(false)} className="p-2 hover:bg-slate-50 rounded-full transition-colors">
                  <X />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
                  <div className="p-6 bg-slate-50 rounded-3xl space-y-4">
                    <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Informasi Tagihan</h4>
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-slate-500">Total Tagihan</span>
                      <span className="font-bold text-slate-900">{formatCurrency(selectedDebt.amount)}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-slate-500">Sudah Dibayar</span>
                      <span className="font-bold text-green-600">{formatCurrency(selectedDebt.amount - selectedDebt.remainingAmount)}</span>
                    </div>
                    <div className="h-px bg-slate-200" />
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-bold text-slate-900">Sisa Tagihan</span>
                      <span className="text-lg font-black text-red-600">{formatCurrency(selectedDebt.remainingAmount)}</span>
                    </div>
                  </div>

                  {selectedDebt.status === 'Belum Lunas' ? (
                    <form onSubmit={handleRecordPayment} className="space-y-4">
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Jumlah Pembayaran</label>
                        <input 
                          type="number"
                          required
                          max={selectedDebt.remainingAmount}
                          value={paymentAmount}
                          onChange={(e) => setPaymentAmount(e.target.value)}
                          placeholder="0"
                          className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-4 focus:ring-red-50 focus:border-red-500 transition-all font-bold"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Catatan (Opsional)</label>
                        <input 
                          type="text"
                          value={paymentNote}
                          onChange={(e) => setPaymentNote(e.target.value)}
                          placeholder="Misal: Pembayaran tahap 1"
                          className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-4 focus:ring-red-50 focus:border-red-500 transition-all font-bold"
                        />
                      </div>
                      <button 
                        type="submit"
                        className="w-full py-4 bg-slate-900 text-white rounded-2xl font-black uppercase tracking-widest hover:bg-slate-800 transition-all shadow-xl shadow-slate-100"
                      >
                        Simpan Pembayaran
                      </button>
                    </form>
                  ) : (
                    <div className="flex items-center justify-center p-8 border-2 border-dashed border-green-200 rounded-3xl bg-green-50 text-green-600 space-y-2 flex-col">
                      <CheckCircle2 size={32} />
                      <p className="text-xs font-black uppercase tracking-widest">Tagihan Ini Sudah Lunas</p>
                    </div>
                  )}
                </div>

                <div className="space-y-4">
                  <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                    <History size={14} />
                    Riwayat Pembayaran
                  </h4>
                  <div className="space-y-2">
                    {selectedDebt.payments && selectedDebt.payments.length > 0 ? (
                      selectedDebt.payments.slice().reverse().map(p => (
                        <div key={p.id} className="flex items-center justify-between p-4 bg-white border border-slate-100 rounded-2xl shadow-sm">
                          <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-full bg-green-50 text-green-600 flex items-center justify-center">
                              <DollarSign size={18} />
                            </div>
                            <div>
                              <div className="text-sm font-black text-slate-800">{formatCurrency(p.amount)}</div>
                              <div className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                                {format(p.timestamp, 'dd MMM yyyy, HH:mm')}
                              </div>
                            </div>
                          </div>
                          {p.note && (
                            <div className="text-right">
                              <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Catatan</div>
                              <div className="text-xs text-slate-600 italic">"{p.note}"</div>
                            </div>
                          )}
                        </div>
                      ))
                    ) : (
                      <div className="text-center py-8 text-slate-400 bg-slate-50 rounded-3xl border border-dashed border-slate-200">
                        <History size={32} className="mx-auto opacity-10 mb-2" />
                        <p className="text-[10px] font-bold uppercase tracking-widest">Belum ada riwayat pembayaran</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showAddModal && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowAddModal(false)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-lg bg-white rounded-[2.5rem] shadow-2xl overflow-hidden"
            >
              <div className="p-8 border-b border-slate-50 flex items-center justify-between">
                <h3 className="text-2xl font-black uppercase tracking-tight">
                  {activeSubTab === 'suppliers' ? 'Tambah Supplier' : 
                   activeSubTab === 'clients' ? 'Tambah Client' : 
                   'Buat Purchase Order'}
                </h3>
                <button onClick={() => setShowAddModal(false)} className="p-2 hover:bg-slate-50 rounded-full transition-colors">
                  <X />
                </button>
              </div>
              <div className="p-8 overflow-y-auto max-h-[70vh]">
                <form onSubmit={handleAddSubmit} className="space-y-4">
                  {activeSubTab === 'purchases' ? (
                    <>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Pilih Supplier</label>
                        <select 
                          required
                          value={formData.supplierId}
                          onChange={(e) => setFormData({...formData, supplierId: e.target.value})}
                          className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-4 focus:ring-red-50 focus:border-red-500 transition-all font-bold"
                        >
                          <option value="">Pilih Supplier</option>
                          {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                        </select>
                      </div>

                      <div className="p-6 bg-slate-50 rounded-3xl border border-slate-200 space-y-4">
                        <div className="flex justify-between items-center">
                          <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Tambah Item Ke PO</h4>
                          <div className="text-[10px] font-bold text-slate-400">{products.length} Produk Tersedia</div>
                        </div>
                        
                        <div className="space-y-3">
                          <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                            <input 
                              type="text"
                              placeholder="Cari produk..."
                              value={productSearch}
                              onChange={(e) => setProductSearch(e.target.value)}
                              className="w-full pl-9 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-red-100 outline-none transition-all"
                            />
                          </div>

                          <div className="max-h-32 overflow-y-auto bg-white rounded-xl border border-slate-200 divide-y divide-slate-50">
                            {products
                              .filter(p => !productSearch || p.name.toLowerCase().includes(productSearch.toLowerCase()))
                              .map(p => (
                                <button
                                  key={p.id}
                                  type="button"
                                  onClick={() => handleProductSelect(p.id)}
                                  className={`w-full text-left px-4 py-2.5 text-xs transition-colors flex justify-between items-center ${
                                    selectedProductId === p.id ? 'bg-red-50 text-red-700 font-bold' : 'hover:bg-slate-50 text-slate-600'
                                  }`}
                                >
                                  <span>{p.name}</span>
                                  <span className="text-[10px] opacity-60">{formatCurrency(p.costPrice)}</span>
                                </button>
                              ))}
                          </div>

                          {selectedProductId && (
                            <motion.div 
                              initial={{ opacity: 0, height: 0 }}
                              animate={{ opacity: 1, height: 'auto' }}
                              className="grid grid-cols-2 gap-3 pt-2"
                            >
                              <div className="space-y-1">
                                <label className="text-[9px] font-bold text-slate-400 uppercase ml-1">Quantity</label>
                                <input 
                                  type="number"
                                  min="1"
                                  value={selectedQty}
                                  onChange={(e) => setSelectedQty(e.target.value)}
                                  placeholder="Qty"
                                  className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-bold"
                                />
                              </div>
                              <div className="space-y-1">
                                <label className="text-[9px] font-bold text-slate-400 uppercase ml-1">Harga Beli</label>
                                <input 
                                  type="number"
                                  value={selectedPrice}
                                  onChange={(e) => setSelectedPrice(e.target.value)}
                                  placeholder="Harga"
                                  className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-bold"
                                />
                              </div>
                              <button 
                                type="button"
                                onClick={() => {
                                  const product = products.find(p => p.id === selectedProductId);
                                  if (!product) return;
                                  setFormData({
                                    ...formData,
                                    items: [
                                      ...formData.items,
                                      {
                                        productId: selectedProductId,
                                        quantity: parseInt(selectedQty) || 1,
                                        costPrice: parseFloat(selectedPrice) || 0
                                      }
                                    ]
                                  });
                                  setSelectedProductId('');
                                  setSelectedQty('1');
                                  setSelectedPrice('0');
                                  setProductSearch('');
                                }}
                                className="col-span-2 py-3 bg-red-600 text-white rounded-xl font-bold text-xs flex items-center justify-center gap-2"
                              >
                                <Plus size={14} />
                                Tambah ke Pesanan
                              </button>
                            </motion.div>
                          )}
                        </div>
                        
                        <div className="space-y-2 pt-4">
                          <div className="h-px bg-slate-200 mb-4" />
                          <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Item dalam PO ({formData.items.length})</h5>
                          {formData.items.length === 0 ? (
                            <div className="text-center py-4 bg-white/50 rounded-xl border border-dashed border-slate-200 text-[10px] font-bold text-slate-400 uppercase">
                              Belum ada item ditambahkan
                            </div>
                          ) : (
                            <div className="space-y-2">
                              {formData.items.map((item, idx) => {
                                const p = products.find(prod => prod.id === item.productId);
                                return (
                                  <div key={idx} className="flex items-center justify-between p-3 bg-white rounded-xl border border-slate-100 group">
                                    <div>
                                      <div className="text-xs font-bold text-slate-800">{p?.name}</div>
                                      <div className="text-[10px] text-slate-400">{item.quantity} x {formatCurrency(item.costPrice)}</div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                      <div className="text-xs font-black text-red-600">{formatCurrency(item.quantity * item.costPrice)}</div>
                                      <button 
                                        type="button"
                                        onClick={() => removeItemFromPO(idx)}
                                        className="p-1.5 text-slate-300 hover:text-red-500 transition-colors"
                                      >
                                        <Trash2 size={14} />
                                      </button>
                                    </div>
                                  </div>
                                );
                              })}
                              
                              <div className="p-4 bg-slate-900 rounded-2xl text-white flex justify-between items-center mt-4">
                                <span className="text-[10px] font-black uppercase tracking-widest opacity-60">Total PO</span>
                                <span className="text-sm font-black">{formatCurrency(formData.items.reduce((sum, i) => sum + (i.quantity * i.costPrice), 0))}</span>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Status Pembayaran</label>
                        <div className="flex gap-2">
                          {['Lunas', 'Hutang'].map((s) => (
                            <button
                              key={s}
                              type="button"
                              onClick={() => setFormData({...formData, paymentStatus: s as any})}
                              className={`flex-1 py-3 rounded-xl text-xs font-bold uppercase tracking-widest transition-all ${
                                formData.paymentStatus === s ? 'bg-red-600 text-white shadow-lg shadow-red-100' : 'bg-slate-100 text-slate-400'
                              }`}
                            >
                              {s}
                            </button>
                          ))}
                        </div>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Nama {activeSubTab === 'suppliers' ? 'Supplier' : 'Client'}</label>
                        <input 
                          required
                          value={formData.name}
                          onChange={(e) => setFormData({...formData, name: e.target.value})}
                          placeholder="CV. Maju Jaya"
                          className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-4 focus:ring-red-50 focus:border-red-500 transition-all font-bold"
                        />
                      </div>
                      {activeSubTab === 'suppliers' && (
                        <div className="space-y-2">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Nama Kontak</label>
                          <input 
                            required
                            value={formData.contactName}
                            onChange={(e) => setFormData({...formData, contactName: e.target.value})}
                            placeholder="John Doe"
                            className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-4 focus:ring-red-50 focus:border-red-500 transition-all font-bold"
                          />
                        </div>
                      )}
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Telepon</label>
                          <input 
                            required
                            value={formData.phone}
                            onChange={(e) => setFormData({...formData, phone: e.target.value})}
                            placeholder="0812345678"
                            className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-4 focus:ring-red-50 focus:border-red-500 transition-all font-bold"
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Email</label>
                          <input 
                            required
                            type="email"
                            value={formData.email}
                            onChange={(e) => setFormData({...formData, email: e.target.value})}
                            placeholder="mail@example.com"
                            className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-4 focus:ring-red-50 focus:border-red-500 transition-all font-bold"
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Alamat</label>
                        <textarea 
                          required
                          value={formData.address}
                          onChange={(e) => setFormData({...formData, address: e.target.value})}
                          placeholder="Alamat lengkap..."
                          className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-4 focus:ring-red-50 focus:border-red-500 transition-all font-bold min-h-[100px]"
                        />
                      </div>
                    </>
                  )}
                  
                  <button 
                    type="submit"
                    className="w-full mt-4 py-4 bg-slate-900 text-white rounded-2xl font-black uppercase tracking-widest hover:bg-slate-800 transition-all shadow-2xl shadow-slate-200"
                  >
                    Simpan Data
                  </button>
                </form>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
