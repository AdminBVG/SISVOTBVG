import React, { useState } from 'react';
import { useParams } from 'react-router-dom';
import Input from '../components/ui/input';
import Button from '../components/ui/button';
import Card from '../components/ui/card';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '../components/ui/table';
import { useToast } from '../components/ui/toast';
import { useShareholders } from '../hooks/useShareholders';
import { useMarkAttendance } from '../hooks/useMarkAttendance';
import { User, Check } from '../lib/icons';

const Asistencia: React.FC = () => {
  const { id } = useParams();
  const electionId = Number(id);
  const toast = useToast();
  const [search, setSearch] = useState('');

  const { data: shareholders, isLoading, error, refetch } = useShareholders(electionId, search);
  const markAttendance = useMarkAttendance(electionId, () => {
    toast('Asistencia registrada');
    refetch();
  }, (err) => toast(err.message));
  const handleMark = (code: string, mode: string) => {
    markAttendance.mutate({ code, mode });
  };

  const capitalSuscrito =
    shareholders?.reduce((acc, sh) => acc + (sh.actions || 0), 0) || 0;
  const capitalPresente =
    shareholders?.filter(
      (sh) => sh.attendance_mode && sh.attendance_mode !== 'AUSENTE',
    ).reduce((acc, sh) => acc + (sh.actions || 0), 0) || 0;
  const quorum = capitalSuscrito
    ? ((capitalPresente / capitalSuscrito) * 100).toFixed(2)
    : '0';

  return (
    <div className="flex flex-col md:flex-row gap-4">
      <div className="flex-1 space-y-4">
        <h1 className="text-xl font-semibold flex items-center"><User className="w-5 h-5 mr-2" />Registro de asistencia</h1>
        <Input
          placeholder="Buscar por nombre o código"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        {isLoading && <p>Cargando...</p>}
        {error && (
          <p role="alert" className="text-body">
            Error al cargar accionistas
          </p>
        )}
        {!isLoading && !error && (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Código</TableHead>
                <TableHead>Nombre</TableHead>
                <TableHead>Acciones</TableHead>
                <TableHead>Marcar</TableHead>
                <TableHead>Estado</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {shareholders?.map((s) => (
                <TableRow key={s.id}>
                  <TableCell>{s.code}</TableCell>
                  <TableCell>{s.name}</TableCell>
                  <TableCell>{s.actions}</TableCell>
                  <TableCell className="space-x-2">
                    <Button onClick={() => handleMark(s.code, 'PRESENCIAL')}>
                      <Check className="w-4 h-4 inline mr-1" />Presencial
                    </Button>
                    <Button onClick={() => handleMark(s.code, 'VIRTUAL')}>
                      <Check className="w-4 h-4 inline mr-1" />Virtual
                    </Button>
                    <Button onClick={() => handleMark(s.code, 'AUSENTE')}>
                      <Check className="w-4 h-4 inline mr-1" />Ausente
                    </Button>
                  </TableCell>
                  <TableCell>{s.attendance_mode || 'AUSENTE'}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>
      <Card className="w-full md:w-64 p-4 space-y-2 h-fit">
        <h2 className="text-lg font-semibold">Resumen</h2>
        <p>Capital suscrito: {capitalSuscrito}</p>
        <p>Capital presente: {capitalPresente}</p>
        <p>% de quórum: {quorum}%</p>
      </Card>
    </div>
  );
};

export default Asistencia;
