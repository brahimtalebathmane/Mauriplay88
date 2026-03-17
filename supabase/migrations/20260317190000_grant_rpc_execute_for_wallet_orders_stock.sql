/*
  # Grant EXECUTE on user-facing RPCs for anon/authenticated

  The frontend uses the Supabase anon key. These RPCs are SECURITY DEFINER
  and must be callable by anon so Wallet, My Purchases, and product stock
  work correctly.

  - get_wallet_transactions(text) – Wallet page transaction history
  - get_user_orders_with_inventory(uuid) – My Purchases (مشترياتي)
  - get_product_stock_count(uuid[]) – Platform page available stock count

  We create these functions here if missing (e.g. earlier migrations not applied).
*/

-- 1. Ensure get_wallet_transactions exists (may be missing if 20260307141848 not applied)
CREATE OR REPLACE FUNCTION get_wallet_transactions(p_phone_number TEXT)
RETURNS TABLE (
  id UUID,
  type transaction_type,
  amount NUMERIC,
  balance_before NUMERIC,
  balance_after NUMERIC,
  description TEXT,
  created_at TIMESTAMPTZ
) AS $$
DECLARE
  v_user_id UUID;
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

-- 2. Ensure get_user_orders_with_inventory exists (may be missing if 20260307153849/20260307153954 not applied)
CREATE OR REPLACE FUNCTION get_user_orders_with_inventory(p_user_id UUID)
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
  transaction_reference TEXT,
  receipt_url TEXT,
  status order_status,
  admin_note TEXT,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  product_name TEXT,
  product_price NUMERIC,
  platform_id UUID,
  platform_name TEXT,
  platform_logo_url TEXT,
  platform_website_url TEXT,
  platform_tutorial_video_url TEXT,
  inventory_code TEXT,
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

-- 3. Ensure get_product_stock_count exists (may be missing if 20260306174353 not applied)
CREATE OR REPLACE FUNCTION get_product_stock_count(p_product_ids uuid[])
RETURNS TABLE (product_id uuid, stock_count bigint) AS $$
BEGIN
  RETURN QUERY
  SELECT
    i.product_id,
    COUNT(*)::bigint AS stock_count
  FROM inventory i
  WHERE i.product_id = ANY(p_product_ids)
    AND i.status = 'available'
    AND i.is_deleted = false
  GROUP BY i.product_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION get_product_stock_count(uuid[]) TO anon;
GRANT EXECUTE ON FUNCTION get_product_stock_count(uuid[]) TO authenticated;
