/*
  # Fix products.logo_url and wallet top-up approve/reject RPCs

  - Add products.logo_url if missing (admin_insert_product / admin_update_product use it)
  - Recreate approve_wallet_topup and reject_wallet_topup to return JSONB (success, message)
  - Grant execute to anon/authenticated so admin panel and wallet flows work
*/

-- 1. Add logo_url to products if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'products' AND column_name = 'logo_url'
  ) THEN
    ALTER TABLE products ADD COLUMN logo_url TEXT;
  END IF;
END $$;

-- 2. Approve wallet top-up: return JSONB so frontend can read data.success / data.message
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

-- 3. Reject wallet top-up: return JSONB
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

-- 4. Ensure RPCs are callable by anon (frontend uses anon key)
GRANT EXECUTE ON FUNCTION approve_wallet_topup(uuid, uuid) TO anon;
GRANT EXECUTE ON FUNCTION approve_wallet_topup(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION reject_wallet_topup(uuid, uuid, text) TO anon;
GRANT EXECUTE ON FUNCTION reject_wallet_topup(uuid, uuid, text) TO authenticated;

COMMENT ON FUNCTION approve_wallet_topup(uuid, uuid) IS 'Admin: approve wallet top-up. Returns JSONB with success/message.';
COMMENT ON FUNCTION reject_wallet_topup(uuid, uuid, text) IS 'Admin: reject wallet top-up. Returns JSONB with success/message.';

-- 5. Ensure wallet/purchases RPCs are callable by anon (fix "Failed to load" on Wallet, Purchases, Top-up list)
DO $$
BEGIN
  BEGIN EXECUTE 'GRANT EXECUTE ON FUNCTION get_all_wallet_topups(uuid, text, text) TO anon'; EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN EXECUTE 'GRANT EXECUTE ON FUNCTION get_all_wallet_topups(uuid, text, text) TO authenticated'; EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN EXECUTE 'GRANT EXECUTE ON FUNCTION get_wallet_transactions(text) TO anon'; EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN EXECUTE 'GRANT EXECUTE ON FUNCTION get_wallet_transactions(text) TO authenticated'; EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN EXECUTE 'GRANT EXECUTE ON FUNCTION get_user_orders_with_inventory(uuid) TO anon'; EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN EXECUTE 'GRANT EXECUTE ON FUNCTION get_user_orders_with_inventory(uuid) TO authenticated'; EXCEPTION WHEN OTHERS THEN NULL; END;
END $$;
