import { useMutation } from '../lib/react-query';
import { apiFetch } from '../lib/api';
import { User } from './useUsers';

interface Payload {
  username: string;
  password: string;
  role: string;
}

export const useCreateUser = (
  onSuccess?: () => void,
  onError?: (err: any) => void
) => {
  return useMutation<User, Payload>({
    mutationFn: (payload) =>
      apiFetch('/users', {
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
