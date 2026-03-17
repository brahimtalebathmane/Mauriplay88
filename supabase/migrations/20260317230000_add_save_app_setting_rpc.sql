/*
  # save_app_setting – admin-only RPC to update settings (e.g. wallet_notice)

  Used by Admin Panel → Wallet Top-up → "تعديل الإشعار" to persist the notice text.
*/

CREATE OR REPLACE FUNCTION save_app_setting(
  p_admin_phone text,
  p_key text,
  p_value text
)
RETURNS json AS $$
DECLARE
  v_admin_id uuid;
BEGIN
  SELECT id INTO v_admin_id
  FROM users
  WHERE phone_number = p_admin_phone AND role = 'admin' AND is_active = true;

  IF v_admin_id IS NULL THEN
    RETURN json_build_object('success', false, 'message', 'غير مصرح');
  END IF;

  IF p_key IS NULL OR trim(p_key) = '' THEN
    RETURN json_build_object('success', false, 'message', 'المفتاح مطلوب');
  END IF;

  IF p_key NOT IN ('wallet_notice') THEN
    RETURN json_build_object('success', false, 'message', 'غير مصرح بتعديل هذا الإعداد');
  END IF;

  INSERT INTO settings (key, value, updated_at)
  VALUES (p_key, COALESCE(trim(p_value), ''), now())
  ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now();

  RETURN json_build_object('success', true, 'message', 'تم الحفظ');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION save_app_setting(text, text, text) IS 'Admin-only: update app settings (e.g. wallet_notice).';

GRANT EXECUTE ON FUNCTION save_app_setting(text, text, text) TO anon;
GRANT EXECUTE ON FUNCTION save_app_setting(text, text, text) TO authenticated;
