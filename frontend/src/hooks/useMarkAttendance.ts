import { useMutation } from '../lib/react-query';
import { useAuth } from '../context/AuthContext';

interface Payload {
  shareholderId: number;
  status: string;
}

export const useMarkAttendance = (electionId: number, onSuccess?: () => void, onError?: (err:any)=>void) => {
  const { token } = useAuth();
  return useMutation<any, Payload>({
    mutationFn: async ({ shareholderId, status }) => {
      const res = await fetch(`/elections/${electionId}/shareholders/${shareholderId}/attendance`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error('Error al marcar asistencia');
      return res.json();
    },
    onSuccess,
    onError,
  });
};
