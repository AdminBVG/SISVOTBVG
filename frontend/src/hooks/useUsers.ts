import { useQuery } from '../lib/react-query';
import { apiFetch } from '../lib/api';

export interface User {
  id: number;
  username: string;
  role: string;
}

export const useUsers = (enabled = true) => {
  return useQuery<User[]>({
    queryKey: ['users'],
    queryFn: () => apiFetch<User[]>('/users'),
    enabled,
  });
};
