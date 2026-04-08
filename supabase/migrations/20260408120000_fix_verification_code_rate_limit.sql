-- Allow a new OTP when the previous one has expired, even if the last request
-- was within 60 seconds. The old logic blocked forgot-password / resend flows
-- after an expired code until the cooldown elapsed.

CREATE OR REPLACE FUNCTION create_verification_code(
  p_phone_number text
)
RETURNS json AS $$
DECLARE
  v_code text;
  v_last_created timestamptz;
  v_expires_at timestamptz;
BEGIN
  SELECT created_at, expires_at INTO v_last_created, v_expires_at
  FROM verification_codes
  WHERE phone_number = p_phone_number
  ORDER BY created_at DESC
  LIMIT 1;

  IF FOUND
     AND v_expires_at >= now()
     AND v_last_created > now() - interval '60 seconds' THEN
    RETURN json_build_object(
      'success', false,
      'message', 'يرجى الانتظار قبل طلب رمز جديد'
    );
  END IF;

  v_code := LPAD(floor(random() * 10000)::text, 4, '0');

  DELETE FROM verification_codes WHERE phone_number = p_phone_number;

  INSERT INTO verification_codes (phone_number, code, expires_at)
  VALUES (p_phone_number, v_code, now() + interval '5 minutes');

  RETURN json_build_object(
    'success', true,
    'code', v_code,
    'expires_at', now() + interval '5 minutes'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
