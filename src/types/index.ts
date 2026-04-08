export type UserRole = 'admin' | 'user';
export type InventoryStatus = 'available' | 'reserved' | 'pending_approval' | 'sold' | 'returned' | 'compromised';
export type PaymentType = 'wallet' | 'manual';
export type OrderStatus = 'pending' | 'approved' | 'rejected';
export type TransactionType = 'credit' | 'debit';

export interface User {
  id: string;
  phone_number: string;
  wallet_balance: number;
  wallet_active: boolean;
  role: UserRole;
  is_verified: boolean;
  failed_login_attempts: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Platform {
  id: string;
  name: string;
  logo_url: string;
  /** Optional; shown on the public platform page */
  description?: string | null;
  website_url?: string;
  tutorial_video_url?: string;
  is_deleted: boolean;
  created_at: string;
  updated_at: string;
}

export interface Product {
  id: string;
  platform_id: string;
  name: string;
  price_mru: number;
  /** Product logo URL (preferred). DB may also expose logo_url. */
  product_logo_url?: string;
  logo_url?: string;
  is_deleted: boolean;
  created_at: string;
  updated_at: string;
}

export interface Inventory {
  id: string;
  product_id: string;
  code: string;
  status: InventoryStatus;
  reserved_until?: string;
  is_deleted: boolean;
  created_at: string;
  updated_at: string;
}

export interface PaymentMethod {
  id: string;
  name: string;
  account_number: string;
  logo_url?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Order {
  id: string;
  user_id: string;
  inventory_id: string;
  product_id: string;
  price_at_purchase: number;
  payment_type: PaymentType;
  payment_method_name?: string;
  user_payment_number?: string;
  user_name?: string;
  receipt_url?: string;
  transaction_reference?: string;
  status: OrderStatus;
  admin_note?: string;
  created_at: string;
  updated_at: string;
}

export interface WalletTransaction {
  id: string;
  user_id: string;
  type: TransactionType;
  amount: number;
  balance_before: number;
  balance_after: number;
  description: string;
  order_id?: string;
  created_at: string;
}

export interface ProductWithStock extends Product {
  stock_count: number;
}

export interface OrderWithDetails extends Order {
  product: Product;
  inventory: Inventory;
  platform: Platform;
}
