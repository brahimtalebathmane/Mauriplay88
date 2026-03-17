/*
  # Admin RPCs for custom auth (no JWT)
  - admin_insert_product: add product (schema: products.logo_url)
  - admin_update_product: extend to accept logo_url
  - admin_insert_payment_method, admin_update_payment_method
  - admin_toggle_wallet_active, admin_toggle_user_active
  - get_admin_orders: list orders for admin (replaces direct SELECT blocked by RLS)
*/

-- ========== PRODUCTS ==========
CREATE OR REPLACE FUNCTION admin_insert_product(
  p_admin_phone TEXT,
  p_platform_id UUID,
  p_name TEXT,
  p_price_mru NUMERIC,
  p_logo_url TEXT DEFAULT NULL
)
RETURNS JSON AS $$
DECLARE
  v_admin_id UUID;
  v_product_id UUID;
BEGIN
  SELECT id INTO v_admin_id FROM users WHERE phone_number = p_admin_phone AND role = 'admin' AND is_active = true;
  IF v_admin_id IS NULL THEN
    RETURN json_build_object('success', false, 'message', 'غير مصرح');
  END IF;
  IF p_name IS NULL OR trim(p_name) = '' THEN
    RETURN json_build_object('success', false, 'message', 'اسم المنتج مطلوب');
  END IF;
  IF p_price_mru IS NULL OR p_price_mru < 0 THEN
    RETURN json_build_object('success', false, 'message', 'السعر غير صالح');
  END IF;

  INSERT INTO products (platform_id, name, price_mru, logo_url, is_deleted)
  VALUES (p_platform_id, trim(p_name), p_price_mru, NULLIF(trim(p_logo_url), ''), false)
  RETURNING id INTO v_product_id;

  RETURN json_build_object('success', true, 'message', 'تمت إضافة المنتج بنجاح', 'id', v_product_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Extend admin_update_product to accept logo_url (products table uses logo_url)
CREATE OR REPLACE FUNCTION admin_update_product(
  p_admin_phone TEXT,
  p_product_id UUID,
  p_name TEXT,
  p_price_mru NUMERIC,
  p_logo_url TEXT DEFAULT NULL
)
RETURNS JSON AS $$
DECLARE
  v_admin_id UUID;
BEGIN
  SELECT id INTO v_admin_id FROM users WHERE phone_number = p_admin_phone AND role = 'admin' AND is_active = true;
  IF v_admin_id IS NULL THEN
    RETURN json_build_object('success', false, 'message', 'غير مصرح');
  END IF;
  IF p_price_mru < 0 THEN
    RETURN json_build_object('success', false, 'message', 'السعر يجب أن يكون رقماً موجباً');
  END IF;

  UPDATE products
  SET name = p_name,
      price_mru = p_price_mru,
      logo_url = COALESCE(NULLIF(trim(p_logo_url), ''), logo_url),
      updated_at = now()
  WHERE id = p_product_id AND is_deleted = false;

  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'message', 'المنتج غير موجود');
  END IF;
  RETURN json_build_object('success', true, 'message', 'تم تحديث المنتج بنجاح');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ========== PAYMENT METHODS ==========
CREATE OR REPLACE FUNCTION admin_insert_payment_method(
  p_admin_phone TEXT,
  p_name TEXT,
  p_account_number TEXT,
  p_logo_url TEXT DEFAULT NULL
)
RETURNS JSON AS $$
DECLARE
  v_admin_id UUID;
BEGIN
  SELECT id INTO v_admin_id FROM users WHERE phone_number = p_admin_phone AND role = 'admin' AND is_active = true;
  IF v_admin_id IS NULL THEN
    RETURN json_build_object('success', false, 'message', 'غير مصرح');
  END IF;
  IF p_name IS NULL OR trim(p_name) = '' THEN
    RETURN json_build_object('success', false, 'message', 'الاسم مطلوب');
  END IF;
  IF p_account_number IS NULL OR trim(p_account_number) = '' THEN
    RETURN json_build_object('success', false, 'message', 'رقم الحساب مطلوب');
  END IF;

  INSERT INTO payment_methods (name, account_number, logo_url, is_active)
  VALUES (trim(p_name), trim(p_account_number), NULLIF(trim(p_logo_url), ''), true);

  RETURN json_build_object('success', true, 'message', 'تمت إضافة وسيلة الدفع');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION admin_update_payment_method(
  p_admin_phone TEXT,
  p_method_id UUID,
  p_name TEXT DEFAULT NULL,
  p_account_number TEXT DEFAULT NULL,
  p_logo_url TEXT DEFAULT NULL,
  p_is_active BOOLEAN DEFAULT NULL
)
RETURNS JSON AS $$
DECLARE
  v_admin_id UUID;
BEGIN
  SELECT id INTO v_admin_id FROM users WHERE phone_number = p_admin_phone AND role = 'admin' AND is_active = true;
  IF v_admin_id IS NULL THEN
    RETURN json_build_object('success', false, 'message', 'غير مصرح');
  END IF;

  UPDATE payment_methods
  SET
    name = COALESCE(NULLIF(trim(p_name), ''), name),
    account_number = COALESCE(NULLIF(trim(p_account_number), ''), account_number),
    logo_url = CASE WHEN p_logo_url IS NOT NULL THEN NULLIF(trim(p_logo_url), '') ELSE logo_url END,
    is_active = COALESCE(p_is_active, is_active),
    updated_at = now()
  WHERE id = p_method_id;

  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'message', 'وسيلة الدفع غير موجودة');
  END IF;
  RETURN json_build_object('success', true, 'message', 'تم التحديث');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ========== USERS (toggle wallet / user active) ==========
CREATE OR REPLACE FUNCTION admin_toggle_wallet_active(
  p_admin_phone TEXT,
  p_user_id UUID
)
RETURNS JSON AS $$
DECLARE
  v_admin_id UUID;
  v_current BOOLEAN;
BEGIN
  SELECT id INTO v_admin_id FROM users WHERE phone_number = p_admin_phone AND role = 'admin' AND is_active = true;
  IF v_admin_id IS NULL THEN
    RETURN json_build_object('success', false, 'message', 'غير مصرح');
  END IF;

  SELECT wallet_active INTO v_current FROM users WHERE id = p_user_id;
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'message', 'المستخدم غير موجود');
  END IF;

  UPDATE users SET wallet_active = NOT v_current, updated_at = now() WHERE id = p_user_id;
  RETURN json_build_object('success', true, 'message', CASE WHEN NOT v_current THEN 'تم تفعيل المحفظة' ELSE 'تم إلغاء تفعيل المحفظة' END);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION admin_toggle_user_active(
  p_admin_phone TEXT,
  p_user_id UUID
)
RETURNS JSON AS $$
DECLARE
  v_admin_id UUID;
  v_current BOOLEAN;
BEGIN
  SELECT id INTO v_admin_id FROM users WHERE phone_number = p_admin_phone AND role = 'admin' AND is_active = true;
  IF v_admin_id IS NULL THEN
    RETURN json_build_object('success', false, 'message', 'غير مصرح');
  END IF;

  SELECT is_active INTO v_current FROM users WHERE id = p_user_id;
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'message', 'المستخدم غير موجود');
  END IF;

  UPDATE users SET is_active = NOT v_current, updated_at = now() WHERE id = p_user_id;
  RETURN json_build_object('success', true, 'message', CASE WHEN NOT v_current THEN 'تم تفعيل الحساب' ELSE 'تم تعطيل الحساب' END);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ========== ORDERS (admin list) ==========
CREATE OR REPLACE FUNCTION get_admin_orders(
  p_admin_id UUID,
  p_status TEXT DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  user_id UUID,
  product_id UUID,
  inventory_id UUID,
  price_at_purchase NUMERIC,
  payment_type payment_type,
  payment_method_name TEXT,
  user_payment_number TEXT,
  user_name TEXT,
  receipt_url TEXT,
  transaction_reference TEXT,
  status order_status,
  admin_note TEXT,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  user_phone_number TEXT,
  product_name TEXT,
  inventory_code TEXT
) AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM users WHERE users.id = p_admin_id AND users.role = 'admin') THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT
    o.id,
    o.user_id,
    o.product_id,
    o.inventory_id,
    o.price_at_purchase,
    o.payment_type,
    o.payment_method_name,
    o.user_payment_number,
    o.user_name,
    o.receipt_url,
    o.transaction_reference,
    o.status,
    o.admin_note,
    o.created_at,
    o.updated_at,
    u.phone_number AS user_phone_number,
    p.name AS product_name,
    i.code AS inventory_code
  FROM orders o
  LEFT JOIN users u ON u.id = o.user_id
  LEFT JOIN products p ON p.id = o.product_id
  LEFT JOIN inventory i ON i.id = o.inventory_id
  WHERE (p_status IS NULL OR o.status::TEXT = p_status)
  ORDER BY o.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ========== USERS (admin list) ==========
CREATE OR REPLACE FUNCTION get_admin_users(p_admin_id UUID)
RETURNS SETOF users AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM users WHERE users.id = p_admin_id AND users.role = 'admin') THEN
    RETURN;
  END IF;
  RETURN QUERY SELECT * FROM users ORDER BY created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
