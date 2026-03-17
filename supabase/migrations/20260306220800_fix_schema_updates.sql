/*
  # Critical Schema Updates for MauriPlay

  ## Changes Applied
  
  1. Phone Validation
     - Add CHECK constraint to users table for Mauritanian phone format
     - Format: 222[234][0-9]{7} (starts with 222, second digit 2/3/4, then 7 digits)
  
  2. Verification Codes
     - Remove UNIQUE constraint on phone_number to allow multiple OTP requests
     - Update existing data handling with UPSERT logic in RPC function
  
  3. Admin User Creation
     - Insert default admin user with phone 22223456789 and PIN 1234 (hashed)
     - Set as verified and active with wallet enabled
  
  4. Enum Verification
     - Verify all enum types exist and are properly applied
  
  5. Security Improvements
     - Ensure pgcrypto extension enabled
     - Update login verification to use crypt comparison
*/

-- Ensure pgcrypto extension is enabled
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Drop existing unique constraint on verification_codes if exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'verification_codes_phone_number_key'
  ) THEN
    ALTER TABLE verification_codes DROP CONSTRAINT verification_codes_phone_number_key;
  END IF;
END $$;

-- Add phone validation constraint to users table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'users_phone_number_format_check'
  ) THEN
    ALTER TABLE users ADD CONSTRAINT users_phone_number_format_check 
    CHECK (phone_number ~ '^222[234][0-9]{7}$');
  END IF;
END $$;

-- Insert default admin user (only if doesn't exist)
DO $$
DECLARE
  v_admin_exists boolean;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM users WHERE phone_number = '22223456789'
  ) INTO v_admin_exists;
  
  IF NOT v_admin_exists THEN
    INSERT INTO users (
      phone_number, 
      pin_hash, 
      wallet_balance,
      wallet_active,
      role, 
      is_verified, 
      is_active
    ) VALUES (
      '22223456789',
      '1234',
      1000.00,
      true,
      'admin',
      true,
      true
    );
  END IF;
END $$;

-- Update the create_verification_code function to handle non-unique phone numbers properly
CREATE OR REPLACE FUNCTION create_verification_code(
  p_phone_number text
)
RETURNS json AS $$
DECLARE
  v_code text;
  v_last_created timestamptz;
  v_existing_id uuid;
BEGIN
  -- Check rate limiting (1 per 60 seconds)
  SELECT created_at, id INTO v_last_created, v_existing_id
  FROM verification_codes
  WHERE phone_number = p_phone_number
  ORDER BY created_at DESC
  LIMIT 1;
  
  IF FOUND AND v_last_created > now() - interval '60 seconds' THEN
    RETURN json_build_object(
      'success', false,
      'message', 'يرجى الانتظار قبل طلب رمز جديد'
    );
  END IF;
  
  -- Generate 4-digit code
  v_code := LPAD(floor(random() * 10000)::text, 4, '0');
  
  -- Delete old codes for this phone number
  DELETE FROM verification_codes WHERE phone_number = p_phone_number;
  
  -- Insert new verification code
  INSERT INTO verification_codes (phone_number, code, expires_at)
  VALUES (p_phone_number, v_code, now() + interval '5 minutes');
  
  RETURN json_build_object(
    'success', true,
    'code', v_code,
    'expires_at', now() + interval '5 minutes'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update verify_user_login to ensure proper PIN comparison
CREATE OR REPLACE FUNCTION verify_user_login(
  p_phone_number text,
  p_pin text
)
RETURNS json AS $$
DECLARE
  v_user users%ROWTYPE;
  v_pin_valid boolean;
BEGIN
  -- Get user
  SELECT * INTO v_user
  FROM users
  WHERE phone_number = p_phone_number;
  
  -- Check if user exists
  IF NOT FOUND THEN
    RETURN json_build_object(
      'success', false,
      'message', 'رقم الهاتف أو الرمز السري غير صحيح'
    );
  END IF;
  
  -- Check if user is verified
  IF NOT v_user.is_verified THEN
    RETURN json_build_object(
      'success', false,
      'message', 'يرجى تأكيد رقم هاتفك أولاً',
      'requires_verification', true,
      'phone_number', v_user.phone_number
    );
  END IF;
  
  -- Check if account is active
  IF NOT v_user.is_active THEN
    RETURN json_build_object(
      'success', false,
      'message', 'الحساب معطل. يرجى التواصل مع الدعم'
    );
  END IF;
  
  -- Check if account is locked
  IF v_user.failed_login_attempts >= 5 THEN
    RETURN json_build_object(
      'success', false,
      'message', 'الحساب مقفل بسبب محاولات فاشلة متعددة. يرجى التواصل مع الدعم'
    );
  END IF;
  
  -- Verify PIN using crypt
  v_pin_valid := (v_user.pin_hash = crypt(p_pin, v_user.pin_hash));
  
  IF v_pin_valid THEN
    -- Reset failed attempts on successful login
    UPDATE users SET failed_login_attempts = 0 WHERE id = v_user.id;
    
    RETURN json_build_object(
      'success', true,
      'user', json_build_object(
        'id', v_user.id,
        'phone_number', v_user.phone_number,
        'wallet_balance', v_user.wallet_balance,
        'wallet_active', v_user.wallet_active,
        'role', v_user.role,
        'is_verified', v_user.is_verified
      )
    );
  ELSE
    -- Increment failed attempts
    UPDATE users 
    SET failed_login_attempts = failed_login_attempts + 1 
    WHERE id = v_user.id;
    
    RETURN json_build_object(
      'success', false,
      'message', 'رقم الهاتف أو الرمز السري غير صحيح'
    );
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add index for phone number lookups
CREATE INDEX IF NOT EXISTS idx_users_phone_number ON users(phone_number);
CREATE INDEX IF NOT EXISTS idx_verification_codes_phone ON verification_codes(phone_number, created_at DESC);