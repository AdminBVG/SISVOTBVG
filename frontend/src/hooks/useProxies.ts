import { useQuery, useMutation } from '../lib/react-query';
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
  pdf_url: string;
  election_id?: number;
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
  return useMutation<any, ProxyPayload>({
    mutationFn: (payload) =>
      apiFetch(`/elections/${electionId}/proxies`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...payload, election_id: electionId }),
      }),
    onSuccess,
    onError,
  });
};

