import { useQuery, useMutation, useQueryClient } from '../lib/react-query';
import { apiFetch } from '../lib/api';

export interface Settings {
  smtp_host?: string;
  smtp_port?: number;
  smtp_user?: string;
  smtp_password?: string;
  smtp_from?: string;
}

export const useSettings = () =>
  useQuery<Settings>({
    queryKey: ['settings'],
    queryFn: () => apiFetch<Settings>('/settings'),
  });

export const useUpdateSettings = (onSuccess?: () => void) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Settings) =>
      apiFetch('/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['settings'] });
      onSuccess?.();
    },
  });
};
