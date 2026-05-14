-- =========================================================
-- FINAL SUPABASE SCHEMA FOR SMART POS & PPOB (FORSDIG)
-- Includes: automatic profile creation, RLS, and admin logic
-- =========================================================

-- 1. Enable Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. Profiles Table
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  username TEXT UNIQUE,
  full_name TEXT,
  email TEXT,
  phone TEXT,
  role TEXT DEFAULT 'kasir' CHECK (role IN ('admin', 'kasir', 'reseller')),
  balance BIGINT DEFAULT 0,
  default_markup INTEGER DEFAULT 0,
  min_markup INTEGER DEFAULT 0,
  max_markup INTEGER DEFAULT 10000,
  subscription_status TEXT DEFAULT 'active',
  package_type TEXT DEFAULT 'FREE',
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
  discount DECIMAL(15, 2) DEFAULT 0,
  total DECIMAL(15, 2) NOT NULL,
  payment_method TEXT NOT NULL,
  amount_paid DECIMAL(15, 2) NOT NULL,
  change DECIMAL(15, 2) NOT NULL,
  status TEXT DEFAULT 'success',
  timestamp BIGINT NOT NULL,
  staff_id UUID,
  reseller_id UUID,
  payment_details JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 5. PPOB Services (Price List)
CREATE TABLE IF NOT EXISTS public.ppob_services (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  category TEXT NOT NULL,
  code TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  provider TEXT DEFAULT 'Tripay',
  base_price BIGINT NOT NULL,
  admin_markup BIGINT DEFAULT 0,
  selling_price BIGINT DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  description TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. PPOB Transactions
CREATE TABLE IF NOT EXISTS public.ppob_transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  reference TEXT UNIQUE,
  customer_number TEXT NOT NULL,
  product_id UUID, 
  selling_price BIGINT NOT NULL,
  profit_admin BIGINT DEFAULT 0,
  profit_user BIGINT DEFAULT 0,
  status TEXT DEFAULT 'pending',
  sn TEXT,
  details JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. Balance Mutations
CREATE TABLE IF NOT EXISTS public.balance_mutations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  amount BIGINT NOT NULL,
  type TEXT NOT NULL,
  description TEXT,
  reference_id TEXT,
  previous_balance BIGINT NOT NULL,
  current_balance BIGINT NOT NULL,
  timestamp TIMESTAMPTZ DEFAULT NOW()
);

-- 8. User Markups (Personalized Pricing)
CREATE TABLE IF NOT EXISTS public.user_markups (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  product_id UUID,
  category_name TEXT,
  markup BIGINT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, product_id),
  UNIQUE(user_id, category_name)
);

-- 9. Automatic Profile Creation Function
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, username, role, status)
  VALUES (
    new.id,
    new.email,
    new.raw_user_meta_data->>'full_name',
    COALESCE(new.raw_user_meta_data->>'username', split_part(new.email, '@', 1)),
    'kasir',
    'active'
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for New Auth Users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 10. Atomic Transaction Function (Refund/Deduct)
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
  SELECT balance INTO v_old_balance FROM public.profiles WHERE id = p_user_id FOR UPDATE;
  
  IF v_old_balance + p_amount < 0 AND p_amount < 0 THEN
    RAISE EXCEPTION 'Insufficient balance';
  END IF;
  
  v_new_balance := v_old_balance + p_amount;
  UPDATE public.profiles SET balance = v_new_balance, updated_at = NOW() WHERE id = p_user_id;
  
  INSERT INTO public.balance_mutations (
    user_id, amount, type, description, reference_id, previous_balance, current_balance
  ) VALUES (
    p_user_id, p_amount, LOWER(p_type), p_description, p_reference_id, v_old_balance, v_new_balance
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 11. Security (RLS)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ppob_services ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ppob_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.balance_mutations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_markups ENABLE ROW LEVEL SECURITY;

-- Profiles: Own profile access (SELECT/UPDATE)
CREATE POLICY "Users view own profile" ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- Admin Global Access (if profile role is admin)
-- Using a subquery instead of a direct function to avoid recursion
CREATE POLICY "Admins view all profiles" ON public.profiles FOR SELECT USING (
  (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin'
);

-- Products & Transactions: Own user_id access
CREATE POLICY "Users manage own products" ON public.products FOR ALL USING (user_id = auth.uid());
CREATE POLICY "Users manage own transactions" ON public.transactions FOR ALL USING (user_id = auth.uid());
CREATE POLICY "Users manage own ppob_transactions" ON public.ppob_transactions FOR ALL USING (user_id = auth.uid());
CREATE POLICY "Users view own mutations" ON public.balance_mutations FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Users manage own markups" ON public.user_markups FOR ALL USING (user_id = auth.uid());

-- PPOB Services: Readable by all authenticated
CREATE POLICY "Authenticated viewServices" ON public.ppob_services FOR SELECT TO authenticated USING (true);

-- Permissions
GRANT USAGE ON SCHEMA public TO authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
GRANT SELECT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.products TO authenticated;
GRANT ALL ON public.transactions TO authenticated;
GRANT ALL ON public.ppob_transactions TO authenticated;
GRANT SELECT ON public.balance_mutations TO authenticated;
GRANT ALL ON public.user_markups TO authenticated;
GRANT SELECT ON public.ppob_services TO authenticated;
