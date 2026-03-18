-- Add product_logo_url to get_user_orders_with_inventory so My Purchases can show product logos.
-- Uses COALESCE(p.product_logo_url, p.logo_url) to support both columns.

-- PostgreSQL cannot change a function's RETURNS TABLE shape via CREATE OR REPLACE.
-- Drop first to avoid SQLSTATE 42P13 when return columns differ.
DROP FUNCTION IF EXISTS get_user_orders_with_inventory(uuid);

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
  product_logo_url text,
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
    COALESCE(NULLIF(trim(p.product_logo_url), ''), NULLIF(trim(p.logo_url), '')) AS product_logo_url,
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

COMMENT ON FUNCTION get_user_orders_with_inventory(uuid) IS 'User orders with inventory and product/platform details; includes product_logo_url for UI.';
