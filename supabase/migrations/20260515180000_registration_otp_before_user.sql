-- Registration flow: OTP must be delivered via send-otp *before* register_user inserts a row.
-- Eliminates orphaned unverified accounts when WhatsApp/OTP delivery fails after user creation.
-- Phone availability for registration is enforced in the send-otp Edge Function (for_registration flag).

CREATE OR REPLACE FUNCTION register_user(
  p_phone_number text,
  p_pin text
)
RETURNS json AS $$
DECLARE
  v_user_id uuid;
  v_pin_hash text;
BEGIN
  IF NOT (p_phone_number ~ '^222[234][0-9]{7}$') THEN
    RETURN json_build_object(
      'success', false,
      'message', 'Invalid phone number format. Must be a valid Mauritanian number.'
    );
  END IF;

  IF length(p_pin) < 4 OR length(p_pin) > 6 THEN
    RETURN json_build_object(
      'success', false,
      'message', 'PIN must be between 4 and 6 digits'
    );
  END IF;

  IF EXISTS (SELECT 1 FROM users WHERE phone_number = p_phone_number) THEN
    RETURN json_build_object(
      'success', false,
      'message', 'Phone number already registered'
    );
  END IF;

  v_pin_hash := crypt(p_pin, gen_salt('bf', 10));

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
    true,
    0
  )
  RETURNING id INTO v_user_id;

  RETURN json_build_object(
    'success', true,
    'user_id', v_user_id,
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
