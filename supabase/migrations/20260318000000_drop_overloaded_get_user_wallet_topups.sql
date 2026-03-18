/*
  Fix PGRST203 "Could not choose the best candidate function" for get_user_wallet_topups.

  PostgREST cannot resolve overloaded functions reliably when calling with partial params.
  This project has:
    - get_user_wallet_topups(p_user_id uuid)
    - get_user_wallet_topups(p_user_id uuid, p_limit int, p_offset int)

  The frontend calls the 1-arg version, so we drop the 3-arg overload to remove ambiguity.
*/

DROP FUNCTION IF EXISTS public.get_user_wallet_topups(uuid, integer, integer);

