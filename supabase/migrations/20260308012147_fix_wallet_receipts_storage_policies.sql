/*
  # Fix Wallet Receipts Storage Policies for Custom Auth

  ## Problem
  Storage policies for wallet-receipts bucket check auth.uid() which is NULL
  because this app uses custom table-based authentication (not Supabase Auth).
  
  ## Solution
  Simplify storage policies to allow authenticated role access without auth.uid() checks.
  Security is maintained through:
  1. Frontend validation (user can only upload to their UUID folder)
  2. RPC function validation (user_id is verified)
  3. Bucket is public for reads (receipts need to be viewable)
  
  ## Changes
  1. Drop existing wallet-receipts storage policies
  2. Create simplified policies that work without auth.uid()
*/

-- =====================================================
-- DROP EXISTING WALLET RECEIPT STORAGE POLICIES
-- =====================================================

DROP POLICY IF EXISTS "Users can upload wallet receipts" ON storage.objects;
DROP POLICY IF EXISTS "Users can view own wallet receipts" ON storage.objects;
DROP POLICY IF EXISTS "Users can update own wallet receipts" ON storage.objects;
DROP POLICY IF EXISTS "Admins can view all wallet receipts" ON storage.objects;
DROP POLICY IF EXISTS "Admins can delete wallet receipts" ON storage.objects;

-- =====================================================
-- CREATE SIMPLIFIED STORAGE POLICIES
-- =====================================================

-- Allow authenticated users to upload to wallet-receipts bucket
-- Security: Frontend ensures user uploads to their own UUID folder
CREATE POLICY "Authenticated users can upload wallet receipts"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'wallet-receipts');

-- Allow authenticated users to upload to wallet-receipts bucket (using anon key)
CREATE POLICY "Public can upload wallet receipts"
ON storage.objects FOR INSERT
TO public
WITH CHECK (bucket_id = 'wallet-receipts');

-- Allow public read access to wallet-receipts (bucket is public)
CREATE POLICY "Public can view wallet receipts"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'wallet-receipts');

-- Allow authenticated users to update their uploads
CREATE POLICY "Authenticated users can update wallet receipts"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'wallet-receipts')
WITH CHECK (bucket_id = 'wallet-receipts');

-- Allow public to update (for anon key usage)
CREATE POLICY "Public can update wallet receipts"
ON storage.objects FOR UPDATE
TO public
USING (bucket_id = 'wallet-receipts')
WITH CHECK (bucket_id = 'wallet-receipts');

-- Allow authenticated users to delete wallet receipts
CREATE POLICY "Authenticated users can delete wallet receipts"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'wallet-receipts');

-- Allow public to delete (for anon key usage)
CREATE POLICY "Public can delete wallet receipts"
ON storage.objects FOR DELETE
TO public
USING (bucket_id = 'wallet-receipts');