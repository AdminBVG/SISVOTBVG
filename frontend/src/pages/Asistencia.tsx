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
import { useSendAttendanceReport } from '../hooks/useSendAttendanceReport';
import { getItem } from '../lib/storage';
import { User } from '../lib/icons';
import Alert from '../components/ui/alert';

const Asistencia: React.FC = () => {
  const { id } = useParams();
  const electionId = Number(id);
  const toast = useToast();
  const [search, setSearch] = useState('');
  const [blocked, setBlocked] = useState(false);
  const [emails, setEmails] = useState('');
  const [alertMsg, setAlertMsg] = useState('');

  const handleForbidden = (err: any) => {
    toast(err.message);
    setAlertMsg('No autorizado para registrar asistencia');
    setBlocked(true);
  };

  const { data: shareholders, isLoading, error } = useShareholders(
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
    (data) => {
      toast('Asistencia registrada');
      if (data.failed.length) {
        toast(`No se pudieron registrar: ${data.failed.join(', ')}`);
      }
      setSelected({});
    },
    (err) => {
      if (err.status === 403) {
        handleForbidden(err);
      } else {
        toast(err.message);
      }
    },
  );
  const [bulkMode, setBulkMode] = useState('PRESENCIAL');
  const [selected, setSelected] = useState<Record<string, boolean>>({});

  const handleMark = (code: string, mode: string) => {
    markAttendance.mutate({ code, mode });
  };

  const toggleSelect = (code: string) => {
    setSelected((prev) => ({ ...prev, [code]: !prev[code] }));
  };

  const selectedCodes = Object.keys(selected).filter((c) => selected[c]);

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      const all: Record<string, boolean> = {};
      shareholders?.forEach((s) => {
        all[s.code] = true;
      });
      setSelected(all);
    } else {
      setSelected({});
    }
  };

  const applyBulk = () => {
    if (selectedCodes.length) {
      bulkMark.mutate({ codes: selectedCodes, mode: bulkMode });
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

  const sendReport = useSendAttendanceReport(
    electionId,
    () => toast('Informe enviado'),
    (err) => toast(err.message),
  );

  const handleSendReport = () => {
    const recipients = emails
      .split(',')
      .map((e) => e.trim())
      .filter(Boolean);
    if (recipients.length) {
      sendReport.mutate({ recipients });
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
          {alertMsg && <Alert message={alertMsg} />}
          <Input
            placeholder="Buscar por nombre o código"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <div className="flex gap-2">
            <Input
              placeholder="Correos separados por coma"
              value={emails}
              onChange={(e) => setEmails(e.target.value)}
            />
            <Button onClick={handleSendReport} disabled={sendReport.isLoading}>
              Enviar informe
            </Button>
            <Button variant="outline" onClick={handleExport}>
              Exportar CSV
            </Button>
          </div>
        {selectedCodes.length > 0 && !blocked && (
          <div className="flex items-center space-x-2 bg-gray-50 p-2 rounded">
            <span>{selectedCodes.length} seleccionados</span>
            <select
              className="border p-1"
              value={bulkMode}
              onChange={(e) => setBulkMode(e.target.value)}
              disabled={blocked}
            >
              <option value="PRESENCIAL">Presencial</option>
              <option value="VIRTUAL">Virtual</option>
              <option value="AUSENTE">Ausente</option>
            </select>
            <Button
              type="button"
              onClick={applyBulk}
              disabled={blocked || bulkMark.isLoading}
            >
              Aplicar
            </Button>
          </div>
        )}
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
                <TableHead>
                  <input
                    type="checkbox"
                    className="h-4 w-4"
                    onChange={(e) => handleSelectAll(e.target.checked)}
                    checked={
                      shareholders?.length > 0 &&
                      selectedCodes.length === shareholders.length
                    }
                    disabled={blocked}
                  />
                </TableHead>
                <TableHead>Código</TableHead>
                <TableHead>Accionista</TableHead>
                <TableHead>Representante Legal</TableHead>
                <TableHead>Apoderado</TableHead>
                <TableHead>Acciones</TableHead>
                <TableHead>Asistencia</TableHead>
                <TableHead>Historial</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {shareholders?.map((s) => (
                <React.Fragment key={s.id}>
                  <TableRow>
                    <TableCell>
                      <input
                        type="checkbox"
                        className="h-4 w-4"
                        checked={!!selected[s.code]}
                        onChange={() => toggleSelect(s.code)}
                        disabled={blocked}
                      />
                    </TableCell>
                    <TableCell>{s.code}</TableCell>
                    <TableCell>{s.name}</TableCell>
                    <TableCell>{s.representante || '-'}</TableCell>
                    <TableCell>
                      {s.apoderado ? (
                        s.apoderado_pdf && s.attendee_id ? (
                          <a
                            href={`${import.meta.env.VITE_API_URL || '/api'}/elections/${electionId}/assistants/${s.attendee_id}/apoderado-pdf`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 underline"
                          >
                            {s.apoderado}
                          </a>
                        ) : (
                          s.apoderado
                        )
                      ) : (
                        '-'
                      )}
                    </TableCell>
                    <TableCell>{s.actions}</TableCell>
                    <TableCell>
                      <select
                        className="border p-1"
                        disabled={blocked}
                        value={s.attendance_mode || 'AUSENTE'}
                        onChange={(e) => handleMark(s.code, e.target.value)}
                      >
                        <option value="PRESENCIAL">Presencial</option>
                        <option value="VIRTUAL">Virtual</option>
                        <option value="AUSENTE">Ausente</option>
                      </select>
                    </TableCell>
                    <TableCell>
                      <Button variant="link" onClick={() => toggleHistory(s.code)}>
                        {historyCode === s.code ? 'Ocultar' : 'Ver'}
                      </Button>
                    </TableCell>
                  </TableRow>
                  {historyCode === s.code && history && (
                    <TableRow>
                      <TableCell colSpan={8}>
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
                                <TableCell>{h.changed_by || '-'}</TableCell>
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
      </Card>
    </div>
  );
};

export default Asistencia;
