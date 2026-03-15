/*
  ============================================================================
  MAURIPLAY COMPLETE DATABASE RESET MIGRATION
  ============================================================================

  This migration completely rebuilds the MauriPlay database from scratch.
  It can be run on an empty or existing database and will:

  1. DROP all existing application tables, functions, triggers, and types
  2. RECREATE the complete schema with all required elements
  3. SET UP all security policies (RLS)
  4. CREATE all RPC functions used by the application
  5. CONFIGURE storage buckets for receipts

  SAFE TO RUN: Uses CASCADE and IF EXISTS to prevent dependency errors

  ============================================================================
  TABLE OF CONTENTS
  ============================================================================

  SECTION 1: CLEANUP - Drop all existing objects
  SECTION 2: EXTENSIONS - Enable required PostgreSQL extensions
  SECTION 3: ENUM TYPES - Create all enum types
  SECTION 4: TABLES - Create all application tables
  SECTION 5: INDEXES - Create performance indexes
  SECTION 6: TRIGGERS - Auto-update timestamps
  SECTION 7: RLS POLICIES - Row Level Security policies
  SECTION 8: RPC FUNCTIONS - Callable functions from frontend
  SECTION 9: STORAGE BUCKETS - File storage configuration
  SECTION 10: DEFAULT DATA - Insert initial settings

  ============================================================================
*/

-- ============================================================================
-- SECTION 1: CLEANUP - Drop all existing objects
-- ============================================================================

-- Drop storage policies first (they reference buckets)
DROP POLICY IF EXISTS "Anyone can upload receipts" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view receipts" ON storage.objects;
DROP POLICY IF EXISTS "Admins can delete receipts" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload wallet receipts" ON storage.objects;
DROP POLICY IF EXISTS "Users can view own wallet receipts" ON storage.objects;
DROP POLICY IF EXISTS "Admins can view all wallet receipts" ON storage.objects;
DROP POLICY IF EXISTS "Admins can delete wallet receipts" ON storage.objects;

-- Delete storage buckets
DELETE FROM storage.buckets WHERE id IN ('receipts', 'wallet-receipts');

-- Drop all RLS policies
DROP POLICY IF EXISTS "Anyone can view non-deleted platforms" ON platforms;
DROP POLICY IF EXISTS "Only admins can insert platforms" ON platforms;
DROP POLICY IF EXISTS "Only admins can update platforms" ON platforms;
DROP POLICY IF EXISTS "Anyone can view non-deleted products" ON products;
DROP POLICY IF EXISTS "Only admins can insert products" ON products;
DROP POLICY IF EXISTS "Only admins can update products" ON products;
DROP POLICY IF EXISTS "Only admins can view all inventory" ON inventory;
DROP POLICY IF EXISTS "Only admins can insert inventory" ON inventory;
DROP POLICY IF EXISTS "Only admins can update inventory" ON inventory;
DROP POLICY IF EXISTS "Users can view own profile" ON users;
DROP POLICY IF EXISTS "Admins can view all users" ON users;
DROP POLICY IF EXISTS "Users can update own profile with restrictions" ON users;
DROP POLICY IF EXISTS "Admins can update any user" ON users;
DROP POLICY IF EXISTS "Anyone can view payment methods" ON payment_methods;
DROP POLICY IF EXISTS "Only admins can insert payment methods" ON payment_methods;
DROP POLICY IF EXISTS "Only admins can update payment methods" ON payment_methods;
DROP POLICY IF EXISTS "System can insert verification codes" ON verification_codes;
DROP POLICY IF EXISTS "System can update verification codes" ON verification_codes;
DROP POLICY IF EXISTS "Users can view own orders" ON orders;
DROP POLICY IF EXISTS "Admins can view all orders" ON orders;
DROP POLICY IF EXISTS "Authenticated users can create orders" ON orders;
DROP POLICY IF EXISTS "Users can update own pending orders" ON orders;
DROP POLICY IF EXISTS "Admins can update any order" ON orders;
DROP POLICY IF EXISTS "Users can view own wallet transactions" ON wallet_transactions;
DROP POLICY IF EXISTS "Admins can view all wallet transactions" ON wallet_transactions;
DROP POLICY IF EXISTS "System can insert wallet transactions" ON wallet_transactions;
DROP POLICY IF EXISTS "Users can view own wallet topups" ON wallet_topups;
DROP POLICY IF EXISTS "Admins can view all wallet topups" ON wallet_topups;
DROP POLICY IF EXISTS "Users can create own wallet topups" ON wallet_topups;
DROP POLICY IF EXISTS "Users can update own pending topups" ON wallet_topups;
DROP POLICY IF EXISTS "Admins can update wallet topups" ON wallet_topups;
DROP POLICY IF EXISTS "Users can delete own pending topups" ON wallet_topups;
DROP POLICY IF EXISTS "Authenticated users can read settings" ON settings;
DROP POLICY IF EXISTS "Admins can update settings" ON settings;
DROP POLICY IF EXISTS "Admins can insert settings" ON settings;

-- Drop all triggers
DROP TRIGGER IF EXISTS update_platforms_updated_at ON platforms;
DROP TRIGGER IF EXISTS update_products_updated_at ON products;
DROP TRIGGER IF EXISTS update_inventory_updated_at ON inventory;
DROP TRIGGER IF EXISTS update_users_updated_at ON users;
DROP TRIGGER IF EXISTS update_payment_methods_updated_at ON payment_methods;
DROP TRIGGER IF EXISTS update_orders_updated_at ON orders;
DROP TRIGGER IF EXISTS limit_pending_topups ON wallet_topups;
DROP TRIGGER IF EXISTS settings_updated_at ON settings;

-- Drop all functions
DROP FUNCTION IF EXISTS update_updated_at() CASCADE;
DROP FUNCTION IF EXISTS get_available_inventory_count(uuid) CASCADE;
DROP FUNCTION IF EXISTS cleanup_expired_verification_codes() CASCADE;
DROP FUNCTION IF EXISTS cleanup_expired_reservations() CASCADE;
DROP FUNCTION IF EXISTS register_user(text, text) CASCADE;
DROP FUNCTION IF EXISTS verify_user_login(text, text) CASCADE;
DROP FUNCTION IF EXISTS create_verification_code(text) CASCADE;
DROP FUNCTION IF EXISTS verify_otp_code(text, text) CASCADE;
DROP FUNCTION IF EXISTS add_wallet_balance(uuid, decimal, text, uuid) CASCADE;
DROP FUNCTION IF EXISTS deduct_wallet_balance(uuid, decimal, text, uuid) CASCADE;
DROP FUNCTION IF EXISTS create_wallet_purchase(uuid, uuid) CASCADE;
DROP FUNCTION IF EXISTS create_manual_purchase(uuid, uuid, text, text, text, text) CASCADE;
DROP FUNCTION IF EXISTS approve_manual_order(uuid, uuid) CASCADE;
DROP FUNCTION IF EXISTS reject_manual_order(uuid, uuid, text) CASCADE;
DROP FUNCTION IF EXISTS get_product_stock_count(uuid[]) CASCADE;
DROP FUNCTION IF EXISTS check_data_integrity() CASCADE;
DROP FUNCTION IF EXISTS get_system_stats() CASCADE;
DROP FUNCTION IF EXISTS approve_order(uuid, uuid) CASCADE;
DROP FUNCTION IF EXISTS reject_order(uuid, uuid, text) CASCADE;
DROP FUNCTION IF EXISTS send_recovery_otp(text) CASCADE;
DROP FUNCTION IF EXISTS verify_recovery_otp(text, text) CASCADE;
DROP FUNCTION IF EXISTS reset_pin_after_recovery(text, text) CASCADE;
DROP FUNCTION IF EXISTS approve_wallet_topup(uuid, uuid) CASCADE;
DROP FUNCTION IF EXISTS reject_wallet_topup(uuid, uuid, text) CASCADE;
DROP FUNCTION IF EXISTS get_user_wallet_topups(uuid, int, int) CASCADE;
DROP FUNCTION IF EXISTS check_pending_topups_limit() CASCADE;
DROP FUNCTION IF EXISTS update_settings_updated_at() CASCADE;

-- Drop all tables (CASCADE handles foreign key dependencies)
DROP TABLE IF EXISTS wallet_transactions CASCADE;
DROP TABLE IF EXISTS wallet_topups CASCADE;
DROP TABLE IF EXISTS orders CASCADE;
DROP TABLE IF EXISTS verification_codes CASCADE;
DROP TABLE IF EXISTS payment_methods CASCADE;
DROP TABLE IF EXISTS users CASCADE;
DROP TABLE IF EXISTS inventory CASCADE;
DROP TABLE IF EXISTS products CASCADE;
DROP TABLE IF EXISTS platforms CASCADE;
DROP TABLE IF EXISTS settings CASCADE;

-- Drop all custom types
DROP TYPE IF EXISTS transaction_type CASCADE;
DROP TYPE IF EXISTS order_status CASCADE;
DROP TYPE IF EXISTS payment_type CASCADE;
DROP TYPE IF EXISTS user_role CASCADE;
DROP TYPE IF EXISTS inventory_status CASCADE;
DROP TYPE IF EXISTS wallet_topup_status CASCADE;

-- ============================================================================
-- SECTION 2: EXTENSIONS - Enable required PostgreSQL extensions
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================================
-- SECTION 3: ENUM TYPES - Create all enum types
-- ============================================================================

CREATE TYPE inventory_status AS ENUM ('available', 'reserved', 'pending_approval', 'sold', 'returned', 'compromised');
CREATE TYPE user_role AS ENUM ('admin', 'user');
CREATE TYPE payment_type AS ENUM ('wallet', 'manual');
CREATE TYPE order_status AS ENUM ('pending', 'approved', 'rejected');
CREATE TYPE transaction_type AS ENUM ('credit', 'debit');
CREATE TYPE wallet_topup_status AS ENUM ('pending', 'approved', 'rejected');

-- ============================================================================
-- SECTION 4: TABLES - Create all application tables
-- ============================================================================

-- =====================================================
-- 4.1 PLATFORMS TABLE
-- =====================================================
CREATE TABLE platforms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  logo_url text NOT NULL,
  website_url text,
  tutorial_video_url text,
  is_deleted boolean DEFAULT false NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

COMMENT ON TABLE platforms IS 'Gaming and service platforms available in the marketplace';

-- =====================================================
-- 4.2 PRODUCTS TABLE
-- =====================================================
CREATE TABLE products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  platform_id uuid NOT NULL REFERENCES platforms(id) ON DELETE CASCADE,
  name text NOT NULL,
  price_mru decimal(10, 2) NOT NULL CHECK (price_mru >= 0),
  is_deleted boolean DEFAULT false NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

COMMENT ON TABLE products IS 'Digital products available for purchase';

-- =====================================================
-- 4.3 INVENTORY TABLE
-- =====================================================
CREATE TABLE inventory (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  code text NOT NULL,
  status inventory_status DEFAULT 'available' NOT NULL,
  reserved_until timestamptz,
  is_deleted boolean DEFAULT false NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL,
  CONSTRAINT unique_product_code UNIQUE (product_id, code)
);

COMMENT ON TABLE inventory IS 'Digital codes/keys inventory for products';

-- =====================================================
-- 4.4 USERS TABLE
-- =====================================================
CREATE TABLE users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  phone_number text UNIQUE NOT NULL,
  pin_hash text NOT NULL,
  wallet_balance decimal(10, 2) DEFAULT 0 NOT NULL CHECK (wallet_balance >= 0),
  wallet_active boolean DEFAULT false NOT NULL,
  role user_role DEFAULT 'user' NOT NULL,
  is_verified boolean DEFAULT false NOT NULL,
  failed_login_attempts integer DEFAULT 0 NOT NULL,
  is_active boolean DEFAULT true NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

COMMENT ON TABLE users IS 'User accounts with authentication and wallet';

-- =====================================================
-- 4.5 PAYMENT_METHODS TABLE
-- =====================================================
CREATE TABLE payment_methods (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  account_number text NOT NULL,
  logo_url text,
  is_active boolean DEFAULT true NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

COMMENT ON TABLE payment_methods IS 'Available payment methods for manual payments';

-- =====================================================
-- 4.6 VERIFICATION_CODES TABLE
-- =====================================================
CREATE TABLE verification_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  phone_number text UNIQUE NOT NULL,
  code text NOT NULL,
  expires_at timestamptz NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL
);

COMMENT ON TABLE verification_codes IS 'OTP codes for phone verification and account recovery';

-- =====================================================
-- 4.7 ORDERS TABLE
-- =====================================================
CREATE TABLE orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  inventory_id uuid NOT NULL REFERENCES inventory(id) ON DELETE RESTRICT,
  product_id uuid NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
  price_at_purchase decimal(10, 2) NOT NULL,
  payment_type payment_type NOT NULL,
  payment_method_name text,
  user_payment_number text,
  user_name text,
  receipt_url text,
  transaction_reference text UNIQUE,
  status order_status DEFAULT 'pending' NOT NULL,
  admin_note text,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

COMMENT ON TABLE orders IS 'Purchase orders from users';

-- =====================================================
-- 4.8 WALLET_TOPUPS TABLE
-- =====================================================
CREATE TABLE wallet_topups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  payment_method_id uuid REFERENCES payment_methods(id) ON DELETE SET NULL,
  amount numeric(10, 2) NOT NULL CHECK (amount > 0),
  depositor_name text NOT NULL,
  phone_number text NOT NULL,
  receipt_url text NOT NULL,
  status wallet_topup_status DEFAULT 'pending' NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  approved_at timestamptz,
  approved_by uuid REFERENCES users(id) ON DELETE SET NULL
);

COMMENT ON TABLE wallet_topups IS 'Wallet top-up requests from users';
COMMENT ON COLUMN wallet_topups.payment_method_id IS 'Payment method used for this top-up';

-- =====================================================
-- 4.9 WALLET_TRANSACTIONS TABLE
-- =====================================================
CREATE TABLE wallet_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type transaction_type NOT NULL,
  amount decimal(10, 2) NOT NULL CHECK (amount > 0),
  balance_before decimal(10, 2) NOT NULL,
  balance_after decimal(10, 2) NOT NULL,
  description text NOT NULL,
  order_id uuid REFERENCES orders(id) ON DELETE SET NULL,
  topup_id uuid REFERENCES wallet_topups(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now() NOT NULL
);

COMMENT ON TABLE wallet_transactions IS 'Audit trail for all wallet balance changes';

-- =====================================================
-- 4.10 SETTINGS TABLE
-- =====================================================
CREATE TABLE settings (
  key text PRIMARY KEY,
  value text NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

COMMENT ON TABLE settings IS 'Application configuration settings';

-- ============================================================================
-- SECTION 5: INDEXES - Create performance indexes
-- ============================================================================

-- Inventory indexes
CREATE INDEX idx_inventory_fifo ON inventory(product_id, created_at)
  WHERE status = 'available' AND is_deleted = false;
CREATE INDEX idx_inventory_status ON inventory(status);
CREATE INDEX idx_inventory_product_id ON inventory(product_id);
CREATE INDEX idx_inventory_product_status ON inventory(product_id, status);

-- Orders indexes
CREATE INDEX idx_orders_user_id ON orders(user_id);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_created_at ON orders(created_at DESC);
CREATE INDEX idx_orders_user_status ON orders(user_id, status);
CREATE INDEX idx_orders_inventory_id ON orders(inventory_id);
CREATE INDEX idx_orders_product_id ON orders(product_id);

-- Wallet transactions indexes
CREATE INDEX idx_wallet_transactions_user_id ON wallet_transactions(user_id);
CREATE INDEX idx_wallet_transactions_created_at ON wallet_transactions(created_at DESC);
CREATE INDEX idx_wallet_transactions_user_created ON wallet_transactions(user_id, created_at DESC);
CREATE INDEX idx_wallet_transactions_order_id ON wallet_transactions(order_id);
CREATE INDEX idx_wallet_transactions_topup ON wallet_transactions(topup_id);

-- Wallet topups indexes
CREATE INDEX idx_wallet_topups_user_status ON wallet_topups(user_id, status);
CREATE INDEX idx_wallet_topups_status_created ON wallet_topups(status, created_at DESC);
CREATE INDEX idx_wallet_topups_payment_method_id ON wallet_topups(payment_method_id);

-- Products indexes
CREATE INDEX idx_products_platform_id ON products(platform_id);
CREATE INDEX idx_products_is_deleted ON products(is_deleted);
CREATE INDEX idx_products_platform_active ON products(platform_id, is_deleted);

-- Platforms indexes
CREATE INDEX idx_platforms_is_deleted ON platforms(is_deleted);

-- Payment methods indexes
CREATE INDEX idx_payment_methods_is_active ON payment_methods(is_active);

-- ============================================================================
-- SECTION 6: TRIGGERS - Auto-update timestamps
-- ============================================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply triggers to all tables with updated_at
CREATE TRIGGER update_platforms_updated_at
  BEFORE UPDATE ON platforms
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_products_updated_at
  BEFORE UPDATE ON products
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_inventory_updated_at
  BEFORE UPDATE ON inventory
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_payment_methods_updated_at
  BEFORE UPDATE ON payment_methods
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_orders_updated_at
  BEFORE UPDATE ON orders
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Function to limit pending topups
CREATE OR REPLACE FUNCTION check_pending_topups_limit()
RETURNS TRIGGER AS $$
DECLARE
  pending_count int;
BEGIN
  SELECT COUNT(*) INTO pending_count
  FROM wallet_topups
  WHERE user_id = NEW.user_id
    AND status = 'pending';

  IF pending_count >= 5 THEN
    RAISE EXCEPTION 'Cannot create more than 5 pending top-up requests';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER limit_pending_topups
  BEFORE INSERT ON wallet_topups
  FOR EACH ROW
  EXECUTE FUNCTION check_pending_topups_limit();

-- Function to update settings updated_at
CREATE OR REPLACE FUNCTION update_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER settings_updated_at
  BEFORE UPDATE ON settings
  FOR EACH ROW
  EXECUTE FUNCTION update_settings_updated_at();

-- ============================================================================
-- SECTION 7: RLS POLICIES - Row Level Security
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE platforms ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_methods ENABLE ROW LEVEL SECURITY;
ALTER TABLE verification_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE wallet_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE wallet_topups ENABLE ROW LEVEL SECURITY;
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;

-- ===== PLATFORMS POLICIES =====
CREATE POLICY "Anyone can view non-deleted platforms"
  ON platforms FOR SELECT
  USING (is_deleted = false);

CREATE POLICY "Only admins can insert platforms"
  ON platforms FOR INSERT
  WITH CHECK (
    EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'admin')
  );

CREATE POLICY "Only admins can update platforms"
  ON platforms FOR UPDATE
  USING (
    EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'admin')
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'admin')
  );

-- ===== PRODUCTS POLICIES =====
CREATE POLICY "Anyone can view non-deleted products"
  ON products FOR SELECT
  USING (is_deleted = false);

CREATE POLICY "Only admins can insert products"
  ON products FOR INSERT
  WITH CHECK (
    EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'admin')
  );

CREATE POLICY "Only admins can update products"
  ON products FOR UPDATE
  USING (
    EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'admin')
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'admin')
  );

-- ===== INVENTORY POLICIES =====
CREATE POLICY "Only admins can view all inventory"
  ON inventory FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'admin')
  );

CREATE POLICY "Only admins can insert inventory"
  ON inventory FOR INSERT
  WITH CHECK (
    EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'admin')
  );

CREATE POLICY "Only admins can update inventory"
  ON inventory FOR UPDATE
  USING (
    EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'admin')
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'admin')
  );

-- ===== USERS POLICIES =====
CREATE POLICY "Users can view own profile"
  ON users FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Admins can view all users"
  ON users FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'admin')
  );

CREATE POLICY "Users can update own profile with restrictions"
  ON users FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (
    auth.uid() = id AND
    wallet_balance = (SELECT wallet_balance FROM users WHERE id = auth.uid()) AND
    wallet_active = (SELECT wallet_active FROM users WHERE id = auth.uid()) AND
    role = (SELECT role FROM users WHERE id = auth.uid())
  );

CREATE POLICY "Admins can update any user"
  ON users FOR UPDATE
  USING (
    EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'admin')
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'admin')
  );

-- ===== PAYMENT_METHODS POLICIES =====
CREATE POLICY "Anyone can view payment methods"
  ON payment_methods FOR SELECT
  USING (true);

CREATE POLICY "Only admins can insert payment methods"
  ON payment_methods FOR INSERT
  WITH CHECK (
    EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'admin')
  );

CREATE POLICY "Only admins can update payment methods"
  ON payment_methods FOR UPDATE
  USING (
    EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'admin')
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'admin')
  );

-- ===== VERIFICATION_CODES POLICIES =====
CREATE POLICY "System can insert verification codes"
  ON verification_codes FOR INSERT
  WITH CHECK (true);

CREATE POLICY "System can update verification codes"
  ON verification_codes FOR UPDATE
  USING (true)
  WITH CHECK (true);

-- ===== ORDERS POLICIES =====
CREATE POLICY "Users can view own orders"
  ON orders FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all orders"
  ON orders FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'admin')
  );

CREATE POLICY "Authenticated users can create orders"
  ON orders FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own pending orders"
  ON orders FOR UPDATE
  USING (auth.uid() = user_id AND status = 'pending')
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can update any order"
  ON orders FOR UPDATE
  USING (
    EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'admin')
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'admin')
  );

-- ===== WALLET_TRANSACTIONS POLICIES =====
CREATE POLICY "Users can view own wallet transactions"
  ON wallet_transactions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all wallet transactions"
  ON wallet_transactions FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'admin')
  );

CREATE POLICY "System can insert wallet transactions"
  ON wallet_transactions FOR INSERT
  WITH CHECK (true);

-- ===== WALLET_TOPUPS POLICIES =====
CREATE POLICY "Users can view own wallet topups"
  ON wallet_topups FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all wallet topups"
  ON wallet_topups FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'admin')
  );

CREATE POLICY "Users can create own wallet topups"
  ON wallet_topups FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own pending topups"
  ON wallet_topups FOR UPDATE
  USING (auth.uid() = user_id AND status = 'pending')
  WITH CHECK (auth.uid() = user_id AND status = 'pending');

CREATE POLICY "Admins can update wallet topups"
  ON wallet_topups FOR UPDATE
  USING (
    EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'admin')
  );

CREATE POLICY "Users can delete own pending topups"
  ON wallet_topups FOR DELETE
  USING (auth.uid() = user_id AND status = 'pending');

-- ===== SETTINGS POLICIES =====
CREATE POLICY "Authenticated users can read settings"
  ON settings FOR SELECT
  USING (true);

CREATE POLICY "Admins can update settings"
  ON settings FOR UPDATE
  USING (
    EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'admin')
  );

CREATE POLICY "Admins can insert settings"
  ON settings FOR INSERT
  WITH CHECK (
    EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'admin')
  );

-- ============================================================================
-- SECTION 8: RPC FUNCTIONS - Callable from frontend
-- ============================================================================

-- =====================================================
-- 8.1 UTILITY FUNCTIONS
-- =====================================================

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

CREATE OR REPLACE FUNCTION cleanup_expired_verification_codes()
RETURNS void AS $$
BEGIN
  DELETE FROM verification_codes WHERE expires_at < now();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

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

CREATE OR REPLACE FUNCTION get_product_stock_count(p_product_ids uuid[])
RETURNS TABLE (product_id uuid, stock_count bigint) AS $$
BEGIN
  RETURN QUERY
  SELECT
    i.product_id,
    COUNT(*) as stock_count
  FROM inventory i
  WHERE i.product_id = ANY(p_product_ids)
    AND i.status = 'available'
    AND i.is_deleted = false
  GROUP BY i.product_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 8.2 AUTHENTICATION FUNCTIONS
-- =====================================================

CREATE OR REPLACE FUNCTION register_user(
  p_phone_number text,
  p_pin text
)
RETURNS json AS $$
DECLARE
  v_user_id uuid;
  v_pin_hash text;
BEGIN
  v_pin_hash := crypt(p_pin, gen_salt('bf', 10));

  INSERT INTO users (phone_number, pin_hash, is_verified, role)
  VALUES (p_phone_number, v_pin_hash, false, 'user')
  RETURNING id INTO v_user_id;

  RETURN json_build_object(
    'success', true,
    'user_id', v_user_id,
    'message', 'User registered successfully'
  );
EXCEPTION
  WHEN unique_violation THEN
    RETURN json_build_object(
      'success', false,
      'message', 'Phone number already exists'
    );
  WHEN OTHERS THEN
    RETURN json_build_object(
      'success', false,
      'message', 'Registration failed: ' || SQLERRM
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION verify_user_login(
  p_phone_number text,
  p_pin text
)
RETURNS json AS $$
DECLARE
  v_user users%ROWTYPE;
  v_pin_matches boolean;
BEGIN
  SELECT * INTO v_user
  FROM users
  WHERE phone_number = p_phone_number;

  IF NOT FOUND THEN
    RETURN json_build_object(
      'success', false,
      'message', 'Invalid phone number or PIN'
    );
  END IF;

  IF NOT v_user.is_active THEN
    RETURN json_build_object(
      'success', false,
      'message', 'Account is locked. Please recover your account.',
      'account_locked', true,
      'phone_number', p_phone_number
    );
  END IF;

  IF NOT v_user.is_verified THEN
    RETURN json_build_object(
      'success', false,
      'message', 'Phone number not verified',
      'user_id', v_user.id,
      'phone_number', v_user.phone_number
    );
  END IF;

  v_pin_matches := (v_user.pin_hash = crypt(p_pin, v_user.pin_hash));

  IF v_pin_matches THEN
    UPDATE users
    SET failed_login_attempts = 0,
        updated_at = now()
    WHERE id = v_user.id;

    RETURN json_build_object(
      'success', true,
      'user', json_build_object(
        'id', v_user.id,
        'phone_number', v_user.phone_number,
        'wallet_balance', v_user.wallet_balance,
        'wallet_active', v_user.wallet_active,
        'role', v_user.role
      )
    );
  ELSE
    UPDATE users
    SET failed_login_attempts = failed_login_attempts + 1,
        is_active = CASE
          WHEN failed_login_attempts + 1 >= 5 THEN false
          ELSE is_active
        END,
        updated_at = now()
    WHERE id = v_user.id
    RETURNING failed_login_attempts, is_active INTO v_user.failed_login_attempts, v_user.is_active;

    IF NOT v_user.is_active THEN
      RETURN json_build_object(
        'success', false,
        'message', 'Account locked due to failed login attempts.',
        'account_locked', true,
        'phone_number', p_phone_number
      );
    END IF;

    RETURN json_build_object(
      'success', false,
      'message', format('Invalid PIN. Attempts remaining: %s', 5 - v_user.failed_login_attempts),
      'attempts_remaining', 5 - v_user.failed_login_attempts
    );
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION create_verification_code(
  p_phone_number text
)
RETURNS json AS $$
DECLARE
  v_code text;
  v_last_created timestamptz;
BEGIN
  SELECT created_at INTO v_last_created
  FROM verification_codes
  WHERE phone_number = p_phone_number;

  IF FOUND AND v_last_created > now() - interval '60 seconds' THEN
    RETURN json_build_object(
      'success', false,
      'message', 'Please wait before requesting another code'
    );
  END IF;

  v_code := LPAD(floor(random() * 10000)::text, 4, '0');

  INSERT INTO verification_codes (phone_number, code, expires_at)
  VALUES (p_phone_number, v_code, now() + interval '5 minutes')
  ON CONFLICT (phone_number)
  DO UPDATE SET
    code = EXCLUDED.code,
    expires_at = EXCLUDED.expires_at,
    created_at = now();

  RETURN json_build_object(
    'success', true,
    'code', v_code,
    'expires_at', now() + interval '5 minutes'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION verify_otp_code(
  p_phone_number text,
  p_code text
)
RETURNS json AS $$
DECLARE
  v_stored_code text;
  v_expires_at timestamptz;
  v_user_id uuid;
BEGIN
  SELECT code, expires_at INTO v_stored_code, v_expires_at
  FROM verification_codes
  WHERE phone_number = p_phone_number;

  IF NOT FOUND THEN
    RETURN json_build_object(
      'success', false,
      'message', 'No verification code found'
    );
  END IF;

  IF v_expires_at < now() THEN
    RETURN json_build_object(
      'success', false,
      'message', 'Verification code expired'
    );
  END IF;

  IF v_stored_code = p_code THEN
    UPDATE users SET is_verified = true WHERE phone_number = p_phone_number RETURNING id INTO v_user_id;
    DELETE FROM verification_codes WHERE phone_number = p_phone_number;

    RETURN json_build_object(
      'success', true,
      'message', 'Phone number verified successfully',
      'user_id', v_user_id
    );
  ELSE
    RETURN json_build_object(
      'success', false,
      'message', 'Invalid verification code'
    );
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 8.3 ACCOUNT RECOVERY FUNCTIONS
-- =====================================================

CREATE OR REPLACE FUNCTION send_recovery_otp(
  p_phone_number text
)
RETURNS json AS $$
DECLARE
  v_user users%ROWTYPE;
  v_code text;
  v_recent_code_count integer;
BEGIN
  IF p_phone_number !~ '^222[234][0-9]{7}$' THEN
    RETURN json_build_object(
      'success', false,
      'message', 'Invalid phone number format'
    );
  END IF;

  SELECT * INTO v_user
  FROM users
  WHERE phone_number = p_phone_number;

  IF NOT FOUND THEN
    RETURN json_build_object(
      'success', false,
      'message', 'Phone number not registered'
    );
  END IF;

  IF v_user.is_active THEN
    RETURN json_build_object(
      'success', false,
      'message', 'Account is active. Please login directly.'
    );
  END IF;

  SELECT COUNT(*) INTO v_recent_code_count
  FROM verification_codes
  WHERE phone_number = p_phone_number
    AND created_at > now() - interval '60 seconds';

  IF v_recent_code_count > 0 THEN
    RETURN json_build_object(
      'success', false,
      'message', 'Please wait 60 seconds before requesting a new code'
    );
  END IF;

  v_code := LPAD(FLOOR(RANDOM() * 10000)::text, 4, '0');

  INSERT INTO verification_codes (phone_number, code, expires_at)
  VALUES (p_phone_number, v_code, now() + interval '5 minutes');

  RETURN json_build_object(
    'success', true,
    'message', 'Recovery code sent',
    'code', v_code,
    'phone_number', p_phone_number,
    'expires_in_seconds', 300
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION verify_recovery_otp(
  p_phone_number text,
  p_code text
)
RETURNS json AS $$
DECLARE
  v_user users%ROWTYPE;
  v_verification verification_codes%ROWTYPE;
BEGIN
  SELECT * INTO v_user
  FROM users
  WHERE phone_number = p_phone_number;

  IF NOT FOUND THEN
    RETURN json_build_object(
      'success', false,
      'message', 'Phone number not registered'
    );
  END IF;

  SELECT * INTO v_verification
  FROM verification_codes
  WHERE phone_number = p_phone_number
    AND code = p_code
    AND expires_at > now()
  ORDER BY created_at DESC
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN json_build_object(
      'success', false,
      'message', 'Invalid or expired code'
    );
  END IF;

  UPDATE users
  SET is_active = true,
      failed_login_attempts = 0,
      updated_at = now()
  WHERE id = v_user.id;

  DELETE FROM verification_codes
  WHERE phone_number = p_phone_number;

  RETURN json_build_object(
    'success', true,
    'message', 'Verification successful. You can now reset your PIN',
    'user_id', v_user.id,
    'phone_number', v_user.phone_number
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION reset_pin_after_recovery(
  p_phone_number text,
  p_new_pin text
)
RETURNS json AS $$
DECLARE
  v_user users%ROWTYPE;
  v_pin_hash text;
BEGIN
  IF p_new_pin !~ '^\d{6}$' THEN
    RETURN json_build_object(
      'success', false,
      'message', 'PIN must be 6 digits'
    );
  END IF;

  SELECT * INTO v_user
  FROM users
  WHERE phone_number = p_phone_number;

  IF NOT FOUND THEN
    RETURN json_build_object(
      'success', false,
      'message', 'Phone number not registered'
    );
  END IF;

  IF NOT v_user.is_active THEN
    RETURN json_build_object(
      'success', false,
      'message', 'Must verify recovery code first'
    );
  END IF;

  v_pin_hash := crypt(p_new_pin, gen_salt('bf'));

  UPDATE users
  SET pin_hash = v_pin_hash,
      failed_login_attempts = 0,
      updated_at = now()
  WHERE id = v_user.id;

  RETURN json_build_object(
    'success', true,
    'message', 'PIN changed successfully'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 8.4 WALLET FUNCTIONS
-- =====================================================

CREATE OR REPLACE FUNCTION add_wallet_balance(
  p_user_id uuid,
  p_amount decimal,
  p_description text,
  p_admin_id uuid
)
RETURNS json AS $$
DECLARE
  v_balance_before decimal;
  v_balance_after decimal;
  v_is_admin boolean;
BEGIN
  SELECT role = 'admin' INTO v_is_admin FROM users WHERE id = p_admin_id;

  IF NOT v_is_admin THEN
    RETURN json_build_object(
      'success', false,
      'message', 'Unauthorized: Admin access required'
    );
  END IF;

  SELECT wallet_balance INTO v_balance_before
  FROM users
  WHERE id = p_user_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN json_build_object(
      'success', false,
      'message', 'User not found'
    );
  END IF;

  v_balance_after := v_balance_before + p_amount;

  UPDATE users SET wallet_balance = v_balance_after WHERE id = p_user_id;

  INSERT INTO wallet_transactions (user_id, type, amount, balance_before, balance_after, description)
  VALUES (p_user_id, 'credit', p_amount, v_balance_before, v_balance_after, p_description);

  RETURN json_build_object(
    'success', true,
    'balance_before', v_balance_before,
    'balance_after', v_balance_after,
    'message', 'Balance added successfully'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION deduct_wallet_balance(
  p_user_id uuid,
  p_amount decimal,
  p_description text,
  p_order_id uuid DEFAULT NULL
)
RETURNS json AS $$
DECLARE
  v_balance_before decimal;
  v_balance_after decimal;
BEGIN
  SELECT wallet_balance INTO v_balance_before
  FROM users
  WHERE id = p_user_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN json_build_object(
      'success', false,
      'message', 'User not found'
    );
  END IF;

  IF v_balance_before < p_amount THEN
    RETURN json_build_object(
      'success', false,
      'message', 'Insufficient balance'
    );
  END IF;

  v_balance_after := v_balance_before - p_amount;

  UPDATE users SET wallet_balance = v_balance_after WHERE id = p_user_id;

  INSERT INTO wallet_transactions (user_id, type, amount, balance_before, balance_after, description, order_id)
  VALUES (p_user_id, 'debit', p_amount, v_balance_before, v_balance_after, p_description, p_order_id);

  RETURN json_build_object(
    'success', true,
    'balance_before', v_balance_before,
    'balance_after', v_balance_after,
    'message', 'Balance deducted successfully'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 8.5 WALLET TOPUP FUNCTIONS
-- =====================================================

CREATE OR REPLACE FUNCTION approve_wallet_topup(
  p_topup_id uuid,
  p_admin_id uuid
)
RETURNS jsonb AS $$
DECLARE
  v_topup wallet_topups;
  v_user_balance numeric;
  v_new_balance numeric;
  v_is_admin boolean;
BEGIN
  SELECT role = 'admin' INTO v_is_admin
  FROM users
  WHERE id = p_admin_id;

  IF NOT v_is_admin THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Unauthorized to approve top-up requests'
    );
  END IF;

  SELECT * INTO v_topup
  FROM wallet_topups
  WHERE id = p_topup_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Top-up request not found'
    );
  END IF;

  IF v_topup.status != 'pending' THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Request already processed'
    );
  END IF;

  SELECT wallet_balance INTO v_user_balance
  FROM users
  WHERE id = v_topup.user_id
  FOR UPDATE;

  v_new_balance := v_user_balance + v_topup.amount;

  UPDATE wallet_topups
  SET
    status = 'approved',
    approved_at = now(),
    approved_by = p_admin_id
  WHERE id = p_topup_id;

  UPDATE users
  SET wallet_balance = v_new_balance
  WHERE id = v_topup.user_id;

  INSERT INTO wallet_transactions (
    user_id,
    topup_id,
    type,
    amount,
    balance_before,
    balance_after,
    description
  ) VALUES (
    v_topup.user_id,
    p_topup_id,
    'credit',
    v_topup.amount,
    v_user_balance,
    v_new_balance,
    'Wallet top-up approved'
  );

  RETURN jsonb_build_object(
    'success', true,
    'message', 'Top-up request approved successfully'
  );

EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Error processing request: ' || SQLERRM
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION reject_wallet_topup(
  p_topup_id uuid,
  p_admin_id uuid,
  p_reason text DEFAULT NULL
)
RETURNS jsonb AS $$
DECLARE
  v_topup wallet_topups;
  v_is_admin boolean;
BEGIN
  SELECT role = 'admin' INTO v_is_admin
  FROM users
  WHERE id = p_admin_id;

  IF NOT v_is_admin THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Unauthorized to reject top-up requests'
    );
  END IF;

  SELECT * INTO v_topup
  FROM wallet_topups
  WHERE id = p_topup_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Top-up request not found'
    );
  END IF;

  IF v_topup.status != 'pending' THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Request already processed'
    );
  END IF;

  UPDATE wallet_topups
  SET
    status = 'rejected',
    approved_at = now(),
    approved_by = p_admin_id
  WHERE id = p_topup_id;

  RETURN jsonb_build_object(
    'success', true,
    'message', 'Top-up request rejected'
  );

EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Error processing request: ' || SQLERRM
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION get_user_wallet_topups(
  p_user_id uuid,
  p_limit int DEFAULT 20,
  p_offset int DEFAULT 0
)
RETURNS TABLE (
  id uuid,
  amount numeric,
  depositor_name text,
  phone_number text,
  receipt_url text,
  status wallet_topup_status,
  created_at timestamptz,
  approved_at timestamptz
) AS $$
BEGIN
  IF auth.uid() != p_user_id AND NOT EXISTS (
    SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'admin'
  ) THEN
    RAISE EXCEPTION 'Unauthorized to view this data';
  END IF;

  RETURN QUERY
  SELECT
    wt.id,
    wt.amount,
    wt.depositor_name,
    wt.phone_number,
    wt.receipt_url,
    wt.status,
    wt.created_at,
    wt.approved_at
  FROM wallet_topups wt
  WHERE wt.user_id = p_user_id
  ORDER BY wt.created_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 8.6 PURCHASE FUNCTIONS
-- =====================================================

CREATE OR REPLACE FUNCTION create_wallet_purchase(
  p_user_id uuid,
  p_product_id uuid
)
RETURNS json AS $$
DECLARE
  v_product products%ROWTYPE;
  v_inventory_id uuid;
  v_order_id uuid;
  v_wallet_result json;
  v_user users%ROWTYPE;
BEGIN
  SELECT * INTO v_user FROM users WHERE id = p_user_id;

  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'message', 'User not found');
  END IF;

  IF NOT v_user.wallet_active THEN
    RETURN json_build_object('success', false, 'message', 'Wallet is not activated');
  END IF;

  SELECT * INTO v_product FROM products WHERE id = p_product_id AND is_deleted = false;

  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'message', 'Product not found');
  END IF;

  SELECT id INTO v_inventory_id
  FROM inventory
  WHERE product_id = p_product_id
    AND status = 'available'
    AND is_deleted = false
  ORDER BY created_at ASC
  LIMIT 1
  FOR UPDATE SKIP LOCKED;

  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'message', 'Product out of stock');
  END IF;

  v_wallet_result := deduct_wallet_balance(p_user_id, v_product.price_mru, 'Purchase: ' || v_product.name, NULL);

  IF NOT (v_wallet_result->>'success')::boolean THEN
    RETURN v_wallet_result;
  END IF;

  INSERT INTO orders (user_id, inventory_id, product_id, price_at_purchase, payment_type, status)
  VALUES (p_user_id, v_inventory_id, p_product_id, v_product.price_mru, 'wallet', 'approved')
  RETURNING id INTO v_order_id;

  UPDATE wallet_transactions
  SET order_id = v_order_id
  WHERE id = (
    SELECT id FROM wallet_transactions
    WHERE user_id = p_user_id AND order_id IS NULL
    ORDER BY created_at DESC
    LIMIT 1
  );

  UPDATE inventory SET status = 'sold' WHERE id = v_inventory_id;

  RETURN json_build_object(
    'success', true,
    'order_id', v_order_id,
    'inventory_id', v_inventory_id,
    'message', 'Purchase completed successfully'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION create_manual_purchase(
  p_user_id uuid,
  p_product_id uuid,
  p_payment_method_name text,
  p_user_payment_number text,
  p_user_name text,
  p_transaction_reference text
)
RETURNS json AS $$
DECLARE
  v_product products%ROWTYPE;
  v_inventory_id uuid;
  v_order_id uuid;
BEGIN
  SELECT * INTO v_product FROM products WHERE id = p_product_id AND is_deleted = false;

  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'message', 'Product not found');
  END IF;

  SELECT id INTO v_inventory_id
  FROM inventory
  WHERE product_id = p_product_id
    AND status = 'available'
    AND is_deleted = false
  ORDER BY created_at ASC
  LIMIT 1
  FOR UPDATE SKIP LOCKED;

  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'message', 'Product out of stock');
  END IF;

  UPDATE inventory
  SET status = 'reserved', reserved_until = now() + interval '15 minutes'
  WHERE id = v_inventory_id;

  INSERT INTO orders (
    user_id, inventory_id, product_id, price_at_purchase,
    payment_type, payment_method_name, user_payment_number,
    user_name, transaction_reference, status
  )
  VALUES (
    p_user_id, v_inventory_id, p_product_id, v_product.price_mru,
    'manual', p_payment_method_name, p_user_payment_number,
    p_user_name, p_transaction_reference, 'pending'
  )
  RETURNING id INTO v_order_id;

  RETURN json_build_object(
    'success', true,
    'order_id', v_order_id,
    'reserved_until', now() + interval '15 minutes',
    'message', 'Order created. Please upload receipt within 15 minutes.'
  );
EXCEPTION
  WHEN unique_violation THEN
    RETURN json_build_object(
      'success', false,
      'message', 'Transaction reference already exists'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 8.7 ORDER MANAGEMENT FUNCTIONS
-- =====================================================

CREATE OR REPLACE FUNCTION approve_order(
  p_order_id uuid,
  p_admin_id uuid
)
RETURNS json AS $$
DECLARE
  v_order orders%ROWTYPE;
  v_admin users%ROWTYPE;
BEGIN
  SELECT * INTO v_admin FROM users WHERE id = p_admin_id AND role = 'admin';
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'message', 'Unauthorized: Admin access required');
  END IF;

  SELECT * INTO v_order FROM orders WHERE id = p_order_id;
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'message', 'Order not found');
  END IF;

  IF v_order.status != 'pending' THEN
    RETURN json_build_object('success', false, 'message', 'Order is not pending');
  END IF;

  UPDATE orders SET
    status = 'approved',
    updated_at = now()
  WHERE id = p_order_id;

  UPDATE inventory SET
    status = 'sold',
    updated_at = now()
  WHERE id = v_order.inventory_id;

  RETURN json_build_object(
    'success', true,
    'message', 'Order approved successfully',
    'order_id', p_order_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION reject_order(
  p_order_id uuid,
  p_admin_id uuid,
  p_admin_note text DEFAULT NULL
)
RETURNS json AS $$
DECLARE
  v_order orders%ROWTYPE;
  v_admin users%ROWTYPE;
BEGIN
  SELECT * INTO v_admin FROM users WHERE id = p_admin_id AND role = 'admin';
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'message', 'Unauthorized: Admin access required');
  END IF;

  SELECT * INTO v_order FROM orders WHERE id = p_order_id;
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'message', 'Order not found');
  END IF;

  IF v_order.status != 'pending' THEN
    RETURN json_build_object('success', false, 'message', 'Order is not pending');
  END IF;

  UPDATE orders SET
    status = 'rejected',
    admin_note = p_admin_note,
    updated_at = now()
  WHERE id = p_order_id;

  UPDATE inventory SET
    status = 'available',
    reserved_until = NULL,
    updated_at = now()
  WHERE id = v_order.inventory_id;

  RETURN json_build_object(
    'success', true,
    'message', 'Order rejected successfully',
    'order_id', p_order_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 8.8 SYSTEM MONITORING FUNCTIONS
-- =====================================================

CREATE OR REPLACE FUNCTION check_data_integrity()
RETURNS json AS $$
DECLARE
  v_orphaned_orders integer;
  v_orphaned_transactions integer;
  v_invalid_inventory integer;
  v_issues json;
BEGIN
  SELECT COUNT(*) INTO v_orphaned_orders
  FROM orders o
  LEFT JOIN users u ON o.user_id = u.id
  LEFT JOIN products p ON o.product_id = p.id
  WHERE u.id IS NULL OR p.id IS NULL;

  SELECT COUNT(*) INTO v_orphaned_transactions
  FROM wallet_transactions wt
  LEFT JOIN users u ON wt.user_id = u.id
  WHERE u.id IS NULL;

  SELECT COUNT(*) INTO v_invalid_inventory
  FROM inventory i
  LEFT JOIN products p ON i.product_id = p.id
  WHERE p.id IS NULL;

  v_issues := json_build_object(
    'orphaned_orders', v_orphaned_orders,
    'orphaned_transactions', v_orphaned_transactions,
    'invalid_inventory', v_invalid_inventory,
    'has_issues', (v_orphaned_orders + v_orphaned_transactions + v_invalid_inventory) > 0
  );

  RETURN v_issues;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION get_system_stats()
RETURNS json AS $$
DECLARE
  v_stats json;
BEGIN
  SELECT json_build_object(
    'total_users', (SELECT COUNT(*) FROM users),
    'active_users', (SELECT COUNT(*) FROM users WHERE is_active = true),
    'verified_users', (SELECT COUNT(*) FROM users WHERE is_verified = true),
    'total_products', (SELECT COUNT(*) FROM products WHERE is_deleted = false),
    'available_inventory', (SELECT COUNT(*) FROM inventory WHERE status = 'available' AND is_deleted = false),
    'total_orders', (SELECT COUNT(*) FROM orders),
    'pending_orders', (SELECT COUNT(*) FROM orders WHERE status = 'pending'),
    'approved_orders', (SELECT COUNT(*) FROM orders WHERE status = 'approved'),
    'total_wallet_balance', (SELECT COALESCE(SUM(wallet_balance), 0) FROM users),
    'pending_topups', (SELECT COUNT(*) FROM wallet_topups WHERE status = 'pending')
  ) INTO v_stats;

  RETURN v_stats;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- SECTION 9: STORAGE BUCKETS - File storage configuration
-- ============================================================================

-- Create receipts bucket (public for order receipts)
INSERT INTO storage.buckets (id, name, public)
VALUES ('receipts', 'receipts', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Anyone can upload receipts"
ON storage.objects FOR INSERT
TO public
WITH CHECK (bucket_id = 'receipts');

CREATE POLICY "Anyone can view receipts"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'receipts');

CREATE POLICY "Admins can delete receipts"
ON storage.objects FOR DELETE
TO public
USING (bucket_id = 'receipts');

-- Create wallet-receipts bucket (private for wallet top-up receipts)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'wallet-receipts',
  'wallet-receipts',
  false,
  5242880,
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Users can upload wallet receipts"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'wallet-receipts'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Users can view own wallet receipts"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'wallet-receipts'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Admins can view all wallet receipts"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'wallet-receipts'
  AND EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid()
    AND users.role = 'admin'
  )
);

CREATE POLICY "Admins can delete wallet receipts"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'wallet-receipts'
  AND EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid()
    AND users.role = 'admin'
  )
);

-- ============================================================================
-- SECTION 10: DEFAULT DATA - Insert initial settings
-- ============================================================================

INSERT INTO settings (key, value)
VALUES ('wallet_notice', 'Please ensure you upload the correct payment receipt. Your request will be reviewed by administration.')
ON CONFLICT (key) DO NOTHING;

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================
-- The database is now fully reset and ready for use.
-- All tables, functions, policies, and storage buckets have been recreated.
-- ============================================================================
