/*
  # Wallet Receipts Storage Bucket

  1. Storage Bucket
    - Create `wallet-receipts` bucket for storing wallet top-up receipt images
    - Public access: false (only authenticated users can access their own receipts)
    - Allowed file types: jpg, jpeg, png, webp
    - Max file size: 5MB

  2. Security Policies
    - Users can upload receipts (INSERT)
    - Users can only view their own receipts (SELECT)
    - Admins can view all receipts
    - Users cannot delete receipts once uploaded (no DELETE policy for users)
    - Only admins can delete receipts
*/

-- =====================================================
-- 1. CREATE STORAGE BUCKET
-- =====================================================

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'wallet-receipts',
  'wallet-receipts',
  false,
  5242880, -- 5MB in bytes
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- =====================================================
-- 2. CREATE STORAGE POLICIES
-- =====================================================

-- Users can upload receipts to their own folder
DROP POLICY IF EXISTS "Users can upload wallet receipts" ON storage.objects;
CREATE POLICY "Users can upload wallet receipts"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'wallet-receipts' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Users can view their own receipts
DROP POLICY IF EXISTS "Users can view own wallet receipts" ON storage.objects;
CREATE POLICY "Users can view own wallet receipts"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'wallet-receipts' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Admins can view all receipts
DROP POLICY IF EXISTS "Admins can view all wallet receipts" ON storage.objects;
CREATE POLICY "Admins can view all wallet receipts"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'wallet-receipts'
  AND EXISTS (
    SELECT 1 FROM users 
    WHERE users.id = auth.uid() 
    AND users.role = 'admin'
  )
);

-- Only admins can delete receipts
DROP POLICY IF EXISTS "Admins can delete wallet receipts" ON storage.objects;
CREATE POLICY "Admins can delete wallet receipts"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'wallet-receipts'
  AND EXISTS (
    SELECT 1 FROM users 
    WHERE users.id = auth.uid() 
    AND users.role = 'admin'
  )
);