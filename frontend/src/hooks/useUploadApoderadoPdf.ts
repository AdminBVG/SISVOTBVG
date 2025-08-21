import { useMutation, useQueryClient } from '../lib/react-query';
import { apiFetch } from '../lib/api';
import { Assistant } from './useAssistants';

interface Payload {
  id: number;
  file: File;
}

export const useUploadApoderadoPdf = (
  electionId: number,
  onSuccess?: () => void,
  onError?: (err: any) => void,
) => {
  const queryClient = useQueryClient();
  return useMutation<Assistant, Payload>({
    mutationFn: ({ id, file }) => {
      const form = new FormData();
      form.append('file', file);
      return apiFetch(`/elections/${electionId}/assistants/${id}/apoderado-pdf`, {
        method: 'POST',
        body: form,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assistants', electionId] });
      onSuccess?.();
    },
    onError,
  });
};
