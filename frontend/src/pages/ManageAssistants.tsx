import React, { useState } from 'react';
import { useParams } from 'react-router-dom';
import Card from '../components/ui/card';
import Button from '../components/ui/button';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '../components/ui/table';
import { useToast } from '../components/ui/toast';
import { useAssistants } from '../hooks/useAssistants';
import { useImportAssistants } from '../hooks/useImportAssistants';

const ManageAssistants: React.FC = () => {
  const { id } = useParams();
  const electionId = Number(id);
  const toast = useToast();
  const [file, setFile] = useState<File | null>(null);

  const { data: assistants } = useAssistants(electionId);
  const importMutation = useImportAssistants(
    electionId,
    () => toast('Asistentes cargados'),
    (err) => toast(err.message),
  );

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
            </TableRow>
          </TableHeader>
          <TableBody>
            {assistants?.map((a) => (
              <TableRow key={a.id}>
                <TableCell>{a.identifier}</TableCell>
                <TableCell>{a.accionista}</TableCell>
                <TableCell>{a.representante || '-'}</TableCell>
                <TableCell>{a.apoderado || '-'}</TableCell>
                <TableCell>{a.acciones}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
};

export default ManageAssistants;
