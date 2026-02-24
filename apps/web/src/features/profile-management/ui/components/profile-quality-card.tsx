'use client';

import { Card } from '@/shared/ui/card';

import type { CareerProfileQualityDto } from '@/shared/types/api';

type ProfileQualityCardProps = {
  quality: CareerProfileQualityDto | undefined;
};

const statusClass: Record<'ok' | 'weak' | 'missing', string> = {
  ok: 'bg-emerald-100 text-emerald-800',
  weak: 'bg-amber-100 text-amber-800',
  missing: 'bg-rose-100 text-rose-800',
};

export const ProfileQualityCard = ({ quality }: ProfileQualityCardProps) => (
  <Card title="Profile quality" description="Deterministic diagnostics for search-readiness and matching consistency.">
    {quality ? (
      <div className="space-y-3">
        <p className="text-sm text-slate-700">
          Score: <span className="font-semibold">{quality.score}/100</span>
        </p>

        <div className="space-y-2">
          {quality.signals.map((signal) => (
            <div key={signal.key} className="rounded-md border border-slate-200 p-2 text-sm">
              <div className="flex items-center justify-between gap-2">
                <span className="font-medium text-slate-900">{signal.key}</span>
                <span className={`rounded px-2 py-0.5 text-xs ${statusClass[signal.status]}`}>{signal.status}</span>
              </div>
              <p className="mt-1 text-xs text-slate-600">{signal.message}</p>
            </div>
          ))}
        </div>

        {quality.recommendations.length ? (
          <div>
            <p className="text-sm font-semibold text-slate-900">Recommendations</p>
            <ul className="mt-1 list-disc space-y-1 pl-5 text-sm text-slate-700">
              {quality.recommendations.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>
    ) : (
      <p className="text-sm text-slate-500">No quality diagnostics available yet.</p>
    )}
  </Card>
);

