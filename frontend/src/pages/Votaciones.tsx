import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Card from '../components/ui/card';
import Button from '../components/ui/button';
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
import { useUpdateElectionStatus } from '../hooks/useUpdateElectionStatus';
import { useAuth } from '../context/AuthContext';

const Votaciones: React.FC = () => {
  const navigate = useNavigate();
  const toast = useToast();
  const { role } = useAuth();
  const { data: elections, isLoading, error, refetch } = useElections();
  const [search, setSearch] = useState('');
  const { mutate: updateStatus } = useUpdateElectionStatus(() => {
    toast('Estado actualizado');
    refetch();
  }, (err) => toast(err.message));

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
        <Button onClick={() => navigate('/votaciones/create')}>Nueva votación</Button>
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
          <>
            <input
              type="text"
              placeholder="Buscar"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="mb-2 border p-1"
            />
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
              {elections
                ?.filter((e) =>
                  e.name.toLowerCase().includes(search.toLowerCase())
                )
                .map((e) => {
                  const open = isRegistrationOpen(e);
                  return (
                    <TableRow key={e.id}>
                      <TableCell>{e.name}</TableCell>
                      <TableCell>{new Date(e.date).toLocaleDateString('es-EC')}</TableCell>
                      <TableCell>{statusLabel(e.status)}</TableCell>
                    <TableCell className="space-x-2">
                      {role === 'ADMIN_BVG' && (
                        <>
                          {e.status === 'DRAFT' && (
                            <>
                              <Button
                                variant="outline"
                                onClick={() => navigate(`/votaciones/${e.id}/edit`)}
                              >
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
                            onClick={() => navigate(`/votaciones/${e.id}/assistants`)}
                          >
                            Gestionar asistentes
                          </Button>
                          <Button
                            variant="outline"
                            onClick={() => navigate(`/votaciones/${e.id}/users`)}
                          >
                            Roles
                          </Button>
                          <Button
                            variant="outline"
                            onClick={() => navigate(`/votaciones/${e.id}/observer`)}
                          >
                            Observador
                          </Button>
                          <Button
                            variant="outline"
                            onClick={() => navigate(`/votaciones/${e.id}/ballots`)}
                          >
                            Boletas
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
                      {role === 'FUNCIONAL_BVG' && (
                        <>
                          {e.can_manage_attendance && (
                            open ? (
                              <Button
                                variant="outline"
                                onClick={() => navigate(`/votaciones/${e.id}/attendance`)}
                              >
                                Gestionar asistentes
                              </Button>
                            ) : (
                              <Button
                                variant="outline"
                                disabled
                                title="Registro de asistencia no habilitado"
                              >
                                Gestionar asistentes
                              </Button>
                            )
                          )}
                          {e.can_manage_votes && (
                            <Button
                              variant="outline"
                              disabled={!open}
                              onClick={() => navigate(`/votaciones/${e.id}/vote`)}
                            >
                              Gestionar votos
                            </Button>
                          )}
                          {e.can_observe && (
                            <Button
                              variant="outline"
                              onClick={() => navigate(`/votaciones/${e.id}/observer`)}
                            >
                              Observador
                            </Button>
                          )}
                          <Button
                            variant="outline"
                            onClick={() => navigate(`/votaciones/${e.id}/ballots`)}
                          >
                            Boletas
                          </Button>
                          {!open && <span className="text-sm text-gray-500">Bloqueada</span>}
                        </>
                      )}
                    </TableCell>
                  </TableRow>
                );
                })}
            </TableBody>
          </Table>
          </>
        )}
      </Card>
    </div>
  );
};

export default Votaciones;
