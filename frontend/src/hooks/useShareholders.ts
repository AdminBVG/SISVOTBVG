import { useQuery } from '../lib/react-query';
import { useAuth } from '../context/AuthContext';

export interface Shareholder {
  id: number;
  code: string;
  name: string;
  capital?: number;
  attendance?: string;
  proxy?: string;
}

export const useShareholders = (electionId: number, search: string) => {
  const { token } = useAuth();
  return useQuery<Shareholder[]>({
    queryKey: ['shareholders', electionId, search],
    queryFn: async () => {
      const params = search ? `?search=${encodeURIComponent(search)}` : '';
      const res = await fetch(`/elections/${electionId}/shareholders${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Error al cargar accionistas');
      return res.json();
    },
  });
};
