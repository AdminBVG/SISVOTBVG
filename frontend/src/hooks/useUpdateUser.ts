import { useMutation } from '../lib/react-query';
import { apiFetch } from '../lib/api';
import { User } from './useUsers';

interface Payload {
  id: number;
  role?: string;
  password?: string;
}

export const useUpdateUser = (
  onSuccess?: () => void,
  onError?: (err: any) => void
) => {
  return useMutation<User, Payload>({
    mutationFn: ({ id, ...data }) =>
      apiFetch(`/users/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      onSuccess?.();
    },
    onError,
  });
};
