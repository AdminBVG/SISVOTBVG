import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import {
  usePendingBallots,
  useBallotResults,
  useCastVote,
  useVoteAll,
  useCloseBallot,
  useCloseElection,
} from '../hooks/useBallots';
import { useAssistants } from '../hooks/useAssistants';
import Button from '../components/ui/button';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '../components/ui/table';
import { useToast } from '../components/ui/toast';

const Vote: React.FC = () => {
  const { id } = useParams();
  const electionId = Number(id);
  const { data: ballots } = usePendingBallots(electionId);
  const { data: assistants } = useAssistants(electionId);
  const [index, setIndex] = useState(0);
  const current = ballots?.[index];
  const { data: options } = useBallotResults(current?.id || 0, !!current);
  const [votes, setVotes] = useState<Record<number, number>>({});
  const toast = useToast();

  useEffect(() => {
    setVotes({});
  }, [current?.id]);

  const castVote = useCastVote(current?.id || 0, () => toast('Voto registrado'));
  const voteAll = useVoteAll(current?.id || 0, () => toast('Votos registrados'));
  const closeBallot = useCloseBallot(current?.id || 0, () => setIndex((i) => i + 1));
  const closeElection = useCloseElection(electionId, () => toast('Votación cerrada'));

  const handleVote = (attId: number, optionId: number) => {
    setVotes((v) => ({ ...v, [attId]: optionId }));
    castVote.mutate({ option_id: optionId, attendee_id: attId });
  };

  const handleVoteAll = (optionId: number) => {
    const map: Record<number, number> = {};
    assistants?.forEach((a) => {
      map[a.id] = optionId;
    });
    setVotes(map);
    voteAll.mutate({ option_id: optionId });
  };

  const done = ballots && index >= ballots.length;

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Registrador de Votación</h1>
      {current && options && (
        <div className="space-y-4">
          <div>
            Pregunta {index + 1} de {ballots?.length}
          </div>
          <h2 className="text-lg font-medium">{current.title}</h2>
          <div className="flex gap-2">
            {options.map((o) => (
              <Button key={o.id} onClick={() => handleVoteAll(o.id)}>
                Todos {o.text}
              </Button>
            ))}
            <Button variant="outline" onClick={() => setVotes({})}>
              Limpiar
            </Button>
            <Button variant="destructive" onClick={() => closeBallot.mutate()}>Cerrar pregunta</Button>
          </div>
          {assistants && options && (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Accionista</TableHead>
                  {options.map((o) => (
                    <TableHead key={o.id}>{o.text}</TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {assistants.map((a) => (
                  <TableRow key={a.id}>
                    <TableCell>{a.accionista}</TableCell>
                    {options.map((o) => (
                      <TableCell key={o.id}>
                        <input
                          type="radio"
                          name={`att-${a.id}`}
                          checked={votes[a.id] === o.id}
                          onChange={() => handleVote(a.id, o.id)}
                        />
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
      )}
      {done && (
        <Button onClick={() => closeElection.mutate()}>Cerrar votación</Button>
      )}
    </div>
  );
};

export default Vote;

