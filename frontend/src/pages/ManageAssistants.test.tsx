import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '../lib/react-query';
import { ToastProvider } from '../components/ui/toast';

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return { ...actual, useParams: () => ({ id: '1' }) };
});

vi.mock('../hooks/useAssistants', () => ({
  useAssistants: () => ({
    data: [
      {
        id: 1,
        identifier: '1',
        accionista: 'Acc1',
        representante: null,
        apoderado: 'Ap',
        acciones: 10,
        requires_document: true,
        document_uploaded: false,
      },
      {
        id: 2,
        identifier: '2',
        accionista: 'Acc2',
        representante: null,
        apoderado: 'Ap',
        acciones: 5,
        requires_document: true,
        document_uploaded: true,
      },
    ],
    refetch: vi.fn(),
  }),
}));

vi.mock('../hooks/useImportAssistants', () => ({
  useImportAssistants: () => ({ mutate: vi.fn(), isLoading: false }),
}));

vi.mock('../hooks/useUpdateAssistant', () => ({
  useUpdateAssistant: () => ({ mutate: vi.fn(), isLoading: false }),
}));

vi.mock('../hooks/useDeleteAssistant', () => ({
  useDeleteAssistant: () => ({ mutate: vi.fn(), isLoading: false }),
}));

vi.mock('../hooks/useUploadApoderadoPdf', () => ({
  useUploadApoderadoPdf: () => ({ mutate: vi.fn(), isLoading: false }),
}));

import ManageAssistants from './ManageAssistants';
import { MemoryRouter } from 'react-router-dom';

const renderPage = () => {
  const client = new QueryClient();
  return render(
    <MemoryRouter>
      <QueryClientProvider client={client}>
        <ToastProvider>
          <ManageAssistants />
        </ToastProvider>
      </QueryClientProvider>
    </MemoryRouter>
  );
};

describe('ManageAssistants', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    cleanup();
  });

  it('muestra estados de documento', async () => {
    renderPage();
    expect(await screen.findByText('Subir')).toBeTruthy();
    expect(await screen.findByText('Ver')).toBeTruthy();
  });
});

