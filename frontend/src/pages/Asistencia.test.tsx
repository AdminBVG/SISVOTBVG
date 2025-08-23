import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '../lib/react-query';
import { ToastProvider } from '../components/ui/toast';
import Asistencia from './Asistencia';

let called = false;
vi.mock('../hooks/useShareholders', () => ({
  useShareholders: (_id: number, _s: string, onError: any) => {
    if (!called) {
      onError({ status: 403, message: 'Forbidden' });
      called = true;
    }
    return { data: [], isLoading: false, error: null, refetch: vi.fn() };
  },
}));
vi.mock('../hooks/useMarkAttendance', () => ({
  useMarkAttendance: () => ({ mutate: vi.fn() }),
}));
vi.mock('../hooks/useBulkMarkAttendance', () => ({
  useBulkMarkAttendance: () => ({ mutate: vi.fn(), isLoading: false }),
}));
vi.mock('../hooks/useAttendanceHistory', () => ({
  useAttendanceHistory: () => ({ data: [] }),
}));
vi.mock('../hooks/useSendAttendanceReport', () => ({
  useSendAttendanceReport: () => ({ mutate: vi.fn(), isLoading: false }),
}));
vi.mock('../components/ui/toast', async () => {
  const actual = await vi.importActual<typeof import('../components/ui/toast')>(
    '../components/ui/toast'
  );
  return { ...actual, useToast: () => vi.fn() };
});

const renderPage = () => {
  const client = new QueryClient();
  return render(
    <MemoryRouter initialEntries={["/1"]}>
      <Routes>
        <Route
          path="/:id"
          element={
            <QueryClientProvider client={client}>
              <ToastProvider>
                <Asistencia />
              </ToastProvider>
            </QueryClientProvider>
          }
        />
      </Routes>
    </MemoryRouter>
  );
};

describe('Asistencia', () => {
  beforeEach(() => {
    cleanup();
  });

  it('muestra aviso cuando el registro está bloqueado', async () => {
    renderPage();
    const alert = await screen.findByRole('alert');
    expect(alert.textContent).toContain('Registro de asistencia no habilitado');
    const chk = await screen.findByRole('checkbox');
    expect((chk as HTMLInputElement).disabled).toBe(true);
  });
});

