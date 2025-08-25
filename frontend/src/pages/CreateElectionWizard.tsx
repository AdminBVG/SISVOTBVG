import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Card from '../components/ui/card';
import Input from '../components/ui/input';
import Button from '../components/ui/button';
import UserRoleSelector from '../components/UserRoleSelector';
import QuestionBuilder, { QuestionDraft } from '../components/QuestionBuilder';
import { useUsers } from '../hooks/useUsers';
import { useCreateElection } from '../hooks/useCreateElection';
import { useShareholdersImport } from '../hooks/useShareholdersImport';
import { getItem } from '../lib/storage';
import { useToast } from '../components/ui/toast';

const CreateElectionWizard: React.FC = () => {
  const navigate = useNavigate();
  const toast = useToast();
  const [step, setStep] = useState(1);

  // Step 1 - basic data
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState('');
  const [openDate, setOpenDate] = useState('');
  const [closeDate, setCloseDate] = useState('');
  const [quorum, setQuorum] = useState('');
  const [demo, setDemo] = useState(false);

  // Step 2 - participants
  const { data: users } = useUsers(true);
  const [attendanceRegs, setAttendanceRegs] = useState<number[]>([]);
  const [voteRegs, setVoteRegs] = useState<number[]>([]);
  const [userSearch, setUserSearch] = useState('');

  // Step 3 - shareholders
  const shImport = useShareholdersImport();
  const downloadTemplate = async (format: 'csv' | 'xlsx') => {
    const base = import.meta.env.VITE_API_URL || '/api';
    const token = getItem('token');
    const res = await fetch(
      `${base}/elections/0/assistants/template?format=${format}`,
      {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      },
    );
    const blob = await res.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `padron_template.${format === 'xlsx' ? 'xlsx' : 'csv'}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  // Step 4 - ballot
  const [questions, setQuestions] = useState<QuestionDraft[]>([]);

  const { mutateAsync, isLoading } = useCreateElection(() => {
    toast('Votación creada');
    navigate('/votaciones');
  });

  const filteredUsers = users?.filter((u) =>
    u.username.toLowerCase().includes(userSearch.toLowerCase())
  );

  const validateStep = () => {
    if (step === 1) {
      if (!name || !date) {
        toast('Complete los datos requeridos');
        return false;
      }
      if (openDate && closeDate && openDate > closeDate) {
        toast('Rango de fechas inválido');
        return false;
      }
    }
    if (step === 3) {
      if (shImport.errors.length) {
        toast('Corrija los errores del padrón');
        return false;
      }
    }
    if (step === 4) {
      if (questions.length === 0) {
        toast('Agregue al menos una pregunta');
        return false;
      }
    }
    return true;
  };

  const next = () => {
    if (validateStep()) setStep(step + 1);
  };

  const prev = () => setStep(step - 1);

  const handleSubmit = async () => {
    if (!validateStep()) return;
    try {
      const payload: any = {
        name,
        description,
        date,
        ...(openDate ? { registration_start: new Date(openDate).toISOString() } : {}),
        ...(closeDate ? { registration_end: new Date(closeDate).toISOString() } : {}),
        ...(quorum ? { min_quorum: Number(quorum) / 100 } : {}),
        ...(demo ? { demo: true } : {}),
        attendance_registrars: attendanceRegs,
        vote_registrars: voteRegs,
        questions: questions.map((q, i) => {
          const opts =
            q.type === 'boolean' && q.options.length === 0
              ? ['Sí', 'No']
              : q.options;
          return {
            text: q.text,
            type: q.type,
            required: q.required,
            order: i,
            options: opts.map((o, oi) => ({ text: o, value: String(oi) })),
          };
        }),
      };
      const election = await mutateAsync(payload);
      if (shImport.file && shImport.previewData.length > 0) {
        await shImport.upload(election.id);
      }
      // error handled in useMutation
    } catch (e) {
    }
  };

  return (
    <div className="p-4">
      <Card className="p-4 max-w-2xl mx-auto space-y-4">
        <h1 className="text-lg font-semibold">Crear votación</h1>
        <p className="text-sm text-gray-600">Paso {step}/5</p>

        {step === 1 && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm mb-1">Nombre</label>
              <Input value={name} onChange={(e) => setName(e.target.value)} required />
            </div>
            <div>
              <label className="block text-sm mb-1">Descripción</label>
              <textarea
                className="border rounded w-full p-1"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm mb-1">Fecha de la asamblea</label>
              <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
            </div>
            <div>
              <label className="block text-sm mb-1">Inicio</label>
              <Input
                type="datetime-local"
                value={openDate}
                onChange={(e) => setOpenDate(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm mb-1">Fin</label>
              <Input
                type="datetime-local"
                value={closeDate}
                onChange={(e) => setCloseDate(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm mb-1">Quórum mínimo (%)</label>
              <Input
                type="number"
                value={quorum}
                onChange={(e) => setQuorum(e.target.value)}
              />
            </div>
            <div>
              <label className="inline-flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={demo}
                  onChange={(e) => setDemo(e.target.checked)}
                />
                Votación de prueba
              </label>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-2">
            <Input
              placeholder="Buscar usuario"
              value={userSearch}
              onChange={(e) => setUserSearch(e.target.value)}
            />
            <UserRoleSelector
              users={filteredUsers || []}
              attendance={attendanceRegs}
              vote={voteRegs}
              setAttendance={setAttendanceRegs}
              setVote={setVoteRegs}
            />
          </div>
        )}

        {step === 3 && (
          <div className="space-y-4">
            <div className="flex space-x-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => downloadTemplate('csv')}
              >
                Descargar CSV
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => downloadTemplate('xlsx')}
              >
                Descargar Excel
              </Button>
            </div>
            <div>
              <label className="block text-sm mb-1">Archivo de padrón</label>
              <Input
                type="file"
                accept=".csv,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) shImport.handleFile(f);
                }}
              />
            </div>
            {shImport.errors.length > 0 && (
              <div className="text-body" role="alert">
                <ul className="list-disc list-inside">
                  {shImport.errors.map((e, i) => (
                    <li key={i}>{e}</li>
                  ))}
                </ul>
              </div>
            )}
            {shImport.previewData.length > 0 && (
              <div className="overflow-x-auto max-h-64">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr>
                      <th className="px-2">ID</th>
                      <th className="px-2">Accionista</th>
                      <th className="px-2">Representante Legal</th>
                      <th className="px-2">Apoderado</th>
                      <th className="px-2">Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {shImport.previewData.map((row, i) => (
                      <tr key={i}>
                        <td className="px-2">{row.id}</td>
                        <td className="px-2">{row.accionista}</td>
                        <td className="px-2">{row.representante_legal}</td>
                        <td className="px-2">{row.apoderado}</td>
                        <td className="px-2">{row.acciones}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {step === 4 && (
          <div className="space-y-4">
            <QuestionBuilder questions={questions} setQuestions={setQuestions} />
            <div className="border rounded p-2">
              <h2 className="text-sm font-semibold mb-2">Previsualización</h2>
              {questions.map((q, idx) => (
                <div key={idx} className="mb-2">
                  <p className="font-medium">{q.text}</p>
                  {(q.type === 'single_choice' || q.type === 'multiple_choice') && (
                    <ul className="list-disc list-inside text-sm">
                      {q.options.map((o, oi) => (
                        <li key={oi}>{o}</li>
                      ))}
                    </ul>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {step === 5 && (
          <div className="space-y-2 text-sm">
            <p><strong>Nombre:</strong> {name}</p>
            <p><strong>Descripción:</strong> {description}</p>
            <p><strong>Fecha:</strong> {date}</p>
            {openDate && <p><strong>Inicio:</strong> {openDate}</p>}
            {closeDate && <p><strong>Fin:</strong> {closeDate}</p>}
            <p><strong>Registradores de asistencia:</strong> {attendanceRegs.length}</p>
            <p><strong>Registradores de voto:</strong> {voteRegs.length}</p>
            <p><strong>Preguntas:</strong> {questions.length}</p>
            {shImport.previewData.length > 0 && (
              <p><strong>Padrón:</strong> {shImport.previewData.length} registros</p>
            )}
            {demo && <p><strong>Demo:</strong> Sí</p>}
          </div>
        )}

        <div className="flex justify-between pt-4">
          {step > 1 && (
            <Button type="button" variant="outline" onClick={prev}>
              Anterior
            </Button>
          )}
          {step < 5 && (
            <Button type="button" onClick={next}>
              Siguiente
            </Button>
          )}
          {step === 5 && (
            <Button type="button" onClick={handleSubmit} disabled={isLoading}>
              {isLoading ? 'Creando…' : 'Crear votación'}
            </Button>
          )}
        </div>
      </Card>
    </div>
  );
};

export default CreateElectionWizard;
