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

let mockElection: any;
let mockQuorum = 100;
let mockBallots: any[];
vi.mock('../hooks/useElection', () => ({
  useElection: () => ({ data: mockElection }),
}));
vi.mock('../hooks/useDashboardStats', () => ({
  useDashboardStats: () => ({ data: { porcentaje_quorum: mockQuorum } }),
}));
vi.mock('../hooks/useBallots', () => ({
  useBallots: () => ({ data: mockBallots }),
  useBallotResults: () => ({ data: [{ id: 10, text: 'Sí' }] }),
  useCastVote: (
    _id: number,
    onSuccess?: () => void,
    onError?: (err: any) => void,
  ) => ({
    mutate: (_: any) => {
      mockSuccess ? onSuccess?.() : onError?.(new Error('fail'));
    },
  }),
  useVoteAll: (
    _id: number,
    onSuccess?: () => void,
    onError?: (err: any) => void,
  ) => ({
    mutate: (_: any) => {
      mockSuccess ? onSuccess?.() : onError?.(new Error('fail'));
    },
  }),
  useCloseBallot: (_id: number, onSuccess?: () => void) => ({
    mutate: () => onSuccess?.(),
  }),
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
    vi.clearAllMocks();
    cleanup();
    mockElection = { status: 'OPEN', min_quorum: 0, voting_open: true };
    mockQuorum = 100;
    mockBallots = [{ id: 1, title: 'Q1', status: 'OPEN' }];
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

  it('deshabilita abrir registro si es antes de la hora', () => {
    const future = new Date(Date.now() + 60_000).toISOString();
    mockElection = {
      status: 'OPEN',
      min_quorum: 0,
      voting_open: false,
      registration_start: future,
      demo: false,
    };
    renderPage();
    const btn = screen.getByRole(
      'button',
      { name: 'Abrir registro de votación' },
    ) as HTMLButtonElement;
    expect(btn.disabled).toBe(true);
  });

  it('permite abrir registro en modo demo', () => {
    const future = new Date(Date.now() + 60_000).toISOString();
    mockElection = {
      status: 'OPEN',
      min_quorum: 0,
      voting_open: false,
      registration_start: future,
      demo: true,
    };
    renderPage();
    const btn = screen.getByRole(
      'button',
      { name: 'Abrir registro de votación' },
    ) as HTMLButtonElement;
    expect(btn.disabled).toBe(false);
  });

  it('avanza a la siguiente pregunta después de cerrar', async () => {
    mockBallots = [
      { id: 1, title: 'Q1', status: 'OPEN' },
      { id: 2, title: 'Q2', status: 'OPEN' },
    ];
    renderPage();
    const radio = await screen.findByRole('radio');
    fireEvent.click(radio);
    const btn = screen.getByRole('button', { name: 'Siguiente pregunta' });
    fireEvent.click(btn);
    await screen.findByText('Q2');
  });
});
