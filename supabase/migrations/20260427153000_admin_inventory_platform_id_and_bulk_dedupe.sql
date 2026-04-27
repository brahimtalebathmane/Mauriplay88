/*
  Admin inventory UX support:
  - admin_get_inventory: add platform_id for client-side grouping without extra joins
  - admin_add_inventory_bulk: skip duplicate (product_id, code) per unique constraint instead of failing the whole batch
*/

CREATE OR REPLACE FUNCTION admin_add_inventory_bulk(
  p_admin_phone TEXT,
  p_product_id UUID,
  p_codes TEXT[]
)
RETURNS JSON AS $$
DECLARE
  v_admin_id UUID;
  v_code TEXT;
  v_norm TEXT;
  v_inserted_count INT := 0;
  v_skipped_duplicates INT := 0;
BEGIN
  SELECT id INTO v_admin_id
  FROM users
  WHERE phone_number = p_admin_phone AND role = 'admin' AND is_active = true;

  IF v_admin_id IS NULL THEN
    RETURN json_build_object('success', false, 'message', 'غير مصرح');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM products WHERE id = p_product_id AND is_deleted = false) THEN
    RETURN json_build_object('success', false, 'message', 'المنتج غير موجود');
  END IF;

  FOREACH v_code IN ARRAY p_codes
  LOOP
    v_norm := trim(both from coalesce(v_code, ''));
    IF v_norm = '' THEN
      CONTINUE;
    END IF;
    BEGIN
      INSERT INTO inventory (product_id, code, status)
      VALUES (p_product_id, v_norm, 'available');
      v_inserted_count := v_inserted_count + 1;
    EXCEPTION WHEN unique_violation THEN
      v_skipped_duplicates := v_skipped_duplicates + 1;
    END;
  END LOOP;

  IF v_inserted_count = 0 AND v_skipped_duplicates = 0 THEN
    RETURN json_build_object(
      'success', false,
      'message', 'لا توجد أكواد صالحة للإضافة',
      'inserted', 0,
      'count', 0,
      'skipped_duplicates', 0
    );
  END IF;

  IF v_inserted_count = 0 AND v_skipped_duplicates > 0 THEN
    RETURN json_build_object(
      'success', false,
      'message', 'جميع الأكواد مكررة لهذا المنتج مسبقاً',
      'inserted', 0,
      'count', 0,
      'skipped_duplicates', v_skipped_duplicates
    );
  END IF;

  RETURN json_build_object(
    'success', true,
    'inserted', v_inserted_count,
    'count', v_inserted_count,
    'skipped_duplicates', v_skipped_duplicates,
    'message',
      CASE
        WHEN v_skipped_duplicates > 0 THEN
          'تم إضافة ' || v_inserted_count || ' رمزاً. تخطّي ' || v_skipped_duplicates || ' مكرراً مسبقاً'
        ELSE
          'تم إضافة ' || v_inserted_count || ' رمز بنجاح'
      END
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP FUNCTION IF EXISTS admin_get_inventory(text);

CREATE OR REPLACE FUNCTION admin_get_inventory(p_admin_phone TEXT)
RETURNS TABLE (
  id UUID,
  product_id UUID,
  product_name TEXT,
  platform_id UUID,
  platform_name TEXT,
  code TEXT,
  status inventory_status,
  created_at TIMESTAMPTZ
) AS $$
DECLARE
  v_admin_id UUID;
BEGIN
  SELECT users.id INTO v_admin_id
  FROM users
  WHERE phone_number = p_admin_phone AND role = 'admin' AND is_active = true;

  IF v_admin_id IS NULL THEN
    RAISE EXCEPTION 'غير مصرح';
  END IF;

  RETURN QUERY
  SELECT
    i.id,
    i.product_id,
    p.name AS product_name,
    p.platform_id,
    pl.name AS platform_name,
    i.code,
    i.status,
    i.created_at
  FROM inventory i
  JOIN products p ON i.product_id = p.id
  JOIN platforms pl ON p.platform_id = pl.id
  WHERE i.is_deleted = false
  ORDER BY i.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION admin_add_inventory_bulk(TEXT, UUID, TEXT[]) IS 'Admin-only: bulk add inventory codes; skips duplicates (unique product_id+code).';
COMMENT ON FUNCTION admin_get_inventory(TEXT) IS 'Admin-only: list all inventory with platform_id.';

GRANT EXECUTE ON FUNCTION admin_get_inventory(text) TO anon;
GRANT EXECUTE ON FUNCTION admin_get_inventory(text) TO authenticated;
