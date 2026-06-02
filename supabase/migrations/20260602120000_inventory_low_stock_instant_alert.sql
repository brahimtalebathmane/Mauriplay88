/*
  Instant low-stock alerts: when a sale (or removal of an available unit) leaves exactly
  one available inventory row for a product, dispatch a push notification immediately
  via pg_net → send-notification edge function.

  - Fires on inventory UPDATE (status → sold, soft-delete) and DELETE of available rows
  - Dedupes while stock stays at 1; resets when stock goes above 1 again
  - Audit log in inventory_low_stock_events + Realtime for in-app admin toasts
*/

CREATE EXTENSION IF NOT EXISTS pg_net;

-- Dedupe: one alert cycle per product while stock remains at 1
CREATE TABLE IF NOT EXISTS inventory_low_stock_alert_state (
  product_id uuid PRIMARY KEY REFERENCES products(id) ON DELETE CASCADE,
  alerted_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE inventory_low_stock_alert_state IS
  'Tracks products already notified at 1 remaining unit; cleared when stock rises above 1.';

-- Audit + Realtime payload for admin UI
CREATE TABLE IF NOT EXISTS inventory_low_stock_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  product_name text NOT NULL,
  remaining_stock integer NOT NULL DEFAULT 1 CHECK (remaining_stock = 1),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_inventory_low_stock_events_created_at
  ON inventory_low_stock_events (created_at DESC);

COMMENT ON TABLE inventory_low_stock_events IS
  'Emitted when available stock for a product reaches exactly 1 after a sale/removal.';

ALTER TABLE inventory_low_stock_events ENABLE ROW LEVEL SECURITY;

-- Admins may read events (for Realtime); inserts only via SECURITY DEFINER trigger
DROP POLICY IF EXISTS inventory_low_stock_events_admin_select ON inventory_low_stock_events;
CREATE POLICY inventory_low_stock_events_admin_select
  ON inventory_low_stock_events
  FOR SELECT
  TO authenticated, anon
  USING (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = auth.uid()
        AND u.role = 'admin'
        AND u.is_active = true
    )
  );

-- Base URL for edge function (project API host)
CREATE OR REPLACE FUNCTION public.get_supabase_functions_base_url()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    nullif(current_setting('app.supabase_functions_base_url', true), ''),
    'https://ajvuaefwakdesdknwiwc.supabase.co'
  );
$$;

COMMENT ON FUNCTION public.get_supabase_functions_base_url() IS
  'Supabase project URL for functions/v1; override with app.supabase_functions_base_url if needed.';

-- Async push via send-notification (verify_jwt = false)
CREATE OR REPLACE FUNCTION public.dispatch_inventory_low_stock_push(p_product_name text)
RETURNS bigint
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, net
AS $$
DECLARE
  v_base text;
  v_request_id bigint;
BEGIN
  v_base := public.get_supabase_functions_base_url();

  SELECT net.http_post(
    url := v_base || '/functions/v1/send-notification',
    headers := jsonb_build_object('Content-Type', 'application/json'),
    body := jsonb_build_object(
      'type', 'stock_low_admin',
      'product_name', p_product_name,
      'base_url', 'https://mauriplay.store'
    )
  ) INTO v_request_id;

  RETURN v_request_id;
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'dispatch_inventory_low_stock_push failed: %', SQLERRM;
    RETURN NULL;
END;
$$;

-- Clear dedupe when stock is replenished above 1
CREATE OR REPLACE FUNCTION public.inventory_clear_low_stock_alert_if_restocked(p_product_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_remaining bigint;
BEGIN
  SELECT COUNT(*)::bigint INTO v_remaining
  FROM inventory
  WHERE product_id = p_product_id
    AND status = 'available'
    AND is_deleted = false;

  IF v_remaining > 1 THEN
    DELETE FROM inventory_low_stock_alert_state WHERE product_id = p_product_id;
  END IF;
END;
$$;

-- Main monitor: after losing an available unit, alert if exactly 1 remains
CREATE OR REPLACE FUNCTION public.inventory_after_change_low_stock_monitor()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_product_id uuid;
  v_remaining bigint;
  v_product_name text;
  v_should_check boolean := false;
  v_inserted uuid;
BEGIN
  IF TG_OP = 'UPDATE' THEN
  v_product_id := NEW.product_id;

    IF OLD.status = 'available' AND NOT OLD.is_deleted THEN
      IF NEW.status = 'sold' OR (NEW.is_deleted AND NOT OLD.is_deleted) THEN
        v_should_check := true;
      END IF;
    ELSIF NEW.status = 'sold' AND OLD.status IS DISTINCT FROM 'sold' THEN
      -- Manual approval: reserved → sold (available count unchanged but sale completed)
      v_should_check := true;
    END IF;

    IF NEW.status = 'available' AND NOT NEW.is_deleted THEN
      PERFORM public.inventory_clear_low_stock_alert_if_restocked(NEW.product_id);
    END IF;
  ELSIF TG_OP = 'INSERT' THEN
    IF NEW.status = 'available' AND NOT NEW.is_deleted THEN
      PERFORM public.inventory_clear_low_stock_alert_if_restocked(NEW.product_id);
    END IF;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    v_product_id := OLD.product_id;
    IF OLD.status = 'available' AND NOT OLD.is_deleted THEN
      v_should_check := true;
    END IF;
  END IF;

  IF NOT v_should_check OR v_product_id IS NULL THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  SELECT COUNT(*)::bigint INTO v_remaining
  FROM inventory
  WHERE product_id = v_product_id
    AND status = 'available'
    AND is_deleted = false;

  IF v_remaining <> 1 THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  SELECT p.name INTO v_product_name
  FROM products p
  WHERE p.id = v_product_id AND p.is_deleted = false;

  IF v_product_name IS NULL OR trim(v_product_name) = '' THEN
    v_product_name := 'منتج';
  END IF;

  INSERT INTO inventory_low_stock_alert_state (product_id)
  VALUES (v_product_id)
  ON CONFLICT (product_id) DO NOTHING
  RETURNING product_id INTO v_inserted;

  IF v_inserted IS NULL THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  INSERT INTO inventory_low_stock_events (product_id, product_name, remaining_stock)
  VALUES (v_product_id, v_product_name, 1);

  PERFORM public.dispatch_inventory_low_stock_push(v_product_name);

  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS trg_inventory_low_stock_monitor ON inventory;
CREATE TRIGGER trg_inventory_low_stock_monitor
  AFTER INSERT OR UPDATE OR DELETE ON inventory
  FOR EACH ROW
  EXECUTE FUNCTION public.inventory_after_change_low_stock_monitor();

-- Realtime: admin clients can show in-app toasts instantly
DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE inventory_low_stock_events;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE inventory_low_stock_events REPLICA IDENTITY FULL;
