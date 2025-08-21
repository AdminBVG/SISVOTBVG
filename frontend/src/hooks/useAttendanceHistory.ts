import { useQuery } from '../lib/react-query';
import { apiFetch } from '../lib/api';

export interface AttendanceHistory {
  id: number;
  from_mode?: string | null;
  to_mode?: string | null;
  from_present?: boolean | null;
  to_present?: boolean | null;
  changed_by: string;
  changed_at: string;
  reason?: string | null;
}

export const useAttendanceHistory = (
  electionId: number,
  code: string,
  enabled: boolean,
) => {
  return useQuery<AttendanceHistory[]>({
    queryKey: ['attendance-history', electionId, code],
    queryFn: () =>
      apiFetch<AttendanceHistory[]>(
        `/elections/${electionId}/attendance/history?code=${code}`,
      ),
    enabled,
  });
};
