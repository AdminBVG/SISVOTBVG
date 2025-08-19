import { useQuery } from '../lib/react-query';
import { apiFetch } from '../lib/api';

export interface AuditLog {
  id: number;
  election_id: number;
  username: string;
  action: string;
  details?: any;
  ip?: string;
  user_agent?: string;
  created_at: string;
}

export const useAuditLogs = (electionId: number) => {
  return useQuery<AuditLog[]>({
    queryKey: ['audit', electionId],
    queryFn: () => apiFetch<AuditLog[]>(`/elections/${electionId}/audit`),
  });
};
