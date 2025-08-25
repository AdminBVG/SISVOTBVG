import React, { createContext, useState, useEffect, useContext } from 'react';
import { useToast } from '../components/ui/toast';

export class QueryClient {
  private listeners = new Map<string, Set<{ refetch: () => void; setData: (d: any) => void }>>();
  private cache = new Map<string, any>();

  subscribe(queryKey: any[], listener: { refetch: () => void; setData: (d: any) => void }) {
    const key = JSON.stringify(queryKey);
    if (!this.listeners.has(key)) {
      this.listeners.set(key, new Set());
    }
    this.listeners.get(key)!.add(listener);
    return () => {
      this.listeners.get(key)!.delete(listener);
    };
  }

  invalidateQueries(opts: { queryKey: any[] }) {
    const prefix = opts.queryKey;
    for (const [key, subs] of this.listeners.entries()) {
      const parsed = JSON.parse(key);
      if (prefix.every((v, i) => parsed[i] === v)) {
        subs.forEach((l) => l.refetch());
      }
    }
  }

  getQueryData<T = any>(queryKey: any[]): T | undefined {
    return this.cache.get(JSON.stringify(queryKey));
  }

  setQueryData(queryKey: any[], data: any) {
    const key = JSON.stringify(queryKey);
    this.cache.set(key, data);
    const subs = this.listeners.get(key);
    subs?.forEach((l) => l.setData(data));
  }

  updateQueriesData(prefixKey: any[], updater: (old: any) => any) {
    const prefix = prefixKey;
    for (const [key, value] of this.cache.entries()) {
      const parsed = JSON.parse(key);
      if (prefix.every((v, i) => parsed[i] === v)) {
        const newData = updater(value);
        this.cache.set(key, newData);
        const subs = this.listeners.get(key);
        subs?.forEach((l) => l.setData(newData));
      }
    }
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
  onSuccess?: (data: TData, variables: TVariables) => void;
  onError?: (err: any) => void;
}

export const useMutation = <TData = any, TVariables = any>(config: MutationConfig<TData, TVariables>) => {
  const [isLoading, setLoading] = useState(false);
  const toast = useToast();

  const mutate = async (vars: TVariables) => {
    try {
      setLoading(true);
      const data = await config.mutationFn(vars);
      config.onSuccess?.(data, vars);
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
  onError?: (err: any) => void;
}

export const useQuery = <TData = any>({ queryKey, queryFn, enabled = true, onError }: QueryConfig<TData>) => {
  const queryClient = useQueryClient();
  const [data, setData] = useState<TData | undefined>(() =>
    queryClient.getQueryData<TData>(queryKey),
  );
  const [error, setError] = useState<any>(null);
  const [isLoading, setLoading] = useState(false);
  const toast = useToast();

  const fetchData = async () => {
    try {
      setLoading(true);
      const res = await queryFn();
      queryClient.setQueryData(queryKey, res);
      setError(null);
    } catch (err: any) {
      setError(err);
      toast(err.message || 'Error');
       onError?.(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (enabled && data === undefined) {
      fetchData();
    }
    const unsubscribe = queryClient.subscribe(queryKey, {
      refetch: fetchData,
      setData: (d: any) => setData(d),
    });
    return () => unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...queryKey, enabled]);

  return { data, error, isLoading, refetch: fetchData };
};
