import React from 'react';

export interface QuestionDraft {
  id: string;
  text: string;
  type: string;
  required: boolean;
  options: string[];
}

interface Props {
  questions: QuestionDraft[];
  setQuestions: (q: QuestionDraft[]) => void;
}

const types = [
  { value: 'single_choice', label: 'Opción múltiple' },
  { value: 'multiple_choice', label: 'Casillas de verificación' },
  { value: 'short_text', label: 'Texto corto' },
  { value: 'long_text', label: 'Texto largo' },
  { value: 'boolean', label: 'Sí/No' },
  { value: 'numeric', label: 'Numérico' },
];

const QuestionBuilder: React.FC<Props> = ({ questions, setQuestions }) => {
  const addQuestion = () =>
    setQuestions([
      ...questions,
      {
        id: `${Date.now()}-${Math.random()}`,
        text: '',
        type: 'short_text',
        required: false,
        options: [],
      },
    ]);

  const updateQuestion = (id: string, data: Partial<QuestionDraft>) => {
    setQuestions(questions.map((q) => (q.id === id ? { ...q, ...data } : q)));
  };

  const removeQuestion = (id: string) => {
    setQuestions(questions.filter((q) => q.id !== id));
  };

  const addOption = (id: string) => {
    setQuestions(
      questions.map((q) =>
        q.id === id ? { ...q, options: [...q.options, ''] } : q,
      ),
    );
  };

  const moveOption = (qid: string, oi: number, dir: -1 | 1) => {
    setQuestions(
      questions.map((q) => {
        if (q.id !== qid) return q;
        const opts = [...q.options];
        const newIndex = oi + dir;
        if (newIndex < 0 || newIndex >= opts.length) return q;
        [opts[oi], opts[newIndex]] = [opts[newIndex], opts[oi]];
        return { ...q, options: opts };
      }),
    );
  };

  const updateOption = (qid: string, oi: number, value: string) => {
    setQuestions(
      questions.map((q) =>
        q.id === qid
          ? {
              ...q,
              options: q.options.map((o, idx) => (idx === oi ? value : o)),
            }
          : q,
      ),
    );
  };

  const removeOption = (qid: string, oi: number) => {
    setQuestions(
      questions.map((q) =>
        q.id === qid
          ? { ...q, options: q.options.filter((_, idx) => idx !== oi) }
          : q,
      ),
    );
  };

  return (
    <div className="space-y-4">
      {questions.map((q) => (
        <div key={q.id} className="border rounded p-2 space-y-2">
          <input
            className="border rounded w-full p-1"
            placeholder="Pregunta"
            value={q.text}
            onChange={(e) => updateQuestion(q.id, { text: e.target.value })}
          />
          <div className="flex space-x-2 items-center text-sm">
            <select
              className="border rounded p-1"
              value={q.type}
              onChange={(e) => {
                const type = e.target.value;
                updateQuestion(q.id, {
                  type,
                  options: type === 'boolean' ? ['Sí', 'No'] : [],
                });
              }}
            >
              {types.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
            <label className="flex items-center space-x-1">
              <input
                type="checkbox"
                checked={q.required}
                onChange={(e) => updateQuestion(q.id, { required: e.target.checked })}
              />
              <span>Requerida</span>
            </label>
            <button type="button" className="text-red-600" onClick={() => removeQuestion(q.id)}>
              Eliminar
            </button>
          </div>
          {(q.type === 'single_choice' || q.type === 'multiple_choice' || q.type === 'boolean') && (
            <div className="ml-4 space-y-1">
              {q.options.map((o, oi) => (
                <div key={oi} className="flex space-x-2 items-center">
                  <input
                    className="border rounded p-1 flex-1"
                    placeholder={`Opción ${oi + 1}`}
                    value={o}
                    onChange={(e) => updateOption(q.id, oi, e.target.value)}
                    disabled={q.type === 'boolean'}
                  />
                  {q.type !== 'boolean' && (
                    <>
                      <button
                        type="button"
                        className="text-blue-600"
                        onClick={() => moveOption(q.id, oi, -1)}
                      >
                        ↑
                      </button>
                      <button
                        type="button"
                        className="text-blue-600"
                        onClick={() => moveOption(q.id, oi, 1)}
                      >
                        ↓
                      </button>
                      <button
                        type="button"
                        className="text-red-600"
                        onClick={() => removeOption(q.id, oi)}
                      >
                        X
                      </button>
                    </>
                  )}
                </div>
              ))}
              {q.type !== 'boolean' && (
                <button
                  type="button"
                  className="text-blue-600 text-sm"
                  onClick={() => addOption(q.id)}
                >
                  Añadir opción
                </button>
              )}
            </div>
          )}
        </div>
      ))}
      <button type="button" className="text-blue-600 text-sm" onClick={addQuestion}>
        Añadir pregunta
      </button>
    </div>
  );
};

export default QuestionBuilder;
