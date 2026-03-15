import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';

const fetchWalletNotice = async (): Promise<string> => {
  const { data, error } = await supabase
    .from('settings')
    .select('value')
    .eq('key', 'wallet_notice')
    .maybeSingle();

  if (error) throw error;

  return data?.value || 'يرجى التأكد من رفع إيصال الدفع الصحيح. سيتم مراجعة طلبك من قبل الإدارة.';
};

export const useWalletNotice = () => {
  return useQuery({
    queryKey: ['wallet-notice'],
    queryFn: fetchWalletNotice,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });
};
