import { useMutation } from '../lib/react-query';
import { apiFetch } from '../lib/api';

interface Payload {
  code: string;
  mode: string;
  evidence?: any;
  reason?: string;
}

export const useMarkAttendance = (
  electionId: number,
  onSuccess?: () => void,
  onError?: (err: any) => void
) => {
  return useMutation<any, Payload>({
    mutationFn: ({ code, mode, evidence, reason }) =>
      apiFetch(`/elections/${electionId}/attendance/${code}/mark`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode, evidence, reason }),
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
