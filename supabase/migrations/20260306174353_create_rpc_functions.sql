/*
  # MauriPlay RPC Functions

  Server-side functions for critical operations requiring atomicity, security, and complex logic.
*/

-- =====================================================
-- AUTHENTICATION FUNCTIONS
-- =====================================================

-- Register new user with PIN hashing
CREATE OR REPLACE FUNCTION register_user(
  p_phone_number text,
  p_pin text
)
RETURNS json AS $$
DECLARE
  v_user_id uuid;
  v_pin_hash text;
BEGIN
  -- Hash the PIN
  v_pin_hash := crypt(p_pin, gen_salt('bf', 10));
  
  -- Insert user
  INSERT INTO users (phone_number, pin_hash, is_verified, role)
  VALUES (p_phone_number, v_pin_hash, false, 'user')
  RETURNING id INTO v_user_id;
  
  RETURN json_build_object(
    'success', true,
    'user_id', v_user_id,
    'message', 'User registered successfully'
  );
EXCEPTION
  WHEN unique_violation THEN
    RETURN json_build_object(
      'success', false,
      'message', 'Phone number already exists'
    );
  WHEN OTHERS THEN
    RETURN json_build_object(
      'success', false,
      'message', 'Registration failed: ' || SQLERRM
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Verify user login
CREATE OR REPLACE FUNCTION verify_user_login(
  p_phone_number text,
  p_pin text
)
RETURNS json AS $$
DECLARE
  v_user users%ROWTYPE;
  v_pin_valid boolean;
BEGIN
  -- Get user
  SELECT * INTO v_user
  FROM users
  WHERE phone_number = p_phone_number;
  
  -- Check if user exists
  IF NOT FOUND THEN
    RETURN json_build_object(
      'success', false,
      'message', 'Invalid phone number or PIN'
    );
  END IF;
  
  -- Check if account is active
  IF NOT v_user.is_active THEN
    RETURN json_build_object(
      'success', false,
      'message', 'Account is deactivated. Contact support.'
    );
  END IF;
  
  -- Check if account is locked
  IF v_user.failed_login_attempts >= 5 THEN
    RETURN json_build_object(
      'success', false,
      'message', 'Account locked due to multiple failed attempts. Contact support.'
    );
  END IF;
  
  -- Verify PIN
  v_pin_valid := (v_user.pin_hash = crypt(p_pin, v_user.pin_hash));
  
  IF v_pin_valid THEN
    -- Reset failed attempts on successful login
    UPDATE users SET failed_login_attempts = 0 WHERE id = v_user.id;
    
    RETURN json_build_object(
      'success', true,
      'user', json_build_object(
        'id', v_user.id,
        'phone_number', v_user.phone_number,
        'wallet_balance', v_user.wallet_balance,
        'wallet_active', v_user.wallet_active,
        'role', v_user.role,
        'is_verified', v_user.is_verified
      )
    );
  ELSE
    -- Increment failed attempts
    UPDATE users 
    SET failed_login_attempts = failed_login_attempts + 1 
    WHERE id = v_user.id;
    
    RETURN json_build_object(
      'success', false,
      'message', 'Invalid phone number or PIN'
    );
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create verification code with rate limiting
CREATE OR REPLACE FUNCTION create_verification_code(
  p_phone_number text
)
RETURNS json AS $$
DECLARE
  v_code text;
  v_last_created timestamptz;
BEGIN
  -- Check rate limiting (1 per 60 seconds)
  SELECT created_at INTO v_last_created
  FROM verification_codes
  WHERE phone_number = p_phone_number;
  
  IF FOUND AND v_last_created > now() - interval '60 seconds' THEN
    RETURN json_build_object(
      'success', false,
      'message', 'Please wait before requesting another code'
    );
  END IF;
  
  -- Generate 4-digit code
  v_code := LPAD(floor(random() * 10000)::text, 4, '0');
  
  -- Upsert verification code
  INSERT INTO verification_codes (phone_number, code, expires_at)
  VALUES (p_phone_number, v_code, now() + interval '5 minutes')
  ON CONFLICT (phone_number)
  DO UPDATE SET 
    code = EXCLUDED.code,
    expires_at = EXCLUDED.expires_at,
    created_at = now();
  
  RETURN json_build_object(
    'success', true,
    'code', v_code,
    'expires_at', now() + interval '5 minutes'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Verify OTP code
CREATE OR REPLACE FUNCTION verify_otp_code(
  p_phone_number text,
  p_code text
)
RETURNS json AS $$
DECLARE
  v_stored_code text;
  v_expires_at timestamptz;
  v_user_id uuid;
BEGIN
  -- Get verification code
  SELECT code, expires_at INTO v_stored_code, v_expires_at
  FROM verification_codes
  WHERE phone_number = p_phone_number;
  
  IF NOT FOUND THEN
    RETURN json_build_object(
      'success', false,
      'message', 'No verification code found'
    );
  END IF;
  
  -- Check if expired
  IF v_expires_at < now() THEN
    RETURN json_build_object(
      'success', false,
      'message', 'Verification code expired'
    );
  END IF;
  
  -- Verify code
  IF v_stored_code = p_code THEN
    -- Mark user as verified
    UPDATE users SET is_verified = true WHERE phone_number = p_phone_number RETURNING id INTO v_user_id;
    
    -- Delete verification code
    DELETE FROM verification_codes WHERE phone_number = p_phone_number;
    
    RETURN json_build_object(
      'success', true,
      'message', 'Phone number verified successfully',
      'user_id', v_user_id
    );
  ELSE
    RETURN json_build_object(
      'success', false,
      'message', 'Invalid verification code'
    );
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- WALLET FUNCTIONS
-- =====================================================

-- Add wallet balance (Admin only)
CREATE OR REPLACE FUNCTION add_wallet_balance(
  p_user_id uuid,
  p_amount decimal,
  p_description text,
  p_admin_id uuid
)
RETURNS json AS $$
DECLARE
  v_balance_before decimal;
  v_balance_after decimal;
  v_is_admin boolean;
BEGIN
  -- Verify admin role
  SELECT role = 'admin' INTO v_is_admin FROM users WHERE id = p_admin_id;
  
  IF NOT v_is_admin THEN
    RETURN json_build_object(
      'success', false,
      'message', 'Unauthorized: Admin access required'
    );
  END IF;
  
  -- Lock user row for update
  SELECT wallet_balance INTO v_balance_before
  FROM users
  WHERE id = p_user_id
  FOR UPDATE;
  
  IF NOT FOUND THEN
    RETURN json_build_object(
      'success', false,
      'message', 'User not found'
    );
  END IF;
  
  -- Calculate new balance
  v_balance_after := v_balance_before + p_amount;
  
  -- Update user balance
  UPDATE users SET wallet_balance = v_balance_after WHERE id = p_user_id;
  
  -- Record transaction
  INSERT INTO wallet_transactions (user_id, type, amount, balance_before, balance_after, description)
  VALUES (p_user_id, 'credit', p_amount, v_balance_before, v_balance_after, p_description);
  
  RETURN json_build_object(
    'success', true,
    'balance_before', v_balance_before,
    'balance_after', v_balance_after,
    'message', 'Balance added successfully'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Deduct wallet balance (for purchases)
CREATE OR REPLACE FUNCTION deduct_wallet_balance(
  p_user_id uuid,
  p_amount decimal,
  p_description text,
  p_order_id uuid DEFAULT NULL
)
RETURNS json AS $$
DECLARE
  v_balance_before decimal;
  v_balance_after decimal;
BEGIN
  -- Lock user row for update
  SELECT wallet_balance INTO v_balance_before
  FROM users
  WHERE id = p_user_id
  FOR UPDATE;
  
  IF NOT FOUND THEN
    RETURN json_build_object(
      'success', false,
      'message', 'User not found'
    );
  END IF;
  
  -- Check sufficient balance
  IF v_balance_before < p_amount THEN
    RETURN json_build_object(
      'success', false,
      'message', 'Insufficient balance'
    );
  END IF;
  
  -- Calculate new balance
  v_balance_after := v_balance_before - p_amount;
  
  -- Update user balance
  UPDATE users SET wallet_balance = v_balance_after WHERE id = p_user_id;
  
  -- Record transaction
  INSERT INTO wallet_transactions (user_id, type, amount, balance_before, balance_after, description, order_id)
  VALUES (p_user_id, 'debit', p_amount, v_balance_before, v_balance_after, p_description, p_order_id);
  
  RETURN json_build_object(
    'success', true,
    'balance_before', v_balance_before,
    'balance_after', v_balance_after,
    'message', 'Balance deducted successfully'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- PURCHASE FUNCTIONS
-- =====================================================

-- Create wallet purchase (FIFO inventory assignment)
CREATE OR REPLACE FUNCTION create_wallet_purchase(
  p_user_id uuid,
  p_product_id uuid
)
RETURNS json AS $$
DECLARE
  v_product products%ROWTYPE;
  v_inventory_id uuid;
  v_order_id uuid;
  v_wallet_result json;
  v_user users%ROWTYPE;
  v_transaction_id uuid;
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
  
  -- Get oldest available inventory (FIFO)
  SELECT id INTO v_inventory_id
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
  VALUES (p_user_id, v_inventory_id, p_product_id, v_product.price_mru, 'wallet', 'approved')
  RETURNING id INTO v_order_id;
  
  -- Update wallet transaction with order_id (get most recent transaction for this user)
  UPDATE wallet_transactions 
  SET order_id = v_order_id 
  WHERE id = (
    SELECT id FROM wallet_transactions 
    WHERE user_id = p_user_id AND order_id IS NULL 
    ORDER BY created_at DESC 
    LIMIT 1
  );
  
  -- Mark inventory as sold
  UPDATE inventory SET status = 'sold' WHERE id = v_inventory_id;
  
  RETURN json_build_object(
    'success', true,
    'order_id', v_order_id,
    'inventory_id', v_inventory_id,
    'message', 'Purchase completed successfully'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create manual purchase (reserve inventory)
CREATE OR REPLACE FUNCTION create_manual_purchase(
  p_user_id uuid,
  p_product_id uuid,
  p_payment_method_name text,
  p_user_payment_number text,
  p_user_name text,
  p_transaction_reference text
)
RETURNS json AS $$
DECLARE
  v_product products%ROWTYPE;
  v_inventory_id uuid;
  v_order_id uuid;
BEGIN
  -- Get product info
  SELECT * INTO v_product FROM products WHERE id = p_product_id AND is_deleted = false;
  
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'message', 'Product not found');
  END IF;
  
  -- Get oldest available inventory (FIFO)
  SELECT id INTO v_inventory_id
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
  
  -- Reserve inventory for 15 minutes
  UPDATE inventory 
  SET status = 'reserved', reserved_until = now() + interval '15 minutes'
  WHERE id = v_inventory_id;
  
  -- Create order
  INSERT INTO orders (
    user_id, inventory_id, product_id, price_at_purchase, 
    payment_type, payment_method_name, user_payment_number, 
    user_name, transaction_reference, status
  )
  VALUES (
    p_user_id, v_inventory_id, p_product_id, v_product.price_mru,
    'manual', p_payment_method_name, p_user_payment_number,
    p_user_name, p_transaction_reference, 'pending'
  )
  RETURNING id INTO v_order_id;
  
  RETURN json_build_object(
    'success', true,
    'order_id', v_order_id,
    'reserved_until', now() + interval '15 minutes',
    'message', 'Order created. Please upload receipt within 15 minutes.'
  );
EXCEPTION
  WHEN unique_violation THEN
    RETURN json_build_object(
      'success', false,
      'message', 'Transaction reference already exists'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Approve manual order
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
  UPDATE orders SET status = 'approved' WHERE id = p_order_id;
  
  -- Mark inventory as sold
  UPDATE inventory SET status = 'sold', reserved_until = NULL WHERE id = v_order.inventory_id;
  
  RETURN json_build_object('success', true, 'message', 'Order approved successfully');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Reject manual order
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
  
  -- Update order status
  UPDATE orders SET status = 'rejected', admin_note = p_admin_note WHERE id = p_order_id;
  
  -- Release inventory back to available
  UPDATE inventory SET status = 'available', reserved_until = NULL WHERE id = v_order.inventory_id;
  
  RETURN json_build_object('success', true, 'message', 'Order rejected successfully');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- INVENTORY FUNCTIONS
-- =====================================================

-- Get product stock count
CREATE OR REPLACE FUNCTION get_product_stock_count(p_product_ids uuid[])
RETURNS TABLE (product_id uuid, stock_count bigint) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    i.product_id,
    COUNT(*) as stock_count
  FROM inventory i
  WHERE i.product_id = ANY(p_product_ids)
    AND i.status = 'available'
    AND i.is_deleted = false
  GROUP BY i.product_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;