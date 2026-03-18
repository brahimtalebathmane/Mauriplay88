/*
  Ensure products.product_logo_url exists on remote DB.
  Some environments may have missed earlier migration; this is safe and idempotent.
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'products'
      AND column_name = 'product_logo_url'
  ) THEN
    ALTER TABLE public.products ADD COLUMN product_logo_url text;
  END IF;
END $$;

