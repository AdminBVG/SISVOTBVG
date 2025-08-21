import { useQuery } from '../lib/react-query';
import { apiFetch } from '../lib/api';

export interface Assistant {
  id: number;
  identifier: string;
  accionista: string;
  representante?: string | null;
  apoderado?: string | null;
  acciones: number;
  requires_document: boolean;
  document_uploaded: boolean;
}

export const useAssistants = (electionId: number) => {
  return useQuery<Assistant[]>({
    queryKey: ['assistants', electionId],
    queryFn: () => apiFetch<Assistant[]>(`/elections/${electionId}/assistants`),
  });
};
