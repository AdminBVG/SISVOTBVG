import { useQuery } from '../lib/react-query';
import { apiFetch } from '../lib/api';

export interface Election {
  id: number;
  name: string;
  date: string;
  status: string;
  registration_start?: string;
  registration_end?: string;
}

export const useElections = () => {
  return useQuery<Election[]>({
    queryKey: ['elections'],
    queryFn: () => apiFetch<Election[]>('/elections'),
  });
};
