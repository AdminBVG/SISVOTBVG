import { useMutation } from '../lib/react-query';
import { apiFetch } from '../lib/api';
import { Election } from './useElections';

interface Payload {
  name: string;
  description?: string;
  date: string;
  registration_start?: string;
  registration_end?: string;
  attendance_registrars?: number[];
  vote_registrars?: number[];
  questions?: {
    text: string;
    type: string;
    required?: boolean;
    order: number;
    options?: { text: string; value: string }[];
  }[];
}

export const useCreateElection = (
  onSuccess?: () => void,
  onError?: (err: any) => void
) => {
  return useMutation<Election, Payload>({
    mutationFn: (payload) =>
      apiFetch('/elections', {
        method: 'POST',
        body: payload,
      }),
    onSuccess: () => {
      onSuccess?.();
    },
    onError,
  });
};
