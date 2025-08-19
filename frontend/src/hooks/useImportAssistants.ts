import { useMutation, useQueryClient } from '../lib/react-query';
import { apiFetch } from '../lib/api';

export const useImportAssistants = (
  electionId: number,
  onSuccess?: () => void,
  onError?: (err: any) => void,
) => {
  const queryClient = useQueryClient();
  return useMutation<any, File>({
    mutationFn: (file) => {
      const form = new FormData();
      form.append('file', file);
      return apiFetch(`/elections/${electionId}/assistants/import-excel`, {
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
