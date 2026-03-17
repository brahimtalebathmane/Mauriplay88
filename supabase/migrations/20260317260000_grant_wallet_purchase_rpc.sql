/*
  # Grant create_wallet_purchase to anon/authenticated

  User wallet purchase flow (Purchase.tsx) calls create_wallet_purchase(p_user_id, p_product_id).
  Ensure the RPC is callable by the frontend (anon key).
*/

DO $$
BEGIN
  EXECUTE 'GRANT EXECUTE ON FUNCTION create_wallet_purchase(uuid, uuid) TO anon';
EXCEPTION WHEN OTHERS THEN
  NULL; -- Function may have different signature or not exist
END $$;
DO $$
BEGIN
  EXECUTE 'GRANT EXECUTE ON FUNCTION create_wallet_purchase(uuid, uuid) TO authenticated';
EXCEPTION WHEN OTHERS THEN
  NULL;
END $$;
