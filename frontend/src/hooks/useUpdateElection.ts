import { useMutation } from '../lib/react-query';
import { apiFetch } from '../lib/api';
import { Election } from './useElections';

interface Payload {
  id: number;
  name?: string;
  date?: string;
}

export const useUpdateElection = (
  onSuccess?: () => void,
  onError?: (err: any) => void
) => {
  return useMutation<Election, Payload>({
    mutationFn: ({ id, ...payload }) =>
      apiFetch(`/elections/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      }),
    onSuccess: () => {
      onSuccess?.();
    },
    onError,
  });
};
