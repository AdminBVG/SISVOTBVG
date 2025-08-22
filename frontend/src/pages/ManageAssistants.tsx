import React, { useState, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import Card from '../components/ui/card';
import Button from '../components/ui/button';
import Input from '../components/ui/input';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '../components/ui/table';
import { useToast } from '../components/ui/toast';
import { useAssistants, Assistant } from '../hooks/useAssistants';
import { useImportAssistants } from '../hooks/useImportAssistants';
import { useUpdateAssistant } from '../hooks/useUpdateAssistant';
import { useDeleteAssistant } from '../hooks/useDeleteAssistant';
import { useUploadApoderadoPdf } from '../hooks/useUploadApoderadoPdf';
import { getItem } from '../lib/storage';

const EditIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} {...props}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M16 3l5 5L8 21H3v-5L16 3z" />
  </svg>
);

const TrashIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} {...props}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M3 6h18M8 6V4h8v2m2 0v14a2 2 0 01-2 2H8a2 2 0 01-2-2V6h12z" />
  </svg>
);

const ManageAssistants: React.FC = () => {
  const { id } = useParams();
  const electionId = Number(id);
  const toast = useToast();
  const [file, setFile] = useState<File | null>(null);
  const [search, setSearch] = useState('');
  const [sortConfig, setSortConfig] = useState<
    { key: keyof Assistant; direction: 'asc' | 'desc' } | null
  >(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);

  const { data: assistants, refetch } = useAssistants(electionId);
  const importMutation = useImportAssistants(
    electionId,
    () => {
      toast('Asistentes cargados');
      refetch();
    },
    (err) => toast(err.message),
  );
  const updateMutation = useUpdateAssistant(
    electionId,
    () => {
      toast('Asistente actualizado');
      setEditingId(null);
      refetch();
    },
    (err) => toast(err.message),
  );
  const deleteMutation = useDeleteAssistant(
    electionId,
    () => {
      toast('Asistente eliminado');
      refetch();
    },
    (err) => toast(err.message),
  );

  const uploadMutation = useUploadApoderadoPdf(
    electionId,
    () => {
      toast('Documento cargado');
      refetch();
    },
    (err) => toast(err.message),
  );

  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<Partial<Assistant>>({});

  const startEdit = (a: Assistant) => {
    setEditingId(a.id);
    setForm(a);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setForm({});
  };

  const saveEdit = () => {
    if (editingId === null) return;
    updateMutation.mutate({
      id: editingId,
      identifier: form.identifier,
      accionista: form.accionista,
      representante: form.representante || null,
      apoderado: form.apoderado || null,
      acciones: form.acciones,
    });
  };

  const handleDelete = (id: number) => {
    deleteMutation.mutate({ id });
  };

  const handlePdfSelected = (id: number, file: File | null) => {
    if (file) {
      uploadMutation.mutate({ id, file });
    }
  };

  const handleViewPdf = async (id: number) => {
    try {
      const base = import.meta.env.VITE_API_URL || '/api';
      const token = getItem('token');
      const res = await fetch(
        `${base}/elections/${electionId}/assistants/${id}/apoderado-pdf`,
        { headers: token ? { Authorization: `Bearer ${token}` } : {} },
      );
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      window.open(url);
      window.URL.revokeObjectURL(url);
    } catch (err: any) {
      toast(err.message || 'No se pudo obtener el documento');
    }
  };

  const downloadTemplate = async (format: 'csv' | 'xlsx') => {
    const base = import.meta.env.VITE_API_URL || '/api';
    const token = getItem('token');
    const res = await fetch(
      `${base}/elections/${electionId}/assistants/template?format=${format}`,
      {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      },
    );
    const blob = await res.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `padron_template.${format === 'xlsx' ? 'xlsx' : 'csv'}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (file) {
      importMutation.mutate(file);
      setFile(null);
    }
  };

  const filteredAssistants = useMemo(() => {
    if (!assistants) return [];
    const term = search.toLowerCase();
    return assistants.filter((a) =>
      [a.identifier, a.accionista, a.representante || '', a.apoderado || ''].some((field) =>
        field.toLowerCase().includes(term),
      ),
    );
  }, [assistants, search]);

  const sortedAssistants = useMemo(() => {
    if (!sortConfig) return filteredAssistants;
    return [...filteredAssistants].sort((a, b) => {
      const key = sortConfig.key;
      const aVal = (a[key] ?? '') as string | number;
      const bVal = (b[key] ?? '') as string | number;
      if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });
  }, [filteredAssistants, sortConfig]);

  const requestSort = (key: keyof Assistant) => {
    setSortConfig((prev) =>
      prev && prev.key === key
        ? { key, direction: prev.direction === 'asc' ? 'desc' : 'asc' }
        : { key, direction: 'asc' },
    );
  };

  return (
    <div className="space-y-6">
      <Card className="p-4">
        <h1 className="text-lg font-semibold mb-4">Gestión de asistentes</h1>
        <div className="flex space-x-2 mb-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => downloadTemplate('csv')}
          >
            Descargar CSV
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => downloadTemplate('xlsx')}
          >
            Descargar Excel
          </Button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="file"
            accept=".csv,.xlsx"
            onChange={(e) => setFile(e.target.files?.[0] || null)}
            className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
          />
          <Button type="submit" disabled={!file || importMutation.isLoading}>
            Cargar asistentes
          </Button>
        </form>
      </Card>
      <Card className="p-4">
        <h2 className="text-lg font-semibold mb-4">Lista de asistentes</h2>
        <Input
          placeholder="Buscar..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="mb-4"
        />
        <div className="overflow-auto max-h-96">
          <Table className="min-w-full">
            <TableHeader>
              <TableRow>
                <TableHead
                  onClick={() => requestSort('identifier')}
                  className="cursor-pointer"
                >
                  ID
                  {sortConfig?.key === 'identifier' &&
                    (sortConfig.direction === 'asc' ? ' ▲' : ' ▼')}
                </TableHead>
                <TableHead
                  onClick={() => requestSort('accionista')}
                  className="cursor-pointer"
                >
                  Accionista
                  {sortConfig?.key === 'accionista' &&
                    (sortConfig.direction === 'asc' ? ' ▲' : ' ▼')}
                </TableHead>
                <TableHead
                  onClick={() => requestSort('representante')}
                  className="cursor-pointer"
                >
                  Representante
                  {sortConfig?.key === 'representante' &&
                    (sortConfig.direction === 'asc' ? ' ▲' : ' ▼')}
                </TableHead>
                <TableHead
                  onClick={() => requestSort('apoderado')}
                  className="cursor-pointer"
                >
                  Apoderado
                  {sortConfig?.key === 'apoderado' &&
                    (sortConfig.direction === 'asc' ? ' ▲' : ' ▼')}
                </TableHead>
                <TableHead
                  onClick={() => requestSort('acciones')}
                  className="cursor-pointer"
                >
                  Acciones
                  {sortConfig?.key === 'acciones' &&
                    (sortConfig.direction === 'asc' ? ' ▲' : ' ▼')}
                </TableHead>
                <TableHead>Documento</TableHead>
                <TableHead>Gestión</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedAssistants.map((a) => (
                <TableRow key={a.id}>
                  <TableCell>
                    {editingId === a.id ? (
                      <Input
                        value={form.identifier || ''}
                        onChange={(e) =>
                          setForm({ ...form, identifier: e.target.value })
                        }
                      />
                    ) : (
                      a.identifier
                    )}
                  </TableCell>
                  <TableCell>
                    {editingId === a.id ? (
                      <Input
                        value={form.accionista || ''}
                        onChange={(e) =>
                          setForm({ ...form, accionista: e.target.value })
                        }
                      />
                    ) : (
                      a.accionista
                    )}
                  </TableCell>
                  <TableCell>
                    {editingId === a.id ? (
                      <Input
                        value={form.representante || ''}
                        onChange={(e) =>
                          setForm({ ...form, representante: e.target.value })
                        }
                      />
                    ) : (
                      a.representante || '-'
                    )}
                  </TableCell>
                  <TableCell>
                    {editingId === a.id ? (
                      <Input
                        value={form.apoderado || ''}
                        onChange={(e) =>
                          setForm({ ...form, apoderado: e.target.value })
                        }
                      />
                    ) : (
                      a.apoderado || '-'
                    )}
                  </TableCell>
                  <TableCell>
                    {editingId === a.id ? (
                      <Input
                        type="number"
                        value={form.acciones ?? ''}
                        onChange={(e) =>
                          setForm({
                            ...form,
                            acciones: e.target.value
                              ? Number(e.target.value)
                              : undefined,
                          })
                        }
                      />
                    ) : (
                      a.acciones
                    )}
                  </TableCell>
                  <TableCell>
                    {a.requires_document ? (
                      <>
                        <input
                          id={`pdf-${a.id}`}
                          type="file"
                          accept="application/pdf"
                          className="hidden"
                          onChange={(e) =>
                            handlePdfSelected(
                              a.id,
                              e.target.files?.[0] || null,
                            )
                          }
                        />
                        {a.document_uploaded ? (
                          <div className="space-x-2">
                            <Button
                              variant="link"
                              type="button"
                              onClick={() => handleViewPdf(a.id)}
                            >
                              Ver
                            </Button>
                            <Button
                              variant="link"
                              type="button"
                              onClick={() =>
                                document
                                  .getElementById(`pdf-${a.id}`)
                                  ?.click()
                              }
                              disabled={uploadMutation.isLoading}
                            >
                              Reemplazar
                            </Button>
                          </div>
                        ) : (
                          <Button
                            variant="link"
                            type="button"
                            onClick={() =>
                              document
                                .getElementById(`pdf-${a.id}`)
                                ?.click()
                            }
                            disabled={uploadMutation.isLoading}
                          >
                            Subir
                          </Button>
                        )}
                      </>
                    ) : (
                      '-'
                    )}
                  </TableCell>
                  <TableCell className="space-x-2">
                    {editingId === a.id ? (
                      <>
                        <Button onClick={saveEdit} disabled={updateMutation.isLoading}>
                          Guardar
                        </Button>
                        <Button
                          variant="outline"
                          onClick={cancelEdit}
                          disabled={updateMutation.isLoading}
                        >
                          Cancelar
                        </Button>
                      </>
                    ) : (
                      <>
                        <Button
                          variant="link"
                          onClick={() => startEdit(a)}
                          aria-label="Editar"
                          title="Editar"
                        >
                          <EditIcon className="w-5 h-5" />
                        </Button>
                        <Button
                          variant="link"
                          onClick={() => setDeleteId(a.id)}
                          disabled={deleteMutation.isLoading}
                          aria-label="Eliminar"
                          title="Eliminar"
                        >
                          <TrashIcon className="w-5 h-5" />
                        </Button>
                      </>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </Card>
      {deleteId !== null && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center">
          <div className="bg-white p-4 rounded-md shadow-md space-y-4">
            <p>¿Eliminar asistente?</p>
            <div className="flex justify-end space-x-2">
              <Button
                onClick={() => {
                  handleDelete(deleteId);
                  setDeleteId(null);
                }}
              >
                Eliminar
              </Button>
              <Button variant="outline" onClick={() => setDeleteId(null)}>
                Cancelar
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ManageAssistants;
