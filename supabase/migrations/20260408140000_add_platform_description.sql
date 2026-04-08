/*
  # Platform description (optional)

  Adds nullable `description` for public display on the platform page.
  Replaces admin_insert_platform / admin_update_platform with new signatures
  that include p_description. Existing rows keep NULL description.
*/

ALTER TABLE platforms ADD COLUMN IF NOT EXISTS description text;

COMMENT ON COLUMN platforms.description IS 'Optional description shown on the public platform page.';

DROP FUNCTION IF EXISTS admin_insert_platform(text, text, text, text, text);
DROP FUNCTION IF EXISTS admin_update_platform(text, uuid, text, text, text, text);

CREATE OR REPLACE FUNCTION admin_insert_platform(
  p_admin_phone TEXT,
  p_name TEXT,
  p_logo_url TEXT,
  p_website_url TEXT DEFAULT NULL,
  p_tutorial_video_url TEXT DEFAULT NULL,
  p_description TEXT DEFAULT NULL
)
RETURNS JSON AS $$
DECLARE
  v_admin_id UUID;
  v_platform_id UUID;
BEGIN
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

  INSERT INTO platforms (name, logo_url, website_url, tutorial_video_url, description, is_deleted)
  VALUES (
    trim(p_name),
    trim(p_logo_url),
    NULLIF(trim(p_website_url), ''),
    NULLIF(trim(p_tutorial_video_url), ''),
    NULLIF(trim(p_description), ''),
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

COMMENT ON FUNCTION admin_insert_platform(text, text, text, text, text, text) IS 'Admin-only: insert platform. Auth by admin phone and role=admin.';

CREATE OR REPLACE FUNCTION admin_update_platform(
  p_admin_phone TEXT,
  p_platform_id UUID,
  p_name TEXT,
  p_logo_url TEXT,
  p_website_url TEXT,
  p_tutorial_video_url TEXT,
  p_description TEXT
)
RETURNS JSON AS $$
DECLARE
  v_admin_id UUID;
BEGIN
  SELECT id INTO v_admin_id
  FROM users
  WHERE phone_number = p_admin_phone AND role = 'admin' AND is_active = true;

  IF v_admin_id IS NULL THEN
    RETURN json_build_object('success', false, 'message', 'غير مصرح');
  END IF;

  UPDATE platforms
  SET name = p_name,
      logo_url = p_logo_url,
      website_url = p_website_url,
      tutorial_video_url = p_tutorial_video_url,
      description = NULLIF(trim(p_description), ''),
      updated_at = now()
  WHERE id = p_platform_id AND is_deleted = false;

  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'message', 'المنصة غير موجودة');
  END IF;

  RETURN json_build_object('success', true, 'message', 'تم تحديث المنصة بنجاح');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION admin_update_platform(text, uuid, text, text, text, text, text) IS 'Admin-only: update platform. Auth by admin phone and role=admin.';

DO $$
BEGIN
  BEGIN EXECUTE 'GRANT EXECUTE ON FUNCTION admin_insert_platform(text, text, text, text, text, text) TO anon'; EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN EXECUTE 'GRANT EXECUTE ON FUNCTION admin_insert_platform(text, text, text, text, text, text) TO authenticated'; EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN EXECUTE 'GRANT EXECUTE ON FUNCTION admin_update_platform(text, uuid, text, text, text, text, text) TO anon'; EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN EXECUTE 'GRANT EXECUTE ON FUNCTION admin_update_platform(text, uuid, text, text, text, text, text) TO authenticated'; EXCEPTION WHEN OTHERS THEN NULL; END;
END $$;
