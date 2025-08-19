import { useMutation } from '../lib/react-query';
import { apiFetch } from '../lib/api';
import { Election } from './useElections';

interface Payload {
  name: string;
  date: string;
}

export const useCreateElection = (
  onSuccess?: () => void,
  onError?: (err: any) => void
) => {
  return useMutation<Election, Payload>({
    mutationFn: (payload) =>
      apiFetch('/elections', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      }),
    onSuccess: () => {
      onSuccess?.();
    },
    onError,
  });
};
