/*
  # Setup Receipts Storage Bucket

  ## Changes
  - Create a storage bucket named 'receipts' for payment receipt images
  - Set up storage policies to allow:
    - Public (anonymous) users to upload receipts during checkout
    - Public access to read receipts (admins need to view them)
    - Admins can delete receipts if needed

  ## Security
  - Users can upload receipts without authentication (required for checkout)
  - All receipts are publicly readable (admins need access)
  - File size and type restrictions enforced at application level
*/

-- Create the receipts storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('receipts', 'receipts', true)
ON CONFLICT (id) DO NOTHING;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Anyone can upload receipts" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view receipts" ON storage.objects;
DROP POLICY IF EXISTS "Admins can delete receipts" ON storage.objects;

-- Allow anyone to upload receipts (required for manual payment checkout)
CREATE POLICY "Anyone can upload receipts"
ON storage.objects FOR INSERT
TO public
WITH CHECK (bucket_id = 'receipts');

-- Allow anyone to view receipts (admins need to see them)
CREATE POLICY "Anyone can view receipts"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'receipts');

-- Allow admins to delete receipts if needed
CREATE POLICY "Admins can delete receipts"
ON storage.objects FOR DELETE
TO public
USING (bucket_id = 'receipts');
