import { useState, useEffect, useCallback } from 'react';
import { logger } from '../utils/logger';

interface UseDataFetchOptions<T> {
  fetchFn: () => Promise<T>;
  onSuccess?: (data: T) => void;
  onError?: (error: Error) => void;
  dependencies?: any[];
  autoFetch?: boolean;
}

interface UseDataFetchResult<T> {
  data: T | null;
  loading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

/**
 * Standardized data fetching hook with loading states and error handling
 *
 * @example
 * const { data, loading, error, refetch } = useDataFetch({
 *   fetchFn: async () => {
 *     const { data, error } = await supabase.from('platforms').select('*');
 *     if (error) throw error;
 *     return data;
 *   },
 *   onSuccess: (data) => console.log('Data loaded:', data),
 *   onError: (error) => showToast(error.message, 'error'),
 * });
 */
export function useDataFetch<T>({
  fetchFn,
  onSuccess,
  onError,
  dependencies = [],
  autoFetch = true,
}: UseDataFetchOptions<T>): UseDataFetchResult<T> {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState<boolean>(autoFetch);
  const [error, setError] = useState<Error | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      logger.debug('useDataFetch', 'Fetching data');
      const result = await fetchFn();

      setData(result);
      logger.success('useDataFetch', 'Data fetched successfully');

      if (onSuccess) {
        onSuccess(result);
      }
    } catch (err) {
      const error = err as Error;
      logger.error('useDataFetch', 'Fetch error', error);
      setError(error);

      if (onError) {
        onError(error);
      }
    } finally {
      setLoading(false);
    }
  }, [fetchFn, onSuccess, onError]);

  useEffect(() => {
    if (autoFetch) {
      fetchData();
    }
  }, [autoFetch, ...dependencies]);

  return {
    data,
    loading,
    error,
    refetch: fetchData,
  };
}

/**
 * Hook for mutations (create, update, delete operations)
 */
interface UseMutationOptions<T, V> {
  mutationFn: (variables: V) => Promise<T>;
  onSuccess?: (data: T, variables: V) => void;
  onError?: (error: Error, variables: V) => void;
}

interface UseMutationResult<T, V> {
  mutate: (variables: V) => Promise<T | undefined>;
  loading: boolean;
  error: Error | null;
  data: T | null;
}

/**
 * Standardized mutation hook for create/update/delete operations
 *
 * @example
 * const { mutate, loading } = useMutation({
 *   mutationFn: async (platform) => {
 *     const { data, error } = await supabase
 *       .from('platforms')
 *       .insert(platform)
 *       .select()
 *       .single();
 *     if (error) throw error;
 *     return data;
 *   },
 *   onSuccess: () => showToast('Platform created', 'success'),
 *   onError: (error) => showToast(error.message, 'error'),
 * });
 */
export function useMutation<T, V>({
  mutationFn,
  onSuccess,
  onError,
}: UseMutationOptions<T, V>): UseMutationResult<T, V> {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<Error | null>(null);

  const mutate = async (variables: V): Promise<T | undefined> => {
    setLoading(true);
    setError(null);

    try {
      logger.debug('useMutation', 'Executing mutation', variables);
      const result = await mutationFn(variables);

      setData(result);
      logger.success('useMutation', 'Mutation successful');

      if (onSuccess) {
        onSuccess(result, variables);
      }

      return result;
    } catch (err) {
      const error = err as Error;
      logger.error('useMutation', 'Mutation error', error);
      setError(error);

      if (onError) {
        onError(error, variables);
      }

      return undefined;
    } finally {
      setLoading(false);
    }
  };

  return {
    mutate,
    loading,
    error,
    data,
  };
}
