export interface User {
  id: string;
  username: string;
  password?: string;
  fullName?: string;
  email?: string;
  phone?: string;
  role: 'admin' | 'kasir';
  balance: number;
  status: 'active' | 'blocked';
  createdAt: number;
}

export interface ApiSettings {
  provider: 'Digiflazz' | 'Tripay' | 'VipReseller' | 'iPaymu' | 'Custom';
  apiKey: string;
  apiId?: string;
  username?: string;
  secretKey?: string;
  endpointUrl: string;
  isActive: boolean;
}

export interface MarkupSettings {
  type: 'flat' | 'percentage';
  value: number;
  categoryMarkups: {
    [key: string]: {
      type: 'flat' | 'percentage';
      value: number;
    };
  };
}

export interface PromoBanner {
  id: string;
  imageUrl: string;
  link?: string;
  title: string;
  isActive: boolean;
}

export interface BroadcastNotification {
  id: string;
  title: string;
  message: string;
  timestamp: number;
  target: 'all' | 'admin' | 'kasir';
}

export interface StoreSettings {
  name: string;
  address: string;
  phone: string;
  email: string;
  logo: string;
  footerMessage: string;
  taxRate: number;
  printerServiceUuid?: string;
  displayConfig?: {
    welcomeText?: string;
    promoTexts?: string[];
    displayLogo?: string;
  };
}

export interface Category {
  id: string;
  name: string;
}

export interface Product {
  id: string;
  sku?: string;
  name: string;
  price: number; // Selling Price
  costPrice: number; // Purchase Price
  category: string;
  image: string;
  stock: number;
  minStock: number;
  unit: string;
  description?: string;
  isActive: boolean;
}

export interface CartItem extends Product {
  quantity: number;
}

export interface PaymentQR {
  id: string;
  name: string;
  provider: string; // 'QRIS' | 'Dana' | 'OVO' | 'Gopay' | 'ShopeePay' | 'Bank'
  imageUrl: string;
  accountName: string;
  accountNumber?: string;
  isDefault: boolean;
  isActive: boolean;
}

export interface Transaction {
  id: string;
  items: CartItem[];
  subtotal: number;
  tax: number;
  total: number;
  paymentMethod: 'Tunai' | 'QRIS' | 'E-wallet' | 'Transfer' | 'Kartu' | 'Lainnya';
  status: 'pending' | 'success' | 'failed' | 'refunded';
  amountPaid: number;
  change: number;
  timestamp: number;
  adminFee?: number;
  paymentDetails?: {
    qrId?: string;
    qrName?: string;
    qrProvider?: string;
    referenceNumber?: string;
    proofImageUrl?: string;
    paymentTime?: number;
    cashierName?: string;
    walletProvider?: string;
    bankName?: string;
  };
}

export interface Supplier {
  id: string;
  name: string;
  contactName: string;
  phone: string;
  email: string;
  address: string;
}

export interface Client {
  id: string;
  name: string;
  phone: string;
  email: string;
  address: string;
}

export interface PurchaseOrder {
  id: string;
  supplierId: string;
  items: {
    productId: string;
    quantity: number;
    costPrice: number;
  }[];
  total: number;
  status: 'Pesanan' | 'Diterima' | 'Dibatalkan';
  paymentStatus: 'Lunas' | 'Hutang';
  timestamp: number;
  receivedAt?: number;
}

export interface PaymentHistory {
  id: string;
  amount: number;
  timestamp: number;
  note?: string;
}

export interface DebtReceivable {
  id: string;
  partnerId: string; // Supplier ID or Client ID
  partnerType: 'Supplier' | 'Client';
  type: 'Hutang' | 'Piutang';
  amount: number;
  remainingAmount: number;
  dueDate: number;
  status: 'Belum Lunas' | 'Lunas';
  referenceId: string; // Transaction ID or PurchaseOrder ID
  timestamp: number;
  payments?: PaymentHistory[];
}

export type PPOBCategory = 'PLN' | 'Pulsa' | 'Paket Data' | 'PDAM' | 'BPJS' | 'E-Wallet' | 'Game' | 'TV';

export interface PPOBService {
  id: string;
  category: PPOBCategory;
  code: string; // SKU code from Tripay
  name: string;
  provider: string; // Tripay or others
  basePrice: number;
  markupPrice: number;
  adminFee: number;
  isActive: boolean;
  desc?: string;
}

export interface PPOBTransaction {
  id: string;
  userId: string;
  outletId: string;
  serviceId: string;
  customerNumber: string;
  productName: string;
  productCode: string;
  amount: number; // base price
  markup: number;
  adminFee: number;
  total: number;
  status: 'pending' | 'success' | 'failed' | 'canceled';
  reference?: string; // Tripay reference
  sn?: string; // Serial Number / Token
  timestamp: number;
  updatedAt?: number;
  paymentMethod: string;
  notes?: string;
}

export interface BalanceMutation {
  id: string;
  userId: string;
  amount: number; // positive for credit, negative for debit
  type: 'topup' | 'transaction' | 'refund' | 'adjustment';
  description: string;
  referenceId?: string; // Transaction ID or Topup ID
  previousBalance: number;
  currentBalance: number;
  timestamp: number;
}

export interface Outlet {
  id: string;
  name: string;
  address: string;
  phone: string;
  adminId: string; // Owner of the outlet
  createdAt: number;
}
