-- Schema for FORSDIGPOS PPOB Integration (Production Grade)

-- 1. Profiles (Extends auth.users)
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

-- Ensure consistent naming and columns for profiles
DO $$ 
BEGIN 
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='profiles' AND column_name='balance') THEN
    ALTER TABLE public.profiles ADD COLUMN balance BIGINT DEFAULT 0;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='profiles' AND column_name='role') THEN
    ALTER TABLE public.profiles ADD COLUMN role TEXT DEFAULT 'kasir';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='profiles' AND column_name='status') THEN
    ALTER TABLE public.profiles ADD COLUMN status TEXT DEFAULT 'active';
  END IF;
END $$;

-- 2. Outlets
CREATE TABLE IF NOT EXISTS public.outlets (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  address TEXT,
  phone TEXT,
  owner_id UUID REFERENCES public.profiles(id),
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. PPOB Services (Cached products from Tripay)
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

-- Ensure consistent naming for services
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='ppob_services' AND column_name='is_active') THEN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='ppob_services' AND column_name='active') THEN
       ALTER TABLE public.ppob_services RENAME COLUMN active TO is_active;
    ELSE
       ALTER TABLE public.ppob_services ADD COLUMN is_active BOOLEAN DEFAULT TRUE;
    END IF;
  END IF;
END $$;

-- 4. PPOB Transactions
CREATE TABLE IF NOT EXISTS public.ppob_transactions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) NOT NULL,
  outlet_id UUID REFERENCES public.outlets(id),
  service_id UUID REFERENCES public.ppob_services(id),
  customer_number TEXT NOT NULL, -- Target number
  product_name TEXT NOT NULL,
  product_code TEXT NOT NULL,
  base_price BIGINT NOT NULL,
  markup BIGINT DEFAULT 0,
  admin_fee BIGINT DEFAULT 0,
  total BIGINT NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'success', 'failed')),
  reference TEXT UNIQUE, -- Tripay Ref
  sn TEXT, -- Serial Number / Token
  payment_method TEXT DEFAULT 'Saldo',
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Balance Mutations
CREATE TABLE IF NOT EXISTS public.balance_mutations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) NOT NULL,
  amount BIGINT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('topup', 'transaction', 'refund', 'adjustment')),
  description TEXT,
  reference_id TEXT,
  previous_balance BIGINT NOT NULL,
  current_balance BIGINT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- --- SECURITY & PERMISSIONS ---

-- Disable all public access from anon
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM anon;
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA public FROM anon;

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.outlets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ppob_services ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ppob_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.balance_mutations ENABLE ROW LEVEL SECURITY;

-- Grant usage and default privileges
GRANT USAGE ON SCHEMA public TO authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON FUNCTIONS TO service_role;

-- Grant explicit privileges on existing tables
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO service_role;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO service_role;

GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT SELECT ON public.outlets TO authenticated;
GRANT SELECT ON public.ppob_services TO authenticated;
GRANT SELECT, INSERT ON public.ppob_transactions TO authenticated;
GRANT SELECT ON public.balance_mutations TO authenticated;

-- --- RLS POLICIES ---

-- Profiles: Users see only their own data
DROP POLICY IF EXISTS "Allow all for profiles" ON public.profiles;
CREATE POLICY "Users can view own profile" ON public.profiles
  FOR SELECT TO authenticated USING (id = auth.uid());

CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE TO authenticated USING (id = auth.uid());

-- Outlets: Users see active outlets
DROP POLICY IF EXISTS "Allow all for outlets" ON public.outlets;
CREATE POLICY "Users can view outlets" ON public.outlets
  FOR SELECT TO authenticated USING (is_active = TRUE);

-- Services: Everyone authenticated can see active services
DROP POLICY IF EXISTS "Allow all for ppob_services" ON public.ppob_services;
CREATE POLICY "Users can view active services" ON public.ppob_services
  FOR SELECT TO authenticated USING (is_active = TRUE);

-- Transactions: Users see only their own transactions
DROP POLICY IF EXISTS "Allow all for ppob_transactions" ON public.ppob_transactions;
CREATE POLICY "Users can view own transactions" ON public.ppob_transactions
  FOR SELECT TO authenticated USING (user_id = auth.uid());

CREATE POLICY "Users can insert own transactions" ON public.ppob_transactions
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

-- Mutations: Users see only their own history
DROP POLICY IF EXISTS "Allow all for balance_mutations" ON public.balance_mutations;
CREATE POLICY "Users can view own mutations" ON public.balance_mutations
  FOR SELECT TO authenticated USING (user_id = auth.uid());

-- --- SHARED FUNCTIONS ---

-- Function to handle balance update and mutation recording (PRC)
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
  
  IF v_old_balance + p_amount < 0 THEN
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

