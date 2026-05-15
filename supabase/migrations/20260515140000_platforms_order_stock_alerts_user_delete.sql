/*
  Storefront platform visibility + ordering, stock admin signals, wallet default-on register,
  and permanent user deletion (admin RPC).

  - platforms.display_order, platforms.is_enabled
  - RLS: public may only SELECT enabled, non-deleted platforms
  - get_platforms(): storefront (enabled only), ordered
  - get_admin_platforms(p_admin_phone): all non-deleted for admin UI
  - admin_insert_platform: assigns display_order; default is_enabled true
  - admin_reorder_platforms, admin_toggle_platform_enabled
  - register_user: wallet_active defaults true for new accounts
  - create_wallet_purchase / approve_manual_order: return remaining_available_stock
  - admin_delete_user_permanent
*/

-- ========== SCHEMA: PLATFORMS ==========
ALTER TABLE platforms ADD COLUMN IF NOT EXISTS display_order integer NOT NULL DEFAULT 0;
ALTER TABLE platforms ADD COLUMN IF NOT EXISTS is_enabled boolean NOT NULL DEFAULT true;

COMMENT ON COLUMN platforms.display_order IS 'Lower values appear first on the storefront.';
COMMENT ON COLUMN platforms.is_enabled IS 'When false, platform is hidden from customers but kept for admins.';

-- One-time stable ordering from creation time (admins can reorder afterward)
WITH ranked AS (
  SELECT id, (ROW_NUMBER() OVER (ORDER BY created_at ASC))::integer AS ord
  FROM platforms
  WHERE is_deleted = false
)
UPDATE platforms p
SET display_order = r.ord
FROM ranked r
WHERE p.id = r.id;

CREATE INDEX IF NOT EXISTS idx_platforms_storefront_order
  ON platforms (is_deleted, is_enabled, display_order);

-- Storefront visibility is enforced by get_platforms() and by client queries using is_enabled = true.
-- (RLS stays compatible with existing admin/product joins that embed platforms.)

-- ========== get_platforms (storefront) ==========
CREATE OR REPLACE FUNCTION get_platforms()
RETURNS SETOF platforms AS $$
BEGIN
  RETURN QUERY
  SELECT *
  FROM platforms
  WHERE is_deleted = false
    AND is_enabled = true
  ORDER BY display_order ASC, name ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION get_platforms() IS 'Public/storefront: enabled, non-deleted platforms ordered by display_order.';

-- ========== get_admin_platforms ==========
CREATE OR REPLACE FUNCTION get_admin_platforms(p_admin_phone text)
RETURNS SETOF platforms AS $$
DECLARE
  v_admin_id uuid;
BEGIN
  SELECT id INTO v_admin_id
  FROM users
  WHERE phone_number = p_admin_phone
    AND role = 'admin'
    AND is_active = true;

  IF v_admin_id IS NULL THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT *
  FROM platforms
  WHERE is_deleted = false
  ORDER BY display_order ASC, name ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION get_admin_platforms(text) IS 'Admin-only: all non-deleted platforms (including disabled), ordered.';

-- ========== admin_insert_platform (display_order + is_enabled) ==========
DROP FUNCTION IF EXISTS admin_insert_platform(text, text, text, text, text, text);

CREATE OR REPLACE FUNCTION admin_insert_platform(
  p_admin_phone text,
  p_name text,
  p_logo_url text,
  p_website_url text DEFAULT NULL,
  p_tutorial_video_url text DEFAULT NULL,
  p_description text DEFAULT NULL
)
RETURNS json AS $$
DECLARE
  v_admin_id uuid;
  v_platform_id uuid;
  v_next_ord integer;
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

  SELECT COALESCE(MAX(display_order), 0) + 1 INTO v_next_ord
  FROM platforms
  WHERE is_deleted = false;

  INSERT INTO platforms (
    name,
    logo_url,
    website_url,
    tutorial_video_url,
    description,
    is_deleted,
    is_enabled,
    display_order
  )
  VALUES (
    trim(p_name),
    trim(p_logo_url),
    NULLIF(trim(p_website_url), ''),
    NULLIF(trim(p_tutorial_video_url), ''),
    NULLIF(trim(p_description), ''),
    false,
    true,
    v_next_ord
  )
  RETURNING id INTO v_platform_id;

  RETURN json_build_object(
    'success', true,
    'message', 'تمت إضافة المنصة بنجاح',
    'id', v_platform_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION admin_insert_platform(text, text, text, text, text, text) IS 'Admin-only: insert platform with next display_order.';

-- ========== admin_reorder_platforms ==========
CREATE OR REPLACE FUNCTION admin_reorder_platforms(
  p_admin_phone text,
  p_ordered_ids uuid[]
)
RETURNS json AS $$
DECLARE
  v_admin_id uuid;
  v_expected integer;
  v_got integer;
  i integer;
BEGIN
  SELECT id INTO v_admin_id
  FROM users
  WHERE phone_number = p_admin_phone AND role = 'admin' AND is_active = true;

  IF v_admin_id IS NULL THEN
    RETURN json_build_object('success', false, 'message', 'غير مصرح');
  END IF;

  IF p_ordered_ids IS NULL OR array_length(p_ordered_ids, 1) IS NULL THEN
    RETURN json_build_object('success', false, 'message', 'قائمة الترتيب فارغة');
  END IF;

  SELECT COUNT(*) INTO v_expected FROM platforms WHERE is_deleted = false;
  v_got := array_length(p_ordered_ids, 1);

  IF v_expected != v_got THEN
    RETURN json_build_object('success', false, 'message', 'يجب تضمين جميع المنصات في الترتيب');
  END IF;

  IF (
    SELECT COUNT(DISTINCT u.x)
    FROM unnest(p_ordered_ids) AS u(x)
  ) != v_got THEN
    RETURN json_build_object('success', false, 'message', 'قائمة الترتيب تحتوي على تكرار');
  END IF;

  IF EXISTS (
    SELECT 1
    FROM unnest(p_ordered_ids) AS u(pid)
    WHERE NOT EXISTS (
      SELECT 1 FROM platforms p WHERE p.id = u.pid AND p.is_deleted = false
    )
  ) THEN
    RETURN json_build_object('success', false, 'message', 'معرف منصة غير صالح');
  END IF;

  FOR i IN 1..v_got LOOP
    UPDATE platforms
    SET display_order = i,
        updated_at = now()
    WHERE id = p_ordered_ids[i];
  END LOOP;

  RETURN json_build_object('success', true, 'message', 'تم تحديث ترتيب المنصات');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION admin_reorder_platforms(text, uuid[]) IS 'Admin-only: assign display_order from array position (1-based).';

-- ========== admin_toggle_platform_enabled ==========
CREATE OR REPLACE FUNCTION admin_toggle_platform_enabled(
  p_admin_phone text,
  p_platform_id uuid
)
RETURNS json AS $$
DECLARE
  v_admin_id uuid;
  v_new boolean;
BEGIN
  SELECT id INTO v_admin_id
  FROM users
  WHERE phone_number = p_admin_phone AND role = 'admin' AND is_active = true;

  IF v_admin_id IS NULL THEN
    RETURN json_build_object('success', false, 'message', 'غير مصرح');
  END IF;

  UPDATE platforms
  SET is_enabled = NOT is_enabled,
      updated_at = now()
  WHERE id = p_platform_id
    AND is_deleted = false
  RETURNING is_enabled INTO v_new;

  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'message', 'المنصة غير موجودة');
  END IF;

  RETURN json_build_object(
    'success', true,
    'message', CASE WHEN v_new THEN 'تم تفعيل المنصة' ELSE 'تم تعطيل المنصة' END,
    'is_enabled', v_new
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION admin_toggle_platform_enabled(text, uuid) IS 'Admin-only: flip is_enabled for a platform.';

-- ========== register_user: wallet active by default ==========
CREATE OR REPLACE FUNCTION register_user(
  p_phone_number text,
  p_pin text
)
RETURNS json AS $$
DECLARE
  v_user_id uuid;
  v_pin_hash text;
  v_verification_result json;
BEGIN
  IF NOT (p_phone_number ~ '^222[234][0-9]{7}$') THEN
    RETURN json_build_object(
      'success', false,
      'message', 'Invalid phone number format. Must be a valid Mauritanian number.'
    );
  END IF;

  IF length(p_pin) < 4 OR length(p_pin) > 6 THEN
    RETURN json_build_object(
      'success', false,
      'message', 'PIN must be between 4 and 6 digits'
    );
  END IF;

  IF EXISTS (SELECT 1 FROM users WHERE phone_number = p_phone_number) THEN
    RETURN json_build_object(
      'success', false,
      'message', 'Phone number already registered'
    );
  END IF;

  v_pin_hash := crypt(p_pin, gen_salt('bf', 10));

  INSERT INTO users (
    phone_number,
    pin_hash,
    is_verified,
    is_active,
    role,
    wallet_balance,
    wallet_active,
    failed_login_attempts
  ) VALUES (
    p_phone_number,
    v_pin_hash,
    false,
    true,
    'user',
    0,
    true,
    0
  )
  RETURNING id INTO v_user_id;

  v_verification_result := send_verification_code(p_phone_number);

  RETURN json_build_object(
    'success', true,
    'user_id', v_user_id,
    'verification_code', v_verification_result->>'code',
    'message', 'User registered successfully. Please verify your phone number.'
  );

EXCEPTION
  WHEN unique_violation THEN
    RETURN json_build_object(
      'success', false,
      'message', 'Phone number already registered'
    );
  WHEN check_violation THEN
    RETURN json_build_object(
      'success', false,
      'message', 'Invalid phone number format'
    );
  WHEN OTHERS THEN
    RETURN json_build_object(
      'success', false,
      'message', 'Registration failed: ' || SQLERRM
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ========== create_wallet_purchase: remaining stock ==========
CREATE OR REPLACE FUNCTION create_wallet_purchase(
  p_user_id uuid,
  p_product_id uuid
)
RETURNS json AS $$
DECLARE
  v_product products%ROWTYPE;
  v_inventory inventory%ROWTYPE;
  v_platform platforms%ROWTYPE;
  v_order_id uuid;
  v_wallet_result json;
  v_user users%ROWTYPE;
  v_remaining bigint;
BEGIN
  SELECT * INTO v_user FROM users WHERE id = p_user_id;

  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'message', 'User not found');
  END IF;

  IF NOT v_user.wallet_active THEN
    RETURN json_build_object('success', false, 'message', 'Wallet is not activated. Please contact support.');
  END IF;

  SELECT * INTO v_product FROM products WHERE id = p_product_id AND is_deleted = false;

  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'message', 'Product not found');
  END IF;

  SELECT * INTO v_platform FROM platforms WHERE id = v_product.platform_id;

  SELECT * INTO v_inventory
  FROM inventory
  WHERE product_id = p_product_id
    AND status = 'available'
    AND is_deleted = false
  ORDER BY created_at ASC
  LIMIT 1
  FOR UPDATE SKIP LOCKED;

  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'message', 'Product out of stock');
  END IF;

  v_wallet_result := deduct_wallet_balance(p_user_id, v_product.price_mru, 'Purchase: ' || v_product.name, NULL);

  IF NOT (v_wallet_result->>'success')::boolean THEN
    RETURN v_wallet_result;
  END IF;

  INSERT INTO orders (user_id, inventory_id, product_id, price_at_purchase, payment_type, status)
  VALUES (p_user_id, v_inventory.id, p_product_id, v_product.price_mru, 'wallet', 'approved')
  RETURNING id INTO v_order_id;

  UPDATE wallet_transactions
  SET order_id = v_order_id
  WHERE id = (
    SELECT id FROM wallet_transactions
    WHERE user_id = p_user_id AND order_id IS NULL
    ORDER BY created_at DESC
    LIMIT 1
  );

  UPDATE inventory SET status = 'sold' WHERE id = v_inventory.id;

  SELECT COUNT(*)::bigint INTO v_remaining
  FROM inventory
  WHERE product_id = p_product_id
    AND status = 'available'
    AND is_deleted = false;

  RETURN json_build_object(
    'success', true,
    'order_id', v_order_id,
    'inventory_id', v_inventory.id,
    'code', v_inventory.code,
    'product_name', v_product.name,
    'platform_name', v_platform.name,
    'platform_logo_url', v_platform.logo_url,
    'platform_website_url', v_platform.website_url,
    'platform_tutorial_video_url', v_platform.tutorial_video_url,
    'remaining_available_stock', v_remaining,
    'message', 'Purchase completed successfully'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ========== approve_manual_order: remaining stock ==========
CREATE OR REPLACE FUNCTION approve_manual_order(
  p_order_id uuid,
  p_admin_id uuid
)
RETURNS json AS $$
DECLARE
  v_order orders%ROWTYPE;
  v_is_admin boolean;
  v_remaining bigint;
BEGIN
  SELECT role = 'admin' INTO v_is_admin FROM users WHERE id = p_admin_id;
  IF NOT v_is_admin THEN
    RETURN json_build_object('success', false, 'message', 'Unauthorized: Admin access required');
  END IF;

  SELECT * INTO v_order FROM orders WHERE id = p_order_id;
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'message', 'Order not found');
  END IF;

  IF v_order.status != 'pending' THEN
    RETURN json_build_object('success', false, 'message', 'Order is not pending');
  END IF;

  UPDATE orders SET status = 'approved', updated_at = now() WHERE id = p_order_id;

  UPDATE inventory
  SET status = 'sold', reserved_until = NULL, updated_at = now()
  WHERE id = v_order.inventory_id;

  SELECT COUNT(*)::bigint INTO v_remaining
  FROM inventory
  WHERE product_id = v_order.product_id
    AND status = 'available'
    AND is_deleted = false;

  RETURN json_build_object(
    'success', true,
    'message', 'Order approved successfully',
    'remaining_available_stock', v_remaining,
    'product_id', v_order.product_id
  );
EXCEPTION WHEN OTHERS THEN
  RETURN json_build_object('success', false, 'message', COALESCE(SQLERRM, 'Error approving order'));
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ========== admin_delete_user_permanent ==========
CREATE OR REPLACE FUNCTION admin_delete_user_permanent(
  p_admin_phone text,
  p_user_id uuid
)
RETURNS json AS $$
DECLARE
  v_admin_id uuid;
  v_target users%ROWTYPE;
  v_phone text;
BEGIN
  SELECT id INTO v_admin_id
  FROM users
  WHERE phone_number = p_admin_phone AND role = 'admin' AND is_active = true;

  IF v_admin_id IS NULL THEN
    RETURN json_build_object('success', false, 'message', 'غير مصرح');
  END IF;

  IF p_user_id = v_admin_id THEN
    RETURN json_build_object('success', false, 'message', 'لا يمكن حذف حسابك الحالي');
  END IF;

  SELECT * INTO v_target FROM users WHERE id = p_user_id;
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'message', 'المستخدم غير موجود');
  END IF;

  IF v_target.role = 'admin' THEN
    RETURN json_build_object('success', false, 'message', 'لا يمكن حذف حساب إداري');
  END IF;

  v_phone := v_target.phone_number;

  DELETE FROM wallet_transactions WHERE user_id = p_user_id;
  DELETE FROM orders WHERE user_id = p_user_id;
  DELETE FROM wallet_topups WHERE user_id = p_user_id;
  UPDATE wallet_topups SET approved_by = NULL WHERE approved_by = p_user_id;
  DELETE FROM pin_reset_sessions WHERE user_id = p_user_id;
  DELETE FROM verification_codes WHERE phone_number = v_phone;
  DELETE FROM users WHERE id = p_user_id;

  RETURN json_build_object('success', true, 'message', 'تم حذف الحساب نهائياً');
EXCEPTION WHEN OTHERS THEN
  RETURN json_build_object('success', false, 'message', 'فشل الحذف: ' || SQLERRM);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION admin_delete_user_permanent(text, uuid) IS 'Admin-only: permanently remove a non-admin user and dependent rows.';

-- ========== GRANTS ==========
DO $$
BEGIN
  BEGIN EXECUTE 'GRANT EXECUTE ON FUNCTION get_admin_platforms(text) TO anon'; EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN EXECUTE 'GRANT EXECUTE ON FUNCTION get_admin_platforms(text) TO authenticated'; EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN EXECUTE 'GRANT EXECUTE ON FUNCTION admin_reorder_platforms(text, uuid[]) TO anon'; EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN EXECUTE 'GRANT EXECUTE ON FUNCTION admin_reorder_platforms(text, uuid[]) TO authenticated'; EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN EXECUTE 'GRANT EXECUTE ON FUNCTION admin_toggle_platform_enabled(text, uuid) TO anon'; EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN EXECUTE 'GRANT EXECUTE ON FUNCTION admin_toggle_platform_enabled(text, uuid) TO authenticated'; EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN EXECUTE 'GRANT EXECUTE ON FUNCTION admin_delete_user_permanent(text, uuid) TO anon'; EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN EXECUTE 'GRANT EXECUTE ON FUNCTION admin_delete_user_permanent(text, uuid) TO authenticated'; EXCEPTION WHEN OTHERS THEN NULL; END;
END $$;
