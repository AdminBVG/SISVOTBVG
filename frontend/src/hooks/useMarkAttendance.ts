import { useMutation } from '../lib/react-query';
import { apiFetch } from '../lib/api';

interface Payload {
  shareholderId: number;
  status: string;
}

export const useMarkAttendance = (
  electionId: number,
  onSuccess?: () => void,
  onError?: (err: any) => void
) => {
  return useMutation<any, Payload>({
    mutationFn: ({ shareholderId, status }) =>
      apiFetch(`/elections/${electionId}/shareholders/${shareholderId}/attendance`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      }),
    onSuccess,
    onError,
  });
};
