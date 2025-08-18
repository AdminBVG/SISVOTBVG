import { useMutation } from '../lib/react-query';
import { useAuth } from '../context/AuthContext';
import { Election } from './useElections';

interface Payload {
  name: string;
  date: string;
}

export const useCreateElection = (onSuccess?: () => void, onError?: (err:any)=>void) => {
  const { token } = useAuth();
  return useMutation<Election, Payload>({
    mutationFn: async (payload) => {
      const res = await fetch('/elections', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error('Error al crear votación');
      return res.json();
    },
    onSuccess: () => {
      onSuccess?.();
    },
    onError,
  });
};
