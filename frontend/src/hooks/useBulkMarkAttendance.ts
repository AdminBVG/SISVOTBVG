import { useMutation } from '../lib/react-query';
import { apiFetch } from '../lib/api';

interface Payload {
  codes: string[];
  mode: string;
  evidence?: any;
  reason?: string;
}

export const useBulkMarkAttendance = (
  electionId: number,
  onSuccess?: () => void,
  onError?: (err: any) => void,
) => {
  return useMutation<any, Payload>({
    mutationFn: (payload) =>
      apiFetch(`/elections/${electionId}/attendance/bulk_mark`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      }),
    onSuccess,
    onError: (err) => {
      if ((err as any).status === 403) {
        (err as any).message = 'Registro no habilitado';
      }
      onError?.(err);
    },
  });
};
