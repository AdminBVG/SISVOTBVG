import React, { createContext, useState } from 'react';

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

