import React from 'react';
import { useParams } from 'react-router-dom';
import Card from '../components/ui/card';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '../components/ui/table';
import { useUsers } from '../hooks/useUsers';
import { useElectionUsers } from '../hooks/useElectionUsers';
import { useSetElectionRole } from '../hooks/useSetElectionRole';
import { useToast } from '../components/ui/toast';

const roleOptions = [
  { value: '', label: 'Sin rol' },
  { value: 'VOTER', label: 'Votante' },
  { value: 'ATTENDANCE', label: 'Registrador de asistencia' },
  { value: 'VOTE', label: 'Registrador de votación' },
  { value: 'DELEGATE', label: 'Delegado' },
];

const ManageElectionUsers: React.FC = () => {
  const { id } = useParams();
  const electionId = Number(id);
  const toast = useToast();
  const { data: users } = useUsers();
  const { data: assignments, refetch } = useElectionUsers(electionId);
  const { mutate: setRole } = useSetElectionRole(
    electionId,
    () => {
      toast('Rol actualizado');
      refetch();
    },
    (err) => toast(err.message),
  );

  const roleMap = new Map(assignments?.map((a) => [a.user_id, a.role]));

  return (
    <Card className="p-4">
      <h1 className="text-lg font-semibold mb-4">Usuarios de la elección</h1>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Usuario</TableHead>
            <TableHead>Rol</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {users?.map((u) => (
            <TableRow key={u.id}>
              <TableCell>{u.username}</TableCell>
              <TableCell>
                <select
                  className="border rounded p-1 text-sm"
                  value={roleMap.get(u.id) || ''}
                  onChange={(e) =>
                    setRole({ userId: u.id, role: e.target.value || undefined })
                  }
                >
                  {roleOptions.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Card>
  );
};

export default ManageElectionUsers;
