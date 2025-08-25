import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '../lib/react-query';
import { MemoryRouter } from 'react-router-dom';
import { ToastProvider } from '../components/ui/toast';
import Votaciones from './Votaciones';
import * as api from '../lib/api';

vi.mock('../hooks/useUsers', () => ({
  useUsers: () => ({ data: [], isLoading: false }),
}));

let mockRole = 'ADMIN_BVG';
vi.mock('../context/AuthContext', () => ({
  useAuth: () => ({ token: 't', role: mockRole, username: 'u', login: vi.fn(), logout: vi.fn() }),
}));

const renderPage = () => {
  const client = new QueryClient();
  return render(
    <MemoryRouter>
      <QueryClientProvider client={client}>
        <ToastProvider>
          <Votaciones />
        </ToastProvider>
      </QueryClientProvider>
    </MemoryRouter>
  );
};

describe('Votaciones', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    cleanup();
  });

  it('oculta el formulario de creación para registradores', async () => {
    mockRole = 'FUNCIONAL_BVG';
    vi.spyOn(api, 'apiFetch').mockResolvedValue([
      { id: 1, name: 'Elec1', date: '2024-01-01', status: 'OPEN', can_manage_attendance: true },
    ]);
    renderPage();
    expect(await screen.findByText('Elec1')).toBeTruthy();
    expect(screen.queryByText('Nueva votación')).toBeNull();
  });

  it('deshabilita gestionar cuando el registro está cerrado', async () => {
    const past = new Date(Date.now() - 86400000).toISOString();
    mockRole = 'FUNCIONAL_BVG';
    vi.spyOn(api, 'apiFetch').mockResolvedValue([
      {
        id: 2,
        name: 'Elec2',
        date: '2024-01-01',
        status: 'OPEN',
        registration_start: past,
        registration_end: past,
        can_manage_attendance: true,
        can_observe: true,
      },
    ]);
    renderPage();
    const btn = await screen.findByRole('button', { name: /Gestionar asistentes/i });
    expect((btn as HTMLButtonElement).disabled).toBe(true);
    expect(btn.getAttribute('title')).toBe('Registro de asistencia no habilitado');
  });

  it('habilita gestionar antes del inicio del registro', async () => {
    const future = new Date(Date.now() + 86400000).toISOString();
    mockRole = 'FUNCIONAL_BVG';
    vi.spyOn(api, 'apiFetch').mockResolvedValue([
      {
        id: 5,
        name: 'Elec5',
        date: '2024-01-01',
        status: 'OPEN',
        registration_start: future,
        registration_end: new Date(Date.now() + 172800000).toISOString(),
        can_manage_attendance: true,
      },
    ]);
    renderPage();
    const btn = await screen.findByRole('button', { name: /Gestionar asistentes/i });
    expect((btn as HTMLButtonElement).disabled).toBe(false);
  });

  it('oculta observador cuando no tiene permiso', async () => {
    mockRole = 'FUNCIONAL_BVG';
    vi.spyOn(api, 'apiFetch').mockResolvedValue([
      {
        id: 4,
        name: 'Elec4',
        date: '2024-01-01',
        status: 'OPEN',
        can_manage_attendance: true,
        can_observe: false,
      },
    ]);
    renderPage();
    expect(await screen.findByText('Elec4')).toBeTruthy();
    expect(screen.queryByRole('button', { name: /Observador/i })).toBeNull();
  });

  it('permite gestionar asistentes como admin en borrador', async () => {
    mockRole = 'ADMIN_BVG';
    vi.spyOn(api, 'apiFetch').mockResolvedValue([
      { id: 3, name: 'Elec3', date: '2024-01-01', status: 'DRAFT' },
    ]);
    renderPage();
    const btn = await screen.findByRole('button', { name: /Gestionar asistentes/i });
    expect((btn as HTMLButtonElement).disabled).toBe(false);
  });
});
