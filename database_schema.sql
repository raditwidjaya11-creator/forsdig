-- SQL Schema for ForsDig POS - Comprehensive Professional Edition
-- Copy and paste this into your Supabase SQL Editor

-- 0. Profiles Table (Extended)
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT,
  full_name TEXT,
  email TEXT,
  phone TEXT,
  role TEXT CHECK (role IN ('admin', 'user')) DEFAULT 'user',
  balance NUMERIC DEFAULT 0,
  default_markup NUMERIC DEFAULT 0,
  min_markup NUMERIC DEFAULT 0,
  max_markup NUMERIC DEFAULT 10000,
  subscription_status TEXT CHECK (status IN ('active', 'expired', 'suspended')) DEFAULT 'active',
  package_type TEXT CHECK (package_type IN ('FREE', 'PRO', 'RESELLER')) DEFAULT 'FREE',
  expired_at TIMESTAMPTZ,
  status TEXT CHECK (status IN ('active', 'blocked')) DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 1. Categories Table
CREATE TABLE IF NOT EXISTS categories (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Products Table
CREATE TABLE IF NOT EXISTS products (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  sku TEXT,
  name TEXT NOT NULL,
  price NUMERIC NOT NULL DEFAULT 0,
  cost_price NUMERIC NOT NULL DEFAULT 0,
  category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
  category_name TEXT, -- Fallback
  image TEXT,
  stock INTEGER DEFAULT 0,
  min_stock INTEGER DEFAULT 0,
  unit TEXT DEFAULT 'pcs',
  description TEXT,
  barcode TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Customers (Clients) Table
CREATE TABLE IF NOT EXISTS customers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  address TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Suppliers Table
CREATE TABLE IF NOT EXISTS suppliers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  address TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Outlets Table
CREATE TABLE IF NOT EXISTS outlets (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  address TEXT,
  phone TEXT,
  admin_id UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Staff Table
CREATE TABLE IF NOT EXISTS staff (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  outlet_id UUID REFERENCES outlets(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  role TEXT,
  base_salary NUMERIC DEFAULT 0,
  commission_rate NUMERIC DEFAULT 0,
  status TEXT DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. Resellers Table
CREATE TABLE IF NOT EXISTS resellers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  platform TEXT,
  contact_info TEXT,
  commission_rate NUMERIC DEFAULT 0,
  status TEXT DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. Transactions Table
CREATE TABLE IF NOT EXISTS transactions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  outlet_id UUID REFERENCES outlets(id) ON DELETE SET NULL,
  items JSONB NOT NULL,
  subtotal NUMERIC NOT NULL,
  tax NUMERIC DEFAULT 0,
  discount NUMERIC DEFAULT 0,
  total NUMERIC NOT NULL,
  payment_method TEXT,
  status TEXT DEFAULT 'success',
  amount_paid NUMERIC NOT NULL,
  change NUMERIC DEFAULT 0,
  customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
  staff_id UUID REFERENCES staff(id) ON DELETE SET NULL,
  reseller_id UUID REFERENCES resellers(id) ON DELETE SET NULL,
  payment_details JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 9. Commissions Table
CREATE TABLE IF NOT EXISTS commissions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  staff_id UUID REFERENCES staff(id) ON DELETE SET NULL,
  reseller_id UUID REFERENCES resellers(id) ON DELETE SET NULL,
  transaction_id UUID REFERENCES transactions(id) ON DELETE SET NULL,
  amount NUMERIC NOT NULL DEFAULT 0,
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 10. Debts Table
CREATE TABLE IF NOT EXISTS debts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  partner_id UUID NOT NULL, -- UUID of supplier or customer
  partner_type TEXT CHECK (partner_type IN ('Supplier', 'Customer')),
  type TEXT CHECK (type IN ('Hutang', 'Piutang')),
  total_amount NUMERIC NOT NULL,
  remaining_amount NUMERIC NOT NULL,
  due_date TIMESTAMPTZ,
  status TEXT DEFAULT 'Belum Lunas',
  reference_id UUID,
  payments JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 11. Vouchers Table
CREATE TABLE IF NOT EXISTS vouchers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  code TEXT NOT NULL,
  type TEXT CHECK (type IN ('percentage', 'fixed')),
  value NUMERIC NOT NULL,
  max_discount NUMERIC,
  min_purchase NUMERIC DEFAULT 0,
  expiry_date TIMESTAMPTZ,
  usage_limit INTEGER DEFAULT 0,
  usage_count INTEGER DEFAULT 0,
  status TEXT DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, code)
);

-- 12. QRIS (Payment QRs) Table
CREATE TABLE IF NOT EXISTS qris (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  provider TEXT,
  image_url TEXT,
  account_name TEXT,
  account_number TEXT,
  is_default BOOLEAN DEFAULT FALSE,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 13. PPOB Services (Products)
CREATE TABLE IF NOT EXISTS ppob_services (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  category TEXT NOT NULL,
  code TEXT NOT NULL,
  name TEXT NOT NULL,
  provider TEXT,
  base_price NUMERIC DEFAULT 0,
  admin_markup NUMERIC DEFAULT 0,
  selling_price NUMERIC DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  description TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 14. PPOB Transactions
CREATE TABLE IF NOT EXISTS ppob_transactions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  product_id UUID REFERENCES ppob_services(id) ON DELETE CASCADE,
  customer_number TEXT,
  selling_price NUMERIC NOT NULL,
  profit_admin NUMERIC NOT NULL,
  profit_user NUMERIC NOT NULL,
  status TEXT DEFAULT 'pending',
  reference TEXT,
  sn TEXT,
  details JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 15. User Markups
CREATE TABLE IF NOT EXISTS user_markups (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  product_id UUID,
  category_name TEXT,
  markup NUMERIC NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, product_id),
  UNIQUE(user_id, category_name)
);

-- 16. Balance Mutations
CREATE TABLE IF NOT EXISTS balance_mutations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  amount NUMERIC NOT NULL,
  type TEXT CHECK (type IN ('topup', 'transaction', 'refund', 'adjustment')),
  description TEXT,
  reference_id UUID,
  previous_balance NUMERIC NOT NULL,
  current_balance NUMERIC NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 17. Store Settings
CREATE TABLE IF NOT EXISTS store_settings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT,
  address TEXT,
  phone TEXT,
  email TEXT,
  logo TEXT,
  footer_message TEXT,
  tax_rate NUMERIC DEFAULT 0,
  api_settings JSONB DEFAULT '[]'::jsonb,
  display_config JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id)
);

-- 18. Subscriptions Table
CREATE TABLE IF NOT EXISTS subscriptions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  package_type TEXT,
  amount NUMERIC,
  status TEXT,
  start_date TIMESTAMPTZ,
  end_date TIMESTAMPTZ,
  payment_proof TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 19. Activity Logs
CREATE TABLE IF NOT EXISTS activity_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  details TEXT,
  ip_address TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS for ALL tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE outlets ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff ENABLE ROW LEVEL SECURITY;
ALTER TABLE resellers ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE commissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE debts ENABLE ROW LEVEL SECURITY;
ALTER TABLE vouchers ENABLE ROW LEVEL SECURITY;
ALTER TABLE qris ENABLE ROW LEVEL SECURITY;
ALTER TABLE ppob_services ENABLE ROW LEVEL SECURITY;
ALTER TABLE ppob_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_markups ENABLE ROW LEVEL SECURITY;
ALTER TABLE balance_mutations ENABLE ROW LEVEL SECURITY;
ALTER TABLE store_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;

-- Generic RLS Policy for most tables: "Users manage own data"
DO $$ 
DECLARE 
    t text;
BEGIN
    FOR t IN 
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name NOT IN ('profiles', 'ppob_services')
    LOOP
        EXECUTE format('CREATE POLICY "Users manage own %I" ON %I FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id)', t, t);
    END LOOP;
END $$;

-- Specific Policies
CREATE POLICY "Users view own profile" ON profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Anyone view active ppob services" ON ppob_services FOR SELECT USING (is_active = true);
CREATE POLICY "Admin manage ppob services" ON ppob_services FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

-- Functions & Triggers
-- Function to handle balance updates and mutations
CREATE OR REPLACE FUNCTION process_transaction(
  p_user_id UUID,
  p_amount NUMERIC,
  p_type TEXT,
  p_description TEXT,
  p_reference_id UUID DEFAULT NULL
) RETURNS VOID AS $$
DECLARE
  v_old_balance NUMERIC;
  v_new_balance NUMERIC;
BEGIN
  -- 1. Get current balance
  SELECT balance INTO v_old_balance FROM profiles WHERE id = p_user_id FOR UPDATE;
  
  -- 2. Calculate new balance
  v_new_balance := v_old_balance + p_amount;
  
  -- 3. Check for sufficient funds if it's a debit
  IF v_new_balance < 0 THEN
    RAISE EXCEPTION 'Insufficient balance';
  END IF;
  
  -- 4. Update profile balance
  UPDATE profiles SET balance = v_new_balance WHERE id = p_user_id;
  
  -- 5. Record mutation
  INSERT INTO balance_mutations (
    user_id, amount, type, description, reference_id, previous_balance, current_balance
  ) VALUES (
    p_user_id, p_amount, p_type, p_description, p_reference_id, v_old_balance, v_new_balance
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
