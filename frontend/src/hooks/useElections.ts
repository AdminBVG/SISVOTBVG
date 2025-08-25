import { useQuery } from '../lib/react-query';
import { apiFetch } from '../lib/api';

export interface Election {
  id: number;
  name: string;
  date: string;
  status: string;
  registration_start?: string;
  registration_end?: string;
  can_manage_attendance?: boolean;
  can_manage_votes?: boolean;
  min_quorum?: number;
  voting_open?: boolean;
  voting_opened_at?: string;
  demo?: boolean;
}

export const useElections = () => {
  return useQuery<Election[]>({
    queryKey: ['elections'],
    queryFn: () => apiFetch<Election[]>('/elections'),
  });
};
