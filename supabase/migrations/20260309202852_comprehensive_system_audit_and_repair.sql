/*
  # Comprehensive System Audit and Repair

  ## Overview
  This migration performs a complete system audit and repair of the MauriPlay application,
  fixing critical authentication, registration, and admin account issues.

  ## Changes Made
  
  1. **Admin Account Setup**
     - Ensures admin account (22249827331) exists and is properly configured
     - Admin is verified, active, with wallet enabled
     - Default admin PIN: 123456 (should be changed after first login)
  
  2. **Authentication System Refinement**
     - Reduced failed attempts threshold from 5 to 3 for better security
     - Clear error messages at each step
     - Automatic counter reset on successful login or OTP verification
     - No permanent account locks
  
  3. **Registration System Enhancement**
     - Better error handling and validation
     - Proper phone number format checking
     - Clear success/failure messages
  
  4. **OTP Verification**
     - Creates verification code for new registrations
     - Handles account unlock scenarios
     - Proper expiry management (5 minutes)
  
  5. **Helper Functions**
     - create_verification_code: Generates 4-digit OTP
     - send_verification_code: Stores OTP with expiry
  
  ## Security Features
  - PIN hashing with bcrypt (cost 10)
  - OTP expires after 5 minutes
  - Failed attempts tracking (max 3)
  - Active account requirement
  - Verification requirement for normal users
*/

-- =====================================================
-- ENSURE ADMIN ACCOUNT EXISTS
-- =====================================================

DO $$
DECLARE
  v_admin_id uuid;
  v_admin_pin_hash text;
BEGIN
  -- Check if admin account exists
  SELECT id INTO v_admin_id
  FROM users
  WHERE phone_number = '22249827331';
  
  IF NOT FOUND THEN
    -- Create admin account with default PIN: 123456
    v_admin_pin_hash := crypt('123456', gen_salt('bf', 10));
    
    INSERT INTO users (
      phone_number,
      pin_hash,
      role,
      is_verified,
      is_active,
      wallet_active,
      wallet_balance,
      failed_login_attempts
    ) VALUES (
      '22249827331',
      v_admin_pin_hash,
      'admin',
      true,
      true,
      true,
      0,
      0
    );
    
    RAISE NOTICE 'Admin account created: 22249827331 with PIN: 123456';
  ELSE
    -- Update existing admin to ensure it's properly configured
    UPDATE users
    SET
      role = 'admin',
      is_verified = true,
      is_active = true,
      wallet_active = true,
      failed_login_attempts = 0
    WHERE id = v_admin_id;
    
    RAISE NOTICE 'Admin account updated: 22249827331';
  END IF;
END $$;

-- =====================================================
-- CREATE OR REPLACE HELPER FUNCTIONS
-- =====================================================

-- Generate 4-digit OTP code
CREATE OR REPLACE FUNCTION create_verification_code()
RETURNS text AS $$
BEGIN
  RETURN LPAD(FLOOR(RANDOM() * 10000)::text, 4, '0');
END;
$$ LANGUAGE plpgsql;

-- Store verification code with expiry
CREATE OR REPLACE FUNCTION send_verification_code(
  p_phone_number text
)
RETURNS json AS $$
DECLARE
  v_code text;
  v_expires_at timestamptz;
BEGIN
  -- Generate code
  v_code := create_verification_code();
  v_expires_at := now() + interval '5 minutes';
  
  -- Delete any existing codes for this phone
  DELETE FROM verification_codes WHERE phone_number = p_phone_number;
  
  -- Insert new code
  INSERT INTO verification_codes (phone_number, code, expires_at)
  VALUES (p_phone_number, v_code, v_expires_at);
  
  RETURN json_build_object(
    'success', true,
    'code', v_code,
    'expires_at', v_expires_at,
    'message', 'Verification code created'
  );
EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object(
      'success', false,
      'message', 'Failed to create verification code: ' || SQLERRM
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- IMPROVED REGISTRATION FUNCTION
-- =====================================================

CREATE OR REPLACE FUNCTION register_user(
  p_phone_number text,
  p_pin text
)
RETURNS json AS $$
DECLARE
  v_user_id uuid;
  v_pin_hash text;
  v_verification_result json;
BEGIN
  -- Validate phone number format (Mauritanian)
  IF NOT (p_phone_number ~ '^222[234][0-9]{7}$') THEN
    RETURN json_build_object(
      'success', false,
      'message', 'Invalid phone number format. Must be a valid Mauritanian number.'
    );
  END IF;
  
  -- Validate PIN length (4-6 digits)
  IF LENGTH(p_pin) < 4 OR LENGTH(p_pin) > 6 THEN
    RETURN json_build_object(
      'success', false,
      'message', 'PIN must be between 4 and 6 digits'
    );
  END IF;
  
  -- Check if user already exists
  IF EXISTS (SELECT 1 FROM users WHERE phone_number = p_phone_number) THEN
    RETURN json_build_object(
      'success', false,
      'message', 'Phone number already registered'
    );
  END IF;
  
  -- Hash the PIN
  v_pin_hash := crypt(p_pin, gen_salt('bf', 10));
  
  -- Insert user
  INSERT INTO users (
    phone_number,
    pin_hash,
    is_verified,
    is_active,
    role,
    wallet_balance,
    wallet_active,
    failed_login_attempts
  ) VALUES (
    p_phone_number,
    v_pin_hash,
    false,
    true,
    'user',
    0,
    false,
    0
  ) RETURNING id INTO v_user_id;
  
  -- Create verification code
  v_verification_result := send_verification_code(p_phone_number);
  
  RETURN json_build_object(
    'success', true,
    'user_id', v_user_id,
    'verification_code', v_verification_result->>'code',
    'message', 'User registered successfully. Please verify your phone number.'
  );
  
EXCEPTION
  WHEN unique_violation THEN
    RETURN json_build_object(
      'success', false,
      'message', 'Phone number already registered'
    );
  WHEN check_violation THEN
    RETURN json_build_object(
      'success', false,
      'message', 'Invalid phone number format'
    );
  WHEN OTHERS THEN
    RETURN json_build_object(
      'success', false,
      'message', 'Registration failed: ' || SQLERRM
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- IMPROVED LOGIN FUNCTION
-- =====================================================

CREATE OR REPLACE FUNCTION verify_user_login(
  p_phone_number text,
  p_pin text
)
RETURNS json AS $$
DECLARE
  v_user users%ROWTYPE;
  v_pin_valid boolean;
  v_remaining_attempts integer;
BEGIN
  -- Get user
  SELECT * INTO v_user
  FROM users
  WHERE phone_number = p_phone_number;
  
  -- Check if user exists
  IF NOT FOUND THEN
    RETURN json_build_object(
      'success', false,
      'message', 'Invalid phone number or PIN'
    );
  END IF;
  
  -- Check if account is active
  IF NOT v_user.is_active THEN
    RETURN json_build_object(
      'success', false,
      'message', 'Account is deactivated. Please contact support.'
    );
  END IF;
  
  -- Check if account has too many failed attempts (require OTP instead of lock)
  IF v_user.failed_login_attempts >= 3 THEN
    RETURN json_build_object(
      'success', false,
      'require_otp', true,
      'phone_number', p_phone_number,
      'message', 'Too many failed login attempts. Please verify your identity with OTP.'
    );
  END IF;
  
  -- Verify PIN
  v_pin_valid := (v_user.pin_hash = crypt(p_pin, v_user.pin_hash));
  
  IF v_pin_valid THEN
    -- For admin, always allow login
    -- For regular users, check verification status
    IF v_user.role != 'admin' AND NOT v_user.is_verified THEN
      RETURN json_build_object(
        'success', false,
        'require_verification', true,
        'phone_number', p_phone_number,
        'message', 'Please verify your phone number first'
      );
    END IF;
    
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
      ),
      'message', 'Login successful'
    );
  ELSE
    -- Increment failed attempts
    UPDATE users 
    SET failed_login_attempts = failed_login_attempts + 1 
    WHERE id = v_user.id;
    
    -- Calculate remaining attempts
    v_remaining_attempts := 3 - (v_user.failed_login_attempts + 1);
    
    IF v_remaining_attempts > 0 THEN
      RETURN json_build_object(
        'success', false,
        'remaining_attempts', v_remaining_attempts,
        'message', 'Invalid PIN. ' || v_remaining_attempts || ' attempt(s) remaining.'
      );
    ELSE
      RETURN json_build_object(
        'success', false,
        'require_otp', true,
        'phone_number', p_phone_number,
        'message', 'Too many failed attempts. Please verify with OTP.'
      );
    END IF;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- IMPROVED OTP VERIFICATION FUNCTION
-- =====================================================

CREATE OR REPLACE FUNCTION verify_otp_code(
  p_phone_number text,
  p_code text
)
RETURNS json AS $$
DECLARE
  v_stored_code text;
  v_expires_at timestamptz;
  v_user users%ROWTYPE;
BEGIN
  -- Get verification code
  SELECT code, expires_at INTO v_stored_code, v_expires_at
  FROM verification_codes
  WHERE phone_number = p_phone_number
  ORDER BY created_at DESC
  LIMIT 1;
  
  IF NOT FOUND THEN
    RETURN json_build_object(
      'success', false,
      'message', 'No verification code found. Please request a new one.'
    );
  END IF;
  
  -- Check if expired
  IF v_expires_at < now() THEN
    DELETE FROM verification_codes WHERE phone_number = p_phone_number;
    RETURN json_build_object(
      'success', false,
      'message', 'Verification code expired. Please request a new one.'
    );
  END IF;
  
  -- Verify code
  IF v_stored_code = p_code THEN
    -- Get user info
    SELECT * INTO v_user FROM users WHERE phone_number = p_phone_number;
    
    IF NOT FOUND THEN
      RETURN json_build_object(
        'success', false,
        'message', 'User not found'
      );
    END IF;
    
    -- Mark user as verified AND reset failed login attempts
    UPDATE users 
    SET
      is_verified = true,
      failed_login_attempts = 0
    WHERE id = v_user.id;
    
    -- Delete verification code
    DELETE FROM verification_codes WHERE phone_number = p_phone_number;
    
    RETURN json_build_object(
      'success', true,
      'user', json_build_object(
        'id', v_user.id,
        'phone_number', v_user.phone_number,
        'wallet_balance', v_user.wallet_balance,
        'wallet_active', v_user.wallet_active,
        'role', v_user.role,
        'is_verified', true
      ),
      'message', 'Phone number verified successfully'
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
-- ADD INDEX FOR VERIFICATION CODES
-- =====================================================

DROP INDEX IF EXISTS idx_verification_codes_phone;
CREATE INDEX idx_verification_codes_phone
ON verification_codes(phone_number, created_at DESC);

DROP INDEX IF EXISTS idx_verification_codes_expires;
CREATE INDEX idx_verification_codes_expires
ON verification_codes(expires_at);

-- =====================================================
-- CLEANUP OLD VERIFICATION CODES
-- =====================================================

-- Delete expired verification codes
DELETE FROM verification_codes WHERE expires_at < now();

COMMENT ON FUNCTION register_user IS 'Register new user with phone validation and OTP generation';
COMMENT ON FUNCTION verify_user_login IS 'Login user with phone+PIN, max 3 attempts before OTP required';
COMMENT ON FUNCTION verify_otp_code IS 'Verify OTP code and unlock/verify account';
COMMENT ON FUNCTION send_verification_code IS 'Generate and store verification code with 5min expiry';
