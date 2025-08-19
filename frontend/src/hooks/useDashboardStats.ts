import { useQuery } from '../lib/react-query';
import { apiFetch } from '../lib/api';

export interface DashboardStats {
  total: number;
  presencial: number;
  virtual: number;
  ausente: number;
  representado: number;
  capital_suscrito: number;
  capital_presente_directo: number;
  capital_presente_representado: number;
  porcentaje_quorum: number;
}

export const useDashboardStats = (electionId: number) =>
  useQuery<DashboardStats>({
    queryKey: ['dashboard', electionId],
    queryFn: () => apiFetch<DashboardStats>(`/elections/${electionId}/attendance/summary`),
  });
