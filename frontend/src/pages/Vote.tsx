import React, { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import {
  useBallots,
  useBallotResults,
  useCastVote,
  useVoteAll,
  useCloseBallot,
  useCloseElection,
  useStartVoting,
  useCloseVoting,
  type Ballot,
} from '../hooks/useBallots';
import { useShareholders } from '../hooks/useShareholders';
import { useElection } from '../hooks/useElection';
import { useDashboardStats } from '../hooks/useDashboardStats';
import Button from '../components/ui/button';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '../components/ui/table';
import { useToast } from '../components/ui/toast';
import Alert from '../components/ui/alert';
import { useVoteReport } from '../hooks/useVoteReport';
import { useSendVoteReport } from '../hooks/useSendVoteReport';
import BallotStepper from '../components/BallotStepper';

const Vote: React.FC = () => {
  const { id } = useParams();
  const electionId = Number(id);
  const { data: election } = useElection(electionId);
  const { data: allBallots } = useBallots(electionId);
  const [ballots, setBallots] = useState<Ballot[]>([]);
  const [syncing, setSyncing] = useState(false);
  const { data: shareholders } = useShareholders(
    electionId,
    '',
    (err) => toast(err.message),
  );
  const assistants =
    shareholders
      ?.filter(
        (s) =>
          s.attendee_id &&
          s.attendance_mode &&
          s.attendance_mode !== 'AUSENTE' &&
          s.actions > 0,
      )
      .map((s) => ({ id: s.attendee_id!, accionista: s.name })) || [];
  const { data: stats } = useDashboardStats(electionId);
  const [currentStep, setCurrentStep] = useState(0);
  const currentIdRef = useRef<number | null>(null);

  useEffect(() => {
    if (!allBallots) return;
    setBallots((prev) => {
      if (prev.length === 0) return allBallots;
      let mismatch = false;
      const merged = allBallots.map((b) => {
        const local = prev.find((p) => p.id === b.id);
        if (local && local.status === 'CLOSED' && b.status !== 'CLOSED') {
          mismatch = true;
          return { ...b, status: 'CLOSED' };
        }
        return b;
      });
      setSyncing(mismatch);
      return merged;
    });
    const currentId = currentIdRef.current;
    if (currentId != null) {
      const index = allBallots.findIndex((b) => b.id === currentId);
      if (index >= 0) {
        if (allBallots[index].status === 'OPEN') {
          advance(index, allBallots);
          return;
        }
        advance(index + 1, allBallots);
        return;
      }
    }
    advance(0, allBallots);
  }, [allBallots]);

  const advance = (i: number, list: Ballot[] = ballots) => {
    let next = i;
    while (next < list.length && list[next].status !== 'OPEN') {
      next++;
    }
    currentIdRef.current = list[next]?.id ?? null;
    setCurrentStep(next);
  };

  const current = ballots[currentStep];
  const {
    data: options,
    isLoading: loadingOptions,
    isFetching: fetchingOptions,
  } = useBallotResults(current?.id || 0, !!current);
  const [votes, setVotes] = useState<Record<number, number>>({});
  const [alertMsg, setAlertMsg] = useState('');
  const toast = useToast();
  const allVoted = assistants.every((a) => votes[a.id]);

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
  const closeBallot = useCloseBallot(current?.id || 0, electionId);

  useEffect(() => {
    if (current && options && options.length === 0) {
      toast('Esta pregunta no tiene respuestas configuradas, se omitirá');
      const updated = ballots.map((b) =>
        b.id === current.id ? { ...b, status: 'CLOSED' } : b,
      );
      setBallots(updated);
      advance(currentStep + 1, updated);
      closeBallot.mutate();
    }
  }, [current, options, closeBallot, toast, ballots, currentStep]);
  const closeElection = useCloseElection(electionId, () => toast('Votación cerrada'));
  const startVoting = useStartVoting(
    electionId,
    () => toast('Registro de votación abierto'),
    (err) => toast(err.message),
  );
  const closeVoting = useCloseVoting(electionId, () => closeElection.mutate());
  const downloadReport = useVoteReport(electionId, () => toast('Descarga iniciada'));
  const sendReport = useSendVoteReport(
    electionId,
    () => toast('Informe enviado'),
    (err) => toast(err.message),
  );

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

  const nextQuestion = () => {
    if (assistants.some((a) => !votes[a.id])) {
      setAlertMsg('Seleccione una opción');
      return;
    }
    setAlertMsg('');
    if (current) {
      const updated = ballots.map((b) =>
        b.id === current.id ? { ...b, status: 'CLOSED' } : b,
      );
      setBallots(updated);
      advance(currentStep + 1, updated);
    } else {
      advance(currentStep + 1);
    }
    closeBallot.mutate();
  };

  const prevQuestion = () => {
    let prev = currentStep - 1;
    while (prev >= 0 && ballots[prev].status !== 'OPEN') {
      prev--;
    }
    if (prev >= 0) {
      setCurrentStep(prev);
      currentIdRef.current = ballots[prev]?.id ?? null;
    }
  };

  const total = ballots.length;
  const done = currentStep >= total;
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
        <div className="flex gap-2">
          <Button onClick={() => downloadReport.mutate()}>Descargar informe de votación</Button>
          <Button variant="outline" onClick={() => sendReport.mutate()}>
            Reenviar informe de votación
          </Button>
        </div>
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
      {syncing && <Alert message="Sincronizando..." />}
      {election?.voting_open && current && (
        loadingOptions || fetchingOptions ? (
          <p>Cargando opciones...</p>
        ) : options && options.length > 0 ? (
          <BallotStepper
            key={current.id}
            ballots={ballots}
            currentBallotId={current.id}
            onNext={nextQuestion}
            onPrev={prevQuestion}
            nextDisabled={!allVoted}
          >
            {alertMsg && <Alert message={alertMsg} />}
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
                    <TableRow key={a.id} className={votes[a.id] ? 'bg-green-50' : ''}>
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
          </BallotStepper>
        ) : (
          <div className="space-y-4">
            <h2 className="text-lg font-medium">{current.title}</h2>
            <p>Esta pregunta no tiene respuestas configuradas</p>
          </div>
        )
      )}
      {election?.voting_open && done && (
        <div className="space-y-2">
          <p>Ha respondido todas las preguntas.</p>
          <Button onClick={() => closeVoting.mutate()}>Enviar definitivamente</Button>
        </div>
      )}
    </div>
  );
};

export default Vote;

