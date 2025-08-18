import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Card from '../components/ui/card';
import Button from '../components/ui/button';
import Input from '../components/ui/input';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '../components/ui/table';
import { useToast } from '../components/ui/toast';
import { useElections } from '../hooks/useElections';
import { useCreateElection } from '../hooks/useCreateElection';
import { Calendar, List } from '../lib/icons';

const Votaciones: React.FC = () => {
  const navigate = useNavigate();
  const toast = useToast();
  const [name, setName] = useState('');
  const [date, setDate] = useState('');

  const { data: elections, isLoading, error, refetch } = useElections();
  const { mutate, isLoading: creating } = useCreateElection(() => {
    toast('Votación creada');
    setName('');
    setDate('');
    refetch();
  }, (err) => toast(err.message));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    mutate({ name, date });
  };

  return (
    <div className="space-y-6">
      <Card className="p-4">
        <h1 className="text-lg font-semibold mb-4 flex items-center"><List className="w-4 h-4 mr-2" />Nueva votación</h1>
        <form onSubmit={handleSubmit} className="space-y-4 max-w-md">
          <div>
            <label className="block text-sm mb-1">Nombre de la votación</label>
            <Input value={name} onChange={(e) => setName(e.target.value)} required />
          </div>
          <div>
            <label className="block text-sm mb-1 flex items-center"><Calendar className="w-4 h-4 mr-1" />Fecha de la asamblea</label>
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
          </div>
          <Button type="submit" disabled={creating}>Crear votación</Button>
        </form>
      </Card>

      <Card className="p-4">
        <h2 className="text-lg font-semibold mb-4">Votaciones</h2>
        {isLoading && <p>Cargando...</p>}
        {error && <p className="text-red-600">Error al cargar votaciones</p>}
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
              {elections?.map((e) => (
                <TableRow key={e.id}>
                  <TableCell>{e.name}</TableCell>
                  <TableCell>{new Date(e.date).toLocaleDateString('es-EC')}</TableCell>
                  <TableCell>{e.status === 'OPEN' ? 'Abierta' : 'Cerrada'}</TableCell>
                  <TableCell>
                    <Button variant="outline" onClick={() => navigate(`/votaciones/${e.id}/asistencia`)}>
                      Gestionar asistentes
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

export default Votaciones;
