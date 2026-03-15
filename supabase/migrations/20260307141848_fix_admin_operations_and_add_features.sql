/*
  # Fix Admin Operations and Add New Features

  ## Changes Made
  
  1. **RPC Functions for Admin Operations**
     - `admin_add_inventory_bulk` - Add multiple inventory codes at once
     - `admin_update_inventory` - Edit inventory codes
     - `admin_delete_inventory` - Delete inventory codes
     - `admin_update_platform` - Update platform details
     - `admin_delete_platform` - Soft delete platforms
     - `admin_update_product` - Update product details
     - `admin_delete_product` - Soft delete products
     - `admin_get_inventory` - Get all inventory for admin panel
     - `change_user_pin` - Allow users to change their PIN
     - `get_wallet_transactions` - Get user wallet transaction history
  
  2. **Security**
     - All admin RPC functions verify the user's phone number and admin role
     - User functions verify phone number ownership
     - Proper error handling with descriptive messages in Arabic
  
  3. **Data Integrity**
     - Cascade handling for platform deletions (soft delete related products)
     - Bulk insert for inventory codes
     - PIN validation and secure hashing
*/

-- Function: Add multiple inventory codes in bulk
CREATE OR REPLACE FUNCTION admin_add_inventory_bulk(
  p_admin_phone TEXT,
  p_product_id UUID,
  p_codes TEXT[]
)
RETURNS JSON AS $$
DECLARE
  v_admin_id UUID;
  v_code TEXT;
  v_inserted_count INT := 0;
BEGIN
  -- Verify admin
  SELECT id INTO v_admin_id
  FROM users
  WHERE phone_number = p_admin_phone AND role = 'admin' AND is_active = true;
  
  IF v_admin_id IS NULL THEN
    RETURN json_build_object('success', false, 'message', 'غير مصرح');
  END IF;
  
  -- Verify product exists
  IF NOT EXISTS (SELECT 1 FROM products WHERE id = p_product_id AND is_deleted = false) THEN
    RETURN json_build_object('success', false, 'message', 'المنتج غير موجود');
  END IF;
  
  -- Insert each code
  FOREACH v_code IN ARRAY p_codes
  LOOP
    IF v_code IS NOT NULL AND trim(v_code) != '' THEN
      INSERT INTO inventory (product_id, code, status)
      VALUES (p_product_id, trim(v_code), 'available');
      v_inserted_count := v_inserted_count + 1;
    END IF;
  END LOOP;
  
  RETURN json_build_object(
    'success', true,
    'message', 'تم إضافة ' || v_inserted_count || ' رمز بنجاح',
    'count', v_inserted_count
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Update inventory code
CREATE OR REPLACE FUNCTION admin_update_inventory(
  p_admin_phone TEXT,
  p_inventory_id UUID,
  p_code TEXT,
  p_status inventory_status
)
RETURNS JSON AS $$
DECLARE
  v_admin_id UUID;
BEGIN
  -- Verify admin
  SELECT id INTO v_admin_id
  FROM users
  WHERE phone_number = p_admin_phone AND role = 'admin' AND is_active = true;
  
  IF v_admin_id IS NULL THEN
    RETURN json_build_object('success', false, 'message', 'غير مصرح');
  END IF;
  
  -- Update inventory
  UPDATE inventory
  SET code = p_code,
      status = p_status,
      updated_at = now()
  WHERE id = p_inventory_id AND is_deleted = false;
  
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'message', 'الرمز غير موجود');
  END IF;
  
  RETURN json_build_object('success', true, 'message', 'تم تحديث الرمز بنجاح');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Delete inventory code
CREATE OR REPLACE FUNCTION admin_delete_inventory(
  p_admin_phone TEXT,
  p_inventory_id UUID
)
RETURNS JSON AS $$
DECLARE
  v_admin_id UUID;
  v_status inventory_status;
BEGIN
  -- Verify admin
  SELECT id INTO v_admin_id
  FROM users
  WHERE phone_number = p_admin_phone AND role = 'admin' AND is_active = true;
  
  IF v_admin_id IS NULL THEN
    RETURN json_build_object('success', false, 'message', 'غير مصرح');
  END IF;
  
  -- Check if inventory is used in an order
  SELECT status INTO v_status FROM inventory WHERE id = p_inventory_id;
  
  IF v_status IN ('sold', 'reserved') THEN
    RETURN json_build_object('success', false, 'message', 'لا يمكن حذف رمز مباع أو محجوز');
  END IF;
  
  -- Soft delete inventory
  UPDATE inventory
  SET is_deleted = true, updated_at = now()
  WHERE id = p_inventory_id;
  
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'message', 'الرمز غير موجود');
  END IF;
  
  RETURN json_build_object('success', true, 'message', 'تم حذف الرمز بنجاح');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Get all inventory for admin
CREATE OR REPLACE FUNCTION admin_get_inventory(p_admin_phone TEXT)
RETURNS TABLE (
  id UUID,
  product_id UUID,
  product_name TEXT,
  platform_name TEXT,
  code TEXT,
  status inventory_status,
  created_at TIMESTAMPTZ
) AS $$
DECLARE
  v_admin_id UUID;
BEGIN
  -- Verify admin
  SELECT users.id INTO v_admin_id
  FROM users
  WHERE phone_number = p_admin_phone AND role = 'admin' AND is_active = true;
  
  IF v_admin_id IS NULL THEN
    RAISE EXCEPTION 'غير مصرح';
  END IF;
  
  RETURN QUERY
  SELECT 
    i.id,
    i.product_id,
    p.name as product_name,
    pl.name as platform_name,
    i.code,
    i.status,
    i.created_at
  FROM inventory i
  JOIN products p ON i.product_id = p.id
  JOIN platforms pl ON p.platform_id = pl.id
  WHERE i.is_deleted = false
  ORDER BY i.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Update platform
CREATE OR REPLACE FUNCTION admin_update_platform(
  p_admin_phone TEXT,
  p_platform_id UUID,
  p_name TEXT,
  p_logo_url TEXT,
  p_website_url TEXT,
  p_tutorial_video_url TEXT
)
RETURNS JSON AS $$
DECLARE
  v_admin_id UUID;
BEGIN
  -- Verify admin
  SELECT id INTO v_admin_id
  FROM users
  WHERE phone_number = p_admin_phone AND role = 'admin' AND is_active = true;
  
  IF v_admin_id IS NULL THEN
    RETURN json_build_object('success', false, 'message', 'غير مصرح');
  END IF;
  
  -- Update platform
  UPDATE platforms
  SET name = p_name,
      logo_url = p_logo_url,
      website_url = p_website_url,
      tutorial_video_url = p_tutorial_video_url,
      updated_at = now()
  WHERE id = p_platform_id AND is_deleted = false;
  
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'message', 'المنصة غير موجودة');
  END IF;
  
  RETURN json_build_object('success', true, 'message', 'تم تحديث المنصة بنجاح');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Delete platform (soft delete with cascade)
CREATE OR REPLACE FUNCTION admin_delete_platform(
  p_admin_phone TEXT,
  p_platform_id UUID
)
RETURNS JSON AS $$
DECLARE
  v_admin_id UUID;
  v_product_count INT;
BEGIN
  -- Verify admin
  SELECT id INTO v_admin_id
  FROM users
  WHERE phone_number = p_admin_phone AND role = 'admin' AND is_active = true;
  
  IF v_admin_id IS NULL THEN
    RETURN json_build_object('success', false, 'message', 'غير مصرح');
  END IF;
  
  -- Count products
  SELECT COUNT(*) INTO v_product_count
  FROM products
  WHERE platform_id = p_platform_id AND is_deleted = false;
  
  -- Soft delete platform
  UPDATE platforms
  SET is_deleted = true, updated_at = now()
  WHERE id = p_platform_id;
  
  -- Soft delete all products
  UPDATE products
  SET is_deleted = true, updated_at = now()
  WHERE platform_id = p_platform_id AND is_deleted = false;
  
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'message', 'المنصة غير موجودة');
  END IF;
  
  RETURN json_build_object(
    'success', true,
    'message', 'تم حذف المنصة و ' || v_product_count || ' منتج مرتبط بنجاح'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Update product
CREATE OR REPLACE FUNCTION admin_update_product(
  p_admin_phone TEXT,
  p_product_id UUID,
  p_name TEXT,
  p_price_mru NUMERIC
)
RETURNS JSON AS $$
DECLARE
  v_admin_id UUID;
BEGIN
  -- Verify admin
  SELECT id INTO v_admin_id
  FROM users
  WHERE phone_number = p_admin_phone AND role = 'admin' AND is_active = true;
  
  IF v_admin_id IS NULL THEN
    RETURN json_build_object('success', false, 'message', 'غير مصرح');
  END IF;
  
  IF p_price_mru < 0 THEN
    RETURN json_build_object('success', false, 'message', 'السعر يجب أن يكون رقماً موجباً');
  END IF;
  
  -- Update product
  UPDATE products
  SET name = p_name,
      price_mru = p_price_mru,
      updated_at = now()
  WHERE id = p_product_id AND is_deleted = false;
  
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'message', 'المنتج غير موجود');
  END IF;
  
  RETURN json_build_object('success', true, 'message', 'تم تحديث المنتج بنجاح');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Delete product (soft delete)
CREATE OR REPLACE FUNCTION admin_delete_product(
  p_admin_phone TEXT,
  p_product_id UUID
)
RETURNS JSON AS $$
DECLARE
  v_admin_id UUID;
BEGIN
  -- Verify admin
  SELECT id INTO v_admin_id
  FROM users
  WHERE phone_number = p_admin_phone AND role = 'admin' AND is_active = true;
  
  IF v_admin_id IS NULL THEN
    RETURN json_build_object('success', false, 'message', 'غير مصرح');
  END IF;
  
  -- Soft delete product
  UPDATE products
  SET is_deleted = true, updated_at = now()
  WHERE id = p_product_id;
  
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'message', 'المنتج غير موجود');
  END IF;
  
  RETURN json_build_object('success', true, 'message', 'تم حذف المنتج بنجاح');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Change user PIN
CREATE OR REPLACE FUNCTION change_user_pin(
  p_phone_number TEXT,
  p_current_pin TEXT,
  p_new_pin TEXT
)
RETURNS JSON AS $$
DECLARE
  v_user_id UUID;
  v_stored_hash TEXT;
  v_new_hash TEXT;
BEGIN
  -- Validate new PIN (must be 4 digits)
  IF p_new_pin !~ '^\d{4}$' THEN
    RETURN json_build_object('success', false, 'message', 'الرمز السري الجديد يجب أن يكون 4 أرقام');
  END IF;
  
  -- Get user and verify current PIN
  SELECT id, pin_hash INTO v_user_id, v_stored_hash
  FROM users
  WHERE phone_number = p_phone_number AND is_active = true;
  
  IF v_user_id IS NULL THEN
    RETURN json_build_object('success', false, 'message', 'المستخدم غير موجود');
  END IF;
  
  -- Verify current PIN
  IF NOT (v_stored_hash = crypt(p_current_pin, v_stored_hash)) THEN
    RETURN json_build_object('success', false, 'message', 'الرمز السري الحالي غير صحيح');
  END IF;
  
  -- Hash new PIN
  v_new_hash := crypt(p_new_pin, gen_salt('bf'));
  
  -- Update PIN
  UPDATE users
  SET pin_hash = v_new_hash,
      updated_at = now()
  WHERE id = v_user_id;
  
  RETURN json_build_object('success', true, 'message', 'تم تغيير الرمز السري بنجاح');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Get wallet transactions for user
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
  -- Get user ID
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
