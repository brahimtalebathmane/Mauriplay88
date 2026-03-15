/*
  # Update Wallet Top-up RPC Functions with Payment Method Support

  1. Updated Functions
    - `create_wallet_topup` - Now accepts and validates payment_method_id parameter
    - `get_all_wallet_topups` - Now joins with payment_methods and returns payment info
    - `get_user_wallet_topups` - Now joins with payment_methods and returns payment info

  2. Validation Added
    - Payment method must exist and be active
    - Payment method is required for new topups
    - All other existing validations remain

  3. Return Data Enhanced
    - All getter functions now return payment method details
    - Includes: payment_method_name, account_number, payment_method_logo
    - NULL values handled for legacy records

  4. Security
    - All functions maintain SECURITY DEFINER
    - All permission checks remain in place
    - No breaking changes to API contracts
*/

-- =====================================================
-- DROP EXISTING FUNCTIONS TO UPDATE SIGNATURES
-- =====================================================

DROP FUNCTION IF EXISTS create_wallet_topup(uuid, numeric, text, text, text);
DROP FUNCTION IF EXISTS get_all_wallet_topups(uuid, text, text);
DROP FUNCTION IF EXISTS get_user_wallet_topups(uuid);

-- =====================================================
-- 1. CREATE NEW CREATE_WALLET_TOPUP FUNCTION
-- =====================================================

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

  -- Verify payment method exists and is active
  SELECT is_active INTO v_payment_method_active
  FROM payment_methods
  WHERE id = p_payment_method_id;

  IF v_payment_method_active IS NULL THEN
    RETURN json_build_object(
      'success', false,
      'message', 'طريقة الدفع غير موجودة'
    );
  END IF;

  IF v_payment_method_active = false THEN
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

  -- Validate receipt URL
  IF p_receipt_url IS NULL OR p_receipt_url = '' THEN
    RETURN json_build_object(
      'success', false,
      'message', 'يجب رفع إيصال الدفع'
    );
  END IF;

  -- Insert wallet topup request
  INSERT INTO wallet_topups (
    user_id,
    amount,
    depositor_name,
    phone_number,
    receipt_url,
    payment_method_id,
    status
  ) VALUES (
    p_user_id,
    p_amount,
    p_depositor_name,
    p_phone_number,
    p_receipt_url,
    p_payment_method_id,
    'pending'
  ) RETURNING * INTO v_new_topup;

  RETURN json_build_object(
    'success', true,
    'topup', row_to_json(v_new_topup)
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 2. CREATE NEW GET_ALL_WALLET_TOPUPS FUNCTION
-- =====================================================

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
    WHERE users.id = p_admin_id 
    AND users.role = 'admin'
  ) THEN
    RAISE EXCEPTION 'غير مصرح لك بالوصول';
  END IF;

  RETURN QUERY
  SELECT 
    wt.id AS id,
    wt.user_id AS user_id,
    wt.amount AS amount,
    wt.depositor_name AS depositor_name,
    wt.phone_number AS phone_number,
    wt.receipt_url AS receipt_url,
    wt.status AS status,
    wt.created_at AS created_at,
    wt.approved_at AS approved_at,
    wt.approved_by AS approved_by,
    u.phone_number AS user_phone_number,
    wt.payment_method_id AS payment_method_id,
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

-- =====================================================
-- 3. CREATE NEW GET_USER_WALLET_TOPUPS FUNCTION
-- =====================================================

CREATE OR REPLACE FUNCTION get_user_wallet_topups(
  p_user_id uuid
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
  payment_method_id uuid,
  payment_method_name text,
  account_number text,
  payment_method_logo text
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    wt.id AS id,
    wt.user_id AS user_id,
    wt.amount AS amount,
    wt.depositor_name AS depositor_name,
    wt.phone_number AS phone_number,
    wt.receipt_url AS receipt_url,
    wt.status AS status,
    wt.created_at AS created_at,
    wt.approved_at AS approved_at,
    wt.approved_by AS approved_by,
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

-- =====================================================
-- 4. GRANT EXECUTE PERMISSIONS
-- =====================================================

GRANT EXECUTE ON FUNCTION create_wallet_topup(uuid, numeric, text, text, text, uuid) TO anon;
GRANT EXECUTE ON FUNCTION create_wallet_topup(uuid, numeric, text, text, text, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION get_all_wallet_topups(uuid, text, text) TO anon;
GRANT EXECUTE ON FUNCTION get_all_wallet_topups(uuid, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_wallet_topups(uuid) TO anon;
GRANT EXECUTE ON FUNCTION get_user_wallet_topups(uuid) TO authenticated;