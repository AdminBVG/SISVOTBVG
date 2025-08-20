import React from 'react';
import { useParams } from 'react-router-dom';
import Card from '../components/ui/card';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '../components/ui/table';
import { useAuditLogs } from '../hooks/useAuditLogs';

const AuditLogs: React.FC = () => {
  const { id } = useParams();
  const electionId = Number(id);
  const { data: logs, isLoading, error } = useAuditLogs(electionId);

  return (
    <Card className="p-4">
      <h1 className="text-lg font-semibold mb-4">Auditoría</h1>
      {isLoading && <p>Cargando...</p>}
      {error && (
        <p role="alert" className="text-body">
          Error al cargar auditoría
        </p>
      )}
      {!isLoading && !error && (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Usuario</TableHead>
              <TableHead>Acción</TableHead>
              <TableHead>Fecha</TableHead>
              <TableHead>Detalles</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {logs?.map((l) => (
              <TableRow key={l.id}>
                <TableCell>{l.username}</TableCell>
                <TableCell>{l.action}</TableCell>
                <TableCell>{new Date(l.created_at).toLocaleString()}</TableCell>
                <TableCell>{l.details ? JSON.stringify(l.details) : ''}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </Card>
  );
};

export default AuditLogs;
