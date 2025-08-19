import React, { useState } from 'react';
import Card from '../components/ui/card';
import Input from '../components/ui/input';
import Button from '../components/ui/button';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '../components/ui/table';
import { useUsers } from '../hooks/useUsers';
import { useCreateUser } from '../hooks/useCreateUser';
import { useUpdateUser } from '../hooks/useUpdateUser';
import { useDeleteUser } from '../hooks/useDeleteUser';
import { useToast } from '../components/ui/toast';

const roles = ['ADMIN_BVG', 'REGISTRADOR_BVG', 'OBSERVADOR_BVG'];

const ManageUsers: React.FC = () => {
  const toast = useToast();
  const { data: users, isLoading, error, refetch } = useUsers();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('REGISTRADOR_BVG');

  const { mutate: createUser, isLoading: creating } = useCreateUser(() => {
    toast('Usuario creado');
    setUsername('');
    setPassword('');
    setRole('REGISTRADOR_BVG');
    refetch();
  }, (err) => toast(err.message));

  const { mutate: updateUser } = useUpdateUser(() => {
    toast('Usuario actualizado');
    refetch();
  }, (err) => toast(err.message));

  const { mutate: deleteUser } = useDeleteUser(() => {
    toast('Usuario eliminado');
    refetch();
  }, (err) => toast(err.message));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createUser({ username, password, role });
  };

  return (
    <div className="space-y-6">
      <Card className="p-4 max-w-md">
        <h1 className="text-lg font-semibold mb-4">Nuevo usuario</h1>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm mb-1">Usuario</label>
            <Input value={username} onChange={(e) => setUsername(e.target.value)} required />
          </div>
          <div>
            <label className="block text-sm mb-1">Contraseña</label>
            <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
          </div>
          <div>
            <label className="block text-sm mb-1">Rol</label>
            <select
              className="border rounded w-full p-2"
              value={role}
              onChange={(e) => setRole(e.target.value)}
            >
              {roles.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </div>
          <Button type="submit" disabled={creating}>
            Crear
          </Button>
        </form>
      </Card>

      <Card className="p-4">
        <h2 className="text-lg font-semibold mb-4">Usuarios</h2>
        {isLoading && <p>Cargando...</p>}
        {error && <p className="text-red-600">Error al cargar usuarios</p>}
        {!isLoading && !error && (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Usuario</TableHead>
                <TableHead>Rol</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users?.map((u) => (
                <TableRow key={u.id}>
                  <TableCell>{u.username}</TableCell>
                  <TableCell>
                    <select
                      className="border rounded p-1"
                      value={u.role}
                      onChange={(e) => updateUser({ id: u.id, role: e.target.value })}
                    >
                      {roles.map((r) => (
                        <option key={r} value={r}>
                          {r}
                        </option>
                      ))}
                    </select>
                  </TableCell>
                  <TableCell>
                    <Button variant="outline" onClick={() => deleteUser({ id: u.id })}>
                      Eliminar
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>
    </div>
  );
};

export default ManageUsers;
