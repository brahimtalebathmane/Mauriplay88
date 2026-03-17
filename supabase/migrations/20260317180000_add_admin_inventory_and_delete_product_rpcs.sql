/*
  # Add admin inventory RPCs and admin_delete_product

  These RPCs are required for admin inventory and product CRUD. They were only
  defined in 20260307141848 which may not be applied on all deployments.
  This migration ensures they exist so the schema cache has them and 404s are resolved.

  - admin_add_inventory_bulk: add multiple codes for a product
  - admin_update_inventory: update one inventory code
  - admin_delete_inventory: soft delete one inventory code (block if sold/reserved)
  - admin_get_inventory: list all inventory for admin (by admin phone)
  - admin_delete_product: soft delete a product
*/

-- ========== INVENTORY ==========
CREATE OR REPLACE FUNCTION admin_add_inventory_bulk(
  p_admin_phone TEXT,
  p_product_id UUID,
  p_codes TEXT[]
)
RETURNS JSON AS $$
DECLARE
  v_admin_id UUID;
  v_code TEXT;
  v_inserted_count INT := 0;
BEGIN
  SELECT id INTO v_admin_id
  FROM users
  WHERE phone_number = p_admin_phone AND role = 'admin' AND is_active = true;

  IF v_admin_id IS NULL THEN
    RETURN json_build_object('success', false, 'message', 'غير مصرح');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM products WHERE id = p_product_id AND is_deleted = false) THEN
    RETURN json_build_object('success', false, 'message', 'المنتج غير موجود');
  END IF;

  FOREACH v_code IN ARRAY p_codes
  LOOP
    IF v_code IS NOT NULL AND trim(v_code) != '' THEN
      INSERT INTO inventory (product_id, code, status)
      VALUES (p_product_id, trim(v_code), 'available');
      v_inserted_count := v_inserted_count + 1;
    END IF;
  END LOOP;

  RETURN json_build_object(
    'success', true,
    'message', 'تم إضافة ' || v_inserted_count || ' رمز بنجاح',
    'count', v_inserted_count
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION admin_update_inventory(
  p_admin_phone TEXT,
  p_inventory_id UUID,
  p_code TEXT,
  p_status inventory_status
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

  UPDATE inventory
  SET code = p_code,
      status = p_status,
      updated_at = now()
  WHERE id = p_inventory_id AND is_deleted = false;

  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'message', 'الرمز غير موجود');
  END IF;

  RETURN json_build_object('success', true, 'message', 'تم تحديث الرمز بنجاح');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION admin_delete_inventory(
  p_admin_phone TEXT,
  p_inventory_id UUID
)
RETURNS JSON AS $$
DECLARE
  v_admin_id UUID;
  v_status inventory_status;
BEGIN
  SELECT id INTO v_admin_id
  FROM users
  WHERE phone_number = p_admin_phone AND role = 'admin' AND is_active = true;

  IF v_admin_id IS NULL THEN
    RETURN json_build_object('success', false, 'message', 'غير مصرح');
  END IF;

  SELECT status INTO v_status FROM inventory WHERE id = p_inventory_id;

  IF v_status IN ('sold', 'reserved') THEN
    RETURN json_build_object('success', false, 'message', 'لا يمكن حذف رمز مباع أو محجوز');
  END IF;

  UPDATE inventory
  SET is_deleted = true, updated_at = now()
  WHERE id = p_inventory_id;

  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'message', 'الرمز غير موجود');
  END IF;

  RETURN json_build_object('success', true, 'message', 'تم حذف الرمز بنجاح');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION admin_get_inventory(p_admin_phone TEXT)
RETURNS TABLE (
  id UUID,
  product_id UUID,
  product_name TEXT,
  platform_name TEXT,
  code TEXT,
  status inventory_status,
  created_at TIMESTAMPTZ
) AS $$
DECLARE
  v_admin_id UUID;
BEGIN
  SELECT users.id INTO v_admin_id
  FROM users
  WHERE phone_number = p_admin_phone AND role = 'admin' AND is_active = true;

  IF v_admin_id IS NULL THEN
    RAISE EXCEPTION 'غير مصرح';
  END IF;

  RETURN QUERY
  SELECT
    i.id,
    i.product_id,
    p.name AS product_name,
    pl.name AS platform_name,
    i.code,
    i.status,
    i.created_at
  FROM inventory i
  JOIN products p ON i.product_id = p.id
  JOIN platforms pl ON p.platform_id = pl.id
  WHERE i.is_deleted = false
  ORDER BY i.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ========== PRODUCTS ==========
CREATE OR REPLACE FUNCTION admin_delete_product(
  p_admin_phone TEXT,
  p_product_id UUID
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

  UPDATE products
  SET is_deleted = true, updated_at = now()
  WHERE id = p_product_id;

  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'message', 'المنتج غير موجود');
  END IF;

  RETURN json_build_object('success', true, 'message', 'تم حذف المنتج بنجاح');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION admin_add_inventory_bulk(TEXT, UUID, TEXT[]) IS 'Admin-only: bulk add inventory codes for a product.';
COMMENT ON FUNCTION admin_update_inventory(TEXT, UUID, TEXT, inventory_status) IS 'Admin-only: update one inventory code.';
COMMENT ON FUNCTION admin_delete_inventory(TEXT, UUID) IS 'Admin-only: soft delete inventory code; blocks if sold/reserved.';
COMMENT ON FUNCTION admin_get_inventory(TEXT) IS 'Admin-only: list all inventory.';
COMMENT ON FUNCTION admin_delete_product(TEXT, UUID) IS 'Admin-only: soft delete product.';
