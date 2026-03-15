/*
  # Add RPC Function to Get User Orders with Inventory

  ## Problem
  The application uses custom authentication (phone + PIN) instead of Supabase Auth,
  so `auth.uid()` is always NULL. This means RLS policies based on `auth.uid()` don't work.
  Users cannot see inventory codes for their purchased orders because the inventory
  table's RLS policies block access.

  ## Solution
  Create a SECURITY DEFINER RPC function that:
  - Takes a user_id parameter
  - Bypasses RLS to fetch orders with full inventory details
  - Returns complete order information including codes for approved orders
  
  ## Security
  - The function is callable by anyone (public access)
  - However, it only returns orders for the specified user_id
  - Users must know their own user_id (stored in frontend after login)
  - The function validates the user exists before returning data
*/

-- Drop the RLS policy that doesn't work with custom auth
DROP POLICY IF EXISTS "Users can view inventory for their own orders" ON inventory;

-- Create RPC function to get user orders with inventory
CREATE OR REPLACE FUNCTION get_user_orders_with_inventory(p_user_id UUID)
RETURNS TABLE (
  id UUID,
  user_id UUID,
  product_id UUID,
  inventory_id UUID,
  price_at_purchase NUMERIC,
  payment_type TEXT,
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
  -- Verify user exists
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
    p.name as product_name,
    p.price_mru as product_price,
    pl.id as platform_id,
    pl.name as platform_name,
    pl.logo_url as platform_logo_url,
    pl.website_url as platform_website_url,
    pl.tutorial_video_url as platform_tutorial_video_url,
    i.code as inventory_code,
    i.status as inventory_status
  FROM orders o
  LEFT JOIN products p ON o.product_id = p.id
  LEFT JOIN platforms pl ON p.platform_id = pl.id
  LEFT JOIN inventory i ON o.inventory_id = i.id
  WHERE o.user_id = p_user_id
  ORDER BY o.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
