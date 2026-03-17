/*
  # Add admin_update_platform and admin_delete_platform RPCs

  These RPCs are required for admin platform CRUD. admin_insert_platform was added
  in 20260317120000; update and delete were only defined in an older migration
  (20260307141848) which may not be applied on all deployments. This migration
  ensures all three exist so the schema cache has them and edit/delete work.
*/

-- admin_update_platform: update platform by id (admin-only, verified by phone + role)
CREATE OR REPLACE FUNCTION admin_update_platform(
  p_admin_phone TEXT,
  p_platform_id UUID,
  p_name TEXT,
  p_logo_url TEXT,
  p_website_url TEXT,
  p_tutorial_video_url TEXT
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
      updated_at = now()
  WHERE id = p_platform_id AND is_deleted = false;

  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'message', 'المنصة غير موجودة');
  END IF;

  RETURN json_build_object('success', true, 'message', 'تم تحديث المنصة بنجاح');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION admin_update_platform(TEXT, UUID, TEXT, TEXT, TEXT, TEXT) IS 'Admin-only: update platform. Auth by admin phone and role=admin.';

-- admin_delete_platform: soft delete platform and its products (admin-only)
CREATE OR REPLACE FUNCTION admin_delete_platform(
  p_admin_phone TEXT,
  p_platform_id UUID
)
RETURNS JSON AS $$
DECLARE
  v_admin_id UUID;
  v_product_count INT;
BEGIN
  SELECT id INTO v_admin_id
  FROM users
  WHERE phone_number = p_admin_phone AND role = 'admin' AND is_active = true;

  IF v_admin_id IS NULL THEN
    RETURN json_build_object('success', false, 'message', 'غير مصرح');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM platforms WHERE id = p_platform_id AND is_deleted = false) THEN
    RETURN json_build_object('success', false, 'message', 'المنصة غير موجودة');
  END IF;

  SELECT COUNT(*) INTO v_product_count
  FROM products
  WHERE platform_id = p_platform_id AND is_deleted = false;

  UPDATE platforms
  SET is_deleted = true, updated_at = now()
  WHERE id = p_platform_id;

  UPDATE products
  SET is_deleted = true, updated_at = now()
  WHERE platform_id = p_platform_id AND is_deleted = false;

  RETURN json_build_object(
    'success', true,
    'message', 'تم حذف المنصة و ' || v_product_count || ' منتج مرتبط بنجاح'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION admin_delete_platform(TEXT, UUID) IS 'Admin-only: soft delete platform and related products. Auth by admin phone and role=admin.';
