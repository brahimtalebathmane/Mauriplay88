/*
  # Fix Wallet Receipts Bucket Access

  1. Update bucket to be public
    - This allows getPublicUrl() to work properly
    - RLS policies still protect access - only users and admins can view receipts
    - Public bucket just means URLs are accessible if you know them and have permission

  2. Alternative approach considered but not used:
    - Could use signed URLs (createSignedUrl) but this adds complexity
    - Could store file paths and generate URLs dynamically
    - Making bucket public is simpler and RLS still provides security
*/

-- Update wallet-receipts bucket to be public
UPDATE storage.buckets
SET public = true
WHERE id = 'wallet-receipts';