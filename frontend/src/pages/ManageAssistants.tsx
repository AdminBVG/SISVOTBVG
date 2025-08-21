import React, { useState } from 'react';
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

const ManageAssistants: React.FC = () => {
  const { id } = useParams();
  const electionId = Number(id);
  const toast = useToast();
  const [file, setFile] = useState<File | null>(null);

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
    if (confirm('¿Eliminar asistente?')) {
      deleteMutation.mutate({ id });
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (file) {
      importMutation.mutate(file);
      setFile(null);
    }
  };

  return (
    <div className="space-y-6">
      <Card className="p-4">
        <h1 className="text-lg font-semibold mb-4">Gestión de asistentes</h1>
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
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>ID</TableHead>
              <TableHead>Accionista</TableHead>
              <TableHead>Representante</TableHead>
              <TableHead>Apoderado</TableHead>
              <TableHead>Acciones</TableHead>
              <TableHead>Gestión</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {assistants?.map((a) => (
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
                      <Button variant="link" onClick={() => startEdit(a)}>
                        Editar
                      </Button>
                      <Button
                        variant="link"
                        onClick={() => handleDelete(a.id)}
                        disabled={deleteMutation.isLoading}
                      >
                        Eliminar
                      </Button>
                    </>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
};

export default ManageAssistants;
