import { useMutation } from '../lib/react-query';
import { getItem } from '../lib/storage';

export const useVoteReport = (
  electionId: number,
  onSuccess?: () => void,
  onError?: (err: any) => void,
) =>
  useMutation({
    mutationFn: async () => {
      const base = import.meta.env.VITE_API_URL || '/api';
      const token = getItem('token');
      const res = await fetch(`${base}/elections/${electionId}/vote-report`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) throw new Error('download failed');
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'vote_report.csv';
      a.click();
      window.URL.revokeObjectURL(url);
    },
    onSuccess,
    onError,
  });
