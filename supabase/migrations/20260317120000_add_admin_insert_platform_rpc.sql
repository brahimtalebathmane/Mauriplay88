/*
  # Add admin_insert_platform RPC

  Custom auth uses phone+PIN; RLS expects JWT so direct inserts fail.
  Add RPC so admin can create platforms via verified admin_phone (role = 'admin').
  Uses schema column: logo_url (platforms table).
*/

CREATE OR REPLACE FUNCTION admin_insert_platform(
  p_admin_phone TEXT,
  p_name TEXT,
  p_logo_url TEXT,
  p_website_url TEXT DEFAULT NULL,
  p_tutorial_video_url TEXT DEFAULT NULL
)
RETURNS JSON AS $$
DECLARE
  v_admin_id UUID;
  v_platform_id UUID;
BEGIN
  -- Verify admin
  SELECT id INTO v_admin_id
  FROM users
  WHERE phone_number = p_admin_phone AND role = 'admin' AND is_active = true;

  IF v_admin_id IS NULL THEN
    RETURN json_build_object('success', false, 'message', 'غير مصرح');
  END IF;

  IF p_name IS NULL OR trim(p_name) = '' THEN
    RETURN json_build_object('success', false, 'message', 'اسم المنصة مطلوب');
  END IF;

  IF p_logo_url IS NULL OR trim(p_logo_url) = '' THEN
    RETURN json_build_object('success', false, 'message', 'رابط الشعار مطلوب');
  END IF;

  INSERT INTO platforms (name, logo_url, website_url, tutorial_video_url, is_deleted)
  VALUES (
    trim(p_name),
    trim(p_logo_url),
    NULLIF(trim(p_website_url), ''),
    NULLIF(trim(p_tutorial_video_url), ''),
    false
  )
  RETURNING id INTO v_platform_id;

  RETURN json_build_object(
    'success', true,
    'message', 'تمت إضافة المنصة بنجاح',
    'id', v_platform_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION admin_insert_platform(TEXT, TEXT, TEXT, TEXT, TEXT) IS 'Admin-only: insert platform. Auth by admin phone and role=admin. Uses logo_url.';
