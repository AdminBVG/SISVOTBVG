import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '../lib/react-query';
import { ToastProvider } from '../components/ui/toast';
import Vote from './Vote';

const toastMock = vi.fn();
vi.mock('../components/ui/toast', () => ({
  useToast: () => toastMock,
  ToastProvider: ({ children }: any) => <div>{children}</div>,
}));

let mockSuccess = true;

vi.mock('../hooks/useElection', () => ({
  useElection: () => ({ data: { status: 'OPEN', min_quorum: 0, voting_open: true } }),
}));
vi.mock('../hooks/useDashboardStats', () => ({
  useDashboardStats: () => ({ data: { porcentaje_quorum: 100 } }),
}));
vi.mock('../hooks/useBallots', () => ({
  usePendingBallots: () => ({ data: [{ id: 1, title: 'Q1' }] }),
  useBallotResults: () => ({ data: [{ id: 10, text: 'Sí' }] }),
  useCastVote: (_id: number, onSuccess?: () => void, onError?: (err: any) => void) => ({
    mutate: (_: any) => {
      mockSuccess ? onSuccess?.() : onError?.(new Error('fail'));
    },
  }),
  useVoteAll: (_id: number, onSuccess?: () => void, onError?: (err: any) => void) => ({
    mutate: (_: any) => {
      mockSuccess ? onSuccess?.() : onError?.(new Error('fail'));
    },
  }),
  useCloseBallot: () => ({ mutate: vi.fn() }),
  useCloseElection: () => ({ mutate: vi.fn() }),
  useStartVoting: () => ({ mutate: vi.fn() }),
  useCloseVoting: () => ({ mutate: vi.fn() }),
}));
vi.mock('../hooks/useShareholders', () => ({
  useShareholders: () => ({
    data: [{ attendee_id: 5, name: 'Alice', attendance_mode: 'PRESENCIAL' }],
  }),
}));

const renderPage = () => {
  const client = new QueryClient();
  return render(
    <MemoryRouter initialEntries={["/votaciones/1/vote"]}>
      <QueryClientProvider client={client}>
        <ToastProvider>
          <Routes>
            <Route path="/votaciones/:id/vote" element={<Vote />} />
          </Routes>
        </ToastProvider>
      </QueryClientProvider>
    </MemoryRouter>
  );
};

describe('Vote page', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    cleanup();
  });

  it('muestra error cuando el voto individual falla', async () => {
    mockSuccess = false;
    renderPage();
    const radio = await screen.findByRole('radio');
    fireEvent.click(radio);
    expect(toastMock).toHaveBeenCalledWith('fail');
  });

  it('registra voto individual exitoso', async () => {
    mockSuccess = true;
    renderPage();
    const radio = await screen.findByRole('radio');
    fireEvent.click(radio);
    expect(toastMock).toHaveBeenCalledWith('Voto registrado');
  });
});

