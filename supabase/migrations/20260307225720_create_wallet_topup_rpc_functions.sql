/*
  # Wallet Top-up RPC Functions

  1. Functions
    - `approve_wallet_topup` - Safely approve a wallet top-up with transaction locking
    - `reject_wallet_topup` - Reject a wallet top-up request
    - `get_user_wallet_topups` - Get user's wallet top-ups with pagination

  2. Security
    - All functions use row-level locking to prevent race conditions
    - Validates admin permissions
    - Ensures atomic operations with transactions
    - Creates audit trail in wallet_transactions
*/

-- =====================================================
-- 1. APPROVE WALLET TOP-UP (WITH TRANSACTION SAFETY)
-- =====================================================

CREATE OR REPLACE FUNCTION approve_wallet_topup(
  p_topup_id uuid,
  p_admin_id uuid
)
RETURNS jsonb AS $$
DECLARE
  v_topup wallet_topups;
  v_user_balance numeric;
  v_new_balance numeric;
  v_is_admin boolean;
BEGIN
  -- Check if caller is admin
  SELECT role = 'admin' INTO v_is_admin
  FROM users
  WHERE id = p_admin_id;

  IF NOT v_is_admin THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'غير مصرح لك بالموافقة على طلبات الشحن'
    );
  END IF;

  -- Lock the wallet_topup row to prevent race conditions
  SELECT * INTO v_topup
  FROM wallet_topups
  WHERE id = p_topup_id
  FOR UPDATE;

  -- Check if topup exists
  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'طلب الشحن غير موجود'
    );
  END IF;

  -- Check if already approved or rejected
  IF v_topup.status != 'pending' THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'تم معالجة هذا الطلب مسبقاً'
    );
  END IF;

  -- Get current user balance (lock user row too)
  SELECT wallet_balance INTO v_user_balance
  FROM users
  WHERE id = v_topup.user_id
  FOR UPDATE;

  -- Calculate new balance
  v_new_balance := v_user_balance + v_topup.amount;

  -- Update wallet_topup status
  UPDATE wallet_topups
  SET 
    status = 'approved',
    approved_at = now(),
    approved_by = p_admin_id
  WHERE id = p_topup_id;

  -- Update user wallet balance
  UPDATE users
  SET wallet_balance = v_new_balance
  WHERE id = v_topup.user_id;

  -- Create audit trail in wallet_transactions
  INSERT INTO wallet_transactions (
    user_id,
    topup_id,
    type,
    amount,
    balance_before,
    balance_after,
    description
  ) VALUES (
    v_topup.user_id,
    p_topup_id,
    'credit',
    v_topup.amount,
    v_user_balance,
    v_new_balance,
    'شحن محفظة - موافق'
  );

  RETURN jsonb_build_object(
    'success', true,
    'message', 'تمت الموافقة على طلب الشحن بنجاح'
  );

EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'حدث خطأ أثناء معالجة الطلب: ' || SQLERRM
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 2. REJECT WALLET TOP-UP
-- =====================================================

CREATE OR REPLACE FUNCTION reject_wallet_topup(
  p_topup_id uuid,
  p_admin_id uuid,
  p_reason text DEFAULT NULL
)
RETURNS jsonb AS $$
DECLARE
  v_topup wallet_topups;
  v_is_admin boolean;
BEGIN
  -- Check if caller is admin
  SELECT role = 'admin' INTO v_is_admin
  FROM users
  WHERE id = p_admin_id;

  IF NOT v_is_admin THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'غير مصرح لك برفض طلبات الشحن'
    );
  END IF;

  -- Lock the wallet_topup row
  SELECT * INTO v_topup
  FROM wallet_topups
  WHERE id = p_topup_id
  FOR UPDATE;

  -- Check if topup exists
  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'طلب الشحن غير موجود'
    );
  END IF;

  -- Check if already approved or rejected
  IF v_topup.status != 'pending' THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'تم معالجة هذا الطلب مسبقاً'
    );
  END IF;

  -- Update wallet_topup status
  UPDATE wallet_topups
  SET 
    status = 'rejected',
    approved_at = now(),
    approved_by = p_admin_id
  WHERE id = p_topup_id;

  RETURN jsonb_build_object(
    'success', true,
    'message', 'تم رفض طلب الشحن'
  );

EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'حدث خطأ أثناء معالجة الطلب: ' || SQLERRM
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 3. GET USER WALLET TOP-UPS (FOR USERS TO VIEW THEIR OWN)
-- =====================================================

CREATE OR REPLACE FUNCTION get_user_wallet_topups(
  p_user_id uuid,
  p_limit int DEFAULT 20,
  p_offset int DEFAULT 0
)
RETURNS TABLE (
  id uuid,
  amount numeric,
  depositor_name text,
  phone_number text,
  receipt_url text,
  status wallet_topup_status,
  created_at timestamptz,
  approved_at timestamptz
) AS $$
BEGIN
  -- Check if caller is requesting their own data or is admin
  IF auth.uid() != p_user_id AND NOT EXISTS (
    SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'admin'
  ) THEN
    RAISE EXCEPTION 'غير مصرح لك بعرض هذه البيانات';
  END IF;

  RETURN QUERY
  SELECT 
    wt.id,
    wt.amount,
    wt.depositor_name,
    wt.phone_number,
    wt.receipt_url,
    wt.status,
    wt.created_at,
    wt.approved_at
  FROM wallet_topups wt
  WHERE wt.user_id = p_user_id
  ORDER BY wt.created_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;