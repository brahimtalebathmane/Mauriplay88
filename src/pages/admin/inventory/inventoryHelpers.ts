import type { InventoryStatus } from '../../../types';

export interface AdminInventoryRow {
  id: string;
  product_id: string;
  product_name: string;
  platform_name: string;
  /** Present after migration 20260427153000; join client-side if missing */
  platform_id?: string;
  code: string;
  status: InventoryStatus | string;
  created_at: string;
}

export function parseCodesFromInput(raw: string): string[] {
  const lines = raw.split(/\r?\n/).map((c) => c.trim()).filter((c) => c.length > 0);
  const seen = new Set<string>();
  const out: string[] = [];
  for (const line of lines) {
    const key = line.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(line);
  }
  return out;
}

export function findCodesAlreadyInProduct(codes: string[], existingCodes: string[]): string[] {
  const existingLower = new Set(existingCodes.map((c) => c.trim().toLowerCase()));
  return codes.filter((c) => existingLower.has(c.trim().toLowerCase()));
}

export function getStatusColor(status: string) {
  switch (status) {
    case 'available':
      return 'bg-green-500/20 text-green-400';
    case 'reserved':
      return 'bg-yellow-500/20 text-yellow-400';
    case 'sold':
      return 'bg-red-500/20 text-red-400';
    default:
      return 'bg-gray-500/20 text-gray-400';
  }
}

export function getStatusText(status: string) {
  switch (status) {
    case 'available':
      return 'متاح';
    case 'reserved':
      return 'محجوز';
    case 'sold':
      return 'مباع';
    case 'pending_approval':
      return 'قيد المراجعة';
    case 'returned':
      return 'مُرجع';
    case 'compromised':
      return 'معطوب';
    default:
      return status;
  }
}

export const INVENTORY_STATUS_OPTIONS: { value: InventoryStatus; label: string }[] = [
  { value: 'available', label: 'متاح' },
  { value: 'reserved', label: 'محجوز' },
  { value: 'pending_approval', label: 'قيد المراجعة' },
  { value: 'sold', label: 'مباع' },
  { value: 'returned', label: 'مُرجع' },
  { value: 'compromised', label: 'معطوب' },
];
