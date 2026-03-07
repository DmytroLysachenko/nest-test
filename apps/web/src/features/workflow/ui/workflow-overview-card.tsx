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
          <div className="bg-surface-muted h-2 overflow-hidden rounded-full">
            <div className="bg-app-success h-full rounded-full transition-all" style={{ width: `${progress}%` }} />
          </div>
          <p className="text-text-soft text-xs">
            {isLoading ? 'Refreshing workflow status...' : `Progress: ${progress}%`}
          </p>
        </div>

        <div className="grid gap-2 md:grid-cols-2">
          {steps.map((step, index) => (
            <article
              key={step.key}
              className={`rounded-md border p-3 text-sm ${
                step.done ? 'border-app-success-border bg-app-success-soft' : 'border-border bg-surface-muted'
              }`}
            >
              <p className="text-text-strong font-medium">
                {index + 1}. {step.label}
              </p>
              <p className="text-text-soft mt-1 text-xs">{step.hint}</p>
            </article>
          ))}
        </div>
      </div>
    </Card>
  );
};
