/*
  # Forgot PIN reset via WhatsApp OTP (same system as send-otp / create_verification_code)

  - check_pin_reset_phone: ensure user exists, verified, active before sending OTP
  - verify_otp_for_pin_reset: same OTP validation pattern as verify_otp_code; invalidates OTP; issues short-lived session
  - complete_pin_reset_after_otp: set new PIN using session id; invalidates session
*/

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS pin_reset_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '15 minutes'),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_pin_reset_sessions_expires ON pin_reset_sessions(expires_at);
CREATE INDEX IF NOT EXISTS idx_pin_reset_sessions_user ON pin_reset_sessions(user_id);

-- No GRANT on table: only SECURITY DEFINER RPCs access this table.

-- =====================================================
-- Eligibility check before send-otp
-- =====================================================

CREATE OR REPLACE FUNCTION check_pin_reset_phone(p_phone_number text)
RETURNS json AS $$
DECLARE
  v_user users%ROWTYPE;
BEGIN
  IF p_phone_number !~ '^222[234][0-9]{7}$' THEN
    RETURN json_build_object(
      'success', false,
      'eligible', false,
      'message', 'رقم الهاتف غير صحيح'
    );
  END IF;

  SELECT * INTO v_user FROM users WHERE phone_number = p_phone_number;

  IF NOT FOUND THEN
    RETURN json_build_object(
      'success', false,
      'eligible', false,
      'message', 'رقم الهاتف غير مسجل'
    );
  END IF;

  IF NOT v_user.is_verified THEN
    RETURN json_build_object(
      'success', false,
      'eligible', false,
      'message', 'يرجى تأكيد رقم الهاتف أولاً'
    );
  END IF;

  IF NOT v_user.is_active THEN
    RETURN json_build_object(
      'success', false,
      'eligible', false,
      'message', 'الحساب معطل. يرجى التواصل مع الدعم'
    );
  END IF;

  RETURN json_build_object(
    'success', true,
    'eligible', true,
    'message', 'OK'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- Verify OTP (same logic as verify_otp_code) + invalidate OTP + session
-- =====================================================

CREATE OR REPLACE FUNCTION verify_otp_for_pin_reset(
  p_phone_number text,
  p_code text
)
RETURNS json AS $$
DECLARE
  v_stored_code text;
  v_expires_at timestamptz;
  v_user users%ROWTYPE;
  v_session_id uuid;
BEGIN
  SELECT * INTO v_user FROM users WHERE phone_number = p_phone_number;

  IF NOT FOUND THEN
    RETURN json_build_object(
      'success', false,
      'message', 'رقم الهاتف غير مسجل'
    );
  END IF;

  IF NOT v_user.is_verified OR NOT v_user.is_active THEN
    RETURN json_build_object(
      'success', false,
      'message', 'لا يمكن إعادة تعيين الرمز لهذا الحساب'
    );
  END IF;

  SELECT code, expires_at INTO v_stored_code, v_expires_at
  FROM verification_codes
  WHERE phone_number = p_phone_number
  ORDER BY created_at DESC
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN json_build_object(
      'success', false,
      'message', 'لا يوجد رمز تحقق. اطلب رمزاً جديداً.'
    );
  END IF;

  IF v_expires_at < now() THEN
    DELETE FROM verification_codes WHERE phone_number = p_phone_number;
    RETURN json_build_object(
      'success', false,
      'message', 'انتهت صلاحية الرمز. اطلب رمزاً جديداً.'
    );
  END IF;

  IF v_stored_code <> p_code THEN
    RETURN json_build_object(
      'success', false,
      'message', 'رمز التحقق غير صحيح'
    );
  END IF;

  -- Match verify_otp_code: reset failed attempts on successful OTP
  UPDATE users
  SET failed_login_attempts = 0
  WHERE id = v_user.id;

  DELETE FROM verification_codes WHERE phone_number = p_phone_number;

  DELETE FROM pin_reset_sessions WHERE user_id = v_user.id;

  INSERT INTO pin_reset_sessions (user_id, expires_at)
  VALUES (v_user.id, now() + interval '15 minutes')
  RETURNING id INTO v_session_id;

  RETURN json_build_object(
    'success', true,
    'message', 'تم التحقق من الرمز',
    'reset_session_id', v_session_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- Set new PIN after OTP verified (session one-time)
-- =====================================================

CREATE OR REPLACE FUNCTION complete_pin_reset_after_otp(
  p_reset_session_id uuid,
  p_new_pin text
)
RETURNS json AS $$
DECLARE
  v_sess pin_reset_sessions%ROWTYPE;
  v_pin_hash text;
BEGIN
  IF p_new_pin !~ '^\d{6}$' THEN
    RETURN json_build_object(
      'success', false,
      'message', 'الرمز السري يجب أن يكون 6 أرقام فقط'
    );
  END IF;

  SELECT * INTO v_sess
  FROM pin_reset_sessions
  WHERE id = p_reset_session_id;

  IF NOT FOUND THEN
    RETURN json_build_object(
      'success', false,
      'message', 'انتهت جلسة إعادة التعيين. يرجى البدء من جديد'
    );
  END IF;

  IF v_sess.expires_at < now() THEN
    DELETE FROM pin_reset_sessions WHERE id = p_reset_session_id;
    RETURN json_build_object(
      'success', false,
      'message', 'انتهت جلسة إعادة التعيين. يرجى البدء من جديد'
    );
  END IF;

  v_pin_hash := crypt(p_new_pin, gen_salt('bf'));

  UPDATE users
  SET pin_hash = v_pin_hash,
      failed_login_attempts = 0,
      updated_at = now()
  WHERE id = v_sess.user_id;

  DELETE FROM pin_reset_sessions WHERE id = p_reset_session_id;

  RETURN json_build_object(
    'success', true,
    'message', 'تم تغيير الرمز السري بنجاح'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION check_pin_reset_phone IS 'Check phone can receive forgot-PIN OTP (registered, verified, active)';
COMMENT ON FUNCTION verify_otp_for_pin_reset IS 'Verify WhatsApp OTP for PIN reset; consumes OTP; creates reset session';
COMMENT ON FUNCTION complete_pin_reset_after_otp IS 'Apply new PIN after verify_otp_for_pin_reset; consumes session';

GRANT EXECUTE ON FUNCTION check_pin_reset_phone(text) TO anon;
GRANT EXECUTE ON FUNCTION check_pin_reset_phone(text) TO authenticated;

GRANT EXECUTE ON FUNCTION verify_otp_for_pin_reset(text, text) TO anon;
GRANT EXECUTE ON FUNCTION verify_otp_for_pin_reset(text, text) TO authenticated;

GRANT EXECUTE ON FUNCTION complete_pin_reset_after_otp(uuid, text) TO anon;
GRANT EXECUTE ON FUNCTION complete_pin_reset_after_otp(uuid, text) TO authenticated;
