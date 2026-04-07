/*
  Idempotent: keep orders, inventory, and wallet_topups in supabase_realtime so admin
  postgres_changes subscriptions work. Safe to re-apply if a branch missed prior migration.
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
