import { useQuery } from '../lib/react-query';
import { apiFetch } from '../lib/api';

export interface Shareholder {
  id: number;
  code: string;
  name: string;
  document: string;
  email?: string;
  actions: number;
  status: string;
  attendance_mode?: string | null;
}

export const useShareholders = (electionId: number, search: string) => {
  return useQuery<Shareholder[]>({
    queryKey: ['shareholders', electionId, search],
    queryFn: () => {
      const params = search ? `?q=${encodeURIComponent(search)}` : '';
      return apiFetch<Shareholder[]>(`/elections/${electionId}/shareholders${params}`);
    },
  });
};
