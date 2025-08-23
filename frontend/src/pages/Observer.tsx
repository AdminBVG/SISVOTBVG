import React, { useEffect, useState } from 'react';
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
import { getItem } from '../lib/storage';

const Observer: React.FC = () => {
  const { id } = useParams();
  const electionId = Number(id);
  const { data: initialRows, isLoading, error } = useObserver(electionId);
  const [rows, setRows] = useState(initialRows || []);
  const [ballots, setBallots] = useState<
    Record<number, { id: number; title: string; results: { id: number; text: string; votes: number }[] }>
  >({});

  useEffect(() => {
    if (initialRows) setRows(initialRows);
  }, [initialRows]);

  useEffect(() => {
    const token = getItem('token');
    const base = (import.meta.env.VITE_API_URL || '/api').replace(/^http/, 'ws');
    const ws = new WebSocket(`${base}/elections/${electionId}/observer/ws?token=${token}`);
    ws.onmessage = (ev) => {
      const msg = JSON.parse(ev.data);
      if (msg.row) {
        setRows((prev) => {
          const idx = prev.findIndex((r) => r.code === msg.row.code);
          if (idx === -1) return prev;
          const copy = [...prev];
          copy[idx] = msg.row;
          return copy;
        });
      }
      if (msg.ballot) {
        setBallots((b) => ({ ...b, [msg.ballot.id]: msg.ballot }));
      }
    };
    return () => ws.close();
  }, [electionId]);

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
      {Object.values(ballots).map((b) => (
        <div key={b.id} className="space-y-2">
          <h2 className="text-lg font-medium">{b.title}</h2>
          <ul className="list-disc list-inside">
            {b.results.map((r) => (
              <li key={r.id}>
                {r.text}: {r.votes}
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
};

export default Observer;

