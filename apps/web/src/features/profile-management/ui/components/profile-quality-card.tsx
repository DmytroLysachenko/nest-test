'use client';

import {
  presentProfileQualityMissing,
  presentProfileQualitySignals,
} from '@/features/profile-management/model/profile-quality-presenter';
import { Card } from '@/shared/ui/card';
import { EmptyState } from '@/shared/ui/empty-state';
import { WorkflowInlineNotice } from '@/shared/ui/workflow-feedback';

import type { CareerProfileQualityDto } from '@/shared/types/api';

type ProfileQualityCardProps = {
  quality: CareerProfileQualityDto | undefined;
  emptyDescription?: string;
};

const statusClass: Record<'ok' | 'weak' | 'missing', string> = {
  ok: 'bg-app-success-soft text-app-success',
  weak: 'bg-app-warning-soft text-app-warning',
  missing: 'bg-app-danger-soft text-app-danger',
};

export const ProfileQualityCard = ({
  quality,
  emptyDescription = 'No profile health summary is available yet.',
}: ProfileQualityCardProps) => {
  const presentedSignals = quality ? presentProfileQualitySignals(quality.signals) : [];
  const presentedMissing = quality ? presentProfileQualityMissing(quality.missing) : [];

  return (
    <Card
      title="Profile health"
      description="A simple read on how complete the current profile is for search and matching."
    >
      {quality ? (
        <div className="space-y-4">
          <div className="app-tonal-section space-y-3">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <p className="text-text-soft text-xs uppercase tracking-[0.14em]">Quality score</p>
                <p className="text-text-strong mt-2 text-3xl font-semibold tracking-[-0.04em]">{quality.score}/100</p>
              </div>
              <p className="text-text-soft max-w-sm text-sm">
                This score summarizes how complete and reliable the current profile is for search and matching.
              </p>
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="app-open-section border-border/35 border-t pt-3">
                <p className="text-text-soft text-xs uppercase tracking-[0.16em]">Strong signals</p>
                <p className="text-text-strong mt-2 text-xl font-semibold">
                  {presentedSignals.filter((signal) => signal.status === 'ok').length}
                </p>
              </div>
              <div className="app-open-section border-border/35 border-t pt-3">
                <p className="text-text-soft text-xs uppercase tracking-[0.16em]">Needs strengthening</p>
                <p className="text-text-strong mt-2 text-xl font-semibold">
                  {presentedSignals.filter((signal) => signal.status === 'weak').length}
                </p>
              </div>
              <div className="app-open-section border-border/35 border-t pt-3">
                <p className="text-text-soft text-xs uppercase tracking-[0.16em]">Missing</p>
                <p className="text-text-strong mt-2 text-xl font-semibold">
                  {presentedSignals.filter((signal) => signal.status === 'missing').length}
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            {presentedSignals.map((signal) => (
              <div key={signal.key} className="app-open-section border-border/45 border-t pt-3 text-sm">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-text-strong font-medium">{signal.label}</span>
                  <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${statusClass[signal.status]}`}>
                    {signal.statusLabel}
                  </span>
                </div>
                <p className="text-text-soft mt-2 text-xs leading-5">{signal.message}</p>
              </div>
            ))}
          </div>

          {quality.recommendations.length ? (
            <div className="app-tonal-section space-y-2">
              <p className="text-text-strong text-sm font-semibold">Recommendations</p>
              <ul className="text-text-soft list-disc space-y-1 pl-5 text-sm">
                {quality.recommendations.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
          ) : null}
          {presentedMissing.length ? (
            <WorkflowInlineNotice
              title="Most likely blockers"
              description={`Missing or weak areas: ${presentedMissing.join(', ')}.`}
              tone="warning"
            />
          ) : null}
        </div>
      ) : (
        <EmptyState
          title="Profile health is unavailable"
          description={emptyDescription}
          className="border-0 bg-transparent p-0 text-left"
        />
      )}
    </Card>
  );
};
