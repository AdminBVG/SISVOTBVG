import { useMutation } from '../lib/react-query';
import { apiFetch } from '../lib/api';

interface Payload {
  userId: number;
  role?: string;
}

export const useSetElectionRole = (
  electionId: number,
  onSuccess?: () => void,
  onError?: (err: any) => void,
) => {
  return useMutation<any, Payload>({
    mutationFn: ({ userId, role }) => {
      if (!role) {
        return apiFetch(`/elections/${electionId}/users/${userId}`, {
          method: 'DELETE',
        });
      }
      return apiFetch(`/elections/${electionId}/users`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: userId, role }),
      });
    },
    onSuccess,
    onError,
  });
};
