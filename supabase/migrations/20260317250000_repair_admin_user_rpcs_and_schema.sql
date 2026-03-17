/*
  # Repair Admin & User Panel RPCs and Schema

  Fixes:
  - wallet_topups: ensure approved_at, approved_by columns exist
  - get_all_wallet_topups: explicit column aliases, GRANT anon/authenticated
  - approve_wallet_topup / reject_wallet_topup: return JSONB, GRANT
  - get_wallet_transactions: ensure exists and granted (Wallet page)
  - get_user_orders_with_inventory: ensure exists and granted (My Purchases)
  - get_admin_orders: ensure exists and granted (Admin Orders)
  - approve_manual_order / reject_manual_order: return JSON, GRANT (Admin approve/reject)
*/

-- 1. Ensure wallet_topups has approved_at, approved_by (some older migrations may not)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'wallet_topups' AND column_name = 'approved_at'
  ) THEN
    ALTER TABLE wallet_topups ADD COLUMN approved_at timestamptz;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'wallet_topups' AND column_name = 'approved_by'
  ) THEN
    ALTER TABLE wallet_topups ADD COLUMN approved_by uuid REFERENCES users(id) ON DELETE SET NULL;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'orders' AND column_name = 'updated_at'
  ) THEN
    ALTER TABLE orders ADD COLUMN updated_at timestamptz DEFAULT now();
  END IF;
END $$;

-- 2. get_all_wallet_topups: admin list with payment method (explicit aliases to avoid ambiguous columns)
DROP FUNCTION IF EXISTS get_all_wallet_topups(uuid, text, text);
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
  IF NOT EXISTS (
    SELECT 1 FROM users
    WHERE id = p_admin_id
      AND role = 'admin'
  ) THEN
    RAISE EXCEPTION 'غير مصرح لك بالوصول';
  END IF;

  RETURN QUERY
  SELECT
    wt.id               AS id,
    wt.user_id          AS user_id,
    wt.amount           AS amount,
    wt.depositor_name   AS depositor_name,
    wt.phone_number     AS phone_number,
    wt.receipt_url      AS receipt_url,
    wt.status           AS status,
    wt.created_at       AS created_at,
    wt.approved_at      AS approved_at,
    wt.approved_by      AS approved_by,
    u.phone_number      AS user_phone_number,
    wt.payment_method_id AS payment_method_id,
    pm.name             AS payment_method_name,
    pm.account_number   AS account_number,
    pm.logo_url         AS payment_method_logo
  FROM wallet_topups wt
  INNER JOIN users u ON wt.user_id = u.id
  LEFT JOIN payment_methods pm ON wt.payment_method_id = pm.id
  WHERE
    (p_status IS NULL OR wt.status::text = p_status)
    AND (p_search_phone IS NULL OR u.phone_number ILIKE '%' || p_search_phone || '%')
  ORDER BY wt.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION get_all_wallet_topups(uuid, text, text) TO anon;
GRANT EXECUTE ON FUNCTION get_all_wallet_topups(uuid, text, text) TO authenticated;

-- 3. Approve wallet top-up: return JSONB (frontend expects data.success / data.message)
CREATE OR REPLACE FUNCTION approve_wallet_topup(p_topup_id uuid, p_admin_id uuid)
RETURNS jsonb AS $$
DECLARE
  v_topup wallet_topups%ROWTYPE;
  v_user_balance numeric;
  v_new_balance numeric;
  v_is_admin boolean;
BEGIN
  SELECT (role = 'admin') INTO v_is_admin FROM users WHERE id = p_admin_id;
  IF NOT v_is_admin THEN
    RETURN jsonb_build_object('success', false, 'message', 'غير مصرح');
  END IF;

  SELECT * INTO v_topup FROM wallet_topups WHERE id = p_topup_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'message', 'طلب الشحن غير موجود');
  END IF;
  IF v_topup.status != 'pending' THEN
    RETURN jsonb_build_object('success', false, 'message', 'تم معالجة هذا الطلب مسبقاً');
  END IF;

  SELECT wallet_balance INTO v_user_balance FROM users WHERE id = v_topup.user_id FOR UPDATE;
  v_new_balance := v_user_balance + v_topup.amount;

  UPDATE wallet_topups
  SET status = 'approved', approved_at = now(), approved_by = p_admin_id
  WHERE id = p_topup_id;

  UPDATE users SET wallet_balance = v_new_balance WHERE id = v_topup.user_id;

  INSERT INTO wallet_transactions (user_id, type, amount, balance_before, balance_after, description)
  VALUES (v_topup.user_id, 'credit', v_topup.amount, v_user_balance, v_new_balance, 'شحن محفظة - موافق');

  RETURN jsonb_build_object('success', true, 'message', 'تمت الموافقة على طلب الشحن بنجاح');
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('success', false, 'message', COALESCE(SQLERRM, 'خطأ غير متوقع'));
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Reject wallet top-up: return JSONB
CREATE OR REPLACE FUNCTION reject_wallet_topup(p_topup_id uuid, p_admin_id uuid, p_reason text DEFAULT NULL)
RETURNS jsonb AS $$
DECLARE
  v_topup wallet_topups%ROWTYPE;
  v_is_admin boolean;
BEGIN
  SELECT (role = 'admin') INTO v_is_admin FROM users WHERE id = p_admin_id;
  IF NOT v_is_admin THEN
    RETURN jsonb_build_object('success', false, 'message', 'غير مصرح');
  END IF;

  SELECT * INTO v_topup FROM wallet_topups WHERE id = p_topup_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'message', 'طلب الشحن غير موجود');
  END IF;
  IF v_topup.status != 'pending' THEN
    RETURN jsonb_build_object('success', false, 'message', 'تم معالجة هذا الطلب مسبقاً');
  END IF;

  UPDATE wallet_topups
  SET status = 'rejected', approved_at = now(), approved_by = p_admin_id
  WHERE id = p_topup_id;

  RETURN jsonb_build_object('success', true, 'message', 'تم رفض طلب الشحن');
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('success', false, 'message', COALESCE(SQLERRM, 'خطأ غير متوقع'));
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION approve_wallet_topup(uuid, uuid) TO anon;
GRANT EXECUTE ON FUNCTION approve_wallet_topup(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION reject_wallet_topup(uuid, uuid, text) TO anon;
GRANT EXECUTE ON FUNCTION reject_wallet_topup(uuid, uuid, text) TO authenticated;

-- 5. get_wallet_transactions: Wallet page transaction history (by phone)
CREATE OR REPLACE FUNCTION get_wallet_transactions(p_phone_number text)
RETURNS TABLE (
  id uuid,
  type transaction_type,
  amount numeric,
  balance_before numeric,
  balance_after numeric,
  description text,
  created_at timestamptz
) AS $$
DECLARE
  v_user_id uuid;
BEGIN
  SELECT users.id INTO v_user_id
  FROM users
  WHERE phone_number = p_phone_number AND is_active = true;

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'المستخدم غير موجود';
  END IF;

  RETURN QUERY
  SELECT
    wt.id,
    wt.type,
    wt.amount,
    wt.balance_before,
    wt.balance_after,
    wt.description,
    wt.created_at
  FROM wallet_transactions wt
  WHERE wt.user_id = v_user_id
  ORDER BY wt.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION get_wallet_transactions(text) TO anon;
GRANT EXECUTE ON FUNCTION get_wallet_transactions(text) TO authenticated;

-- 6. get_user_orders_with_inventory: My Purchases page
CREATE OR REPLACE FUNCTION get_user_orders_with_inventory(p_user_id uuid)
RETURNS TABLE (
  id uuid,
  user_id uuid,
  product_id uuid,
  inventory_id uuid,
  price_at_purchase numeric,
  payment_type payment_type,
  payment_method_name text,
  user_payment_number text,
  user_name text,
  transaction_reference text,
  receipt_url text,
  status order_status,
  admin_note text,
  created_at timestamptz,
  updated_at timestamptz,
  product_name text,
  product_price numeric,
  platform_id uuid,
  platform_name text,
  platform_logo_url text,
  platform_website_url text,
  platform_tutorial_video_url text,
  inventory_code text,
  inventory_status inventory_status
) AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM users WHERE users.id = p_user_id) THEN
    RAISE EXCEPTION 'User not found';
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
    o.transaction_reference,
    o.receipt_url,
    o.status,
    o.admin_note,
    o.created_at,
    o.updated_at,
    p.name AS product_name,
    p.price_mru AS product_price,
    pl.id AS platform_id,
    pl.name AS platform_name,
    pl.logo_url AS platform_logo_url,
    pl.website_url AS platform_website_url,
    pl.tutorial_video_url AS platform_tutorial_video_url,
    i.code AS inventory_code,
    i.status AS inventory_status
  FROM orders o
  LEFT JOIN products p ON o.product_id = p.id
  LEFT JOIN platforms pl ON p.platform_id = pl.id
  LEFT JOIN inventory i ON o.inventory_id = i.id
  WHERE o.user_id = p_user_id
  ORDER BY o.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION get_user_orders_with_inventory(uuid) TO anon;
GRANT EXECUTE ON FUNCTION get_user_orders_with_inventory(uuid) TO authenticated;

-- 7. get_admin_orders: Admin Orders list
CREATE OR REPLACE FUNCTION get_admin_orders(
  p_admin_id uuid,
  p_status text DEFAULT NULL
)
RETURNS TABLE (
  id uuid,
  user_id uuid,
  product_id uuid,
  inventory_id uuid,
  price_at_purchase numeric,
  payment_type payment_type,
  payment_method_name text,
  user_payment_number text,
  user_name text,
  receipt_url text,
  transaction_reference text,
  status order_status,
  admin_note text,
  created_at timestamptz,
  updated_at timestamptz,
  user_phone_number text,
  product_name text,
  inventory_code text
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
  WHERE (p_status IS NULL OR o.status::text = p_status)
  ORDER BY o.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION get_admin_orders(uuid, text) TO anon;
GRANT EXECUTE ON FUNCTION get_admin_orders(uuid, text) TO authenticated;

-- 8. approve_manual_order / reject_manual_order: Admin approve/reject direct orders
CREATE OR REPLACE FUNCTION approve_manual_order(
  p_order_id uuid,
  p_admin_id uuid
)
RETURNS json AS $$
DECLARE
  v_order orders%ROWTYPE;
  v_is_admin boolean;
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

  RETURN json_build_object('success', true, 'message', 'Order approved successfully');
EXCEPTION WHEN OTHERS THEN
  RETURN json_build_object('success', false, 'message', COALESCE(SQLERRM, 'Error approving order'));
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION reject_manual_order(
  p_order_id uuid,
  p_admin_id uuid,
  p_admin_note text
)
RETURNS json AS $$
DECLARE
  v_order orders%ROWTYPE;
  v_is_admin boolean;
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

  UPDATE orders
  SET status = 'rejected',
      admin_note = p_admin_note,
      updated_at = now()
  WHERE id = p_order_id;

  UPDATE inventory
  SET status = 'available',
      reserved_until = NULL,
      updated_at = now()
  WHERE id = v_order.inventory_id;

  RETURN json_build_object('success', true, 'message', 'Order rejected successfully');
EXCEPTION WHEN OTHERS THEN
  RETURN json_build_object('success', false, 'message', COALESCE(SQLERRM, 'Error rejecting order'));
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION approve_manual_order(uuid, uuid) TO anon;
GRANT EXECUTE ON FUNCTION approve_manual_order(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION reject_manual_order(uuid, uuid, text) TO anon;
GRANT EXECUTE ON FUNCTION reject_manual_order(uuid, uuid, text) TO authenticated;

-- 9. create_wallet_topup (user submit top-up request) and get_user_wallet_topups (user list)
DROP FUNCTION IF EXISTS create_wallet_topup(uuid, numeric, text, text, text);
CREATE OR REPLACE FUNCTION create_wallet_topup(
  p_user_id uuid,
  p_amount numeric,
  p_depositor_name text,
  p_phone_number text,
  p_receipt_url text,
  p_payment_method_id uuid
)
RETURNS json AS $$
DECLARE
  v_pending_count integer;
  v_new_topup wallet_topups%ROWTYPE;
  v_payment_method_active boolean;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM users
    WHERE id = p_user_id AND is_active = true AND is_verified = true
  ) THEN
    RETURN json_build_object('success', false, 'message', 'المستخدم غير موجود أو غير نشط');
  END IF;
  IF p_payment_method_id IS NULL THEN
    RETURN json_build_object('success', false, 'message', 'يرجى اختيار طريقة الدفع');
  END IF;
  SELECT is_active INTO v_payment_method_active FROM payment_methods WHERE id = p_payment_method_id;
  IF NOT FOUND OR NOT v_payment_method_active THEN
    RETURN json_build_object('success', false, 'message', 'طريقة الدفع غير متاحة حالياً');
  END IF;
  SELECT COUNT(*) INTO v_pending_count FROM wallet_topups WHERE user_id = p_user_id AND status = 'pending';
  IF v_pending_count >= 5 THEN
    RETURN json_build_object('success', false, 'message', 'لديك 5 طلبات شحن معلقة. يرجى الانتظار حتى تتم معالجتها.');
  END IF;
  IF p_amount <= 0 THEN
    RETURN json_build_object('success', false, 'message', 'المبلغ يجب أن يكون أكبر من صفر');
  END IF;
  INSERT INTO wallet_topups (user_id, payment_method_id, amount, depositor_name, phone_number, receipt_url, status)
  VALUES (p_user_id, p_payment_method_id, p_amount, p_depositor_name, p_phone_number, p_receipt_url, 'pending')
  RETURNING * INTO v_new_topup;
  RETURN json_build_object('success', true, 'topup', row_to_json(v_new_topup));
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION get_user_wallet_topups(p_user_id uuid)
RETURNS TABLE (
  id uuid,
  amount numeric,
  depositor_name text,
  phone_number text,
  receipt_url text,
  status wallet_topup_status,
  created_at timestamptz,
  approved_at timestamptz,
  payment_method_id uuid,
  payment_method_name text,
  account_number text,
  payment_method_logo text
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    wt.id AS id,
    wt.amount AS amount,
    wt.depositor_name AS depositor_name,
    wt.phone_number AS phone_number,
    wt.receipt_url AS receipt_url,
    wt.status AS status,
    wt.created_at AS created_at,
    wt.approved_at AS approved_at,
    wt.payment_method_id AS payment_method_id,
    pm.name AS payment_method_name,
    pm.account_number AS account_number,
    pm.logo_url AS payment_method_logo
  FROM wallet_topups wt
  LEFT JOIN payment_methods pm ON wt.payment_method_id = pm.id
  WHERE wt.user_id = p_user_id
  ORDER BY wt.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION create_wallet_topup(uuid, numeric, text, text, text, uuid) TO anon;
GRANT EXECUTE ON FUNCTION create_wallet_topup(uuid, numeric, text, text, text, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_wallet_topups(uuid) TO anon;
GRANT EXECUTE ON FUNCTION get_user_wallet_topups(uuid) TO authenticated;
