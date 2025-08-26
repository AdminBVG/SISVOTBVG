import React from 'react';
import Button from './ui/button';
import type { Ballot } from '../hooks/useBallots';

interface QuestionWizardProps {
  ballots: Ballot[];
  currentStep: number;
  onNext: () => void;
  onPrev: () => void;
  children: React.ReactNode;
  nextDisabled?: boolean;
}

const QuestionWizard: React.FC<QuestionWizardProps> = ({
  ballots,
  currentStep,
  onNext,
  onPrev,
  children,
  nextDisabled,
}) => {
  const total = ballots.length;
  const progress = Math.min(currentStep + 1, total);
  const percentage = total ? (progress / total) * 100 : 0;

  return (
    <div className="space-y-4">
      <div>
        <p className="text-sm text-gray-600">
          Pregunta {progress} de {total}
        </p>
        <div className="w-full bg-gray-200 rounded-full h-2 mt-1">
          <div
            className="bg-blue-500 h-2 rounded-full"
            style={{ width: `${percentage}%` }}
          ></div>
        </div>
      </div>
      {children}
      <div className="flex justify-between">
        <Button variant="outline" disabled={currentStep === 0} onClick={onPrev}>
          Anterior
        </Button>
        <Button disabled={total === 0 || nextDisabled} onClick={onNext}>
          Siguiente
        </Button>
      </div>
    </div>
  );
};

export default QuestionWizard;