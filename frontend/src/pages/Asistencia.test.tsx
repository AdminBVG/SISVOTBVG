import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, cleanup, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '../lib/react-query';
import { ToastProvider } from '../components/ui/toast';
import Asistencia from './Asistencia';

const apiFetchMock = vi.fn();
vi.mock('../lib/api', () => ({
  apiFetch: (path: string, init?: RequestInit) => apiFetchMock(path, init),
}));

vi.mock('../hooks/useBulkMarkAttendance', () => ({
  useBulkMarkAttendance: () => ({ mutate: vi.fn(), isLoading: false }),
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
    apiFetchMock.mockReset();
  });

  it('muestra aviso cuando el registro está bloqueado', async () => {
    apiFetchMock.mockRejectedValueOnce({ status: 403, message: 'Forbidden' });
    renderPage();
    await screen.findByText('No autorizado para registrar asistencia');
    expect(screen.queryByRole('checkbox')).toBeNull();
  });

  it('actualiza el select inmediatamente al marcar asistencia', async () => {
    let shareholders = [
      {
        id: 1,
        code: 'SH1',
        name: 'Alice',
        document: 'D1',
        email: 'a@example.com',
        actions: 10,
        status: 'OK',
        attendance_mode: 'AUSENTE',
      },
    ];
    apiFetchMock.mockImplementation((path: string, init?: RequestInit) => {
      if (path.includes('/attendance/') && init?.method === 'POST') {
        const body = JSON.parse(init.body as string);
        shareholders[0].attendance_mode = body.mode;
        return Promise.resolve({});
      }
      if (path.includes('/shareholders')) {
        return Promise.resolve(shareholders);
      }
      return Promise.resolve({});
    });
    renderPage();
    const select = await screen.findByRole('combobox');
    fireEvent.change(select, { target: { value: 'PRESENCIAL' } });
    await waitFor(() =>
      expect((screen.getByRole('combobox') as HTMLSelectElement).value).toBe(
        'PRESENCIAL',
      ),
    );
  });

  it('muestra quien registró en historial', async () => {
    const shareholders = [
      {
        id: 1,
        code: 'SH1',
        name: 'Alice',
        document: 'D1',
        email: 'a@example.com',
        actions: 10,
        status: 'OK',
        attendance_mode: 'AUSENTE',
      },
    ];
    apiFetchMock.mockImplementation((path: string) => {
      if (path.includes('/attendance/history')) {
        return Promise.resolve([
          {
            id: 1,
            attendance_id: 1,
            from_mode: 'AUSENTE',
            to_mode: 'PRESENCIAL',
            changed_by: 'AdminBVG',
            changed_at: '2024-01-01T00:00:00Z',
            reason: null,
          },
        ]);
      }
      return Promise.resolve(shareholders);
    });
    renderPage();
    const btn = await screen.findByText('Ver');
    fireEvent.click(btn);
    expect(await screen.findByText('AdminBVG')).toBeTruthy();
  });
});

