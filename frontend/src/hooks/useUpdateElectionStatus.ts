import { useMutation } from '../lib/react-query';
import { apiFetch } from '../lib/api';
import { Election } from './useElections';

interface Payload {
  id: number;
  status: 'DRAFT' | 'OPEN' | 'CLOSED';
}

export const useUpdateElectionStatus = (
  onSuccess?: () => void,
  onError?: (err: any) => void
) => {
  return useMutation<Election, Payload>({
    mutationFn: ({ id, status }) =>
      apiFetch(`/elections/${id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      }),
    onSuccess: () => {
      onSuccess?.();
    },
    onError,
  });
};
