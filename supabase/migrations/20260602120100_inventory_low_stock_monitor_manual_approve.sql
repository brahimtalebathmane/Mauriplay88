-- Include manual order path: reserved → sold with 1 available unit remaining
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
