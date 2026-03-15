/*
  # Add Admin Phone Number Update Function

  1. New Functions
    - `update_user_phone_number` - Admin-only function to update phone numbers
    
  2. Security
    - Only admin users can update phone numbers
    - Validates that the new phone number is not already in use
    - Validates phone number format
    
  3. Changes
    - Adds RPC function with proper authorization checks
    - Returns success/error status with messages
*/

-- Function to update user phone number (admin only)
CREATE OR REPLACE FUNCTION update_user_phone_number(
  p_user_id uuid,
  p_new_phone_number text,
  p_admin_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_admin_role user_role;
  v_phone_exists boolean;
BEGIN
  -- Check if the requester is an admin
  SELECT role INTO v_admin_role
  FROM users
  WHERE id = p_admin_id;

  IF v_admin_role IS NULL OR v_admin_role != 'admin' THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'غير مصرح لك بتحديث أرقام الهواتف'
    );
  END IF;

  -- Validate phone number format (basic validation)
  IF p_new_phone_number IS NULL OR LENGTH(p_new_phone_number) < 8 THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'رقم الهاتف غير صالح'
    );
  END IF;

  -- Check if the phone number is already in use by another user
  SELECT EXISTS(
    SELECT 1 FROM users 
    WHERE phone_number = p_new_phone_number 
    AND id != p_user_id
  ) INTO v_phone_exists;

  IF v_phone_exists THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'رقم الهاتف مستخدم بالفعل'
    );
  END IF;

  -- Update the phone number
  UPDATE users
  SET phone_number = p_new_phone_number
  WHERE id = p_user_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'المستخدم غير موجود'
    );
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'message', 'تم تحديث رقم الهاتف بنجاح'
  );
END;
$$;

-- Add comment explaining the function
COMMENT ON FUNCTION update_user_phone_number IS 'Admin-only function to update user phone numbers';
