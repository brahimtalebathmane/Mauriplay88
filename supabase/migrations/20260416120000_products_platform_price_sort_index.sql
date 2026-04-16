-- Supports listing products per platform ordered by price (ascending) with stable tie-break.
-- Partial index matches typical filters: active products only.
CREATE INDEX IF NOT EXISTS idx_products_platform_price_active
  ON public.products (platform_id, price_mru, name)
  WHERE is_deleted = false;
