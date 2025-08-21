import { useMutation } from '../lib/react-query';
import { apiFetch } from '../lib/api';
import { Assistant } from './useAssistants';

interface Payload {
  id: number;
  identifier?: string;
  accionista?: string;
  representante?: string | null;
  apoderado?: string | null;
  acciones?: number;
}

export const useUpdateAssistant = (
  electionId: number,
  onSuccess?: () => void,
  onError?: (err: any) => void,
) => {
  return useMutation<Assistant, Payload>({
    mutationFn: ({ id, ...data }) =>
      apiFetch(`/elections/${electionId}/assistants/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      }),
    onSuccess,
    onError,
  });
};
