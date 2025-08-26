import { useQuery, useMutation, useQueryClient } from '../lib/react-query';
import { apiFetch } from '../lib/api';

export interface Ballot {
  id: number;
  election_id: number;
  title: string;
  order: number;
  status: 'OPEN' | 'CLOSED';
}

export interface OptionResult {
  id: number;
  ballot_id: number;
  text: string;
  votes: number;
}

export const useBallots = (electionId: number) => {
  return useQuery<Ballot[]>({
    queryKey: ['ballots', electionId],
    queryFn: () => apiFetch<Ballot[]>(`/elections/${electionId}/ballots`),
    refetchOnMount: 'always',
  });
};

export const usePendingBallots = (electionId: number) => {
  return useQuery<Ballot[]>({
    queryKey: ['pending-ballots', electionId],
    queryFn: () =>
      apiFetch<Ballot[]>(`/elections/${electionId}/ballots/pending`),
  });
};

export const useBallotResults = (ballotId: number, enabled = true) => {
  return useQuery<OptionResult[]>({
    queryKey: ['ballot-results', ballotId],
    queryFn: () => apiFetch<OptionResult[]>(`/ballots/${ballotId}/results`),
    enabled,
  });
};

export const useCastVote = (
  ballotId: number,
  onSuccess?: () => void,
  onError?: (err: any) => void,
) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { option_id: number; attendee_id: number }) =>
      apiFetch(`/ballots/${ballotId}/vote`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['ballot-results', ballotId] });
      onSuccess?.();
    },
    onError,
  });
};

export const useVoteAll = (
  ballotId: number,
  onSuccess?: () => void,
  onError?: (err: any) => void,
) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { option_id: number }) =>
      apiFetch(`/ballots/${ballotId}/vote-all`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['ballot-results', ballotId] });
      onSuccess?.();
    },
    onError,
  });
};

export const useCloseBallot = (
  ballotId: number,
  electionId: number,
  onSuccess?: () => void,
) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () =>
      apiFetch(`/ballots/${ballotId}/close`, { method: 'POST' }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['ballots', electionId] });
      qc.invalidateQueries({ queryKey: ['pending-ballots', electionId] });
      onSuccess?.();
    },
  });
};

export const useReopenBallot = (
  ballotId: number,
  electionId: number,
  onSuccess?: () => void,
) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () =>
      apiFetch(`/ballots/${ballotId}/reopen`, { method: 'POST' }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['ballots', electionId] });
      qc.invalidateQueries({ queryKey: ['pending-ballots', electionId] });
      onSuccess?.();
    },
  });
};

export const useCloseElection = (electionId: number, onSuccess?: () => void) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () =>
      apiFetch(`/elections/${electionId}/close`, { method: 'POST' }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['elections'] });
      qc.invalidateQueries({ queryKey: ['election', electionId] });
      onSuccess?.();
    },
  });
};

export const useStartVoting = (
  electionId: number,
  onSuccess?: () => void,
  onError?: (err: any) => void,
) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => apiFetch(`/elections/${electionId}/start-voting`, { method: 'POST' }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['election', electionId] });
      onSuccess?.();
    },
    onError,
  });
};

export const useCloseVoting = (electionId: number, onSuccess?: () => void) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => apiFetch(`/elections/${electionId}/close-voting`, { method: 'POST' }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['election', electionId] });
      onSuccess?.();
    },
  });
};

