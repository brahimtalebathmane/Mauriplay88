/*
  # Fix get_all_wallet_topups RPC – 400 Bad Request & ambiguous column "id"

  - Recreate function with explicit table qualifiers (wt., u., pm.) to fix PostgreSQL 42702
  - Admin check uses users.id explicitly to avoid any ambiguity
  - Same parameter names as frontend: p_admin_id, p_status, p_search_phone
  - Ensures RPC works for Admin Panel Wallet Top-up requests
*/

DROP FUNCTION IF EXISTS get_all_wallet_topups(uuid, text, text);

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
  user_phone_number text,
  payment_method_id uuid,
  payment_method_name text,
  account_number text,
  payment_method_logo text
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Admin check: use explicit table.column to avoid ambiguous "id"
  IF NOT EXISTS (
    SELECT 1 FROM public.users u_admin
    WHERE u_admin.id = p_admin_id
      AND u_admin.role = 'admin'
  ) THEN
    RAISE EXCEPTION 'غير مصرح لك بالوصول';
  END IF;

  RETURN QUERY
  SELECT
    wt.id               AS id,
    wt.user_id          AS user_id,
    wt.amount           AS amount,
    wt.depositor_name   AS depositor_name,
    wt.phone_number     AS phone_number,
    wt.receipt_url      AS receipt_url,
    wt.status           AS status,
    wt.created_at       AS created_at,
    wt.approved_at      AS approved_at,
    wt.approved_by      AS approved_by,
    u.phone_number      AS user_phone_number,
    wt.payment_method_id AS payment_method_id,
    pm.name             AS payment_method_name,
    pm.account_number   AS account_number,
    pm.logo_url         AS payment_method_logo
  FROM public.wallet_topups wt
  INNER JOIN public.users u ON wt.user_id = u.id
  LEFT JOIN public.payment_methods pm ON wt.payment_method_id = pm.id
  WHERE
    (p_status IS NULL OR wt.status::text = p_status)
    AND (p_search_phone IS NULL OR p_search_phone = '' OR u.phone_number ILIKE '%' || p_search_phone || '%')
  ORDER BY wt.created_at DESC;
END;
$$;

GRANT EXECUTE ON FUNCTION get_all_wallet_topups(uuid, text, text) TO anon;
GRANT EXECUTE ON FUNCTION get_all_wallet_topups(uuid, text, text) TO authenticated;

COMMENT ON FUNCTION get_all_wallet_topups(uuid, text, text) IS 'Admin: list wallet top-up requests with user and payment method. Params: p_admin_id, p_status (optional), p_search_phone (optional).';
