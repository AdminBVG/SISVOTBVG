import React from 'react';
import { useParams } from 'react-router-dom';
import { useObserver } from '../hooks/useObserver';
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from '../components/ui/table';

const Observer: React.FC = () => {
  const { id } = useParams();
  const electionId = Number(id);
  const { data: rows, isLoading, error } = useObserver(electionId);

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Observador</h1>
      {isLoading && <p>Cargando...</p>}
      {error && (
        <p role="alert" className="text-body">
          Error al cargar observación
        </p>
      )}
      {rows && (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Código</TableHead>
              <TableHead>Nombre</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead>Apoderado</TableHead>
              <TableHead>Acciones propias</TableHead>
              <TableHead>Acciones representadas</TableHead>
              <TableHead>Total quorum</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((r) => (
              <TableRow key={r.code}>
                <TableCell>{r.code}</TableCell>
                <TableCell>{r.name}</TableCell>
                <TableCell>{r.estado}</TableCell>
                <TableCell>{r.apoderado || '-'}</TableCell>
                <TableCell>{r.acciones_propias}</TableCell>
                <TableCell>{r.acciones_representadas}</TableCell>
                <TableCell>{r.total_quorum}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
};

export default Observer;

