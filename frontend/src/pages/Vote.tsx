import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import {
  usePendingBallots,
  useBallotResults,
  useCastVote,
  useVoteAll,
  useCloseBallot,
  useCloseElection,
  useStartVoting,
  useCloseVoting,
} from '../hooks/useBallots';
import { useShareholders } from '../hooks/useShareholders';
import { useElection } from '../hooks/useElection';
import { useDashboardStats } from '../hooks/useDashboardStats';
import Button from '../components/ui/button';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '../components/ui/table';
import { useToast } from '../components/ui/toast';

const Vote: React.FC = () => {
  const { id } = useParams();
  const electionId = Number(id);
  const { data: election } = useElection(electionId);
  const { data: ballots } = usePendingBallots(electionId);
  const { data: shareholders } = useShareholders(
    electionId,
    '',
    (err) => toast(err.message),
  );
  const assistants =
    shareholders
      ?.filter(
        (s) => s.attendee_id && s.attendance_mode && s.attendance_mode !== 'AUSENTE',
      )
      .map((s) => ({ id: s.attendee_id!, accionista: s.name })) || [];
  const { data: stats } = useDashboardStats(electionId);
  const [index, setIndex] = useState(0);
  const current = ballots?.[index];
  const { data: options } = useBallotResults(current?.id || 0, !!current);
  const [votes, setVotes] = useState<Record<number, number>>({});
  const toast = useToast();

  useEffect(() => {
    setVotes({});
  }, [current?.id]);

  const castVote = useCastVote(
    current?.id || 0,
    () => toast('Voto registrado'),
    (err) => toast(err.message),
  );
  const voteAll = useVoteAll(
    current?.id || 0,
    () => toast('Votos registrados'),
    (err) => toast(err.message),
  );
  const closeBallot = useCloseBallot(current?.id || 0, () => setIndex((i) => i + 1));
  const closeElection = useCloseElection(electionId, () => toast('Votación cerrada'));
  const startVoting = useStartVoting(
    electionId,
    () => toast('Registro de votación abierto'),
    (err) => toast(err.message),
  );
  const closeVoting = useCloseVoting(electionId, () => closeElection.mutate());

  const handleVote = (attId: number, optionId: number) => {
    setVotes((v) => ({ ...v, [attId]: optionId }));
    castVote.mutate({ option_id: optionId, attendee_id: attId });
  };

  const handleVoteAll = (optionId: number) => {
    const map: Record<number, number> = {};
    assistants.forEach((a) => {
      map[a.id] = optionId;
    });
    setVotes(map);
    voteAll.mutate({ option_id: optionId });
  };

  const done = ballots && index >= ballots.length;
  const closed = election?.status === 'CLOSED';
  const quorum = stats?.porcentaje_quorum || 0;
  const min = election?.min_quorum || 0;
  const start = election?.registration_start
    ? new Date(election.registration_start)
    : null;
  const now = new Date();
  const afterStart = !start || start <= now;
  const canStart = !election?.voting_open && (election?.demo || (quorum >= min && afterStart));

  if (closed) {
    return (
      <div className="space-y-4">
        <h1 className="text-xl font-semibold">Registrador de Votación</h1>
        <p>Votación finalizada</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Registrador de Votación</h1>
      {!election?.voting_open && (
        <div className="space-y-2">
          <p>Quórum actual: {quorum.toFixed(2)}%</p>
          <Button onClick={() => startVoting.mutate()} disabled={!canStart}>
            Abrir registro de votación
          </Button>
        </div>
      )}
      {election?.voting_open && current && options && (
        options.length === 0 ? (
          <div className="space-y-4">
            <h2 className="text-lg font-medium">{current.title}</h2>
            <p>Esta pregunta no tiene respuestas configuradas</p>
            <Button variant="destructive" onClick={() => closeBallot.mutate()}>
              Cerrar pregunta
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                disabled={index === 0}
                onClick={() => setIndex((i) => Math.max(i - 1, 0))}
              >
                Anterior
              </Button>
              <div className="flex-1">
                <div>
                  Pregunta {index + 1} de {ballots?.length}
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2 mt-1">
                  <div
                    className="bg-blue-500 h-2 rounded-full"
                    style={{ width: `${((index + 1) / (ballots?.length || 1)) * 100}%` }}
                  ></div>
                </div>
              </div>
              <Button
                variant="outline"
                disabled={!ballots || index >= ballots.length - 1}
                onClick={() => setIndex((i) => i + 1)}
              >
                Siguiente
              </Button>
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
              <Button variant="destructive" onClick={() => closeBallot.mutate()}>
                Cerrar pregunta
              </Button>
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
        )
      )}
      {election?.voting_open && done && (
        <Button onClick={() => closeVoting.mutate()}>Cerrar votación</Button>
      )}
    </div>
  );
};

export default Vote;

