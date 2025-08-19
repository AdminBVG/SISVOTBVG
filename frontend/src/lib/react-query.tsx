import React, { createContext, useState, useEffect, useContext } from 'react';
import { useToast } from '../components/ui/toast';

export class QueryClient {
  invalidateQueries(_opts: { queryKey: any[] }) {
    // no-op
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
    } catch (err: any) {
      toast(err.message || 'Error');
      config.onError?.(err);
    } finally {
      setLoading(false);
    }
  };

  return { mutate, isLoading };
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...queryKey, enabled]);

  return { data, error, isLoading, refetch: fetchData };
};

