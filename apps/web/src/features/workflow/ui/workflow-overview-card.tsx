'use client';

import { Card } from '@/shared/ui/card';

type WorkflowOverviewCardProps = {
  completedSteps: number;
  totalSteps: number;
  isLoading: boolean;
  steps: Array<{
    key: string;
    label: string;
    done: boolean;
    hint: string;
  }>;
};

export const WorkflowOverviewCard = ({ completedSteps, totalSteps, isLoading, steps }: WorkflowOverviewCardProps) => {
  const progress = totalSteps > 0 ? Math.round((completedSteps / totalSteps) * 100) : 0;

  return (
    <Card
      title="Workflow progress"
      description={`Track end-to-end readiness: ${completedSteps}/${totalSteps} steps completed.`}
    >
      <div className="space-y-4">
        <div className="space-y-2">
          <div className="h-2 overflow-hidden rounded-full bg-slate-200">
            <div className="h-full rounded-full bg-emerald-500 transition-all" style={{ width: `${progress}%` }} />
          </div>
          <p className="text-xs text-slate-600">
            {isLoading ? 'Refreshing workflow status...' : `Progress: ${progress}%`}
          </p>
        </div>

        <div className="grid gap-2 md:grid-cols-2">
          {steps.map((step, index) => (
            <article
              key={step.key}
              className={`rounded-md border p-3 text-sm ${
                step.done ? 'border-emerald-200 bg-emerald-50' : 'border-slate-200 bg-slate-50'
              }`}
            >
              <p className="font-medium text-slate-900">
                {index + 1}. {step.label}
              </p>
              <p className="mt-1 text-xs text-slate-600">{step.hint}</p>
            </article>
          ))}
        </div>
      </div>
    </Card>
  );
};
