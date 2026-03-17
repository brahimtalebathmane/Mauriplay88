/*
  # Grant EXECUTE on all admin and app RPCs to anon and authenticated

  The frontend uses the Supabase anon key. These RPCs are SECURITY DEFINER
  and enforce admin/auth inside the function. They must be callable by anon
  so the Admin Panel works. Each GRANT is wrapped so missing functions
  on the remote do not cause the migration to fail.
*/

DO $$
BEGIN
  -- Orders
  BEGIN EXECUTE 'GRANT EXECUTE ON FUNCTION get_admin_orders(uuid, text) TO anon'; EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN EXECUTE 'GRANT EXECUTE ON FUNCTION get_admin_orders(uuid, text) TO authenticated'; EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN EXECUTE 'GRANT EXECUTE ON FUNCTION approve_manual_order(uuid, uuid) TO anon'; EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN EXECUTE 'GRANT EXECUTE ON FUNCTION approve_manual_order(uuid, uuid) TO authenticated'; EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN EXECUTE 'GRANT EXECUTE ON FUNCTION reject_manual_order(uuid, uuid, text) TO anon'; EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN EXECUTE 'GRANT EXECUTE ON FUNCTION reject_manual_order(uuid, uuid, text) TO authenticated'; EXCEPTION WHEN OTHERS THEN NULL; END;

  -- Users
  BEGIN EXECUTE 'GRANT EXECUTE ON FUNCTION get_admin_users(uuid) TO anon'; EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN EXECUTE 'GRANT EXECUTE ON FUNCTION get_admin_users(uuid) TO authenticated'; EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN EXECUTE 'GRANT EXECUTE ON FUNCTION add_wallet_balance(uuid, numeric, text, uuid) TO anon'; EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN EXECUTE 'GRANT EXECUTE ON FUNCTION add_wallet_balance(uuid, numeric, text, uuid) TO authenticated'; EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN EXECUTE 'GRANT EXECUTE ON FUNCTION admin_toggle_wallet_active(text, uuid) TO anon'; EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN EXECUTE 'GRANT EXECUTE ON FUNCTION admin_toggle_wallet_active(text, uuid) TO authenticated'; EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN EXECUTE 'GRANT EXECUTE ON FUNCTION admin_toggle_user_active(text, uuid) TO anon'; EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN EXECUTE 'GRANT EXECUTE ON FUNCTION admin_toggle_user_active(text, uuid) TO authenticated'; EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN EXECUTE 'GRANT EXECUTE ON FUNCTION update_user_phone_number(uuid, text, uuid) TO anon'; EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN EXECUTE 'GRANT EXECUTE ON FUNCTION update_user_phone_number(uuid, text, uuid) TO authenticated'; EXCEPTION WHEN OTHERS THEN NULL; END;

  -- Payment methods
  BEGIN EXECUTE 'GRANT EXECUTE ON FUNCTION get_payment_methods_for_admin(text) TO anon'; EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN EXECUTE 'GRANT EXECUTE ON FUNCTION get_payment_methods_for_admin(text) TO authenticated'; EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN EXECUTE 'GRANT EXECUTE ON FUNCTION admin_insert_payment_method(text, text, text, text) TO anon'; EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN EXECUTE 'GRANT EXECUTE ON FUNCTION admin_insert_payment_method(text, text, text, text) TO authenticated'; EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN EXECUTE 'GRANT EXECUTE ON FUNCTION admin_update_payment_method(text, uuid, text, text, text, boolean) TO anon'; EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN EXECUTE 'GRANT EXECUTE ON FUNCTION admin_update_payment_method(text, uuid, text, text, text, boolean) TO authenticated'; EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN EXECUTE 'GRANT EXECUTE ON FUNCTION admin_delete_payment_method(text, uuid) TO anon'; EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN EXECUTE 'GRANT EXECUTE ON FUNCTION admin_delete_payment_method(text, uuid) TO authenticated'; EXCEPTION WHEN OTHERS THEN NULL; END;

  -- Wallet top-ups
  BEGIN EXECUTE 'GRANT EXECUTE ON FUNCTION get_all_wallet_topups(uuid, text, text) TO anon'; EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN EXECUTE 'GRANT EXECUTE ON FUNCTION get_all_wallet_topups(uuid, text, text) TO authenticated'; EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN EXECUTE 'GRANT EXECUTE ON FUNCTION approve_wallet_topup(uuid, uuid) TO anon'; EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN EXECUTE 'GRANT EXECUTE ON FUNCTION approve_wallet_topup(uuid, uuid) TO authenticated'; EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN EXECUTE 'GRANT EXECUTE ON FUNCTION reject_wallet_topup(uuid, uuid, text) TO anon'; EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN EXECUTE 'GRANT EXECUTE ON FUNCTION reject_wallet_topup(uuid, uuid, text) TO authenticated'; EXCEPTION WHEN OTHERS THEN NULL; END;

  -- Inventory
  BEGIN EXECUTE 'GRANT EXECUTE ON FUNCTION admin_get_inventory(text) TO anon'; EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN EXECUTE 'GRANT EXECUTE ON FUNCTION admin_get_inventory(text) TO authenticated'; EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN EXECUTE 'GRANT EXECUTE ON FUNCTION admin_add_inventory_bulk(text, uuid, text[]) TO anon'; EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN EXECUTE 'GRANT EXECUTE ON FUNCTION admin_add_inventory_bulk(text, uuid, text[]) TO authenticated'; EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN EXECUTE 'GRANT EXECUTE ON FUNCTION admin_update_inventory(text, uuid, text, inventory_status) TO anon'; EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN EXECUTE 'GRANT EXECUTE ON FUNCTION admin_update_inventory(text, uuid, text, inventory_status) TO authenticated'; EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN EXECUTE 'GRANT EXECUTE ON FUNCTION admin_delete_inventory(text, uuid) TO anon'; EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN EXECUTE 'GRANT EXECUTE ON FUNCTION admin_delete_inventory(text, uuid) TO authenticated'; EXCEPTION WHEN OTHERS THEN NULL; END;

  -- Products
  BEGIN EXECUTE 'GRANT EXECUTE ON FUNCTION admin_insert_product(text, uuid, text, numeric, text) TO anon'; EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN EXECUTE 'GRANT EXECUTE ON FUNCTION admin_insert_product(text, uuid, text, numeric, text) TO authenticated'; EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN EXECUTE 'GRANT EXECUTE ON FUNCTION admin_update_product(text, uuid, text, numeric, text) TO anon'; EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN EXECUTE 'GRANT EXECUTE ON FUNCTION admin_update_product(text, uuid, text, numeric, text) TO authenticated'; EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN EXECUTE 'GRANT EXECUTE ON FUNCTION admin_delete_product(text, uuid) TO anon'; EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN EXECUTE 'GRANT EXECUTE ON FUNCTION admin_delete_product(text, uuid) TO authenticated'; EXCEPTION WHEN OTHERS THEN NULL; END;

  -- Platforms
  BEGIN EXECUTE 'GRANT EXECUTE ON FUNCTION get_platforms() TO anon'; EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN EXECUTE 'GRANT EXECUTE ON FUNCTION get_platforms() TO authenticated'; EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN EXECUTE 'GRANT EXECUTE ON FUNCTION admin_insert_platform(text, text, text, text, text) TO anon'; EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN EXECUTE 'GRANT EXECUTE ON FUNCTION admin_insert_platform(text, text, text, text, text) TO authenticated'; EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN EXECUTE 'GRANT EXECUTE ON FUNCTION admin_update_platform(text, uuid, text, text, text, text) TO anon'; EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN EXECUTE 'GRANT EXECUTE ON FUNCTION admin_update_platform(text, uuid, text, text, text, text) TO authenticated'; EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN EXECUTE 'GRANT EXECUTE ON FUNCTION admin_delete_platform(text, uuid) TO anon'; EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN EXECUTE 'GRANT EXECUTE ON FUNCTION admin_delete_platform(text, uuid) TO authenticated'; EXCEPTION WHEN OTHERS THEN NULL; END;

  -- Settings (wallet notice)
  BEGIN EXECUTE 'GRANT EXECUTE ON FUNCTION save_app_setting(text, text, text) TO anon'; EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN EXECUTE 'GRANT EXECUTE ON FUNCTION save_app_setting(text, text, text) TO authenticated'; EXCEPTION WHEN OTHERS THEN NULL; END;
END $$;
