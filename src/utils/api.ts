import { supabase } from '../lib/supabase';
import { logger } from './logger';
import { parseNumber } from './validation';

/**
 * Standard API response wrapper
 */
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

/**
 * Handle Supabase query errors consistently
 */
export function handleSupabaseError(error: any, context: string): never {
  logger.error('API', `${context} error`, error);

  const message = error?.message || error?.error_description || 'حدث خطأ غير متوقع';

  throw new Error(message);
}

/**
 * Platforms API
 */
export const PlatformsAPI = {
  async getAll() {
    logger.debug('API', 'Fetching all platforms');

    const { data, error } = await supabase
      .from('platforms')
      .select('*')
      .eq('is_deleted', false)
      .order('created_at', { ascending: false });

    if (error) handleSupabaseError(error, 'Fetch platforms');

    return data || [];
  },

  async getById(id: string) {
    logger.debug('API', 'Fetching platform by ID', { id });

    const { data, error } = await supabase
      .from('platforms')
      .select('*')
      .eq('id', id)
      .eq('is_deleted', false)
      .single();

    if (error) handleSupabaseError(error, 'Fetch platform');

    return data;
  },

  async create(platform: { name: string; logo_url: string; website_url?: string; tutorial_video_url?: string; description?: string | null }) {
    logger.debug('API', 'Creating platform', platform);

    const { data, error } = await supabase
      .from('platforms')
      .insert({
        name: platform.name.trim(),
        logo_url: platform.logo_url.trim(),
        website_url: platform.website_url?.trim() || null,
        tutorial_video_url: platform.tutorial_video_url?.trim() || null,
        description: platform.description?.trim() || null,
      })
      .select()
      .single();

    if (error) handleSupabaseError(error, 'Create platform');

    logger.success('API', 'Platform created', { id: data.id });
    return data;
  },

  async update(id: string, platform: Partial<{ name: string; logo_url: string; website_url?: string; tutorial_video_url?: string; description?: string | null }>) {
    logger.debug('API', 'Updating platform', { id, platform });

    const updateData: any = {};
    if (platform.name !== undefined) updateData.name = platform.name.trim();
    if (platform.logo_url !== undefined) updateData.logo_url = platform.logo_url.trim();
    if (platform.website_url !== undefined) updateData.website_url = platform.website_url?.trim() || null;
    if (platform.tutorial_video_url !== undefined) updateData.tutorial_video_url = platform.tutorial_video_url?.trim() || null;
    if (platform.description !== undefined) updateData.description = platform.description?.trim() || null;

    const { data, error } = await supabase
      .from('platforms')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) handleSupabaseError(error, 'Update platform');

    logger.success('API', 'Platform updated', { id });
    return data;
  },

  async delete(id: string) {
    logger.debug('API', 'Deleting platform', { id });

    const { error } = await supabase
      .from('platforms')
      .update({ is_deleted: true })
      .eq('id', id);

    if (error) handleSupabaseError(error, 'Delete platform');

    logger.success('API', 'Platform deleted', { id });
  },
};

/**
 * Products API
 */
export const ProductsAPI = {
  async getAll() {
    logger.debug('API', 'Fetching all products');

    const { data, error } = await supabase
      .from('products')
      .select('*, platforms(name, logo_url)')
      .eq('is_deleted', false)
      .order('platform_id', { ascending: true })
      .order('price_mru', { ascending: true })
      .order('name', { ascending: true });

    if (error) handleSupabaseError(error, 'Fetch products');

    return data || [];
  },

  async getByPlatform(platformId: string) {
    logger.debug('API', 'Fetching products by platform', { platformId });

    const { data, error } = await supabase
      .from('products')
      .select('*')
      .eq('platform_id', platformId)
      .eq('is_deleted', false)
      .order('price_mru', { ascending: true })
      .order('name', { ascending: true });

    if (error) handleSupabaseError(error, 'Fetch products by platform');

    return data || [];
  },

  async getById(id: string) {
    logger.debug('API', 'Fetching product by ID', { id });

    const { data, error } = await supabase
      .from('products')
      .select('*, platforms(*)')
      .eq('id', id)
      .eq('is_deleted', false)
      .single();

    if (error) handleSupabaseError(error, 'Fetch product');

    return data;
  },

  async create(product: { platform_id: string; name: string; price_mru: string | number; logo_url?: string }) {
    logger.debug('API', 'Creating product', product);

    const { data, error } = await supabase
      .from('products')
      .insert({
        platform_id: product.platform_id,
        name: product.name.trim(),
        price_mru: parseNumber(product.price_mru, 2),
        logo_url: product.logo_url?.trim() || null,
      })
      .select()
      .single();

    if (error) handleSupabaseError(error, 'Create product');

    logger.success('API', 'Product created', { id: data.id });
    return data;
  },

  async update(id: string, product: Partial<{ name: string; price_mru: string | number; logo_url?: string }>) {
    logger.debug('API', 'Updating product', { id, product });

    const updateData: any = {};
    if (product.name !== undefined) updateData.name = product.name.trim();
    if (product.price_mru !== undefined) updateData.price_mru = parseNumber(product.price_mru, 2);
    if (product.logo_url !== undefined) updateData.logo_url = product.logo_url?.trim() || null;

    const { data, error } = await supabase
      .from('products')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) handleSupabaseError(error, 'Update product');

    logger.success('API', 'Product updated', { id });
    return data;
  },

  async delete(id: string) {
    logger.debug('API', 'Deleting product', { id });

    const { error } = await supabase
      .from('products')
      .update({ is_deleted: true })
      .eq('id', id);

    if (error) handleSupabaseError(error, 'Delete product');

    logger.success('API', 'Product deleted', { id });
  },
};

/**
 * Payment Methods API
 */
export const PaymentMethodsAPI = {
  async getAll() {
    logger.debug('API', 'Fetching all payment methods');

    const { data, error } = await supabase
      .from('payment_methods')
      .select('*')
      .order('name');

    if (error) handleSupabaseError(error, 'Fetch payment methods');

    return data || [];
  },

  async getActive() {
    logger.debug('API', 'Fetching active payment methods');

    const { data, error } = await supabase
      .from('payment_methods')
      .select('*')
      .eq('is_active', true)
      .order('name');

    if (error) handleSupabaseError(error, 'Fetch active payment methods');

    return data || [];
  },

  async create(method: { name: string; account_number: string; logo_url?: string }) {
    logger.debug('API', 'Creating payment method', method);

    const { data, error } = await supabase
      .from('payment_methods')
      .insert({
        name: method.name.trim(),
        account_number: method.account_number.trim(),
        logo_url: method.logo_url?.trim() || null,
        is_active: true,
      })
      .select()
      .single();

    if (error) handleSupabaseError(error, 'Create payment method');

    logger.success('API', 'Payment method created', { id: data.id });
    return data;
  },

  async update(id: string, method: Partial<{ name: string; account_number: string; logo_url?: string; is_active: boolean }>) {
    logger.debug('API', 'Updating payment method', { id, method });

    const updateData: any = {};
    if (method.name !== undefined) updateData.name = method.name.trim();
    if (method.account_number !== undefined) updateData.account_number = method.account_number.trim();
    if (method.logo_url !== undefined) updateData.logo_url = method.logo_url?.trim() || null;
    if (method.is_active !== undefined) updateData.is_active = method.is_active;

    const { data, error } = await supabase
      .from('payment_methods')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) handleSupabaseError(error, 'Update payment method');

    logger.success('API', 'Payment method updated', { id });
    return data;
  },

  async delete(id: string) {
    logger.debug('API', 'Deleting payment method', { id });

    const { error } = await supabase
      .from('payment_methods')
      .delete()
      .eq('id', id);

    if (error) handleSupabaseError(error, 'Delete payment method');

    logger.success('API', 'Payment method deleted', { id });
  },
};

/**
 * Inventory API
 */
export const InventoryAPI = {
  async getByProduct(productId: string) {
    logger.debug('API', 'Fetching inventory by product', { productId });

    const { data, error } = await supabase
      .from('inventory')
      .select('*')
      .eq('product_id', productId)
      .eq('is_deleted', false)
      .order('created_at', { ascending: true });

    if (error) handleSupabaseError(error, 'Fetch inventory');

    return data || [];
  },

  async create(inventory: { product_id: string; code: string }) {
    logger.debug('API', 'Creating inventory item', inventory);

    const { data, error } = await supabase
      .from('inventory')
      .insert({
        product_id: inventory.product_id,
        code: inventory.code.trim(),
        status: 'available',
      })
      .select()
      .single();

    if (error) handleSupabaseError(error, 'Create inventory');

    logger.success('API', 'Inventory item created', { id: data.id });
    return data;
  },

  async delete(id: string) {
    logger.debug('API', 'Deleting inventory item', { id });

    const { error } = await supabase
      .from('inventory')
      .update({ is_deleted: true })
      .eq('id', id);

    if (error) handleSupabaseError(error, 'Delete inventory');

    logger.success('API', 'Inventory item deleted', { id });
  },
};

/**
 * Storage API
 */
export const StorageAPI = {
  async uploadReceipt(file: File, orderId: string, bucket: 'receipts' | 'wallet-receipts' = 'receipts'): Promise<string> {
    logger.debug('API', 'Uploading receipt', { orderId, bucket });

    const fileExt = file.name.split('.').pop();
    const fileName = `${orderId}.${fileExt}`;

    const { error: uploadError } = await supabase.storage
      .from(bucket)
      .upload(fileName, file, {
        upsert: true,
        contentType: file.type,
      });

    if (uploadError) handleSupabaseError(uploadError, 'Upload receipt');

    const { data } = supabase.storage.from(bucket).getPublicUrl(fileName);

    logger.success('API', 'Receipt uploaded', { url: data.publicUrl });
    return data.publicUrl;
  },

  async deleteReceipt(fileName: string, bucket: 'receipts' | 'wallet-receipts' = 'receipts') {
    logger.debug('API', 'Deleting receipt', { fileName, bucket });

    const { error } = await supabase.storage.from(bucket).remove([fileName]);

    if (error) handleSupabaseError(error, 'Delete receipt');

    logger.success('API', 'Receipt deleted', { fileName });
  },
};
