import { useMutation, useQueryClient } from '../lib/react-query';
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
  const queryClient = useQueryClient();
  return useMutation<any, Payload>({
    mutationFn: ({ code, mode, evidence, reason }) =>
      apiFetch(`/elections/${electionId}/attendance/${code}/mark`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode, evidence, reason }),
      }),
    onSuccess: (_data, vars) => {
      queryClient.updateQueriesData(['shareholders', electionId], (old: any[] | undefined) => {
        if (!old) return old;
        return old.map((s) =>
          s.code === vars.code ? { ...s, attendance_mode: vars.mode } : s,
        );
      });
      queryClient.invalidateQueries({ queryKey: ['shareholders', electionId] });
      onSuccess?.();
    },
    onError: (err) => {
      if ((err as any).status === 403) {
        (err as any).message = 'Registro no habilitado';
      }
      onError?.(err);
    },
  });
};
