/*
  Realtime: expose tables to supabase_realtime publication so postgres_changes
  subscriptions receive INSERT/UPDATE/DELETE. Replica identity FULL improves UPDATE payloads.
  RLS still applies to which events each client receives (requires JWT with user_id / admin).
*/

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE orders;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE inventory;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE wallet_topups;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE orders REPLICA IDENTITY FULL;
ALTER TABLE inventory REPLICA IDENTITY FULL;
ALTER TABLE wallet_topups REPLICA IDENTITY FULL;
