/*
  # Platforms RLS - ensure read works without auth (no 401)
  Custom auth = no JWT, so policies using auth.uid() block everyone.
  - Public SELECT for non-deleted platforms (so get_platforms and any client read work).
  - Writes go through RPCs (admin_insert_platform, admin_update_platform, admin_delete_platform).
*/

-- Drop existing policies that might block anon read
DROP POLICY IF EXISTS "admin_all_platforms" ON platforms;
DROP POLICY IF EXISTS "user_read_platforms" ON platforms;
DROP POLICY IF EXISTS "Public can view non-deleted platforms" ON platforms;
DROP POLICY IF EXISTS "Anyone can view non-deleted platforms" ON platforms;

-- Allow anyone to read non-deleted platforms (no auth required)
CREATE POLICY "platforms_public_select"
  ON platforms FOR SELECT
  USING (is_deleted = false);

-- Admin write access is via RPCs only (SECURITY DEFINER), so we do not add INSERT/UPDATE/DELETE
-- policies that rely on auth.uid() (would always fail with custom auth).

COMMENT ON POLICY "platforms_public_select" ON platforms IS 'Allow public read of active platforms. Admin writes use RPCs.';
