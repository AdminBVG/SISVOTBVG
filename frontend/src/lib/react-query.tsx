import React, { createContext, useState, useEffect, useContext } from 'react';
import { useToast } from '../components/ui/toast';

export class QueryClient {
  private listeners = new Map<string, Set<() => void>>();

  subscribe(queryKey: any[], cb: () => void) {
    const key = JSON.stringify(queryKey);
    if (!this.listeners.has(key)) {
      this.listeners.set(key, new Set());
    }
    this.listeners.get(key)!.add(cb);
    return () => {
      this.listeners.get(key)!.delete(cb);
    };
  }

  invalidateQueries(opts: { queryKey: any[] }) {
    const key = JSON.stringify(opts.queryKey);
    const subs = this.listeners.get(key);
    subs?.forEach((cb) => cb());
  }
}

const QueryContext = createContext<QueryClient | null>(null);

export const QueryClientProvider: React.FC<{ client: QueryClient; children: React.ReactNode }> = ({
  client,
  children,
}) => <QueryContext.Provider value={client}>{children}</QueryContext.Provider>;

export const useQueryClient = () => {
  const client = useContext(QueryContext);
  if (!client) {
    throw new Error('useQueryClient must be used within a QueryClientProvider');
  }
  return client;
};

interface MutationConfig<TData, TVariables> {
  mutationFn: (variables: TVariables) => Promise<TData>;
  onSuccess?: (data: TData) => void;
  onError?: (err: any) => void;
}

export const useMutation = <TData = any, TVariables = any>(config: MutationConfig<TData, TVariables>) => {
  const [isLoading, setLoading] = useState(false);
  const toast = useToast();

  const mutate = async (vars: TVariables) => {
    try {
      setLoading(true);
      const data = await config.mutationFn(vars);
      config.onSuccess?.(data);
      return data;
    } catch (err: any) {
      toast(err.message || 'Error');
      config.onError?.(err);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return { mutate, mutateAsync: mutate, isLoading };
};

interface QueryConfig<TData> {
  queryKey: any[];
  queryFn: () => Promise<TData>;
  enabled?: boolean;
}

export const useQuery = <TData = any>({ queryKey, queryFn, enabled = true }: QueryConfig<TData>) => {
  const [data, setData] = useState<TData | undefined>();
  const [error, setError] = useState<any>(null);
  const [isLoading, setLoading] = useState(false);
  const toast = useToast();
  const queryClient = useQueryClient();

  const fetchData = async () => {
    try {
      setLoading(true);
      const res = await queryFn();
      setData(res);
      setError(null);
    } catch (err: any) {
      setError(err);
      toast(err.message || 'Error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (enabled) {
      fetchData();
    }
    const unsubscribe = queryClient.subscribe(queryKey, fetchData);
    return () => unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...queryKey, enabled]);

  return { data, error, isLoading, refetch: fetchData };
};

