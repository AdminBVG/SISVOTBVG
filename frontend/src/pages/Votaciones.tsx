import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Card from '../components/ui/card';
import Button from '../components/ui/button';
import Input from '../components/ui/input';
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from '../components/ui/table';
import { useToast } from '../components/ui/toast';
import { useElections } from '../hooks/useElections';
import { useCreateElection } from '../hooks/useCreateElection';
import { useUpdateElection } from '../hooks/useUpdateElection';
import { useUpdateElectionStatus } from '../hooks/useUpdateElectionStatus';
import { useUsers } from '../hooks/useUsers';
import { useAuth } from '../context/AuthContext';
import { Calendar, List } from '../lib/icons';

const Votaciones: React.FC = () => {
  const navigate = useNavigate();
  const toast = useToast();
  const { role } = useAuth();
  const [name, setName] = useState('');
  const [date, setDate] = useState('');
  const [registrationStart, setRegistrationStart] = useState('');
  const [registrationEnd, setRegistrationEnd] = useState('');
  const [attendanceRegs, setAttendanceRegs] = useState<number[]>([]);
  const [voteRegs, setVoteRegs] = useState<number[]>([]);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editName, setEditName] = useState('');
  const [editDate, setEditDate] = useState('');

  const { data: elections, isLoading, error, refetch } = useElections();
  const { data: users } = useUsers();
  const registrarUsers = users?.filter((u) => u.role === 'REGISTRADOR_BVG') || [];
  const { mutate, isLoading: creating } = useCreateElection(() => {
    toast('Votación creada');
    setName('');
    setDate('');
    setRegistrationStart('');
    setRegistrationEnd('');
    refetch();
  }, (err) => toast(err.message));
  const { mutate: updateElection } = useUpdateElection(() => {
    toast('Votación actualizada');
    setEditingId(null);
    refetch();
  }, (err) => toast(err.message));
  const { mutate: updateStatus } = useUpdateElectionStatus(() => {
    toast('Estado actualizado');
    refetch();
  }, (err) => toast(err.message));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    mutate({
      name,
      date,
      ...(registrationStart
        ? { registration_start: new Date(registrationStart).toISOString() }
        : {}),
      ...(registrationEnd
        ? { registration_end: new Date(registrationEnd).toISOString() }
        : {}),
      attendance_registrars: attendanceRegs,
      vote_registrars: voteRegs,
    });
  };

  const startEdit = (election: any) => {
    setEditingId(election.id);
    setEditName(election.name);
    setEditDate(election.date.slice(0, 10));
  };

  const saveEdit = () => {
    if (editingId == null) return;
    updateElection({ id: editingId, name: editName, date: editDate });
  };

  const cancelEdit = () => setEditingId(null);

  const statusLabel = (status: string) => {
    switch (status) {
      case 'DRAFT':
        return 'Borrador';
      case 'OPEN':
        return 'Abierta';
      case 'CLOSED':
        return 'Cerrada';
      default:
        return status;
    }
  };

  const isRegistrationOpen = (e: any) => {
    if (e.status !== 'OPEN') return false;
    const now = new Date();
    if (e.registration_start && new Date(e.registration_start) > now) return false;
    if (e.registration_end && new Date(e.registration_end) < now) return false;
    return true;
  };

  return (
    <div className="space-y-6">
      {role === 'ADMIN_BVG' && (
        <Card className="p-4">
          <h1 className="text-lg font-semibold mb-4 flex items-center"><List className="w-4 h-4 mr-2" />Nueva votación</h1>
          <form onSubmit={handleSubmit} className="space-y-4 max-w-md">
            <div>
              <label className="block text-sm mb-1">Nombre de la votación</label>
              <Input value={name} onChange={(e) => setName(e.target.value)} required />
            </div>
            <div>
              <label className="block text-sm mb-1 flex items-center">
                <Calendar className="w-4 h-4 mr-1" />Fecha de la asamblea
              </label>
              <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
            </div>
            <div>
              <label className="block text-sm mb-1">Inicio de registro</label>
              <Input
                type="datetime-local"
                value={registrationStart}
                onChange={(e) => setRegistrationStart(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm mb-1">Fin de registro</label>
              <Input
                type="datetime-local"
                value={registrationEnd}
                onChange={(e) => setRegistrationEnd(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm mb-1">Registradores de asistencia</label>
              <select
                multiple
                className="border rounded w-full p-2"
                value={attendanceRegs.map(String)}
                onChange={(e) =>
                  setAttendanceRegs(
                    Array.from(e.target.selectedOptions).map((o) => Number(o.value)),
                  )
                }
              >
                {registrarUsers.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.username}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm mb-1">Registradores de votos</label>
              <select
                multiple
                className="border rounded w-full p-2"
                value={voteRegs.map(String)}
                onChange={(e) =>
                  setVoteRegs(
                    Array.from(e.target.selectedOptions).map((o) => Number(o.value)),
                  )
                }
              >
                {registrarUsers.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.username}
                  </option>
                ))}
              </select>
            </div>
            <Button type="submit" disabled={creating}>Crear votación</Button>
          </form>
        </Card>
      )}

      <Card className="p-4">
        <h2 className="text-lg font-semibold mb-4">Votaciones</h2>
        {isLoading && <p>Cargando...</p>}
        {error && (
          <p role="alert" className="text-body">
            Error al cargar votaciones
          </p>
        )}
        {!isLoading && !error && (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nombre</TableHead>
                <TableHead>Fecha</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {elections?.map((e) => {
                const open = isRegistrationOpen(e);
                return (
                  <TableRow key={e.id}>
                    {editingId === e.id ? (
                      <>
                        <TableCell>
                          <Input value={editName} onChange={(ev) => setEditName(ev.target.value)} />
                        </TableCell>
                        <TableCell>
                          <Input type="date" value={editDate} onChange={(ev) => setEditDate(ev.target.value)} />
                        </TableCell>
                        <TableCell>{statusLabel(e.status)}</TableCell>
                        <TableCell className="space-x-2">
                          <Button onClick={saveEdit}>Guardar</Button>
                          <Button variant="outline" onClick={cancelEdit}>
                            Cancelar
                          </Button>
                        </TableCell>
                      </>
                    ) : (
                      <>
                        <TableCell>{e.name}</TableCell>
                        <TableCell>{new Date(e.date).toLocaleDateString('es-EC')}</TableCell>
                        <TableCell>{statusLabel(e.status)}</TableCell>
                        <TableCell className="space-x-2">
                          {role === 'ADMIN_BVG' && (
                            <>
                              {e.status === 'DRAFT' && (
                                <>
                                  <Button variant="outline" onClick={() => startEdit(e)}>
                                    Editar
                                  </Button>
                                  <Button
                                    variant="outline"
                                    onClick={() => updateStatus({ id: e.id, status: 'OPEN' })}
                                  >
                                    Abrir
                                  </Button>
                                </>
                              )}
                              {e.status === 'OPEN' && (
                                <Button
                                  variant="outline"
                                  onClick={() => updateStatus({ id: e.id, status: 'CLOSED' })}
                                >
                                  Cerrar
                                </Button>
                              )}
                              <Button
                                variant="outline"
                                disabled={!open}
                                onClick={() => navigate(`/votaciones/${e.id}/assistants`)}
                              >
                                Gestionar asistentes
                              </Button>
                              {!open && <span className="text-sm text-gray-500">Bloqueada</span>}
                              <Button
                                variant="outline"
                                onClick={() => navigate(`/votaciones/${e.id}/audit`)}
                              >
                                Auditoría
                              </Button>
                            </>
                          )}
                          {role === 'REGISTRADOR_BVG' && (
                            <>
                              {e.can_manage_attendance && (
                                <Button
                                  variant="outline"
                                  disabled={!open}
                                  onClick={() => navigate(`/votaciones/${e.id}/attendance`)}
                                >
                                  Gestionar asistentes
                                </Button>
                              )}
                              {e.can_manage_votes && (
                                <Button
                                  variant="outline"
                                  disabled={!open}
                                  onClick={() => navigate(`/votaciones/${e.id}/proxies`)}
                                >
                                  Gestionar votos
                                </Button>
                              )}
                              {!open && <span className="text-sm text-gray-500">Bloqueada</span>}
                            </>
                          )}
                        </TableCell>
                      </>
                    )}
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </Card>
    </div>
  );
};

export default Votaciones;
