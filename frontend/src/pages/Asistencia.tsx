import React, { useState } from 'react';
import { useParams } from 'react-router-dom';
import Input from '../components/ui/input';
import Button from '../components/ui/button';
import Card from '../components/ui/card';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '../components/ui/table';
import { useToast } from '../components/ui/toast';
import { useShareholders } from '../hooks/useShareholders';
import { useMarkAttendance } from '../hooks/useMarkAttendance';
import { useBulkMarkAttendance } from '../hooks/useBulkMarkAttendance';
import { useAttendanceHistory } from '../hooks/useAttendanceHistory';
import { getItem } from '../lib/storage';
import { User, Check } from '../lib/icons';

const Asistencia: React.FC = () => {
  const { id } = useParams();
  const electionId = Number(id);
  const toast = useToast();
  const [search, setSearch] = useState('');
  const [blocked, setBlocked] = useState(false);

  const handleForbidden = (err: any) => {
    toast(err.message);
    setBlocked(true);
  };

  const { data: shareholders, isLoading, error, refetch } = useShareholders(
    electionId,
    search,
    (err) => {
      if (err.status === 403) {
        handleForbidden(err);
      }
    },
  );
  const markAttendance = useMarkAttendance(
    electionId,
    () => {
      toast('Asistencia registrada');
      refetch();
    },
    (err) => {
      if (err.status === 403) {
        handleForbidden(err);
      } else {
        toast(err.message);
      }
    },
  );
  const bulkMark = useBulkMarkAttendance(
    electionId,
    () => {
      toast('Asistencia registrada');
      refetch();
      setBulkCodes('');
    },
    (err) => {
      if (err.status === 403) {
        handleForbidden(err);
      } else {
        toast(err.message);
      }
    },
  );
  const [bulkCodes, setBulkCodes] = useState('');
  const [bulkMode, setBulkMode] = useState('PRESENCIAL');

  const handleMark = (code: string, mode: string) => {
    markAttendance.mutate({ code, mode });
  };

  const handleBulkSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const codes = bulkCodes
      .split(/\s+/)
      .map((c) => c.trim())
      .filter(Boolean);
    if (codes.length) {
      bulkMark.mutate({ codes, mode: bulkMode });
    }
  };

  const [historyCode, setHistoryCode] = useState<string | null>(null);
  const { data: history } = useAttendanceHistory(
    electionId,
    historyCode || '',
    !!historyCode,
  );

  const toggleHistory = (code: string) => {
    setHistoryCode(historyCode === code ? null : code);
  };

  const handleExport = async () => {
    try {
      const base = import.meta.env.VITE_API_URL || '/api';
      const token = getItem('token');
      const res = await fetch(`${base}/elections/${electionId}/attendance/export`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `attendance_${electionId}.csv`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (err: any) {
      toast(err.message || 'No se pudo exportar');
    }
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
        <Card className="p-4 space-y-2">
          <h2 className="text-lg font-semibold">Registro masivo</h2>
          <form onSubmit={handleBulkSubmit} className="space-y-2">
            <textarea
              className="w-full border p-2"
              placeholder="Códigos separados por espacio o línea"
              value={bulkCodes}
              onChange={(e) => setBulkCodes(e.target.value)}
            />
            <select
              className="border p-2"
              value={bulkMode}
              onChange={(e) => setBulkMode(e.target.value)}
            >
              <option value="PRESENCIAL">Presencial</option>
              <option value="VIRTUAL">Virtual</option>
              <option value="AUSENTE">Ausente</option>
            </select>
            <Button type="submit" disabled={blocked || bulkMark.isLoading}>
              Marcar en bloque
            </Button>
          </form>
        </Card>
        {isLoading && <p>Cargando...</p>}
        {error && (
          <p role="alert" className="text-body">
            {error.message || 'Error al cargar accionistas'}
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
                <TableHead>Historial</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {shareholders?.map((s) => (
                <React.Fragment key={s.id}>
                  <TableRow>
                    <TableCell>{s.code}</TableCell>
                    <TableCell>{s.name}</TableCell>
                    <TableCell>{s.actions}</TableCell>
                    <TableCell className="space-x-2">
                      <Button disabled={blocked} onClick={() => handleMark(s.code, 'PRESENCIAL')}>
                        <Check className="w-4 h-4 inline mr-1" />Presencial
                      </Button>
                      <Button disabled={blocked} onClick={() => handleMark(s.code, 'VIRTUAL')}>
                        <Check className="w-4 h-4 inline mr-1" />Virtual
                      </Button>
                      <Button disabled={blocked} onClick={() => handleMark(s.code, 'AUSENTE')}>
                        <Check className="w-4 h-4 inline mr-1" />Ausente
                      </Button>
                    </TableCell>
                    <TableCell>{s.attendance_mode || 'AUSENTE'}</TableCell>
                    <TableCell>
                      <Button variant="link" onClick={() => toggleHistory(s.code)}>
                        {historyCode === s.code ? 'Ocultar' : 'Ver'}
                      </Button>
                    </TableCell>
                  </TableRow>
                  {historyCode === s.code && history && (
                    <TableRow>
                      <TableCell colSpan={6}>
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>De</TableHead>
                              <TableHead>A</TableHead>
                              <TableHead>Por</TableHead>
                              <TableHead>Fecha</TableHead>
                              <TableHead>Motivo</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {history.map((h) => (
                              <TableRow key={h.id}>
                                <TableCell>{h.from_mode || '-'}</TableCell>
                                <TableCell>{h.to_mode || '-'}</TableCell>
                                <TableCell>{h.changed_by}</TableCell>
                                <TableCell>
                                  {new Date(h.changed_at).toLocaleString()}
                                </TableCell>
                                <TableCell>{h.reason || '-'}</TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </TableCell>
                    </TableRow>
                  )}
                </React.Fragment>
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
        <Button onClick={handleExport}>Exportar CSV</Button>
      </Card>
    </div>
  );
};

export default Asistencia;
