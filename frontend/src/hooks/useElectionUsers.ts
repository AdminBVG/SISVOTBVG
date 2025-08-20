import { useQuery } from '../lib/react-query';
import { apiFetch } from '../lib/api';

export interface ElectionUser {
  id: number;
  user_id: number;
  username: string;
  role: string;
}

export const useElectionUsers = (electionId: number) => {
  return useQuery<ElectionUser[]>({
    queryKey: ['election-users', electionId],
    queryFn: () => apiFetch<ElectionUser[]>(`/elections/${electionId}/users`),
  });
};
