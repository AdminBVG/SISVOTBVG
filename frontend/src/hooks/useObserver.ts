import { useQuery } from '../lib/react-query';
import { apiFetch } from '../lib/api';

export interface ObserverRow {
  code: string;
  name: string;
  estado: string;
  apoderado?: string | null;
  acciones_propias: number;
  acciones_representadas: number;
  total_quorum: number;
}

export const useObserver = (electionId: number) => {
  return useQuery<ObserverRow[]>({
    queryKey: ['observer', electionId],
    queryFn: () => apiFetch<ObserverRow[]>(`/elections/${electionId}/observer`),
  });
};

