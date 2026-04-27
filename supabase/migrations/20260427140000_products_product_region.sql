/*
  Optional product region for storefront display (flag + code).
  - Adds products.product_region (nullable, CHECK whitelist)
  - Extends admin_insert_product / admin_update_product with p_product_region
*/

ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS product_region text;

ALTER TABLE public.products DROP CONSTRAINT IF EXISTS products_product_region_check;

ALTER TABLE public.products
  ADD CONSTRAINT products_product_region_check CHECK (
    product_region IS NULL
    OR product_region IN (
      'USA', 'KSA', 'UAE', 'Kuwait', 'UK', 'Qatar', 'Oman', 'Bahrain',
      'Canada', 'Australia', 'Turkey', 'Germany', 'France', 'Spain',
      'Italy', 'Japan', 'India'
    )
  );

COMMENT ON COLUMN public.products.product_region IS 'Optional storefront region code (e.g. USA, KSA); NULL = not set.';

-- Replace RPCs: new last arg p_product_region (optional)
DROP FUNCTION IF EXISTS public.admin_insert_product(text, uuid, text, numeric, text);
DROP FUNCTION IF EXISTS public.admin_update_product(text, uuid, text, numeric, text);

CREATE OR REPLACE FUNCTION public.admin_insert_product(
  p_admin_phone text,
  p_platform_id uuid,
  p_name text,
  p_price_mru numeric,
  p_logo_url text DEFAULT NULL,
  p_product_region text DEFAULT NULL
)
RETURNS json AS $$
DECLARE
  v_admin_id uuid;
  v_product_id uuid;
  v_region text;
BEGIN
  SELECT id INTO v_admin_id FROM users WHERE phone_number = p_admin_phone AND role = 'admin' AND is_active = true;
  IF v_admin_id IS NULL THEN
    RETURN json_build_object('success', false, 'message', 'غير مصرح');
  END IF;
  IF p_name IS NULL OR trim(p_name) = '' THEN
    RETURN json_build_object('success', false, 'message', 'اسم المنتج مطلوب');
  END IF;
  IF p_price_mru IS NULL OR p_price_mru < 0 THEN
    RETURN json_build_object('success', false, 'message', 'السعر غير صالح');
  END IF;

  v_region := NULLIF(trim(p_product_region), '');
  IF v_region IS NOT NULL AND v_region NOT IN (
    'USA', 'KSA', 'UAE', 'Kuwait', 'UK', 'Qatar', 'Oman', 'Bahrain',
    'Canada', 'Australia', 'Turkey', 'Germany', 'France', 'Spain',
    'Italy', 'Japan', 'India'
  ) THEN
    RETURN json_build_object('success', false, 'message', 'منطقة المنتج غير صالحة');
  END IF;

  INSERT INTO products (platform_id, name, price_mru, logo_url, product_region, is_deleted)
  VALUES (p_platform_id, trim(p_name), p_price_mru, NULLIF(trim(p_logo_url), ''), v_region, false)
  RETURNING id INTO v_product_id;

  RETURN json_build_object('success', true, 'message', 'تمت إضافة المنتج بنجاح', 'id', v_product_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.admin_update_product(
  p_admin_phone text,
  p_product_id uuid,
  p_name text,
  p_price_mru numeric,
  p_logo_url text DEFAULT NULL,
  p_product_region text DEFAULT NULL
)
RETURNS json AS $$
DECLARE
  v_admin_id uuid;
  v_region text;
BEGIN
  SELECT id INTO v_admin_id FROM users WHERE phone_number = p_admin_phone AND role = 'admin' AND is_active = true;
  IF v_admin_id IS NULL THEN
    RETURN json_build_object('success', false, 'message', 'غير مصرح');
  END IF;
  IF p_price_mru < 0 THEN
    RETURN json_build_object('success', false, 'message', 'السعر يجب أن يكون رقماً موجباً');
  END IF;

  IF p_product_region IS NOT NULL THEN
    v_region := NULLIF(trim(p_product_region), '');
    IF v_region IS NOT NULL AND v_region NOT IN (
      'USA', 'KSA', 'UAE', 'Kuwait', 'UK', 'Qatar', 'Oman', 'Bahrain',
      'Canada', 'Australia', 'Turkey', 'Germany', 'France', 'Spain',
      'Italy', 'Japan', 'India'
    ) THEN
      RETURN json_build_object('success', false, 'message', 'منطقة المنتج غير صالحة');
    END IF;
  END IF;

  UPDATE products
  SET name = p_name,
      price_mru = p_price_mru,
      logo_url = COALESCE(NULLIF(trim(p_logo_url), ''), logo_url),
      product_region = CASE WHEN p_product_region IS NULL THEN product_region ELSE v_region END,
      updated_at = now()
  WHERE id = p_product_id AND is_deleted = false;

  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'message', 'المنتج غير موجود');
  END IF;
  RETURN json_build_object('success', true, 'message', 'تم تحديث المنتج بنجاح');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.admin_insert_product(text, uuid, text, numeric, text, text) TO anon;
GRANT EXECUTE ON FUNCTION public.admin_insert_product(text, uuid, text, numeric, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_update_product(text, uuid, text, numeric, text, text) TO anon;
GRANT EXECUTE ON FUNCTION public.admin_update_product(text, uuid, text, numeric, text, text) TO authenticated;

-- My Purchases: expose product_region on each order row
DROP FUNCTION IF EXISTS public.get_user_orders_with_inventory(uuid);

CREATE OR REPLACE FUNCTION public.get_user_orders_with_inventory(p_user_id uuid)
RETURNS TABLE (
  id uuid,
  user_id uuid,
  product_id uuid,
  inventory_id uuid,
  price_at_purchase numeric,
  payment_type payment_type,
  payment_method_name text,
  user_payment_number text,
  user_name text,
  transaction_reference text,
  receipt_url text,
  status order_status,
  admin_note text,
  created_at timestamptz,
  updated_at timestamptz,
  product_name text,
  product_price numeric,
  product_logo_url text,
  product_region text,
  platform_id uuid,
  platform_name text,
  platform_logo_url text,
  platform_website_url text,
  platform_tutorial_video_url text,
  inventory_code text,
  inventory_status inventory_status
) AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM users WHERE users.id = p_user_id) THEN
    RAISE EXCEPTION 'User not found';
  END IF;

  RETURN QUERY
  SELECT
    o.id,
    o.user_id,
    o.product_id,
    o.inventory_id,
    o.price_at_purchase,
    o.payment_type,
    o.payment_method_name,
    o.user_payment_number,
    o.user_name,
    o.transaction_reference,
    o.receipt_url,
    o.status,
    o.admin_note,
    o.created_at,
    o.updated_at,
    p.name AS product_name,
    p.price_mru AS product_price,
    COALESCE(NULLIF(trim(p.product_logo_url), ''), NULLIF(trim(p.logo_url), '')) AS product_logo_url,
    p.product_region,
    pl.id AS platform_id,
    pl.name AS platform_name,
    pl.logo_url AS platform_logo_url,
    pl.website_url AS platform_website_url,
    pl.tutorial_video_url AS platform_tutorial_video_url,
    i.code AS inventory_code,
    i.status AS inventory_status
  FROM orders o
  LEFT JOIN products p ON o.product_id = p.id
  LEFT JOIN platforms pl ON p.platform_id = pl.id
  LEFT JOIN inventory i ON o.inventory_id = i.id
  WHERE o.user_id = p_user_id
  ORDER BY o.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION public.get_user_orders_with_inventory(uuid) IS 'User orders with inventory and product/platform details; includes product_logo_url and product_region for UI.';

GRANT EXECUTE ON FUNCTION public.get_user_orders_with_inventory(uuid) TO anon;
GRANT EXECUTE ON FUNCTION public.get_user_orders_with_inventory(uuid) TO authenticated;
