import React from 'react';
import Button from './ui/button';
import type { Ballot } from '../hooks/useBallots';

interface QuestionWizardProps {
  ballots: Ballot[];
  currentStep: number;
  onNext: () => void;
  onPrev: () => void;
  children: React.ReactNode;
}

const QuestionWizard: React.FC<QuestionWizardProps> = ({
  ballots,
  currentStep,
  onNext,
  onPrev,
  children,
}) => {
  const total = ballots.length;
  const progress = Math.min(currentStep + 1, total);
  const percentage = total ? (progress / total) * 100 : 0;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Button variant="outline" disabled={currentStep === 0} onClick={onPrev}>
          Anterior
        </Button>
        <div className="flex-1">
          <div>
            Pregunta {progress} de {total}
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2 mt-1">
            <div
              className="bg-blue-500 h-2 rounded-full"
              style={{ width: `${percentage}%` }}
            ></div>
          </div>
        </div>
        <Button variant="outline" disabled={total === 0} onClick={onNext}>
          Siguiente pregunta
        </Button>
      </div>
      {children}
    </div>
  );
};

export default QuestionWizard;

