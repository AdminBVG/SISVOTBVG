import { useQuery } from '../lib/react-query';
import { apiFetch } from '../lib/api';

export interface Shareholder {
  id: number;
  code: string;
  name: string;
  capital?: number;
  attendance?: string;
  proxy?: string;
}

export const useShareholders = (electionId: number, search: string) => {
  return useQuery<Shareholder[]>({
    queryKey: ['shareholders', electionId, search],
    queryFn: () => {
      const params = search ? `?search=${encodeURIComponent(search)}` : '';
      return apiFetch<Shareholder[]>(`/elections/${electionId}/shareholders${params}`);
    },
  });
};
