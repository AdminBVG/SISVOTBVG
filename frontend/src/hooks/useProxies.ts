import { useQuery, useMutation } from '../lib/react-query';
import { useAuth } from '../context/AuthContext';

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
  const { token } = useAuth();
  return useQuery<Proxy[]>({
    queryKey: ['proxies', electionId],
    queryFn: async () => {
      const res = await fetch(`/elections/${electionId}/proxies`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Error al cargar poderes');
      return res.json();
    },
  });
};

export const useCreateProxy = (
  electionId: number,
  onSuccess?: () => void,
  onError?: (err: any) => void
) => {
  const { token } = useAuth();
  return useMutation<any, ProxyPayload>({
    mutationFn: async (payload) => {
      const res = await fetch(`/elections/${electionId}/proxies`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ ...payload, election_id: electionId }),
      });
      if (!res.ok) throw new Error('Error al crear poder');
      return res.json();
    },
    onSuccess,
    onError,
  });
};

