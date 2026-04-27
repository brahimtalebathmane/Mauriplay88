import { supabase } from '../lib/supabase';
import type { ProductWithStock } from '../types';

/** Loads storefront products for a platform with stock counts (same RPC as legacy platform page). */
export async function fetchPlatformProductsWithStock(platformId: string): Promise<ProductWithStock[]> {
  const { data: productsData, error: productsError } = await supabase
    .from('products')
    .select('*')
    .eq('platform_id', platformId)
    .eq('is_deleted', false)
    .order('price_mru', { ascending: true })
    .order('name', { ascending: true });

  if (productsError) throw productsError;

  const productList = productsData || [];
  if (productList.length === 0) return [];

  const { data: stockData, error: stockError } = await supabase.rpc('get_product_stock_count', {
    p_product_ids: productList.map((p: { id: string }) => p.id),
  });

  if (stockError) {
    console.warn('Stock count RPC failed, showing 0 stock', stockError);
  }

  const stockMap = new Map<string, number>();
  (stockData || []).forEach((row: { product_id: string; stock_count: number }) => {
    stockMap.set(row.product_id, Number(row.stock_count) || 0);
  });

  return productList.map((product: Record<string, unknown> & { id: string }) => ({
    ...product,
    stock_count: stockMap.get(product.id) ?? 0,
  })) as ProductWithStock[];
}
