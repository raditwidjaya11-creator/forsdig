-- Supabase Database Schema for POS App (forsdig)

-- 1. Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. Products Table
CREATE TABLE IF NOT EXISTS products (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  sku TEXT,
  name TEXT NOT NULL,
  price DECIMAL(15, 2) NOT NULL DEFAULT 0,
  cost_price DECIMAL(15, 2) NOT NULL DEFAULT 0,
  category TEXT,
  image TEXT,
  stock INTEGER NOT NULL DEFAULT 0,
  min_stock INTEGER NOT NULL DEFAULT 0,
  unit TEXT,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 3. Transactions Table
CREATE TABLE IF NOT EXISTS transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  items JSONB NOT NULL, -- Array of CartItem
  subtotal DECIMAL(15, 2) NOT NULL,
  tax DECIMAL(15, 2) NOT NULL,
  total DECIMAL(15, 2) NOT NULL,
  payment_method TEXT NOT NULL,
  amount_paid DECIMAL(15, 2) NOT NULL,
  change DECIMAL(15, 2) NOT NULL,
  timestamp BIGINT NOT NULL, -- BigInt to store unix timestamp as used in frontend
  admin_fee DECIMAL(15, 2) DEFAULT 0,
  payment_details JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 4. Suppliers Table
CREATE TABLE IF NOT EXISTS suppliers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  contact_name TEXT,
  phone TEXT,
  email TEXT,
  address TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 5. Clients Table
CREATE TABLE IF NOT EXISTS clients (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  address TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 6. Purchase Orders Table
CREATE TABLE IF NOT EXISTS purchase_orders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  supplier_id UUID NOT NULL,
  items JSONB NOT NULL, -- Array of items with productId, quantity, costPrice
  total DECIMAL(15, 2) NOT NULL,
  status TEXT NOT NULL, -- 'Pesanan' | 'Diterima' | 'Dibatalkan'
  payment_status TEXT NOT NULL, -- 'Lunas' | 'Hutang'
  timestamp BIGINT NOT NULL,
  received_at BIGINT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 7. Debts and Receivables Table
CREATE TABLE IF NOT EXISTS debts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  partner_id UUID NOT NULL,
  partner_type TEXT NOT NULL, -- 'Supplier' | 'Client'
  type TEXT NOT NULL, -- 'Hutang' | 'Piutang'
  amount DECIMAL(15, 2) NOT NULL,
  remaining_amount DECIMAL(15, 2) NOT NULL,
  due_date BIGINT NOT NULL,
  status TEXT NOT NULL, -- 'Belum Lunas' | 'Lunas'
  reference_id UUID NOT NULL,
  timestamp BIGINT NOT NULL,
  payments JSONB DEFAULT '[]'::jsonb, -- Array of PaymentHistory
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 8. PPOB Transactions Table
CREATE TABLE IF NOT EXISTS ppob_transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  service_id TEXT NOT NULL,
  customer_number TEXT NOT NULL,
  product_name TEXT,
  amount DECIMAL(15, 2) NOT NULL,
  admin_fee DECIMAL(15, 2) NOT NULL,
  total DECIMAL(15, 2) NOT NULL,
  status TEXT NOT NULL, -- 'Pending' | 'Success' | 'Failed'
  timestamp BIGINT NOT NULL,
  payment_method TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 9. Store Settings Table
CREATE TABLE IF NOT EXISTS store_settings (
  id TEXT PRIMARY KEY DEFAULT 'default-settings',
  name TEXT NOT NULL,
  address TEXT,
  phone TEXT,
  email TEXT,
  logo TEXT,
  footer_message TEXT,
  tax_rate INTEGER DEFAULT 11,
  printer_service_uuid TEXT,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 10. Payment QRs Table
CREATE TABLE IF NOT EXISTS payment_qrs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  provider TEXT NOT NULL, -- 'QRIS' | 'Dana' | 'OVO' | 'Gopay' | 'ShopeePay' | 'Bank'
  image_url TEXT NOT NULL,
  account_name TEXT NOT NULL,
  account_number TEXT,
  is_default BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- RLS (Row Level Security) Configuration
-- Note: These are simple policies. For production, you'd want to restrict by user_id.

ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE debts ENABLE ROW LEVEL SECURITY;
ALTER TABLE ppob_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE store_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_qrs ENABLE ROW LEVEL SECURITY;

-- Allow all authenticated users to read and write (Simplification for this app)
CREATE POLICY "Enable all for authenticated users" ON products FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Enable all for authenticated users" ON transactions FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Enable all for authenticated users" ON suppliers FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Enable all for authenticated users" ON clients FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Enable all for authenticated users" ON purchase_orders FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Enable all for authenticated users" ON debts FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Enable all for authenticated users" ON ppob_transactions FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Enable all for authenticated users" ON store_settings FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Enable all for authenticated users" ON payment_qrs FOR ALL TO authenticated USING (true) WITH CHECK (true);
