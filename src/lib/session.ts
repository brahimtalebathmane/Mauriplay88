import { supabase } from './supabase';

/**
 * After phone+PIN login, mints a project JWT via Edge Function so Realtime RLS applies.
 */
export async function establishSupabaseAuthSession(phoneNumber: string, pin: string): Promise<boolean> {
  const { data, error } = await supabase.functions.invoke<{
    success?: boolean;
    access_token?: string;
    refresh_token?: string;
    message?: string;
  }>('issue-session', {
    body: { phone_number: phoneNumber, pin },
  });

  if (error) {
    console.warn('[session] issue-session invoke error', error);
    return false;
  }
  if (!data?.success || !data.access_token) {
    console.warn('[session] issue-session rejected', data?.message);
    return false;
  }

  const { error: sessionError } = await supabase.auth.setSession({
    access_token: data.access_token,
    refresh_token: data.refresh_token ?? data.access_token,
  });
  if (sessionError) {
    console.warn('[session] setSession failed', sessionError);
    return false;
  }
  return true;
}
