import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Card from '../components/ui/card';
import Input from '../components/ui/input';
import Button from '../components/ui/button';
import QuestionBuilder, { QuestionDraft } from '../components/QuestionBuilder';
import { useUpdateElection } from '../hooks/useUpdateElection';
import { apiFetch } from '../lib/api';
import { useToast } from '../components/ui/toast';

const EditElection: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const [name, setName] = useState('');
  const [date, setDate] = useState('');
  const [questions, setQuestions] = useState<QuestionDraft[]>([]);
  const [quorum, setQuorum] = useState('');

  useEffect(() => {
    if (!id) return;
    apiFetch<any>(`/elections/${id}`).then((e) => {
      setName(e.name);
      setDate(e.date.slice(0, 10));
      setQuorum(e.min_quorum ? String(e.min_quorum * 100) : '');
    });
    apiFetch<any[]>(`/elections/${id}/questions`).then((qs) => {
      setQuestions(
        qs.map((q) => ({
          text: q.text,
          type: q.type,
          required: q.required,
          options: q.options?.map((o: any) => o.text) || [],
        }))
      );
    });
  }, [id]);

  const { mutate, isLoading } = useUpdateElection(
    () => {
      toast('Votación actualizada');
      navigate('/votaciones');
    },
    (err) => toast(err.message)
  );

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    mutate({
      id: Number(id),
      name,
      date,
      ...(quorum ? { min_quorum: Number(quorum) / 100 } : {}),
      questions: questions.map((q, i) => ({
        text: q.text,
        type: q.type,
        required: q.required,
        order: i,
        options: q.options.map((o, oi) => ({ text: o, value: String(oi) })),
      })),
    });
  };

  return (
    <div className="p-4">
      <Card className="p-4 max-w-xl mx-auto">
        <form onSubmit={onSubmit} className="space-y-4">
          <h1 className="text-lg font-semibold">Editar votación</h1>
          <div>
            <label className="block text-sm mb-1">Nombre</label>
            <Input value={name} onChange={(e) => setName(e.target.value)} required />
          </div>
          <div>
            <label className="block text-sm mb-1">Fecha</label>
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
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
            <label className="block text-sm mb-1">Preguntas</label>
            <QuestionBuilder questions={questions} setQuestions={setQuestions} />
          </div>
          <div className="flex space-x-2">
            <Button type="submit" disabled={isLoading}>Guardar</Button>
            <Button type="button" variant="outline" onClick={() => navigate('/votaciones')}>
              Cancelar
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
};

export default EditElection;
