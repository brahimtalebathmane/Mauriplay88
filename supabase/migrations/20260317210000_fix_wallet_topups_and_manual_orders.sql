/*
  # Fix Wallet Top-ups, Storage, and Manual Order RPCs

  This migration repairs issues introduced by the full reset migration:
  - Re-creates wallet top-up RPC functions with payment method support
  - Simplifies RLS on wallet_topups and wallet_transactions to work with custom auth
  - Fixes storage policies for the `wallet-receipts` bucket (no auth.uid() dependency)
  - Ensures manual order RPCs (approve_manual_order / reject_manual_order) exist and are executable
*/

-- =====================================================
-- 1. WALLET TOP-UP RPC FUNCTIONS (WITH PAYMENT METHOD)
-- =====================================================

-- Drop any older versions with outdated signatures
DROP FUNCTION IF EXISTS create_wallet_topup(uuid, numeric, text, text, text);
DROP FUNCTION IF EXISTS get_all_wallet_topups(uuid, text, text);
DROP FUNCTION IF EXISTS get_user_wallet_topups(uuid);

-- Create create_wallet_topup with payment_method_id support
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
  -- Verify user exists and is active
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

  -- Validate payment method
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

  -- Check for pending requests limit (max 5)
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

  -- Validate amount
  IF p_amount <= 0 THEN
    RETURN json_build_object(
      'success', false,
      'message', 'المبلغ يجب أن يكون أكبر من صفر'
    );
  END IF;

  -- Insert wallet topup request
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

-- Admin view of all wallet top-ups (with payment method info)
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
  -- Verify admin
  IF NOT EXISTS (
    SELECT 1 FROM users
    WHERE id = p_admin_id
      AND role = 'admin'
  ) THEN
    RAISE EXCEPTION 'غير مصرح لك بالوصول';
  END IF;

  RETURN QUERY
  SELECT
    wt.id,
    wt.user_id,
    wt.amount,
    wt.depositor_name,
    wt.phone_number,
    wt.receipt_url,
    wt.status,
    wt.created_at,
    wt.approved_at,
    wt.approved_by,
    u.phone_number AS user_phone_number,
    wt.payment_method_id,
    pm.name AS payment_method_name,
    pm.account_number AS account_number,
    pm.logo_url AS payment_method_logo
  FROM wallet_topups wt
  INNER JOIN users u ON wt.user_id = u.id
  LEFT JOIN payment_methods pm ON wt.payment_method_id = pm.id
  WHERE
    (p_status IS NULL OR wt.status::text = p_status)
    AND (p_search_phone IS NULL OR u.phone_number ILIKE '%' || p_search_phone || '%')
  ORDER BY wt.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- User view of own wallet top-ups (with payment method info)
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
    wt.id,
    wt.amount,
    wt.depositor_name,
    wt.phone_number,
    wt.receipt_url,
    wt.status,
    wt.created_at,
    wt.approved_at,
    wt.payment_method_id,
    pm.name AS payment_method_name,
    pm.account_number AS account_number,
    pm.logo_url AS payment_method_logo
  FROM wallet_topups wt
  LEFT JOIN payment_methods pm ON wt.payment_method_id = pm.id
  WHERE wt.user_id = p_user_id
  ORDER BY wt.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions for wallet top-up RPCs
GRANT EXECUTE ON FUNCTION create_wallet_topup(uuid, numeric, text, text, text, uuid) TO anon;
GRANT EXECUTE ON FUNCTION create_wallet_topup(uuid, numeric, text, text, text, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION get_all_wallet_topups(uuid, text, text) TO anon;
GRANT EXECUTE ON FUNCTION get_all_wallet_topups(uuid, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_wallet_topups(uuid) TO anon;
GRANT EXECUTE ON FUNCTION get_user_wallet_topups(uuid) TO authenticated;

-- =====================================================
-- 2. SIMPLIFY RLS FOR WALLET TABLES (CUSTOM AUTH COMPATIBLE)
-- =====================================================

-- Drop existing RLS policies that rely on auth.uid()
DROP POLICY IF EXISTS "Users can view own wallet topups" ON wallet_topups;
DROP POLICY IF EXISTS "Admins can view all wallet topups" ON wallet_topups;
DROP POLICY IF EXISTS "Users can create own wallet topups" ON wallet_topups;
DROP POLICY IF EXISTS "Users can update own pending topups" ON wallet_topups;
DROP POLICY IF EXISTS "Admins can update wallet topups" ON wallet_topups;
DROP POLICY IF EXISTS "Users can delete own pending topups" ON wallet_topups;

-- Allow all operations via trusted RPCs (functions are SECURITY DEFINER)
CREATE POLICY "Allow all wallet_topups operations via RPC"
ON wallet_topups FOR ALL
TO public
USING (true)
WITH CHECK (true);

-- Wallet transactions policies
DROP POLICY IF EXISTS "Users can view own wallet transactions" ON wallet_transactions;
DROP POLICY IF EXISTS "Admins can view all wallet transactions" ON wallet_transactions;
DROP POLICY IF EXISTS "System can insert wallet transactions" ON wallet_transactions;

CREATE POLICY "Allow all wallet_transactions operations via RPC"
ON wallet_transactions FOR ALL
TO public
USING (true)
WITH CHECK (true);

-- =====================================================
-- 3. FIX STORAGE POLICIES FOR WALLET RECEIPTS
-- =====================================================

-- Remove existing wallet-receipts policies that depend on auth.uid()
DROP POLICY IF EXISTS "Users can upload wallet receipts" ON storage.objects;
DROP POLICY IF EXISTS "Users can view own wallet receipts" ON storage.objects;
DROP POLICY IF EXISTS "Admins can view all wallet receipts" ON storage.objects;
DROP POLICY IF EXISTS "Admins can delete wallet receipts" ON storage.objects;

-- Allow public uploads and reads to wallet-receipts bucket.
-- NOTE: The bucket remains non-public at the bucket level; these policies govern access.
DROP POLICY IF EXISTS "Public can upload wallet receipts" ON storage.objects;
CREATE POLICY "Public can upload wallet receipts"
ON storage.objects FOR INSERT
TO public
WITH CHECK (bucket_id = 'wallet-receipts');

DROP POLICY IF EXISTS "Public can view wallet receipts" ON storage.objects;
CREATE POLICY "Public can view wallet receipts"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'wallet-receipts');

-- Optionally allow deletes (used only from admin tools / service key if any)
DROP POLICY IF EXISTS "Public can delete wallet receipts" ON storage.objects;
CREATE POLICY "Public can delete wallet receipts"
ON storage.objects FOR DELETE
TO public
USING (bucket_id = 'wallet-receipts');

-- =====================================================
-- 4. ENSURE MANUAL ORDER RPC FUNCTIONS EXIST & ARE USABLE
-- =====================================================

-- Recreate approve_manual_order / reject_manual_order in case they were dropped by reset
CREATE OR REPLACE FUNCTION approve_manual_order(
  p_order_id uuid,
  p_admin_id uuid
)
RETURNS json AS $$
DECLARE
  v_order orders%ROWTYPE;
  v_is_admin boolean;
BEGIN
  -- Verify admin role
  SELECT role = 'admin' INTO v_is_admin FROM users WHERE id = p_admin_id;

  IF NOT v_is_admin THEN
    RETURN json_build_object('success', false, 'message', 'Unauthorized: Admin access required');
  END IF;

  -- Get order
  SELECT * INTO v_order FROM orders WHERE id = p_order_id;

  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'message', 'Order not found');
  END IF;

  IF v_order.status != 'pending' THEN
    RETURN json_build_object('success', false, 'message', 'Order is not pending');
  END IF;

  -- Update order status
  UPDATE orders SET status = 'approved', updated_at = now() WHERE id = p_order_id;

  -- Mark inventory as sold
  UPDATE inventory SET status = 'sold', reserved_until = NULL, updated_at = now() WHERE id = v_order.inventory_id;

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
  -- Verify admin role
  SELECT role = 'admin' INTO v_is_admin FROM users WHERE id = p_admin_id;

  IF NOT v_is_admin THEN
    RETURN json_build_object('success', false, 'message', 'Unauthorized: Admin access required');
  END IF;

  -- Get order
  SELECT * INTO v_order FROM orders WHERE id = p_order_id;

  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'message', 'Order not found');
  END IF;

  IF v_order.status != 'pending' THEN
    RETURN json_build_object('success', false, 'message', 'Order is not pending');
  END IF;

  -- Update order status and admin note
  UPDATE orders
  SET status = 'rejected',
      admin_note = p_admin_note,
      updated_at = now()
  WHERE id = p_order_id;

  -- Release inventory back to available
  UPDATE inventory
  SET status = 'available',
      reserved_until = NULL,
      updated_at = now()
  WHERE id = v_order.inventory_id;

  RETURN json_build_object('success', true, 'message', 'Order rejected successfully');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions for manual order RPCs
GRANT EXECUTE ON FUNCTION approve_manual_order(uuid, uuid) TO anon;
GRANT EXECUTE ON FUNCTION approve_manual_order(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION reject_manual_order(uuid, uuid, text) TO anon;
GRANT EXECUTE ON FUNCTION reject_manual_order(uuid, uuid, text) TO authenticated;

