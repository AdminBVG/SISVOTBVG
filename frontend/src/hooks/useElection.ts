import { useQuery } from '../lib/react-query';
import { apiFetch } from '../lib/api';
import { Election } from './useElections';

export const useElection = (id: number) => {
  return useQuery<Election>({
    queryKey: ['election', id],
    queryFn: () => apiFetch<Election>(`/elections/${id}`),
  });
};

