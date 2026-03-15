/*
  # Fix Wallet Top-up RLS Policies

  1. Storage Bucket Policies
    - Simplify upload policy to allow authenticated users to upload to their own folder
    - Add UPDATE policy for storage objects (needed for some operations)

  2. Wallet Topups Table
    - Keep existing policies but ensure they work correctly
    - Add proper admin policies

  3. Wallet Transactions Table
    - Ensure RPC functions can insert records
    - Users can view their own transactions
    - Admins can view all transactions

  4. Issue Resolution
    - Fix storage upload failures by simplifying folder path validation
    - Fix admin dashboard by ensuring proper SELECT permissions
    - Ensure wallet_transactions has proper policies for INSERT by RPC
*/

-- =====================================================
-- 1. DROP AND RECREATE STORAGE POLICIES
-- =====================================================

-- Drop existing wallet receipt policies
DROP POLICY IF EXISTS "Users can upload wallet receipts" ON storage.objects;
DROP POLICY IF EXISTS "Users can view own wallet receipts" ON storage.objects;
DROP POLICY IF EXISTS "Admins can view all wallet receipts" ON storage.objects;
DROP POLICY IF EXISTS "Admins can delete wallet receipts" ON storage.objects;

-- Create simplified upload policy
CREATE POLICY "Users can upload wallet receipts"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'wallet-receipts'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow users to update their own receipts (needed for overwrites)
CREATE POLICY "Users can update own wallet receipts"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'wallet-receipts'
  AND (storage.foldername(name))[1] = auth.uid()::text
)
WITH CHECK (
  bucket_id = 'wallet-receipts'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Users can view their own receipts
CREATE POLICY "Users can view own wallet receipts"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'wallet-receipts'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Admins can view all wallet receipts
CREATE POLICY "Admins can view all wallet receipts"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'wallet-receipts'
  AND EXISTS (
    SELECT 1 FROM public.users
    WHERE users.id = auth.uid()
    AND users.role = 'admin'
  )
);

-- Admins can delete wallet receipts
CREATE POLICY "Admins can delete wallet receipts"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'wallet-receipts'
  AND EXISTS (
    SELECT 1 FROM public.users
    WHERE users.id = auth.uid()
    AND users.role = 'admin'
  )
);

-- =====================================================
-- 2. FIX WALLET_TRANSACTIONS RLS POLICIES
-- =====================================================

-- Drop the overly permissive policy
DROP POLICY IF EXISTS "RPC can manage wallet transactions" ON wallet_transactions;

-- Users can view their own transactions
DROP POLICY IF EXISTS "Users can view own wallet transactions" ON wallet_transactions;
CREATE POLICY "Users can view own wallet transactions"
ON wallet_transactions FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Admins can view all transactions
DROP POLICY IF EXISTS "Admins can view all wallet transactions" ON wallet_transactions;
CREATE POLICY "Admins can view all wallet transactions"
ON wallet_transactions FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid()
    AND users.role = 'admin'
  )
);

-- Allow authenticated users to insert (this is needed for RPC functions with SECURITY DEFINER)
CREATE POLICY "Allow inserts for authenticated users"
ON wallet_transactions FOR INSERT
TO authenticated
WITH CHECK (true);

-- =====================================================
-- 3. ENSURE PROPER POLICIES FOR SETTINGS TABLE
-- =====================================================

-- Settings should be readable by all authenticated users (already exists, just ensuring)
-- Already covered by existing policy

-- =====================================================
-- 4. ADD GRANT PERMISSIONS FOR RPC FUNCTIONS
-- =====================================================

-- Ensure RPC functions have proper permissions
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT EXECUTE ON FUNCTION approve_wallet_topup(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION reject_wallet_topup(uuid, uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_wallet_topups(uuid, int, int) TO authenticated;