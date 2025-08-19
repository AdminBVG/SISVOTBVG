import { useMutation } from '../lib/react-query';
import { apiFetch } from '../lib/api';

interface Payload {
  id: number;
}

export const useDeleteUser = (
  onSuccess?: () => void,
  onError?: (err: any) => void
) => {
  return useMutation<void, Payload>({
    mutationFn: ({ id }) =>
      apiFetch(`/users/${id}`, {
        method: 'DELETE',
      }),
    onSuccess: () => {
      onSuccess?.();
    },
    onError,
  });
};
