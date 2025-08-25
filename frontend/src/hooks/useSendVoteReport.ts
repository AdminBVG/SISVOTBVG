import { useMutation } from '../lib/react-query';
import { apiFetch } from '../lib/api';

export const useSendVoteReport = (
  electionId: number,
  onSuccess?: () => void,
  onError?: (err: any) => void,
) =>
  useMutation({
    mutationFn: () =>
      apiFetch(`/elections/${electionId}/vote-report/send`, { method: 'POST' }),
    onSuccess,
    onError,
  });
