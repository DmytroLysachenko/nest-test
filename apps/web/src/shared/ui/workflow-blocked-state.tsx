'use client';

import { Lock } from 'lucide-react';

import { Button } from '@/shared/ui/button';
import { Card } from '@/shared/ui/card';
import { EmptyState } from '@/shared/ui/empty-state';

type WorkflowBlockedStateProps = {
  title: string;
  description: string;
  actionLabel: string;
  onAction: () => void;
  breakdown?: Array<{
    key: string;
    label: string;
    ready: boolean;
    detail: string;
  }>;
};

export const WorkflowBlockedState = ({
  title,
  description,
  actionLabel,
  onAction,
  breakdown = [],
}: WorkflowBlockedStateProps) => (
  <main className="app-page space-y-6">
    <EmptyState icon={<Lock className="h-8 w-8" />} title={title} description={description} />
    <div className="flex justify-center">
      <Button onClick={onAction}>{actionLabel}</Button>
    </div>
    {breakdown.length ? (
      <Card title="What is blocking this page" description="Server-driven readiness stages for the current workflow.">
        <div className="space-y-3">
          {breakdown.map((step) => (
            <div key={step.key} className="app-muted-panel">
              <div className="flex items-center justify-between gap-3">
                <p className="text-text-strong text-sm font-semibold">{step.label}</p>
                <span className={`app-badge ${step.ready ? '' : 'text-app-warning'}`}>
                  {step.ready ? 'Ready' : 'Blocked'}
                </span>
              </div>
              <p className="text-text-soft mt-2 text-sm">{step.detail}</p>
            </div>
          ))}
        </div>
      </Card>
    ) : null}
  </main>
);
