import React, { createContext, useState, useEffect } from 'react';

export class QueryClient {}

const QueryContext = createContext<QueryClient | null>(null);

export const QueryClientProvider: React.FC<{ client: QueryClient; children: React.ReactNode }> = ({ children }) => (
  <QueryContext.Provider value={null}>{children}</QueryContext.Provider>
);

interface MutationConfig<TData, TVariables> {
  mutationFn: (variables: TVariables) => Promise<TData>;
  onSuccess?: (data: TData) => void;
  onError?: (err: any) => void;
}

export const useMutation = <TData = any, TVariables = any>(config: MutationConfig<TData, TVariables>) => {
  const [isLoading, setLoading] = useState(false);

  const mutate = async (vars: TVariables) => {
    try {
      setLoading(true);
      const data = await config.mutationFn(vars);
      config.onSuccess?.(data);
    } catch (err) {
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

  const fetchData = async () => {
    try {
      setLoading(true);
      const res = await queryFn();
      setData(res);
      setError(null);
    } catch (err) {
      setError(err);
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

