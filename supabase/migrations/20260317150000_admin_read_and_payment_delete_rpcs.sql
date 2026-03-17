/*
  # Admin read RPCs and payment method delete (bypass RLS / fix 401)
  - get_platforms: load platforms without hitting RLS (no auth required for read)
  - get_payment_methods_for_admin: load all payment methods for admin
  - admin_delete_payment_method: delete payment method (admin only)
*/

-- ========== PLATFORMS (read without RLS) ==========
CREATE OR REPLACE FUNCTION get_platforms()
RETURNS SETOF platforms AS $$
BEGIN
  RETURN QUERY
  SELECT * FROM platforms
  WHERE is_deleted = false
  ORDER BY name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION get_platforms() IS 'Returns non-deleted platforms. No auth required. Use for admin and public listing.';

-- ========== PAYMENT METHODS (admin read + delete) ==========
CREATE OR REPLACE FUNCTION get_payment_methods_for_admin(p_admin_phone TEXT)
RETURNS SETOF payment_methods AS $$
DECLARE
  v_admin_id UUID;
BEGIN
  SELECT id INTO v_admin_id FROM users WHERE phone_number = p_admin_phone AND role = 'admin' AND is_active = true;
  IF v_admin_id IS NULL THEN
    RETURN;
  END IF;
  RETURN QUERY
  SELECT * FROM payment_methods
  ORDER BY name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION admin_delete_payment_method(
  p_admin_phone TEXT,
  p_method_id UUID
)
RETURNS JSON AS $$
DECLARE
  v_admin_id UUID;
BEGIN
  SELECT id INTO v_admin_id FROM users WHERE phone_number = p_admin_phone AND role = 'admin' AND is_active = true;
  IF v_admin_id IS NULL THEN
    RETURN json_build_object('success', false, 'message', 'غير مصرح');
  END IF;

  DELETE FROM payment_methods WHERE id = p_method_id;

  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'message', 'وسيلة الدفع غير موجودة');
  END IF;
  RETURN json_build_object('success', true, 'message', 'تم حذف وسيلة الدفع');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
