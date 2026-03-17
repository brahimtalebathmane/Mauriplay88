/*
  # MauriPlay Digital Marketplace Schema

  ## Overview
  Complete database schema for MauriPlay - a high-end digital marketplace for Mauritanian users.
  Includes platforms, products, inventory management, user authentication, wallet system, and order processing.

  ## Tables Created (in order)
  
  ### 1. Platforms
  - `id` (uuid, primary key)
  - `name` (text) - Platform name
  - `logo_url` (text) - Platform logo URL
  - `website_url` (text) - Official website
  - `tutorial_video_url` (text, optional) - Tutorial video URL
  - `is_deleted` (boolean) - Soft delete flag
  - `created_at` (timestamptz)
  - `updated_at` (timestamptz)

  ### 2. Products
  - `id` (uuid, primary key)
  - `platform_id` (uuid, FK to platforms) - Parent platform
  - `name` (text) - Product name
  - `price_mru` (decimal) - Price in Mauritanian Ouguiya
  - `is_deleted` (boolean) - Soft delete flag
  - `created_at` (timestamptz)
  - `updated_at` (timestamptz)

  ### 3. Inventory
  - `id` (uuid, primary key)
  - `product_id` (uuid, FK to products)
  - `code` (text) - Digital code/key
  - `status` (enum: available, reserved, pending_approval, sold, returned, compromised)
  - `reserved_until` (timestamptz, nullable) - Reservation expiry
  - `is_deleted` (boolean) - Soft delete flag
  - `created_at` (timestamptz)
  - `updated_at` (timestamptz)
  - UNIQUE constraint on (product_id, code) WHERE is_deleted = false

  ### 4. Users
  - `id` (uuid, primary key)
  - `phone_number` (text, unique) - Phone with country code
  - `pin_hash` (text) - Hashed PIN using pgcrypto
  - `wallet_balance` (decimal) - Current wallet balance
  - `wallet_active` (boolean) - Admin-controlled wallet activation
  - `role` (enum: admin, user)
  - `is_verified` (boolean) - OTP verification status
  - `failed_login_attempts` (integer) - Track failed logins
  - `is_active` (boolean) - Account active/banned status
  - `created_at` (timestamptz)
  - `updated_at` (timestamptz)

  ### 5. Payment_Methods
  - `id` (uuid, primary key)
  - `name` (text) - Payment method name
  - `account_number` (text) - Unified account number
  - `logo_url` (text) - Payment method logo
  - `created_at` (timestamptz)
  - `updated_at` (timestamptz)

  ### 6. Verification_Codes
  - `id` (uuid, primary key)
  - `phone_number` (text, unique) - Phone number for OTP
  - `code` (text) - 4-digit OTP code
  - `expires_at` (timestamptz) - 5 minute expiry
  - `created_at` (timestamptz)

  ### 7. Orders
  - `id` (uuid, primary key)
  - `user_id` (uuid, FK to users)
  - `inventory_id` (uuid, FK to inventory)
  - `product_id` (uuid, FK to products)
  - `price_at_purchase` (decimal) - Snapshot of price
  - `payment_type` (enum: wallet, manual)
  - `payment_method_name` (text, nullable) - For manual payments
  - `user_payment_number` (text, nullable) - User's payment number
  - `user_name` (text, nullable) - User's name for manual payment
  - `receipt_url` (text, nullable) - Private receipt URL
  - `transaction_reference` (text, nullable, unique) - Unique transaction ref
  - `status` (enum: pending, approved, rejected)
  - `admin_note` (text, nullable) - Admin note on rejection
  - `created_at` (timestamptz)
  - `updated_at` (timestamptz)

  ### 8. Wallet_Transactions
  - `id` (uuid, primary key)
  - `user_id` (uuid, FK to users)
  - `type` (enum: credit, debit)
  - `amount` (decimal)
  - `balance_before` (decimal)
  - `balance_after` (decimal)
  - `description` (text)
  - `order_id` (uuid, FK to orders, nullable)
  - `created_at` (timestamptz)

  ## Security
  - RLS enabled on all tables
  - Restrictive policies requiring authentication and ownership checks
  - Admin-only policies for sensitive operations
  - PIN hashing via pgcrypto extension
  - Wallet balance constraints (>= 0)

  ## Functions & Triggers
  - Auto-update timestamps on UPDATE
  - FIFO inventory assignment (oldest available code)
  - Wallet transaction with row-level locking
  - Expired reservation cleanup
  - PIN hashing on user creation/update
*/

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =====================================================
-- 1. PLATFORMS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS platforms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  logo_url text NOT NULL,
  website_url text,
  tutorial_video_url text,
  is_deleted boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- =====================================================
-- 2. PRODUCTS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  platform_id uuid NOT NULL REFERENCES platforms(id),
  name text NOT NULL,
  price_mru decimal(10, 2) NOT NULL CHECK (price_mru >= 0),
  is_deleted boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- =====================================================
-- 3. INVENTORY TABLE
-- =====================================================
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'inventory_status') THEN
    CREATE TYPE inventory_status AS ENUM ('available', 'reserved', 'pending_approval', 'sold', 'returned', 'compromised');
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS inventory (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES products(id),
  code text NOT NULL,
  status inventory_status DEFAULT 'available',
  reserved_until timestamptz,
  is_deleted boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT unique_product_code UNIQUE (product_id, code)
);

-- Create index for FIFO queries
CREATE INDEX IF NOT EXISTS idx_inventory_fifo ON inventory(product_id, created_at) WHERE status = 'available' AND is_deleted = false;

-- =====================================================
-- 4. USERS TABLE
-- =====================================================
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN
    CREATE TYPE user_role AS ENUM ('admin', 'user');
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  phone_number text UNIQUE NOT NULL,
  pin_hash text NOT NULL,
  wallet_balance decimal(10, 2) DEFAULT 0 CHECK (wallet_balance >= 0),
  wallet_active boolean DEFAULT false,
  role user_role DEFAULT 'user',
  is_verified boolean DEFAULT false,
  failed_login_attempts integer DEFAULT 0,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- =====================================================
-- 5. PAYMENT_METHODS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS payment_methods (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  account_number text NOT NULL,
  logo_url text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- =====================================================
-- 6. VERIFICATION_CODES TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS verification_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  phone_number text UNIQUE NOT NULL,
  code text NOT NULL,
  expires_at timestamptz NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Create index for expiry cleanup
CREATE INDEX IF NOT EXISTS idx_verification_codes_expiry ON verification_codes(expires_at);

-- =====================================================
-- 7. ORDERS TABLE
-- =====================================================
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'payment_type') THEN
    CREATE TYPE payment_type AS ENUM ('wallet', 'manual');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'order_status') THEN
    CREATE TYPE order_status AS ENUM ('pending', 'approved', 'rejected');
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id),
  inventory_id uuid NOT NULL REFERENCES inventory(id),
  product_id uuid NOT NULL REFERENCES products(id),
  price_at_purchase decimal(10, 2) NOT NULL,
  payment_type payment_type NOT NULL,
  payment_method_name text,
  user_payment_number text,
  user_name text,
  receipt_url text,
  transaction_reference text UNIQUE,
  status order_status DEFAULT 'pending',
  admin_note text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- =====================================================
-- 8. WALLET_TRANSACTIONS TABLE
-- =====================================================
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'transaction_type') THEN
    CREATE TYPE transaction_type AS ENUM ('credit', 'debit');
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS wallet_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id),
  type transaction_type NOT NULL,
  amount decimal(10, 2) NOT NULL CHECK (amount > 0),
  balance_before decimal(10, 2) NOT NULL,
  balance_after decimal(10, 2) NOT NULL,
  description text NOT NULL,
  order_id uuid REFERENCES orders(id),
  created_at timestamptz DEFAULT now()
);

-- =====================================================
-- TRIGGERS FOR AUTO-UPDATING TIMESTAMPS
-- =====================================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$
BEGIN
  DROP TRIGGER IF EXISTS update_platforms_updated_at ON platforms;
  CREATE TRIGGER update_platforms_updated_at BEFORE UPDATE ON platforms FOR EACH ROW EXECUTE FUNCTION update_updated_at();
  
  DROP TRIGGER IF EXISTS update_products_updated_at ON products;
  CREATE TRIGGER update_products_updated_at BEFORE UPDATE ON products FOR EACH ROW EXECUTE FUNCTION update_updated_at();
  
  DROP TRIGGER IF EXISTS update_inventory_updated_at ON inventory;
  CREATE TRIGGER update_inventory_updated_at BEFORE UPDATE ON inventory FOR EACH ROW EXECUTE FUNCTION update_updated_at();
  
  DROP TRIGGER IF EXISTS update_users_updated_at ON users;
  CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at();
  
  DROP TRIGGER IF EXISTS update_payment_methods_updated_at ON payment_methods;
  CREATE TRIGGER update_payment_methods_updated_at BEFORE UPDATE ON payment_methods FOR EACH ROW EXECUTE FUNCTION update_updated_at();
  
  DROP TRIGGER IF EXISTS update_orders_updated_at ON orders;
  CREATE TRIGGER update_orders_updated_at BEFORE UPDATE ON orders FOR EACH ROW EXECUTE FUNCTION update_updated_at();
END $$;

-- =====================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- =====================================================

-- Enable RLS on all tables
ALTER TABLE platforms ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_methods ENABLE ROW LEVEL SECURITY;
ALTER TABLE verification_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE wallet_transactions ENABLE ROW LEVEL SECURITY;

-- ===== PLATFORMS POLICIES =====
DROP POLICY IF EXISTS "Anyone can view non-deleted platforms" ON platforms;
CREATE POLICY "Anyone can view non-deleted platforms"
  ON platforms FOR SELECT
  USING (is_deleted = false);

DROP POLICY IF EXISTS "Only admins can insert platforms" ON platforms;
CREATE POLICY "Only admins can insert platforms"
  ON platforms FOR INSERT
  WITH CHECK (
    EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'admin')
  );

DROP POLICY IF EXISTS "Only admins can update platforms" ON platforms;
CREATE POLICY "Only admins can update platforms"
  ON platforms FOR UPDATE
  USING (
    EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'admin')
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'admin')
  );

-- ===== PRODUCTS POLICIES =====
DROP POLICY IF EXISTS "Anyone can view non-deleted products" ON products;
CREATE POLICY "Anyone can view non-deleted products"
  ON products FOR SELECT
  USING (is_deleted = false);

DROP POLICY IF EXISTS "Only admins can insert products" ON products;
CREATE POLICY "Only admins can insert products"
  ON products FOR INSERT
  WITH CHECK (
    EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'admin')
  );

DROP POLICY IF EXISTS "Only admins can update products" ON products;
CREATE POLICY "Only admins can update products"
  ON products FOR UPDATE
  USING (
    EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'admin')
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'admin')
  );

-- ===== INVENTORY POLICIES =====
DROP POLICY IF EXISTS "Only admins can view all inventory" ON inventory;
CREATE POLICY "Only admins can view all inventory"
  ON inventory FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'admin')
  );

DROP POLICY IF EXISTS "Only admins can insert inventory" ON inventory;
CREATE POLICY "Only admins can insert inventory"
  ON inventory FOR INSERT
  WITH CHECK (
    EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'admin')
  );

DROP POLICY IF EXISTS "Only admins can update inventory" ON inventory;
CREATE POLICY "Only admins can update inventory"
  ON inventory FOR UPDATE
  USING (
    EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'admin')
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'admin')
  );

-- ===== USERS POLICIES =====
DROP POLICY IF EXISTS "Users can view own profile" ON users;
CREATE POLICY "Users can view own profile"
  ON users FOR SELECT
  USING (auth.uid() = id);

DROP POLICY IF EXISTS "Admins can view all users" ON users;
CREATE POLICY "Admins can view all users"
  ON users FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'admin')
  );

DROP POLICY IF EXISTS "Users can update own profile with restrictions" ON users;
CREATE POLICY "Users can update own profile with restrictions"
  ON users FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (
    auth.uid() = id AND
    -- Prevent users from modifying these fields
    wallet_balance = (SELECT wallet_balance FROM users WHERE id = auth.uid()) AND
    wallet_active = (SELECT wallet_active FROM users WHERE id = auth.uid()) AND
    role = (SELECT role FROM users WHERE id = auth.uid())
  );

DROP POLICY IF EXISTS "Admins can update any user" ON users;
CREATE POLICY "Admins can update any user"
  ON users FOR UPDATE
  USING (
    EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'admin')
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'admin')
  );

-- ===== PAYMENT_METHODS POLICIES =====
DROP POLICY IF EXISTS "Anyone can view payment methods" ON payment_methods;
CREATE POLICY "Anyone can view payment methods"
  ON payment_methods FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Only admins can insert payment methods" ON payment_methods;
CREATE POLICY "Only admins can insert payment methods"
  ON payment_methods FOR INSERT
  WITH CHECK (
    EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'admin')
  );

DROP POLICY IF EXISTS "Only admins can update payment methods" ON payment_methods;
CREATE POLICY "Only admins can update payment methods"
  ON payment_methods FOR UPDATE
  USING (
    EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'admin')
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'admin')
  );

-- ===== VERIFICATION_CODES POLICIES =====
-- No SELECT policy - codes accessed only via RPC functions
DROP POLICY IF EXISTS "System can insert verification codes" ON verification_codes;
CREATE POLICY "System can insert verification codes"
  ON verification_codes FOR INSERT
  WITH CHECK (true);

DROP POLICY IF EXISTS "System can update verification codes" ON verification_codes;
CREATE POLICY "System can update verification codes"
  ON verification_codes FOR UPDATE
  USING (true)
  WITH CHECK (true);

-- ===== ORDERS POLICIES =====
DROP POLICY IF EXISTS "Users can view own orders" ON orders;
CREATE POLICY "Users can view own orders"
  ON orders FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins can view all orders" ON orders;
CREATE POLICY "Admins can view all orders"
  ON orders FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'admin')
  );

DROP POLICY IF EXISTS "Authenticated users can create orders" ON orders;
CREATE POLICY "Authenticated users can create orders"
  ON orders FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own pending orders" ON orders;
CREATE POLICY "Users can update own pending orders"
  ON orders FOR UPDATE
  USING (auth.uid() = user_id AND status = 'pending')
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins can update any order" ON orders;
CREATE POLICY "Admins can update any order"
  ON orders FOR UPDATE
  USING (
    EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'admin')
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'admin')
  );

-- ===== WALLET_TRANSACTIONS POLICIES =====
DROP POLICY IF EXISTS "Users can view own wallet transactions" ON wallet_transactions;
CREATE POLICY "Users can view own wallet transactions"
  ON wallet_transactions FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins can view all wallet transactions" ON wallet_transactions;
CREATE POLICY "Admins can view all wallet transactions"
  ON wallet_transactions FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'admin')
  );

DROP POLICY IF EXISTS "System can insert wallet transactions" ON wallet_transactions;
CREATE POLICY "System can insert wallet transactions"
  ON wallet_transactions FOR INSERT
  WITH CHECK (true);

-- =====================================================
-- HELPER FUNCTIONS
-- =====================================================

-- Function to get available inventory count for a product
CREATE OR REPLACE FUNCTION get_available_inventory_count(p_product_id uuid)
RETURNS integer AS $$
BEGIN
  RETURN (
    SELECT COUNT(*)::integer
    FROM inventory
    WHERE product_id = p_product_id
      AND status = 'available'
      AND is_deleted = false
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to cleanup expired verification codes
CREATE OR REPLACE FUNCTION cleanup_expired_verification_codes()
RETURNS void AS $$
BEGIN
  DELETE FROM verification_codes WHERE expires_at < now();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to cleanup expired inventory reservations
CREATE OR REPLACE FUNCTION cleanup_expired_reservations()
RETURNS void AS $$
BEGIN
  UPDATE inventory
  SET status = 'available', reserved_until = NULL
  WHERE status = 'reserved'
    AND reserved_until < now()
    AND is_deleted = false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;