export interface UserProfile {
  id: string;
  role: 'admin' | 'user';
  username?: string;
  fullName?: string;
  email?: string;
  phone?: string;
  balance: number;
  subscriptionStatus: 'active' | 'expired' | 'suspended';
  packageType: 'FREE' | 'PRO' | 'RESELLER';
  expiredAt?: string | number;
  status: 'active' | 'blocked';
  createdAt: string | number;
}

export interface ActivityLog {
  id: string;
  userId: string;
  action: string;
  details?: string;
  ipAddress?: string;
  createdAt: string | number;
}

export interface Subscription {
  id: string;
  userId: string;
  packageType: 'FREE' | 'PRO' | 'RESELLER';
  amount: number;
  status: 'pending' | 'success' | 'failed';
  startDate?: string | number;
  endDate?: string | number;
  paymentProof?: string;
  createdAt: string | number;
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
  timestamp: string | number;
  target: 'all' | 'admin' | 'kasir';
}

export interface StoreSettings {
  id?: string;
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
  discount?: number;
  total: number;
  paymentMethod: 'Tunai' | 'QRIS' | 'E-wallet' | 'Transfer' | 'Kartu' | 'Lainnya';
  status: 'pending' | 'success' | 'failed' | 'refunded';
  amountPaid: number;
  change: number;
  timestamp: string | number;
  adminFee?: number;
  staffId?: string;
  resellerId?: string;
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
    customerId?: string;
    customerName?: string;
    customerPhone?: string;
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

export type Customer = Client;

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
  timestamp: string | number;
  receivedAt?: string | number;
}

export interface PaymentHistory {
  id: string;
  amount: number;
  timestamp: string | number;
  note?: string;
}

export interface DebtReceivable {
  id: string;
  partnerId: string; // Supplier ID or Client ID
  partnerType: 'Supplier' | 'Client';
  type: 'Hutang' | 'Piutang';
  amount: number;
  remainingAmount: number;
  dueDate: string | number;
  status: 'Belum Lunas' | 'Lunas';
  referenceId: string; // Transaction ID or PurchaseOrder ID
  timestamp: string | number;
  payments?: PaymentHistory[];
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
  timestamp: string | number;
  userName?: string;
}

export interface Outlet {
  id: string;
  name: string;
  address: string;
  phone: string;
  adminId: string; // Owner of the outlet
  createdAt: string | number;
}

export interface Voucher {
  id: string;
  code: string;
  type: 'percentage' | 'fixed';
  value: number;
  maxDiscount?: number;
  minPurchase: number;
  expiryDate?: string | number;
  usageLimit: number;
  usageCount: number;
  status: 'active' | 'expired' | 'disabled';
  createdAt: string | number;
}

export interface Staff {
  id: string;
  name: string;
  phone?: string;
  email?: string;
  role?: string;
  baseSalary: number;
  commissionRate: number; // Percentage
  status: 'active' | 'inactive';
  createdAt: string | number;
}

export interface Reseller {
  id: string;
  name: string;
  platform?: string;
  contactInfo?: string;
  commissionRate: number; // Percentage
  status: 'active' | 'inactive';
  createdAt: string | number;
}

export interface Commission {
  id: string;
  staffId?: string;
  resellerId?: string;
  transactionId: string;
  amount: number;
  status: 'pending' | 'paid' | 'cancelled';
  createdAt: string | number;
  staffName?: string;
  resellerName?: string;
}

export interface Shift {
  id: string;
  staffId: string;
  staffName: string;
  startedAt: string | number;
  endedAt?: string | number;
  initialCash: number;
  totalCashTransactions: number;
  expectedCash: number;
  actualCash?: number;
  difference?: number;
  notes?: string;
  status: 'active' | 'closed';
}

