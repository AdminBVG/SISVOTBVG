import { useMutation } from '../lib/react-query';
import { apiFetch } from '../lib/api';

export const useSendAttendanceReport = (
  electionId: number,
  onSuccess?: () => void,
  onError?: (err: any) => void,
) =>
  useMutation({
    mutationFn: (data: { recipients: string[] }) =>
      apiFetch(`/elections/${electionId}/attendance/report`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      }),
    onSuccess,
    onError,
  });
