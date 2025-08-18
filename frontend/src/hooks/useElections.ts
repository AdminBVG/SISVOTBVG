import { useQuery } from '../lib/react-query';
import { useAuth } from '../context/AuthContext';

export interface Election {
  id: number;
  name: string;
  date: string;
  status: string;
}

export const useElections = () => {
  const { token } = useAuth();
  return useQuery<Election[]>({
    queryKey: ['elections'],
    queryFn: async () => {
      const res = await fetch('/elections', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Error al obtener votaciones');
      return res.json();
    },
  });
};
