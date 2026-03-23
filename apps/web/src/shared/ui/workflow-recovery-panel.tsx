'use client';

import { Button } from '@/shared/ui/button';
import { Card } from '@/shared/ui/card';
import { StatusPill } from '@/shared/ui/dashboard-primitives';

type WorkflowRecoveryPanelProps = {
  blockers: Array<{
    key: string;
    severity: 'critical' | 'warning' | 'info';
    title: string;
    description: string;
    href: string;
    ctaLabel: string;
  }>;
  title?: string;
  description?: string;
};

export const WorkflowRecoveryPanel = ({
  blockers,
  title = 'Recovery Center',
  description = 'Targeted fixes for current workflow blockers.',
}: WorkflowRecoveryPanelProps) => {
  if (!blockers.length) {
    return null;
  }

  return (
    <Card title={title} description={description}>
      <div className="grid gap-3 md:grid-cols-2">
        {blockers.map((blocker) => (
          <div key={blocker.key} className="app-inset-stack space-y-3">
            <StatusPill
              value={blocker.severity}
              tone={blocker.severity === 'critical' ? 'danger' : blocker.severity === 'warning' ? 'warning' : 'info'}
            />
            <p className="text-text-strong font-semibold">{blocker.title}</p>
            <p className="text-text-soft text-sm">{blocker.description}</p>
            <Button size="sm" onClick={() => (window.location.href = blocker.href)}>
              {blocker.ctaLabel}
            </Button>
          </div>
        ))}
      </div>
    </Card>
  );
};
