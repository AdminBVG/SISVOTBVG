import { useQuery, useMutation, useQueryClient } from '../lib/react-query';
import { apiFetch } from '../lib/api';

export interface Proxy {
  id: number;
  num_doc: string;
  pdf_url: string;
}

export interface ProxyPayload {
  proxy_person_id: number;
  tipo_doc: string;
  num_doc: string;
  fecha_otorg: string;
  fecha_vigencia?: string | null;
  pdf: File;
}

export const useProxies = (electionId: number) => {
  return useQuery<Proxy[]>({
    queryKey: ['proxies', electionId],
    queryFn: () => apiFetch<Proxy[]>(`/elections/${electionId}/proxies`),
  });
};

export const useCreateProxy = (
  electionId: number,
  onSuccess?: () => void,
  onError?: (err: any) => void
) => {
  const queryClient = useQueryClient();
  return useMutation<any, ProxyPayload>({
    mutationFn: (payload) => {
      const form = new FormData();
      form.append(
        'data',
        JSON.stringify({
          proxy_person_id: payload.proxy_person_id,
          tipo_doc: payload.tipo_doc,
          num_doc: payload.num_doc,
          fecha_otorg: payload.fecha_otorg,
          fecha_vigencia: payload.fecha_vigencia,
        })
      );
      form.append('pdf', payload.pdf);
      return apiFetch(`/elections/${electionId}/proxies`, {
        method: 'POST',
        body: form,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['proxies', electionId] });
      onSuccess?.();
    },
    onError,
  });
};

