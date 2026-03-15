/*
  # Add is_active column to payment_methods table

  1. Changes
    - Add `is_active` boolean column to `payment_methods` table
    - Default value is `true` for new records
    - Set existing records to `true` (active by default)

  2. Purpose
    - Allow admins to enable/disable payment methods
    - Frontend filters by active payment methods only
    - Maintains backward compatibility

  3. Notes
    - Non-breaking change
    - All existing payment methods remain active
    - No impact on wallet top-ups or other features
*/

-- =====================================================
-- ADD IS_ACTIVE COLUMN
-- =====================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'payment_methods' 
    AND column_name = 'is_active'
  ) THEN
    -- Add column with default true
    ALTER TABLE payment_methods 
    ADD COLUMN is_active boolean DEFAULT true NOT NULL;
    
    -- Update existing records to be active
    UPDATE payment_methods 
    SET is_active = true 
    WHERE is_active IS NULL;
  END IF;
END $$;

-- =====================================================
-- CREATE INDEX FOR PERFORMANCE
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_payment_methods_is_active
ON payment_methods(is_active);

-- =====================================================
-- COMMENT FOR DOCUMENTATION
-- =====================================================

COMMENT ON COLUMN payment_methods.is_active IS 
'Indicates whether this payment method is currently active and available for use. Defaults to true.';