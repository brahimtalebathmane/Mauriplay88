/*
  # Payment methods – public read for active methods

  Custom auth = no JWT, so policies that depend on auth.uid() or
  request.jwt.claims block everyone. Allow anyone to read active payment
  methods so Wallet top-up and Purchase (direct payment) show options.

  - Public SELECT for payment_methods where is_active = true.
  - Admin writes remain via RPCs (admin_insert_payment_method, etc.).
*/

-- Drop policies that may rely on JWT or block anon read
DROP POLICY IF EXISTS "admin_all_payment_methods" ON payment_methods;
DROP POLICY IF EXISTS "user_read_payment_methods" ON payment_methods;
DROP POLICY IF EXISTS "Public can view payment methods" ON payment_methods;
DROP POLICY IF EXISTS "Anyone can view payment methods" ON payment_methods;
DROP POLICY IF EXISTS "public_read_payment_methods" ON payment_methods;
DROP POLICY IF EXISTS "users_read_active_payment_methods" ON payment_methods;

-- Allow anyone to read active payment methods (no auth required)
CREATE POLICY "payment_methods_public_select_active"
  ON payment_methods FOR SELECT
  USING (is_active = true);

COMMENT ON POLICY "payment_methods_public_select_active" ON payment_methods IS
  'Allow public read of active payment methods. Admin writes use RPCs.';

-- Ensure create_manual_purchase is callable by anon/authenticated (direct payment form)
GRANT EXECUTE ON FUNCTION create_manual_purchase(uuid, uuid, text, text, text, text) TO anon;
GRANT EXECUTE ON FUNCTION create_manual_purchase(uuid, uuid, text, text, text, text) TO authenticated;

-- Allow user to attach receipt to their own pending order (RLS blocks direct order update)
CREATE OR REPLACE FUNCTION update_order_receipt(
  p_user_id uuid,
  p_order_id uuid,
  p_receipt_url text
)
RETURNS json AS $$
DECLARE
  v_updated integer;
BEGIN
  IF p_receipt_url IS NULL OR p_receipt_url = '' THEN
    RETURN json_build_object('success', false, 'message', 'Receipt URL required');
  END IF;

  UPDATE orders
  SET receipt_url = p_receipt_url, updated_at = now()
  WHERE id = p_order_id
    AND user_id = p_user_id
    AND status = 'pending';

  GET DIAGNOSTICS v_updated = ROW_COUNT;
  IF v_updated = 0 THEN
    RETURN json_build_object('success', false, 'message', 'Order not found or not pending');
  END IF;
  RETURN json_build_object('success', true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION update_order_receipt(uuid, uuid, text) TO anon;
GRANT EXECUTE ON FUNCTION update_order_receipt(uuid, uuid, text) TO authenticated;
