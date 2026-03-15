/*
  # Update Wallet Purchase to Return Full Code Details

  ## Changes Made
  
  1. **Updated create_wallet_purchase RPC Function**
     - Now returns complete code details including the actual code, usage link, and tutorial
     - Returns inventory code immediately after successful purchase
     - Includes product and platform information for immediate display
     - Enables frontend to show code details without additional queries
  
  2. **Return Structure**
     - success: boolean
     - order_id: uuid
     - inventory_id: uuid
     - code: text (the actual purchased code)
     - product_name: text
     - platform_name: text
     - platform_website_url: text (usage link)
     - platform_tutorial_video_url: text (tutorial video)
     - message: text
  
  ## Security
  - Still requires wallet activation
  - Maintains FIFO inventory assignment
  - Row-level locking prevents race conditions
  - Atomic transaction ensures data consistency
*/

-- =====================================================
-- UPDATE create_wallet_purchase RPC
-- =====================================================

CREATE OR REPLACE FUNCTION create_wallet_purchase(
  p_user_id uuid,
  p_product_id uuid
)
RETURNS json AS $$
DECLARE
  v_product products%ROWTYPE;
  v_inventory inventory%ROWTYPE;
  v_platform platforms%ROWTYPE;
  v_order_id uuid;
  v_wallet_result json;
  v_user users%ROWTYPE;
BEGIN
  -- Get user info
  SELECT * INTO v_user FROM users WHERE id = p_user_id;
  
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'message', 'User not found');
  END IF;
  
  -- Check if wallet is active
  IF NOT v_user.wallet_active THEN
    RETURN json_build_object('success', false, 'message', 'Wallet is not activated. Please contact support.');
  END IF;
  
  -- Get product info
  SELECT * INTO v_product FROM products WHERE id = p_product_id AND is_deleted = false;
  
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'message', 'Product not found');
  END IF;
  
  -- Get platform info
  SELECT * INTO v_platform FROM platforms WHERE id = v_product.platform_id;
  
  -- Get oldest available inventory (FIFO) and lock it
  SELECT * INTO v_inventory
  FROM inventory
  WHERE product_id = p_product_id
    AND status = 'available'
    AND is_deleted = false
  ORDER BY created_at ASC
  LIMIT 1
  FOR UPDATE SKIP LOCKED;
  
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'message', 'Product out of stock');
  END IF;
  
  -- Deduct wallet balance
  v_wallet_result := deduct_wallet_balance(p_user_id, v_product.price_mru, 'Purchase: ' || v_product.name, NULL);
  
  IF NOT (v_wallet_result->>'success')::boolean THEN
    RETURN v_wallet_result;
  END IF;
  
  -- Create order
  INSERT INTO orders (user_id, inventory_id, product_id, price_at_purchase, payment_type, status)
  VALUES (p_user_id, v_inventory.id, p_product_id, v_product.price_mru, 'wallet', 'approved')
  RETURNING id INTO v_order_id;
  
  -- Update wallet transaction with order_id
  UPDATE wallet_transactions 
  SET order_id = v_order_id 
  WHERE id = (
    SELECT id FROM wallet_transactions 
    WHERE user_id = p_user_id AND order_id IS NULL 
    ORDER BY created_at DESC 
    LIMIT 1
  );
  
  -- Mark inventory as sold
  UPDATE inventory SET status = 'sold' WHERE id = v_inventory.id;
  
  -- Return complete details including the code
  RETURN json_build_object(
    'success', true,
    'order_id', v_order_id,
    'inventory_id', v_inventory.id,
    'code', v_inventory.code,
    'product_name', v_product.name,
    'platform_name', v_platform.name,
    'platform_logo_url', v_platform.logo_url,
    'platform_website_url', v_platform.website_url,
    'platform_tutorial_video_url', v_platform.tutorial_video_url,
    'message', 'Purchase completed successfully'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
