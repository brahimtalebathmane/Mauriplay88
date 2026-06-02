import { supabase } from '../lib/supabase';

const PRODUCTS_PAGE_SIZE = 1000;

/** Fetches all non-deleted products for the given platforms (paginates past PostgREST max_rows). */
export async function fetchStorefrontProductsByPlatform(
  platformIds: string[],
): Promise<{ id: string; platform_id: string }[]> {
  if (platformIds.length === 0) return [];

  const rows: { id: string; platform_id: string }[] = [];
  let from = 0;

  while (true) {
    const to = from + PRODUCTS_PAGE_SIZE - 1;
    const { data, error } = await supabase
      .from('products')
      .select('id, platform_id')
      .in('platform_id', platformIds)
      .eq('is_deleted', false)
      .order('id', { ascending: true })
      .range(from, to);

    if (error) throw error;

    const page = (data as { id: string; platform_id: string }[] | null) ?? [];
    rows.push(...page);

    if (page.length < PRODUCTS_PAGE_SIZE) break;
    from += PRODUCTS_PAGE_SIZE;
  }

  return rows;
}
