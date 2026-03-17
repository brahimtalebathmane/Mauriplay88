/*
  REPAIR: Admin Panel RPCs – run this in Supabase Dashboard → SQL Editor
  if Admin Panel shows "Failed to load orders/users/payment methods/shipping requests"
  or "Make sure to apply migrations (admin_get_inventory)".

  This creates the required RPCs and grants EXECUTE to anon/authenticated.
  Run once, then refresh the Admin Panel.
*/

-- ========== 1. ORDERS ==========
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
    o.id, o.user_id, o.product_id, o.inventory_id, o.price_at_purchase,
    o.payment_type, o.payment_method_name, o.user_payment_number, o.user_name,
    o.receipt_url, o.transaction_reference, o.status, o.admin_note,
    o.created_at, o.updated_at,
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

-- ========== 2. USERS ==========
CREATE OR REPLACE FUNCTION get_admin_users(p_admin_id UUID)
RETURNS SETOF users AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM users WHERE users.id = p_admin_id AND users.role = 'admin') THEN
    RETURN;
  END IF;
  RETURN QUERY SELECT * FROM users ORDER BY created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ========== 3. PLATFORMS ==========
CREATE OR REPLACE FUNCTION get_platforms()
RETURNS SETOF platforms AS $$
BEGIN
  RETURN QUERY SELECT * FROM platforms WHERE is_deleted = false ORDER BY name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ========== 4. PAYMENT METHODS ==========
CREATE OR REPLACE FUNCTION get_payment_methods_for_admin(p_admin_phone TEXT)
RETURNS SETOF payment_methods AS $$
DECLARE v_admin_id UUID;
BEGIN
  SELECT id INTO v_admin_id FROM users WHERE phone_number = p_admin_phone AND role = 'admin' AND is_active = true;
  IF v_admin_id IS NULL THEN RETURN; END IF;
  RETURN QUERY SELECT * FROM payment_methods ORDER BY name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ========== 5. WALLET TOP-UPS (admin list) ==========
CREATE OR REPLACE FUNCTION get_all_wallet_topups(
  p_admin_id uuid,
  p_status text DEFAULT NULL,
  p_search_phone text DEFAULT NULL
)
RETURNS TABLE (
  id uuid,
  user_id uuid,
  amount numeric,
  depositor_name text,
  phone_number text,
  receipt_url text,
  status wallet_topup_status,
  created_at timestamptz,
  approved_at timestamptz,
  approved_by uuid,
  user_phone_number text,
  payment_method_id uuid,
  payment_method_name text,
  account_number text,
  payment_method_logo text
) AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM users WHERE id = p_admin_id AND role = 'admin') THEN
    RAISE EXCEPTION 'غير مصرح لك بالوصول';
  END IF;
  RETURN QUERY
  SELECT
    wt.id, wt.user_id, wt.amount, wt.depositor_name, wt.phone_number, wt.receipt_url,
    wt.status, wt.created_at, wt.approved_at, wt.approved_by,
    u.phone_number AS user_phone_number,
    wt.payment_method_id, pm.name AS payment_method_name, pm.account_number, pm.logo_url AS payment_method_logo
  FROM wallet_topups wt
  INNER JOIN users u ON wt.user_id = u.id
  LEFT JOIN payment_methods pm ON wt.payment_method_id = pm.id
  WHERE (p_status IS NULL OR wt.status::text = p_status)
    AND (p_search_phone IS NULL OR u.phone_number ILIKE '%' || p_search_phone || '%')
  ORDER BY wt.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ========== 6. APPROVE / REJECT WALLET TOP-UP ==========
CREATE OR REPLACE FUNCTION approve_wallet_topup(p_topup_id uuid, p_admin_id uuid)
RETURNS jsonb AS $$
DECLARE v_topup wallet_topups; v_user_balance numeric; v_new_balance numeric; v_is_admin boolean;
BEGIN
  SELECT role = 'admin' INTO v_is_admin FROM users WHERE id = p_admin_id;
  IF NOT v_is_admin THEN RETURN jsonb_build_object('success', false, 'message', 'غير مصرح'); END IF;
  SELECT * INTO v_topup FROM wallet_topups WHERE id = p_topup_id FOR UPDATE;
  IF NOT FOUND THEN RETURN jsonb_build_object('success', false, 'message', 'طلب الشحن غير موجود'); END IF;
  IF v_topup.status != 'pending' THEN RETURN jsonb_build_object('success', false, 'message', 'تم معالجة هذا الطلب مسبقاً'); END IF;
  SELECT wallet_balance INTO v_user_balance FROM users WHERE id = v_topup.user_id FOR UPDATE;
  v_new_balance := v_user_balance + v_topup.amount;
  UPDATE wallet_topups SET status = 'approved', approved_at = now(), approved_by = p_admin_id WHERE id = p_topup_id;
  UPDATE users SET wallet_balance = v_new_balance WHERE id = v_topup.user_id;
  BEGIN
    INSERT INTO wallet_transactions (user_id, type, amount, balance_before, balance_after, description)
    VALUES (v_topup.user_id, 'credit', v_topup.amount, v_user_balance, v_new_balance, 'شحن محفظة - موافق');
  EXCEPTION WHEN OTHERS THEN NULL;
  END;
  RETURN jsonb_build_object('success', true, 'message', 'تمت الموافقة على طلب الشحن بنجاح');
EXCEPTION WHEN OTHERS THEN RETURN jsonb_build_object('success', false, 'message', SQLERRM);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION reject_wallet_topup(p_topup_id uuid, p_admin_id uuid, p_reason text DEFAULT NULL)
RETURNS jsonb AS $$
DECLARE v_topup wallet_topups; v_is_admin boolean;
BEGIN
  SELECT role = 'admin' INTO v_is_admin FROM users WHERE id = p_admin_id;
  IF NOT v_is_admin THEN RETURN jsonb_build_object('success', false, 'message', 'غير مصرح'); END IF;
  SELECT * INTO v_topup FROM wallet_topups WHERE id = p_topup_id FOR UPDATE;
  IF NOT FOUND THEN RETURN jsonb_build_object('success', false, 'message', 'طلب الشحن غير موجود'); END IF;
  IF v_topup.status != 'pending' THEN RETURN jsonb_build_object('success', false, 'message', 'تم معالجة هذا الطلب مسبقاً'); END IF;
  UPDATE wallet_topups SET status = 'rejected', approved_at = now(), approved_by = p_admin_id WHERE id = p_topup_id;
  RETURN jsonb_build_object('success', true, 'message', 'تم رفض طلب الشحن');
EXCEPTION WHEN OTHERS THEN RETURN jsonb_build_object('success', false, 'message', SQLERRM);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ========== 7. INVENTORY ==========
CREATE OR REPLACE FUNCTION admin_get_inventory(p_admin_phone TEXT)
RETURNS TABLE (
  id UUID, product_id UUID, product_name TEXT, platform_name TEXT, code TEXT, status inventory_status, created_at TIMESTAMPTZ
) AS $$
DECLARE v_admin_id UUID;
BEGIN
  SELECT users.id INTO v_admin_id FROM users WHERE phone_number = p_admin_phone AND role = 'admin' AND is_active = true;
  IF v_admin_id IS NULL THEN RAISE EXCEPTION 'غير مصرح'; END IF;
  RETURN QUERY
  SELECT i.id, i.product_id, p.name AS product_name, pl.name AS platform_name, i.code, i.status, i.created_at
  FROM inventory i
  JOIN products p ON i.product_id = p.id
  JOIN platforms pl ON p.platform_id = pl.id
  WHERE i.is_deleted = false
  ORDER BY i.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION admin_add_inventory_bulk(p_admin_phone TEXT, p_product_id UUID, p_codes TEXT[])
RETURNS JSON AS $$
DECLARE v_admin_id UUID; v_code TEXT; v_inserted_count INT := 0;
BEGIN
  SELECT id INTO v_admin_id FROM users WHERE phone_number = p_admin_phone AND role = 'admin' AND is_active = true;
  IF v_admin_id IS NULL THEN RETURN json_build_object('success', false, 'message', 'غير مصرح'); END IF;
  IF NOT EXISTS (SELECT 1 FROM products WHERE id = p_product_id AND is_deleted = false) THEN
    RETURN json_build_object('success', false, 'message', 'المنتج غير موجود');
  END IF;
  FOREACH v_code IN ARRAY p_codes LOOP
    IF v_code IS NOT NULL AND trim(v_code) != '' THEN
      INSERT INTO inventory (product_id, code, status) VALUES (p_product_id, trim(v_code), 'available');
      v_inserted_count := v_inserted_count + 1;
    END IF;
  END LOOP;
  RETURN json_build_object('success', true, 'message', 'تم إضافة ' || v_inserted_count || ' رمز بنجاح', 'count', v_inserted_count);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION admin_update_inventory(p_admin_phone TEXT, p_inventory_id UUID, p_code TEXT, p_status inventory_status)
RETURNS JSON AS $$
DECLARE v_admin_id UUID;
BEGIN
  SELECT id INTO v_admin_id FROM users WHERE phone_number = p_admin_phone AND role = 'admin' AND is_active = true;
  IF v_admin_id IS NULL THEN RETURN json_build_object('success', false, 'message', 'غير مصرح'); END IF;
  UPDATE inventory SET code = p_code, status = p_status, updated_at = now() WHERE id = p_inventory_id AND is_deleted = false;
  IF NOT FOUND THEN RETURN json_build_object('success', false, 'message', 'الرمز غير موجود'); END IF;
  RETURN json_build_object('success', true, 'message', 'تم تحديث الرمز بنجاح');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION admin_delete_inventory(p_admin_phone TEXT, p_inventory_id UUID)
RETURNS JSON AS $$
DECLARE v_admin_id UUID; v_status inventory_status;
BEGIN
  SELECT id INTO v_admin_id FROM users WHERE phone_number = p_admin_phone AND role = 'admin' AND is_active = true;
  IF v_admin_id IS NULL THEN RETURN json_build_object('success', false, 'message', 'غير مصرح'); END IF;
  SELECT status INTO v_status FROM inventory WHERE id = p_inventory_id;
  IF v_status IN ('sold', 'reserved') THEN RETURN json_build_object('success', false, 'message', 'لا يمكن حذف رمز مباع أو محجوز'); END IF;
  UPDATE inventory SET is_deleted = true, updated_at = now() WHERE id = p_inventory_id;
  IF NOT FOUND THEN RETURN json_build_object('success', false, 'message', 'الرمز غير موجود'); END IF;
  RETURN json_build_object('success', true, 'message', 'تم حذف الرمز بنجاح');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION admin_delete_product(p_admin_phone TEXT, p_product_id UUID)
RETURNS JSON AS $$
DECLARE v_admin_id UUID;
BEGIN
  SELECT id INTO v_admin_id FROM users WHERE phone_number = p_admin_phone AND role = 'admin' AND is_active = true;
  IF v_admin_id IS NULL THEN RETURN json_build_object('success', false, 'message', 'غير مصرح'); END IF;
  UPDATE products SET is_deleted = true, updated_at = now() WHERE id = p_product_id;
  IF NOT FOUND THEN RETURN json_build_object('success', false, 'message', 'المنتج غير موجود'); END IF;
  RETURN json_build_object('success', true, 'message', 'تم حذف المنتج بنجاح');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ========== 8. SETTINGS (admin edit notice) ==========
CREATE OR REPLACE FUNCTION save_app_setting(p_admin_phone text, p_key text, p_value text)
RETURNS json AS $$
DECLARE v_admin_id uuid;
BEGIN
  SELECT id INTO v_admin_id FROM users WHERE phone_number = p_admin_phone AND role = 'admin' AND is_active = true;
  IF v_admin_id IS NULL THEN RETURN json_build_object('success', false, 'message', 'غير مصرح'); END IF;
  IF p_key IS NULL OR trim(p_key) = '' THEN RETURN json_build_object('success', false, 'message', 'المفتاح مطلوب'); END IF;
  IF p_key NOT IN ('wallet_notice') THEN RETURN json_build_object('success', false, 'message', 'غير مصرح'); END IF;
  INSERT INTO settings (key, value, updated_at)
  VALUES (p_key, COALESCE(trim(p_value), ''), now())
  ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now();
  RETURN json_build_object('success', true, 'message', 'تم الحفظ');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ========== 9. GRANTS ==========
GRANT EXECUTE ON FUNCTION get_admin_orders(uuid, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION get_admin_users(uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION get_platforms() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION get_payment_methods_for_admin(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION get_all_wallet_topups(uuid, text, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION approve_wallet_topup(uuid, uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION reject_wallet_topup(uuid, uuid, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION admin_get_inventory(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION admin_add_inventory_bulk(text, uuid, text[]) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION admin_update_inventory(text, uuid, text, inventory_status) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION admin_delete_inventory(text, uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION admin_delete_product(text, uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION save_app_setting(text, text, text) TO anon, authenticated;
