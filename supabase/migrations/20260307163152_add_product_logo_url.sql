/*
  # Add Product Logo URL Field

  ## Changes
  - Add `product_logo_url` column to the `products` table
  - This allows admins to specify a custom logo/icon for each product
  - Used for displaying product icons in the card-based UI

  ## Notes
  - Field is optional (nullable)
  - Stores URL to external image or uploaded asset
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'products' AND column_name = 'product_logo_url'
  ) THEN
    ALTER TABLE products ADD COLUMN product_logo_url text;
  END IF;
END $$;
