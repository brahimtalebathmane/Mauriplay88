/*
  # Clean Database Refactoring

  ## Overview
  This migration performs a clean refactoring by:
  1. Dropping all existing RLS policies
  2. Optimizing foreign keys
  3. Creating unified, bulletproof RLS policies
  4. Adding performance indexes
  5. Setting up triggers

  ## Changes
  - Unified admin access across all tables
  - Consistent user access patterns
  - Optimized foreign key relationships
  - Performance indexes on frequently queried columns
  - Auto-updating timestamps
*/

-- =====================================================
-- DROP ALL EXISTING RLS POLICIES
-- =====================================================

-- Drop policies on inventory
DROP POLICY IF EXISTS "Only admins can insert inventory" ON inventory;
DROP POLICY IF EXISTS "Only admins can update inventory" ON inventory;
DROP POLICY IF EXISTS "Only admins can view all inventory" ON inventory;
DROP POLICY IF EXISTS "admin_full_access_inventory" ON inventory;

-- Drop policies on orders
DROP POLICY IF EXISTS "Admins can update any order" ON orders;
DROP POLICY IF EXISTS "Admins can view all orders" ON orders;
DROP POLICY IF EXISTS "Authenticated users can create orders" ON orders;
DROP POLICY IF EXISTS "Users can update own pending orders" ON orders;
DROP POLICY IF EXISTS "Users can view own orders" ON orders;
DROP POLICY IF EXISTS "admin_full_access_orders" ON orders;
DROP POLICY IF EXISTS "orders_policy" ON orders;
DROP POLICY IF EXISTS "users_read_own_orders" ON orders;

-- Drop policies on payment_methods
DROP POLICY IF EXISTS "Anyone can view payment methods" ON payment_methods;
DROP POLICY IF EXISTS "Only admins can insert payment methods" ON payment_methods;
DROP POLICY IF EXISTS "Only admins can update payment methods" ON payment_methods;
DROP POLICY IF EXISTS "admin_full_access_payment_methods" ON payment_methods;
DROP POLICY IF EXISTS "public_read_payment_methods" ON payment_methods;
DROP POLICY IF EXISTS "users_read_active_payment_methods" ON payment_methods;

-- Drop policies on platforms
DROP POLICY IF EXISTS "Anyone can view non-deleted platforms" ON platforms;
DROP POLICY IF EXISTS "Only admins can insert platforms" ON platforms;
DROP POLICY IF EXISTS "Only admins can update platforms" ON platforms;
DROP POLICY IF EXISTS "admin_full_access_platforms" ON platforms;
DROP POLICY IF EXISTS "public_read_platforms" ON platforms;
DROP POLICY IF EXISTS "users_read_active_platforms" ON platforms;

-- Drop policies on products
DROP POLICY IF EXISTS "Anyone can view non-deleted products" ON products;
DROP POLICY IF EXISTS "Only admins can insert products" ON products;
DROP POLICY IF EXISTS "Only admins can update products" ON products;
DROP POLICY IF EXISTS "admin_full_access_products" ON products;
DROP POLICY IF EXISTS "public_read_products" ON products;
DROP POLICY IF EXISTS "users_read_active_products" ON products;

-- Drop policies on settings
DROP POLICY IF EXISTS "allow_admin_all" ON settings;
DROP POLICY IF EXISTS "allow_read_all" ON settings;
DROP POLICY IF EXISTS "admin_full_access_settings" ON settings;
DROP POLICY IF EXISTS "users_read_settings" ON settings;

-- Drop policies on users
DROP POLICY IF EXISTS "Admins can update any user" ON users;
DROP POLICY IF EXISTS "Admins_Full_Access" ON users;
DROP POLICY IF EXISTS "Users can update own profile with restrictions" ON users;
DROP POLICY IF EXISTS "Users can view own profile" ON users;
DROP POLICY IF EXISTS "Users_Self_View" ON users;
DROP POLICY IF EXISTS "users_read_own" ON users;
DROP POLICY IF EXISTS "admin_full_access_users" ON users;
DROP POLICY IF EXISTS "users_read_own_data" ON users;
DROP POLICY IF EXISTS "users_update_own_data" ON users;

-- Drop policies on verification_codes
DROP POLICY IF EXISTS "System can insert verification codes" ON verification_codes;
DROP POLICY IF EXISTS "System can update verification codes" ON verification_codes;
DROP POLICY IF EXISTS "admin_full_access_verification_codes" ON verification_codes;

-- Drop policies on wallet_topups
DROP POLICY IF EXISTS "Admins can update wallet topups" ON wallet_topups;
DROP POLICY IF EXISTS "Admins can view all wallet topups" ON wallet_topups;
DROP POLICY IF EXISTS "Users can create own wallet topups" ON wallet_topups;
DROP POLICY IF EXISTS "Users can delete own pending topups" ON wallet_topups;
DROP POLICY IF EXISTS "Users can update own pending topups" ON wallet_topups;
DROP POLICY IF EXISTS "Users can view own wallet topups" ON wallet_topups;
DROP POLICY IF EXISTS "admin_full_access_wallet_topups" ON wallet_topups;
DROP POLICY IF EXISTS "wallet_topups_policy" ON wallet_topups;
DROP POLICY IF EXISTS "users_read_own_topups" ON wallet_topups;

-- Drop policies on wallet_transactions
DROP POLICY IF EXISTS "Admins can view all wallet transactions" ON wallet_transactions;
DROP POLICY IF EXISTS "System can insert wallet transactions" ON wallet_transactions;
DROP POLICY IF EXISTS "Users can view own wallet transactions" ON wallet_transactions;
DROP POLICY IF EXISTS "admin_full_access_wallet_transactions" ON wallet_transactions;
DROP POLICY IF EXISTS "users_read_own_transactions" ON wallet_transactions;

-- =====================================================
-- OPTIMIZE NULL CONSTRAINTS
-- =====================================================

-- Make orders nullable for historical preservation
ALTER TABLE orders ALTER COLUMN user_id DROP NOT NULL;
ALTER TABLE orders ALTER COLUMN product_id DROP NOT NULL;
ALTER TABLE orders ALTER COLUMN inventory_id DROP NOT NULL;

-- Add logo_url to products if missing
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'products' AND column_name = 'logo_url'
  ) THEN
    ALTER TABLE products ADD COLUMN logo_url TEXT;
  END IF;
END $$;

-- =====================================================
-- OPTIMIZE FOREIGN KEY RELATIONSHIPS
-- =====================================================

-- Products -> Platforms (CASCADE)
ALTER TABLE products DROP CONSTRAINT IF EXISTS products_platform_id_fkey;
ALTER TABLE products
  ADD CONSTRAINT products_platform_id_fkey
  FOREIGN KEY (platform_id)
  REFERENCES platforms(id)
  ON DELETE CASCADE;

-- Inventory -> Products (CASCADE)
ALTER TABLE inventory DROP CONSTRAINT IF EXISTS inventory_product_id_fkey;
ALTER TABLE inventory
  ADD CONSTRAINT inventory_product_id_fkey
  FOREIGN KEY (product_id)
  REFERENCES products(id)
  ON DELETE CASCADE;

-- Orders -> Users (SET NULL)
ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_user_id_fkey;
ALTER TABLE orders
  ADD CONSTRAINT orders_user_id_fkey
  FOREIGN KEY (user_id)
  REFERENCES users(id)
  ON DELETE SET NULL;

-- Orders -> Products (SET NULL)
ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_product_id_fkey;
ALTER TABLE orders
  ADD CONSTRAINT orders_product_id_fkey
  FOREIGN KEY (product_id)
  REFERENCES products(id)
  ON DELETE SET NULL;

-- Orders -> Inventory (SET NULL)
ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_inventory_id_fkey;
ALTER TABLE orders
  ADD CONSTRAINT orders_inventory_id_fkey
  FOREIGN KEY (inventory_id)
  REFERENCES inventory(id)
  ON DELETE SET NULL;

-- =====================================================
-- CREATE UNIFIED RLS POLICIES
-- =====================================================

-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE platforms ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_methods ENABLE ROW LEVEL SECURITY;
ALTER TABLE wallet_topups ENABLE ROW LEVEL SECURITY;
ALTER TABLE wallet_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE verification_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;

-- Helper function to check if user is admin (using RPC pattern)
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM users
    WHERE id = (current_setting('request.jwt.claims', true)::json->>'user_id')::uuid
    AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Users
CREATE POLICY "admin_all_users" ON users FOR ALL USING (is_admin());
CREATE POLICY "user_read_self" ON users FOR SELECT USING (id = (current_setting('request.jwt.claims', true)::json->>'user_id')::uuid);
CREATE POLICY "user_update_self" ON users FOR UPDATE 
  USING (id = (current_setting('request.jwt.claims', true)::json->>'user_id')::uuid)
  WITH CHECK (id = (current_setting('request.jwt.claims', true)::json->>'user_id')::uuid);

-- Platforms
CREATE POLICY "admin_all_platforms" ON platforms FOR ALL USING (is_admin());
CREATE POLICY "user_read_platforms" ON platforms FOR SELECT USING (is_deleted = false);

-- Products
CREATE POLICY "admin_all_products" ON products FOR ALL USING (is_admin());
CREATE POLICY "user_read_products" ON products FOR SELECT USING (is_deleted = false);

-- Inventory
CREATE POLICY "admin_all_inventory" ON inventory FOR ALL USING (is_admin());

-- Orders
CREATE POLICY "admin_all_orders" ON orders FOR ALL USING (is_admin());
CREATE POLICY "user_read_own_orders" ON orders FOR SELECT 
  USING (user_id = (current_setting('request.jwt.claims', true)::json->>'user_id')::uuid);

-- Payment Methods
CREATE POLICY "admin_all_payment_methods" ON payment_methods FOR ALL USING (is_admin());
CREATE POLICY "user_read_payment_methods" ON payment_methods FOR SELECT USING (is_active = true);

-- Wallet Topups
CREATE POLICY "admin_all_wallet_topups" ON wallet_topups FOR ALL USING (is_admin());
CREATE POLICY "user_read_own_topups" ON wallet_topups FOR SELECT 
  USING (user_id = (current_setting('request.jwt.claims', true)::json->>'user_id')::uuid);

-- Wallet Transactions
CREATE POLICY "admin_all_wallet_transactions" ON wallet_transactions FOR ALL USING (is_admin());
CREATE POLICY "user_read_own_transactions" ON wallet_transactions FOR SELECT 
  USING (user_id = (current_setting('request.jwt.claims', true)::json->>'user_id')::uuid);

-- Verification Codes
CREATE POLICY "admin_all_verification_codes" ON verification_codes FOR ALL USING (is_admin());

-- Settings
CREATE POLICY "admin_all_settings" ON settings FOR ALL USING (is_admin());
CREATE POLICY "user_read_settings" ON settings FOR SELECT USING (true);

-- =====================================================
-- PERFORMANCE INDEXES
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_users_phone ON users(phone_number);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_platforms_deleted ON platforms(is_deleted);
CREATE INDEX IF NOT EXISTS idx_products_platform ON products(platform_id);
CREATE INDEX IF NOT EXISTS idx_products_deleted ON products(is_deleted);
CREATE INDEX IF NOT EXISTS idx_inventory_product ON inventory(product_id);
CREATE INDEX IF NOT EXISTS idx_inventory_status ON inventory(status);
CREATE INDEX IF NOT EXISTS idx_inventory_available ON inventory(product_id, created_at) WHERE status = 'available' AND is_deleted = false;
CREATE INDEX IF NOT EXISTS idx_orders_user ON orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_created ON orders(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_wallet_topups_user ON wallet_topups(user_id);
CREATE INDEX IF NOT EXISTS idx_wallet_topups_status ON wallet_topups(status);
CREATE INDEX IF NOT EXISTS idx_wallet_transactions_user ON wallet_transactions(user_id);

-- =====================================================
-- AUTO-UPDATE TIMESTAMPS
-- =====================================================

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply to all tables with updated_at
DO $$
DECLARE
  tbl TEXT;
BEGIN
  FOR tbl IN
    SELECT DISTINCT table_name
    FROM information_schema.columns
    WHERE table_schema = 'public'
    AND column_name = 'updated_at'
    AND table_name NOT IN (SELECT viewname FROM pg_views WHERE schemaname = 'public')
  LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS trg_update_%I ON %I', tbl, tbl);
    EXECUTE format('
      CREATE TRIGGER trg_update_%I
      BEFORE UPDATE ON %I
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at()
    ', tbl, tbl);
  END LOOP;
END $$;

-- =====================================================
-- COMPLETION
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE '✓ Database refactoring completed';
  RAISE NOTICE '✓ All RLS policies unified';
  RAISE NOTICE '✓ Foreign keys optimized';
  RAISE NOTICE '✓ Performance indexes created';
  RAISE NOTICE '✓ Auto-update triggers active';
END $$;
