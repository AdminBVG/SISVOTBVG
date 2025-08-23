import React, { useState } from 'react';
import { useParams } from 'react-router-dom';
import {
  useBallots,
  useBallotResults,
  useCastVote,
} from '../hooks/useBallots';
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from '../components/ui/table';
import Button from '../components/ui/button';
import { useToast } from '../components/ui/toast';

const Ballots: React.FC = () => {
  const { id } = useParams();
  const electionId = Number(id);
  const { data: ballots, isLoading, error } = useBallots(electionId);
  const [selected, setSelected] = useState<number | null>(null);
  const { data: results } = useBallotResults(selected || 0, !!selected);
  const [attendeeId, setAttendeeId] = useState<number>(1);
  const toast = useToast();
  const castVote = useCastVote(selected || 0, () => toast('Voto registrado'));

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Boletas</h1>
      {isLoading && <p>Cargando...</p>}
      {error && (
        <p role="alert" className="text-body">
          Error al cargar boletas
        </p>
      )}
      {ballots && (
        <ul className="space-y-2">
          {ballots.map((b) => (
            <li key={b.id}>
              <button className="underline" onClick={() => setSelected(b.id)}>
                {b.title}
              </button>
            </li>
          ))}
        </ul>
      )}
      {results && selected && (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Opción</TableHead>
              <TableHead>Votos</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {results.map((r) => (
              <TableRow key={r.id}>
                <TableCell>{r.text}</TableCell>
                <TableCell>{r.votes}</TableCell>
                <TableCell>
                  <Button
                    variant="outline"
                    onClick={() => castVote.mutate({ option_id: r.id, attendee_id: attendeeId })}
                  >
                    Votar
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
      {selected && (
        <div className="space-y-2">
          <label htmlFor="attendee" className="block">ID asistente</label>
          <input
            id="attendee"
            type="number"
            value={attendeeId}
            onChange={(e) => setAttendeeId(Number(e.target.value))}
            className="border p-1"
          />
        </div>
      )}
    </div>
  );
};

export default Ballots;

