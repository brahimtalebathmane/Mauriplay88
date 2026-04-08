import { FunctionsHttpError } from '@supabase/supabase-js';

type InvokeBody = { success?: boolean; message?: string };

/**
 * Edge functions that return 4xx set `error` on invoke(); the JSON body (message) is on error.context.
 */
export async function getFunctionsInvokeMessage(
  error: unknown,
  data: InvokeBody | null
): Promise<string> {
  if (data?.message) return data.message;
  if (error instanceof FunctionsHttpError) {
    try {
      const body = (await error.context.json()) as InvokeBody;
      if (body?.message) return body.message;
    } catch {
      /* ignore */
    }
  }
  if (error instanceof Error) return error.message;
  return 'حدث خطأ';
}
