-- =========================================================
-- COMPLETE SUPABASE SCHEMA FOR SMART POS & PPOB (FORSDIG)
-- =========================================================

-- 1. Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. Profiles Table (Extends auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  username TEXT UNIQUE,
  full_name TEXT,
  email TEXT,
  phone TEXT,
  role TEXT DEFAULT 'kasir' CHECK (role IN ('admin', 'kasir')),
  balance BIGINT DEFAULT 0,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'suspended')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Products Table
CREATE TABLE IF NOT EXISTS public.products (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
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

-- 4. Transactions Table
CREATE TABLE IF NOT EXISTS public.transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  items JSONB NOT NULL,
  subtotal DECIMAL(15, 2) NOT NULL,
  tax DECIMAL(15, 2) NOT NULL,
  total DECIMAL(15, 2) NOT NULL,
  payment_method TEXT NOT NULL,
  amount_paid DECIMAL(15, 2) NOT NULL,
  change DECIMAL(15, 2) NOT NULL,
  timestamp BIGINT NOT NULL,
  admin_fee DECIMAL(15, 2) DEFAULT 0,
  payment_details JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 5. PPOB Services Table (Price List Cache)
CREATE TABLE IF NOT EXISTS public.ppob_services (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  category TEXT NOT NULL,
  code TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  provider TEXT DEFAULT 'Tripay',
  base_price BIGINT NOT NULL,
  markup_price BIGINT DEFAULT 0,
  admin_fee BIGINT DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. PPOB Transactions Table
CREATE TABLE IF NOT EXISTS public.ppob_transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  reference TEXT UNIQUE, -- Provider Reference
  customer_number TEXT NOT NULL,
  product_name TEXT NOT NULL,
  product_code TEXT NOT NULL,
  amount DECIMAL(15, 2) NOT NULL,
  admin_fee DECIMAL(15, 2) NOT NULL,
  total DECIMAL(15, 2) NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'success', 'failed')),
  sn TEXT, -- Serial Number / Token
  notes TEXT,
  timestamp BIGINT NOT NULL,
  payment_method TEXT NOT NULL DEFAULT 'Saldo',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 7. Balance Mutations Table
CREATE TABLE IF NOT EXISTS public.balance_mutations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  amount BIGINT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('topup', 'transaction', 'refund', 'adjustment')),
  description TEXT,
  reference_id TEXT,
  previous_balance BIGINT NOT NULL,
  current_balance BIGINT NOT NULL,
  timestamp TIMESTAMPTZ DEFAULT NOW()
);

-- 8. Suppliers Table
CREATE TABLE IF NOT EXISTS public.suppliers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  contact_name TEXT,
  phone TEXT,
  email TEXT,
  address TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 9. Clients Table
CREATE TABLE IF NOT EXISTS public.clients (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  address TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 10. Store Settings Table
CREATE TABLE IF NOT EXISTS public.store_settings (
  id TEXT PRIMARY KEY DEFAULT 'default-settings',
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
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

-- 11. Payment QRs Table
CREATE TABLE IF NOT EXISTS public.payment_qrs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  provider TEXT NOT NULL,
  image_url TEXT NOT NULL,
  account_name TEXT NOT NULL,
  account_number TEXT,
  is_default BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 12. Vouchers Table
CREATE TABLE IF NOT EXISTS public.vouchers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  code TEXT NOT NULL UNIQUE,
  type TEXT CHECK (type IN ('percentage', 'fixed')),
  value DECIMAL(15, 2) NOT NULL,
  max_discount DECIMAL(15, 2),
  min_purchase DECIMAL(15, 2) DEFAULT 0,
  expiry_date TIMESTAMPTZ,
  usage_limit INTEGER DEFAULT 1,
  usage_count INTEGER DEFAULT 0,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'expired', 'disabled')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 13. Staff Table
CREATE TABLE IF NOT EXISTS public.staff (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  role TEXT,
  base_salary DECIMAL(15, 2) DEFAULT 0,
  commission_rate DECIMAL(5, 2) DEFAULT 0, -- Percentage
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 14. Resellers Table
CREATE TABLE IF NOT EXISTS public.resellers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  platform TEXT, -- e.g., Shopee, Tokopedia, Custom
  contact_info TEXT,
  commission_rate DECIMAL(5, 2) DEFAULT 0, -- Percentage
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 15. Commissions Table
CREATE TABLE IF NOT EXISTS public.commissions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  staff_id UUID REFERENCES public.staff(id) ON DELETE SET NULL,
  reseller_id UUID REFERENCES public.resellers(id) ON DELETE SET NULL,
  transaction_id UUID REFERENCES public.transactions(id) ON DELETE CASCADE,
  amount DECIMAL(15, 2) NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'cancelled')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =========================================================
-- FUNCTIONS & PROCEDURES
-- =========================================================

-- Function to handle atomic balance updates
CREATE OR REPLACE FUNCTION public.process_transaction(
  p_user_id UUID,
  p_amount BIGINT,
  p_type TEXT,
  p_description TEXT,
  p_reference_id TEXT
) RETURNS VOID AS $$
DECLARE
  v_old_balance BIGINT;
  v_new_balance BIGINT;
BEGIN
  -- Get current balance with lock
  SELECT balance INTO v_old_balance FROM public.profiles WHERE id = p_user_id FOR UPDATE;
  
  IF v_old_balance + p_amount < 0 AND p_amount < 0 THEN
    RAISE EXCEPTION 'Insufficient balance';
  END IF;
  
  v_new_balance := v_old_balance + p_amount;
  
  -- Update balance
  UPDATE public.profiles SET balance = v_new_balance, updated_at = NOW() WHERE id = p_user_id;
  
  -- Record mutation
  INSERT INTO public.balance_mutations (
    user_id, amount, type, description, reference_id, previous_balance, current_balance
  ) VALUES (
    p_user_id, p_amount, LOWER(p_type), p_description, p_reference_id, v_old_balance, v_new_balance
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =========================================================
-- RLS (ROW LEVEL SECURITY)
-- =========================================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ppob_services ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ppob_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.balance_mutations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.store_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_qrs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vouchers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.staff ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.resellers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.commissions ENABLE ROW LEVEL SECURITY;

-- Simple Policies: Users can only see their own data
CREATE POLICY "Users can manage their own profile" ON public.profiles FOR ALL USING (id = auth.uid());
CREATE POLICY "Users can manage their own products" ON public.products FOR ALL USING (user_id = auth.uid());
CREATE POLICY "Users can manage their own transactions" ON public.transactions FOR ALL USING (user_id = auth.uid());
CREATE POLICY "Users can manage their own ppob_transactions" ON public.ppob_transactions FOR ALL USING (user_id = auth.uid());
CREATE POLICY "Users can view their own mutations" ON public.balance_mutations FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Users can manage their own suppliers" ON public.suppliers FOR ALL USING (user_id = auth.uid());
CREATE POLICY "Users can manage their own clients" ON public.clients FOR ALL USING (user_id = auth.uid());
CREATE POLICY "Users can manage their own settings" ON public.store_settings FOR ALL USING (user_id = auth.uid());
CREATE POLICY "Users can manage their own QRs" ON public.payment_qrs FOR ALL USING (user_id = auth.uid());
CREATE POLICY "Users can manage their own vouchers" ON public.vouchers FOR ALL USING (user_id = auth.uid());
CREATE POLICY "Users can manage their own staff" ON public.staff FOR ALL USING (user_id = auth.uid());
CREATE POLICY "Users can manage their own resellers" ON public.resellers FOR ALL USING (user_id = auth.uid());
CREATE POLICY "Users can manage their own commissions" ON public.commissions FOR ALL USING (user_id = auth.uid());

-- Special Policy for PPOB Services (Public/Authenticated Read)
CREATE POLICY "Everyone authenticated can view ppob_services" ON public.ppob_services FOR SELECT TO authenticated USING (true);

-- Grant privileges to authenticated users and service role
GRANT USAGE ON SCHEMA public TO authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO service_role;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO service_role;

GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.products TO authenticated;
GRANT SELECT, INSERT ON public.transactions TO authenticated;
GRANT SELECT, INSERT ON public.ppob_transactions TO authenticated;
GRANT SELECT ON public.balance_mutations TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.suppliers TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.clients TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.store_settings TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.payment_qrs TO authenticated;
GRANT SELECT ON public.ppob_services TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.vouchers TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.staff TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.resellers TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.commissions TO authenticated;
