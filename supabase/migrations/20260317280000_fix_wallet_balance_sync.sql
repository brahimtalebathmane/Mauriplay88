/*
  # Fix wallet balance sync when admin approves top-up

  ## Problem
  When admin approves a wallet top-up, the transaction appears in history but the
  user's wallet balance was not updating (or the frontend showed stale balance).

  ## Changes
  1. approve_wallet_topup: Ensure atomic update of users.wallet_balance and
     wallet_transactions; prevent duplicate approval; include topup_id in audit.
  2. get_user_balance: New RPC so the app can refetch current balance (Wallet page).
  3. Grants for anon/authenticated so frontend can call these RPCs.
*/

-- 1. Approve wallet top-up: atomic balance update + audit; idempotent for non-pending
CREATE OR REPLACE FUNCTION approve_wallet_topup(p_topup_id uuid, p_admin_id uuid)
RETURNS jsonb AS $$
DECLARE
  v_topup wallet_topups%ROWTYPE;
  v_user_balance numeric;
  v_new_balance numeric;
  v_is_admin boolean;
BEGIN
  SELECT (role = 'admin') INTO v_is_admin FROM public.users WHERE id = p_admin_id;
  IF NOT v_is_admin THEN
    RETURN jsonb_build_object('success', false, 'message', 'غير مصرح');
  END IF;

  SELECT * INTO v_topup FROM public.wallet_topups WHERE id = p_topup_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'message', 'طلب الشحن غير موجود');
  END IF;
  -- Prevent duplicate approval: only pending requests can be approved
  IF v_topup.status != 'pending' THEN
    RETURN jsonb_build_object('success', false, 'message', 'تم معالجة هذا الطلب مسبقاً');
  END IF;

  -- Lock user row and get current balance
  SELECT wallet_balance INTO v_user_balance
  FROM public.users WHERE id = v_topup.user_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'message', 'المستخدم غير موجود');
  END IF;

  v_new_balance := COALESCE(v_user_balance, 0) + v_topup.amount;

  -- 1) Mark top-up as approved
  UPDATE public.wallet_topups
  SET status = 'approved', approved_at = now(), approved_by = p_admin_id
  WHERE id = p_topup_id;

  -- 2) Update user balance (source of truth)
  UPDATE public.users
  SET wallet_balance = v_new_balance
  WHERE id = v_topup.user_id;

  -- 3) Audit trail
  INSERT INTO public.wallet_transactions (
    user_id, type, amount, balance_before, balance_after, description
  ) VALUES (
    v_topup.user_id, 'credit', v_topup.amount,
    COALESCE(v_user_balance, 0), v_new_balance,
    'شحن محفظة - موافق'
  );

  RETURN jsonb_build_object(
    'success', true,
    'message', 'تمت الموافقة على طلب الشحن بنجاح',
    'new_balance', v_new_balance
  );
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('success', false, 'message', COALESCE(SQLERRM, 'خطأ غير متوقع'));
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Get current wallet balance for a user (used by Wallet page to refresh balance)
CREATE OR REPLACE FUNCTION get_user_balance(p_user_id uuid)
RETURNS jsonb AS $$
DECLARE
  v_balance numeric;
BEGIN
  SELECT wallet_balance INTO v_balance
  FROM public.users
  WHERE id = p_user_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'message', 'User not found');
  END IF;
  RETURN jsonb_build_object(
    'success', true,
    'wallet_balance', COALESCE(v_balance, 0)
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Grants
GRANT EXECUTE ON FUNCTION approve_wallet_topup(uuid, uuid) TO anon;
GRANT EXECUTE ON FUNCTION approve_wallet_topup(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_balance(uuid) TO anon;
GRANT EXECUTE ON FUNCTION get_user_balance(uuid) TO authenticated;

COMMENT ON FUNCTION approve_wallet_topup(uuid, uuid) IS 'Admin: approve wallet top-up; updates users.wallet_balance and inserts wallet_transactions. Prevents duplicate approval.';
COMMENT ON FUNCTION get_user_balance(uuid) IS 'Returns current wallet_balance for user; used by Wallet page to sync balance after top-up/purchase.';
