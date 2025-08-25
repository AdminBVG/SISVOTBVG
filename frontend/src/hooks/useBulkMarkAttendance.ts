import { useMutation, useQueryClient } from '../lib/react-query';
import { apiFetch } from '../lib/api';

interface Payload {
  codes: string[];
  mode: string;
  evidence?: any;
  reason?: string;
}

export const useBulkMarkAttendance = (
  electionId: number,
  onSuccess?: (data: any) => void,
  onError?: (err: any) => void,
) => {
  const queryClient = useQueryClient();
  return useMutation<any, Payload>({
    mutationFn: (payload) =>
      apiFetch(`/elections/${electionId}/attendance/bulk_mark`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      }),
    onSuccess: (data) => {
      queryClient.updateQueriesData(['shareholders', electionId], (old: any[] | undefined) => {
        if (!old) return old;
        const map = new Map(
          data.updated.map((u: any) => [u.shareholder_id, u.mode]),
        );
        return old.map((s) =>
          map.has(s.id) ? { ...s, attendance_mode: map.get(s.id) } : s,
        );
      });
      queryClient.invalidateQueries({ queryKey: ['shareholders', electionId] });
      queryClient.invalidateQueries({ queryKey: ['dashboard', electionId] });
      onSuccess?.(data);
    },
    onError: (err) => {
      if ((err as any).status === 403) {
        (err as any).message = 'Registro no habilitado';
      }
      onError?.(err);
    },
  });
};
