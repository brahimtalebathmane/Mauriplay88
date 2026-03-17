/*
  # Grant EXECUTE on user-facing RPCs for anon/authenticated

  The frontend uses the Supabase anon key. These RPCs are SECURITY DEFINER
  and must be callable by anon so Wallet, My Purchases, and product stock
  work correctly.

  - get_wallet_transactions(text) – Wallet page transaction history
  - get_user_orders_with_inventory(uuid) – My Purchases (مشترياتي)
  - get_product_stock_count(uuid[]) – Platform page available stock count
*/

GRANT EXECUTE ON FUNCTION get_wallet_transactions(text) TO anon;
GRANT EXECUTE ON FUNCTION get_wallet_transactions(text) TO authenticated;

GRANT EXECUTE ON FUNCTION get_user_orders_with_inventory(uuid) TO anon;
GRANT EXECUTE ON FUNCTION get_user_orders_with_inventory(uuid) TO authenticated;

GRANT EXECUTE ON FUNCTION get_product_stock_count(uuid[]) TO anon;
GRANT EXECUTE ON FUNCTION get_product_stock_count(uuid[]) TO authenticated;
