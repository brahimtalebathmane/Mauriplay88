import { supabase } from './supabase';
import { logger } from '../utils/logger';

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
    logger.warn('session', 'issue-session invoke error', error);
    return false;
  }
  if (!data?.success || !data.access_token) {
    logger.warn('session', 'issue-session rejected', { message: data?.message });
    return false;
  }

  const { error: sessionError } = await supabase.auth.setSession({
    access_token: data.access_token,
    refresh_token: data.refresh_token ?? data.access_token,
  });
  if (sessionError) {
    logger.warn('session', 'setSession failed', sessionError);
    return false;
  }
  logger.debug('session', 'Supabase JWT established for Realtime / Edge Functions');
  return true;
}
