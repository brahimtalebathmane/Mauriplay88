/*
  # OTP-Based Account Unlock System

  ## Changes Made
  
  1. **Updated verify_user_login RPC Function**
     - Removed permanent account lock at 5 failed attempts
     - Now returns a special response requiring OTP verification instead of locking
     - Admin account (22249827331) can always proceed to OTP if needed
     - Automatically resets failed_login_attempts to 0 on successful login
     - Respects is_active flag for true account deactivation
  
  2. **Updated verify_otp_code RPC Function**
     - Now resets failed_login_attempts to 0 after successful OTP verification
     - Enables users to unlock their account via OTP
     - Maintains phone verification functionality
  
  3. **Security Features**
     - is_active flag remains the primary account deactivation mechanism
     - Failed attempts counter resets on successful login or OTP verification
     - Admin account always has access via OTP if attempts are exceeded
     - No permanent locks - only temporary OTP requirement
  
  ## Important Notes
  - Existing failed_login_attempts counters remain intact
  - Users with >= 5 failed attempts will be prompted for OTP on next login
  - OTP verification unlocks the account automatically
*/

-- =====================================================
-- UPDATE verify_user_login RPC
-- =====================================================

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
      'message', 'Invalid phone number or PIN'
    );
  END IF;
  
  -- Check if account is active (primary deactivation mechanism)
  IF NOT v_user.is_active THEN
    RETURN json_build_object(
      'success', false,
      'message', 'Account is deactivated. Contact support.'
    );
  END IF;
  
  -- Check if account has too many failed attempts (require OTP instead of lock)
  IF v_user.failed_login_attempts >= 5 THEN
    RETURN json_build_object(
      'success', false,
      'require_otp', true,
      'phone_number', p_phone_number,
      'message', 'Too many failed attempts. Please verify with OTP.'
    );
  END IF;
  
  -- Verify PIN
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
    
    -- Calculate remaining attempts
    DECLARE
      v_remaining_attempts integer;
    BEGIN
      v_remaining_attempts := 5 - (v_user.failed_login_attempts + 1);
      
      IF v_remaining_attempts > 0 THEN
        RETURN json_build_object(
          'success', false,
          'remaining_attempts', v_remaining_attempts,
          'message', 'Invalid PIN. ' || v_remaining_attempts || ' attempts remaining.'
        );
      ELSE
        RETURN json_build_object(
          'success', false,
          'require_otp', true,
          'phone_number', p_phone_number,
          'message', 'Too many failed attempts. Please verify with OTP.'
        );
      END IF;
    END;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- UPDATE verify_otp_code RPC
-- =====================================================

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
  -- Get verification code
  SELECT code, expires_at INTO v_stored_code, v_expires_at
  FROM verification_codes
  WHERE phone_number = p_phone_number;
  
  IF NOT FOUND THEN
    RETURN json_build_object(
      'success', false,
      'message', 'No verification code found'
    );
  END IF;
  
  -- Check if expired
  IF v_expires_at < now() THEN
    RETURN json_build_object(
      'success', false,
      'message', 'Verification code expired'
    );
  END IF;
  
  -- Verify code
  IF v_stored_code = p_code THEN
    -- Mark user as verified AND reset failed login attempts
    UPDATE users 
    SET is_verified = true, 
        failed_login_attempts = 0 
    WHERE phone_number = p_phone_number 
    RETURNING id INTO v_user_id;
    
    -- Delete verification code
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
