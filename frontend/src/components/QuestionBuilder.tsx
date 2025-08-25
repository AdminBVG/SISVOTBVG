import React from 'react';

export interface QuestionDraft {
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
    setQuestions([...questions, { text: '', type: 'short_text', required: false, options: [] }]);

  const updateQuestion = (i: number, data: Partial<QuestionDraft>) => {
    const copy = [...questions];
    copy[i] = { ...copy[i], ...data };
    setQuestions(copy);
  };

  const removeQuestion = (i: number) => {
    const copy = [...questions];
    copy.splice(i, 1);
    setQuestions(copy);
  };

  const addOption = (i: number) => {
    const copy = [...questions];
    copy[i].options.push('');
    setQuestions(copy);
  };

  const moveOption = (qi: number, oi: number, dir: -1 | 1) => {
    const copy = [...questions];
    const opts = copy[qi].options;
    const newIndex = oi + dir;
    if (newIndex < 0 || newIndex >= opts.length) return;
    [opts[oi], opts[newIndex]] = [opts[newIndex], opts[oi]];
    setQuestions(copy);
  };

  const updateOption = (qi: number, oi: number, value: string) => {
    const copy = [...questions];
    copy[qi].options[oi] = value;
    setQuestions(copy);
  };

  const removeOption = (qi: number, oi: number) => {
    const copy = [...questions];
    copy[qi].options.splice(oi, 1);
    setQuestions(copy);
  };

  return (
    <div className="space-y-4">
      {questions.map((q, i) => (
        <div key={i} className="border rounded p-2 space-y-2">
          <input
            className="border rounded w-full p-1"
            placeholder="Pregunta"
            value={q.text}
            onChange={(e) => updateQuestion(i, { text: e.target.value })}
          />
          <div className="flex space-x-2 items-center text-sm">
            <select
              className="border rounded p-1"
              value={q.type}
              onChange={(e) => {
                const type = e.target.value;
                updateQuestion(i, {
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
                onChange={(e) => updateQuestion(i, { required: e.target.checked })}
              />
              <span>Requerida</span>
            </label>
            <button type="button" className="text-red-600" onClick={() => removeQuestion(i)}>
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
                    onChange={(e) => updateOption(i, oi, e.target.value)}
                    disabled={q.type === 'boolean'}
                  />
                  {q.type !== 'boolean' && (
                    <>
                      <button
                        type="button"
                        className="text-blue-600"
                        onClick={() => moveOption(i, oi, -1)}
                      >
                        ↑
                      </button>
                      <button
                        type="button"
                        className="text-blue-600"
                        onClick={() => moveOption(i, oi, 1)}
                      >
                        ↓
                      </button>
                      <button
                        type="button"
                        className="text-red-600"
                        onClick={() => removeOption(i, oi)}
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
                  onClick={() => addOption(i)}
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
