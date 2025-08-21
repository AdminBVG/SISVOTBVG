import { useMutation } from '../lib/react-query';
import { apiFetch } from '../lib/api';

interface Payload {
  id: number;
}

export const useDeleteAssistant = (
  electionId: number,
  onSuccess?: () => void,
  onError?: (err: any) => void,
) => {
  return useMutation<void, Payload>({
    mutationFn: ({ id }) =>
      apiFetch(`/elections/${electionId}/assistants/${id}`, {
        method: 'DELETE',
      }),
    onSuccess,
    onError,
  });
};
