import React, { useState } from 'react';
import { useParams } from 'react-router-dom';
import {
  useBallots,
  useBallotResults,
  useCastVote,
  useReopenBallot,
} from '../hooks/useBallots';
import { useAssistants } from '../hooks/useAssistants';
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
  const { data: assistants } = useAssistants(electionId);
  const [attendeeSearch, setAttendeeSearch] = useState('');
  const attendee = assistants?.find((a) => a.accionista === attendeeSearch);
  const attendeeId = attendee?.id;
  const toast = useToast();
  const castVote = useCastVote(selected || 0, () => toast('Voto registrado'));
  const reopenBallot = useReopenBallot(selected || 0, () => toast('Boleta reabierta'));

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
                    disabled={!attendeeId}
                    onClick={() => attendeeId && castVote.mutate({ option_id: r.id, attendee_id: attendeeId })}
                  >
                    Votar
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
      {selected && assistants && (
        <div className="space-y-2">
          <label htmlFor="attendee" className="block">Asistente</label>
          <input
            id="attendee"
            list="assistants"
            value={attendeeSearch}
            onChange={(e) => setAttendeeSearch(e.target.value)}
            className="border p-1"
          />
          <datalist id="assistants">
            {assistants.map((a) => (
              <option key={a.id} value={a.accionista} />
            ))}
          </datalist>
        </div>
      )}
      {selected && ballots && ballots.find((b) => b.id === selected)?.status === 'CLOSED' && (
        <Button variant="outline" onClick={() => reopenBallot.mutate()}>
          Reabrir boleta
        </Button>
      )}
    </div>
  );
};

export default Ballots;

