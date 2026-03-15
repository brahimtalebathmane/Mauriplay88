/*
  # Fix Ambiguous Column References in get_all_wallet_topups

  ## Problem
  The RPC function `get_all_wallet_topups` throws error:
  "column reference 'id' is ambiguous" (PostgreSQL error code 42702)
  
  This occurs because:
  1. The function performs a JOIN between wallet_topups (wt) and users (u)
  2. Both tables have columns named: id, user_id, phone_number
  3. The RETURNS TABLE defines: id, user_id, phone_number
  4. PostgreSQL cannot determine which table's columns to map to the return type
  
  ## Solution
  Explicitly alias ALL potentially ambiguous columns in the SELECT statement
  to make it crystal clear which table each column comes from.
  
  ## Changes
  1. Add explicit aliases for all columns in the SELECT
  2. Use AS to rename columns that could be ambiguous
  3. Keep the same RETURNS TABLE structure (no breaking changes)
*/

-- =====================================================
-- RECREATE get_all_wallet_topups WITH EXPLICIT ALIASES
-- =====================================================

CREATE OR REPLACE FUNCTION get_all_wallet_topups(
  p_admin_id uuid,
  p_status text DEFAULT NULL,
  p_search_phone text DEFAULT NULL
)
RETURNS TABLE (
  id uuid,
  user_id uuid,
  amount numeric,
  depositor_name text,
  phone_number text,
  receipt_url text,
  status wallet_topup_status,
  created_at timestamptz,
  approved_at timestamptz,
  approved_by uuid,
  user_phone_number text
) AS $$
BEGIN
  -- Verify admin
  IF NOT EXISTS (
    SELECT 1 FROM users 
    WHERE users.id = p_admin_id 
    AND users.role = 'admin'
  ) THEN
    RAISE EXCEPTION 'غير مصرح لك بالوصول';
  END IF;

  RETURN QUERY
  SELECT 
    wt.id AS id,
    wt.user_id AS user_id,
    wt.amount AS amount,
    wt.depositor_name AS depositor_name,
    wt.phone_number AS phone_number,
    wt.receipt_url AS receipt_url,
    wt.status AS status,
    wt.created_at AS created_at,
    wt.approved_at AS approved_at,
    wt.approved_by AS approved_by,
    u.phone_number AS user_phone_number
  FROM wallet_topups wt
  INNER JOIN users u ON wt.user_id = u.id
  WHERE 
    (p_status IS NULL OR wt.status::text = p_status)
    AND (p_search_phone IS NULL OR u.phone_number ILIKE '%' || p_search_phone || '%')
  ORDER BY wt.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions (ensure they exist)
GRANT EXECUTE ON FUNCTION get_all_wallet_topups(uuid, text, text) TO anon;
GRANT EXECUTE ON FUNCTION get_all_wallet_topups(uuid, text, text) TO authenticated;