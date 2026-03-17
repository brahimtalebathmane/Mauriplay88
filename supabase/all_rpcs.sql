/*
  Canonical definitions of core RPC functions for Mauriplay.

  Usage:
  - This file is a convenience bundle for initializing or repairing a Supabase project.
  - Do NOT edit functions directly in the Supabase dashboard; instead, update migrations
    and, if needed, regenerate this file from them.
  - To (re)apply all core RPCs, paste this file into the Supabase SQL editor and run it.
*/

-- =====================================================
-- Wallet top-up RPCs (with payment method support)
-- Source: 20260317210000_fix_wallet_topups_and_manual_orders.sql
-- =====================================================

DROP FUNCTION IF EXISTS create_wallet_topup(uuid, numeric, text, text, text);
DROP FUNCTION IF EXISTS get_all_wallet_topups(uuid, text, text);
DROP FUNCTION IF EXISTS get_user_wallet_topups(uuid);

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
    WHERE id = p_user_id
      AND is_active = true
      AND is_verified = true
  ) THEN
    RETURN json_build_object(
      'success', false,
      'message', 'المستخدم غير موجود أو غير نشط'
    );
  END IF;

  IF p_payment_method_id IS NULL THEN
    RETURN json_build_object(
      'success', false,
      'message', 'يرجى اختيار طريقة الدفع'
    );
  END IF;

  SELECT is_active INTO v_payment_method_active
  FROM payment_methods
  WHERE id = p_payment_method_id;

  IF NOT FOUND OR NOT v_payment_method_active THEN
    RETURN json_build_object(
      'success', false,
      'message', 'طريقة الدفع غير متاحة حالياً'
    );
  END IF;

  SELECT COUNT(*) INTO v_pending_count
  FROM wallet_topups
  WHERE user_id = p_user_id
    AND status = 'pending';

  IF v_pending_count >= 5 THEN
    RETURN json_build_object(
      'success', false,
      'message', 'لديك 5 طلبات شحن معلقة. يرجى الانتظار حتى تتم معالجتها.'
    );
  END IF;

  IF p_amount <= 0 THEN
    RETURN json_build_object(
      'success', false,
      'message', 'المبلغ يجب أن يكون أكبر من صفر'
    );
  END IF;

  INSERT INTO wallet_topups (
    user_id,
    payment_method_id,
    amount,
    depositor_name,
    phone_number,
    receipt_url,
    status
  ) VALUES (
    p_user_id,
    p_payment_method_id,
    p_amount,
    p_depositor_name,
    p_phone_number,
    p_receipt_url,
    'pending'
  ) RETURNING * INTO v_new_topup;

  RETURN json_build_object(
    'success', true,
    'topup', row_to_json(v_new_topup)
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

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

CREATE OR REPLACE FUNCTION get_user_wallet_topups(
  p_user_id uuid
)
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
    wt.id               AS id,
    wt.amount           AS amount,
    wt.depositor_name   AS depositor_name,
    wt.phone_number     AS phone_number,
    wt.receipt_url      AS receipt_url,
    wt.status           AS status,
    wt.created_at       AS created_at,
    wt.approved_at      AS approved_at,
    wt.payment_method_id AS payment_method_id,
    pm.name             AS payment_method_name,
    pm.account_number   AS account_number,
    pm.logo_url         AS payment_method_logo
  FROM wallet_topups wt
  LEFT JOIN payment_methods pm ON wt.payment_method_id = pm.id
  WHERE wt.user_id = p_user_id
  ORDER BY wt.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION create_wallet_topup(uuid, numeric, text, text, text, uuid) TO anon;
GRANT EXECUTE ON FUNCTION create_wallet_topup(uuid, numeric, text, text, text, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION get_all_wallet_topups(uuid, text, text) TO anon;
GRANT EXECUTE ON FUNCTION get_all_wallet_topups(uuid, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_wallet_topups(uuid) TO anon;
GRANT EXECUTE ON FUNCTION get_user_wallet_topups(uuid) TO authenticated;

-- =====================================================
-- Manual order RPCs
-- Source: 20260317210000_fix_wallet_topups_and_manual_orders.sql
-- =====================================================

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
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION approve_manual_order(uuid, uuid) TO anon;
GRANT EXECUTE ON FUNCTION approve_manual_order(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION reject_manual_order(uuid, uuid, text) TO anon;
GRANT EXECUTE ON FUNCTION reject_manual_order(uuid, uuid, text) TO authenticated;

