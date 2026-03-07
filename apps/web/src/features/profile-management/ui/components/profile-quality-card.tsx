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
      <div className="space-y-3">
        <p className="text-text-soft text-sm">
          Score: <span className="font-semibold">{quality.score}/100</span>
        </p>

        <div className="space-y-2">
          {quality.signals.map((signal) => (
            <div key={signal.key} className="border-border rounded-md border p-2 text-sm">
              <div className="flex items-center justify-between gap-2">
                <span className="text-text-strong font-medium">{signal.key}</span>
                <span className={`rounded px-2 py-0.5 text-xs ${statusClass[signal.status]}`}>{signal.status}</span>
              </div>
              <p className="text-text-soft mt-1 text-xs">{signal.message}</p>
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
