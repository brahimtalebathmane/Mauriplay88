/*
  # Wallet Top-up System

  1. ENUM Types
    - `wallet_topup_status` - Status for wallet top-up requests (pending, approved, rejected)

  2. New Tables
    - `wallet_topups`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references users)
      - `amount` (numeric, must be positive)
      - `depositor_name` (text, required)
      - `phone_number` (text, required)
      - `receipt_url` (text, required)
      - `status` (wallet_topup_status, default: pending)
      - `created_at` (timestamptz)
      - `approved_at` (timestamptz, nullable)
      - `approved_by` (uuid, nullable, references users)
    
    - `settings`
      - `key` (text, primary key)
      - `value` (text)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  3. Modifications to Existing Tables
    - `wallet_transactions` - Add topup_id column to link top-up transactions

  4. Security
    - Enable RLS on all tables
    - Users can only access their own wallet_topups
    - Admins have full access to wallet_topups
    - wallet_transactions are read-only for users (audit trail)
    - settings table is read-only for all authenticated users
    - Prevent users from having more than 5 pending top-ups

  5. Indexes
    - Index on wallet_topups(user_id, status) for efficient queries
*/

-- =====================================================
-- 1. CREATE ENUM TYPE FOR WALLET TOP-UP STATUS
-- =====================================================

DO $$ BEGIN
  CREATE TYPE wallet_topup_status AS ENUM ('pending', 'approved', 'rejected');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- =====================================================
-- 2. CREATE WALLET_TOPUPS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS wallet_topups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id),
  amount numeric(10, 2) NOT NULL CHECK (amount > 0),
  depositor_name text NOT NULL,
  phone_number text NOT NULL,
  receipt_url text NOT NULL,
  status wallet_topup_status DEFAULT 'pending',
  created_at timestamptz DEFAULT now(),
  approved_at timestamptz,
  approved_by uuid REFERENCES users(id)
);

-- Create indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_wallet_topups_user_status 
  ON wallet_topups(user_id, status);

CREATE INDEX IF NOT EXISTS idx_wallet_topups_status_created 
  ON wallet_topups(status, created_at DESC);

-- =====================================================
-- 3. ADD TOPUP_ID TO WALLET_TRANSACTIONS TABLE
-- =====================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'wallet_transactions' 
    AND column_name = 'topup_id'
  ) THEN
    ALTER TABLE wallet_transactions ADD COLUMN topup_id uuid REFERENCES wallet_topups(id);
  END IF;
END $$;

-- Create index for topup_id lookups
CREATE INDEX IF NOT EXISTS idx_wallet_transactions_topup 
  ON wallet_transactions(topup_id);

-- =====================================================
-- 4. CREATE SETTINGS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS settings (
  key text PRIMARY KEY,
  value text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Insert default wallet notice
INSERT INTO settings (key, value) 
VALUES ('wallet_notice', 'يرجى التأكد من رفع إيصال الدفع الصحيح. سيتم مراجعة طلبك من قبل الإدارة.')
ON CONFLICT (key) DO NOTHING;

-- =====================================================
-- 5. ENABLE ROW LEVEL SECURITY
-- =====================================================

ALTER TABLE wallet_topups ENABLE ROW LEVEL SECURITY;
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- 6. CREATE RLS POLICIES FOR WALLET_TOPUPS
-- =====================================================

-- Users can view their own wallet top-ups
CREATE POLICY "Users can view own wallet topups"
  ON wallet_topups FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Admins can view all wallet top-ups
CREATE POLICY "Admins can view all wallet topups"
  ON wallet_topups FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role = 'admin'
    )
  );

-- Users can insert their own wallet top-ups (with limit check via trigger)
CREATE POLICY "Users can create own wallet topups"
  ON wallet_topups FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Users can update only their own pending wallet top-ups (to update receipt)
CREATE POLICY "Users can update own pending topups"
  ON wallet_topups FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id AND status = 'pending')
  WITH CHECK (auth.uid() = user_id AND status = 'pending');

-- Admins can update any wallet top-up
CREATE POLICY "Admins can update wallet topups"
  ON wallet_topups FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role = 'admin'
    )
  );

-- Users can delete their own pending wallet top-ups
CREATE POLICY "Users can delete own pending topups"
  ON wallet_topups FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id AND status = 'pending');

-- =====================================================
-- 7. CREATE RLS POLICIES FOR SETTINGS
-- =====================================================

-- Anyone authenticated can read settings
CREATE POLICY "Authenticated users can read settings"
  ON settings FOR SELECT
  TO authenticated
  USING (true);

-- Only admins can modify settings
CREATE POLICY "Admins can update settings"
  ON settings FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role = 'admin'
    )
  );

CREATE POLICY "Admins can insert settings"
  ON settings FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role = 'admin'
    )
  );

-- =====================================================
-- 8. CREATE TRIGGER TO LIMIT PENDING TOP-UPS
-- =====================================================

CREATE OR REPLACE FUNCTION check_pending_topups_limit()
RETURNS TRIGGER AS $$
DECLARE
  pending_count int;
BEGIN
  -- Count pending top-ups for this user
  SELECT COUNT(*) INTO pending_count
  FROM wallet_topups
  WHERE user_id = NEW.user_id
    AND status = 'pending';
  
  -- Limit to 5 pending top-ups
  IF pending_count >= 5 THEN
    RAISE EXCEPTION 'لا يمكن إنشاء أكثر من 5 طلبات شحن معلقة';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS limit_pending_topups ON wallet_topups;
CREATE TRIGGER limit_pending_topups
  BEFORE INSERT ON wallet_topups
  FOR EACH ROW
  EXECUTE FUNCTION check_pending_topups_limit();

-- =====================================================
-- 9. CREATE TRIGGER TO UPDATE settings.updated_at
-- =====================================================

CREATE OR REPLACE FUNCTION update_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS settings_updated_at ON settings;
CREATE TRIGGER settings_updated_at
  BEFORE UPDATE ON settings
  FOR EACH ROW
  EXECUTE FUNCTION update_settings_updated_at();