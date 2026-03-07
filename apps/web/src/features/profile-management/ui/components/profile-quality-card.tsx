'use client';

import { Card } from '@/shared/ui/card';

import type { CareerProfileQualityDto } from '@/shared/types/api';

type ProfileQualityCardProps = {
  quality: CareerProfileQualityDto | undefined;
};

const statusClass: Record<'ok' | 'weak' | 'missing', string> = {
  ok: 'bg-app-success-soft text-app-success',
  weak: 'bg-app-warning-soft text-app-warning',
  missing: 'bg-app-danger-soft text-app-danger',
};

export const ProfileQualityCard = ({ quality }: ProfileQualityCardProps) => (
  <Card title="Profile quality" description="Deterministic diagnostics for search-readiness and matching consistency.">
    {quality ? (
      <div className="space-y-4">
        <div className="app-muted-panel flex items-end justify-between gap-4">
          <div>
            <p className="text-text-soft text-xs uppercase tracking-[0.14em]">Quality score</p>
            <p className="text-text-strong mt-2 text-3xl font-semibold tracking-[-0.04em]">{quality.score}/100</p>
          </div>
          <p className="text-text-soft max-w-sm text-sm">
            This score summarizes how complete and reliable the current profile is for search and matching.
          </p>
        </div>

        <div className="space-y-2">
          {quality.signals.map((signal) => (
            <div key={signal.key} className="border-border/80 rounded-2xl border p-3 text-sm">
              <div className="flex items-center justify-between gap-2">
                <span className="text-text-strong font-medium">{signal.key}</span>
                <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${statusClass[signal.status]}`}>
                  {signal.status}
                </span>
              </div>
              <p className="text-text-soft mt-2 text-xs leading-5">{signal.message}</p>
            </div>
          ))}
        </div>

        {quality.recommendations.length ? (
          <div>
            <p className="text-text-strong text-sm font-semibold">Recommendations</p>
            <ul className="text-text-soft mt-1 list-disc space-y-1 pl-5 text-sm">
              {quality.recommendations.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>
    ) : (
      <p className="text-text-soft text-sm">No quality diagnostics available yet.</p>
    )}
  </Card>
);
