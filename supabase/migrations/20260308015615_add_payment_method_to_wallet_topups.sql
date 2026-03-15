/*
  # Add Payment Method Selection to Wallet Top-ups

  1. Changes to Tables
    - Add `payment_method_id` column to `wallet_topups` table
    - Create foreign key relationship to `payment_methods` table
    - Set default to NULL for backwards compatibility with existing data

  2. Security
    - No changes to RLS policies (existing policies remain)
    - Users can only create topups with their own user_id
    - Payment method must exist and be active

  3. Data Integrity
    - Foreign key ensures payment_method_id references valid payment methods
    - Existing records remain valid (NULL payment_method_id allowed initially)
    - Future records should include payment_method_id

  4. Notes
    - This is a non-breaking change
    - Existing topup records will have NULL payment_method_id
    - New topups should include payment method selection
*/

-- =====================================================
-- ADD PAYMENT_METHOD_ID COLUMN TO WALLET_TOPUPS
-- =====================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'wallet_topups' 
    AND column_name = 'payment_method_id'
  ) THEN
    ALTER TABLE wallet_topups 
    ADD COLUMN payment_method_id uuid;
  END IF;
END $$;

-- =====================================================
-- CREATE FOREIGN KEY CONSTRAINT
-- =====================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'wallet_topups_payment_method_id_fkey'
    AND table_name = 'wallet_topups'
  ) THEN
    ALTER TABLE wallet_topups
    ADD CONSTRAINT wallet_topups_payment_method_id_fkey
    FOREIGN KEY (payment_method_id)
    REFERENCES payment_methods(id)
    ON DELETE SET NULL;
  END IF;
END $$;

-- =====================================================
-- CREATE INDEX FOR PERFORMANCE
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_wallet_topups_payment_method_id
ON wallet_topups(payment_method_id);

-- =====================================================
-- COMMENT FOR DOCUMENTATION
-- =====================================================

COMMENT ON COLUMN wallet_topups.payment_method_id IS 
'References the payment method used for this wallet top-up. NULL for legacy records.';