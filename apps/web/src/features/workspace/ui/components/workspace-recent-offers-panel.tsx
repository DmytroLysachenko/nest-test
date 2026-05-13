'use client';

import { Inbox } from 'lucide-react';

import { getSafeOfferField } from '@/shared/lib/presentation/job-search-ui';
import { DataTableShell, StatusPill } from '@/shared/ui/dashboard-primitives';
import { EmptyState } from '@/shared/ui/empty-state';
import { WorkflowFeedback } from '@/shared/ui/workflow-feedback';

type WorkspaceRecentOffer = {
  id: string;
  title: string;
  company: string | null;
  location: string | null;
  matchScore: number | null;
};

type WorkspaceRecentOffersPanelProps = {
  offers: WorkspaceRecentOffer[];
  isLoading: boolean;
  errorMessage: string | null;
  onRetry: () => void;
};

export const WorkspaceRecentOffersPanel = ({
  offers,
  isLoading,
  errorMessage,
  onRetry,
}: WorkspaceRecentOffersPanelProps) => (
  <DataTableShell title="Recent roles" description="A quick scan of the latest opportunities in your workspace.">
    {isLoading ? (
      <div className="space-y-2">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="bg-surface-muted h-10 animate-pulse rounded-lg" />
        ))}
      </div>
    ) : errorMessage ? (
      <WorkflowFeedback
        title="Recent roles are temporarily unavailable"
        description={errorMessage}
        tone="danger"
        actionLabel="Retry"
        onAction={onRetry}
      />
    ) : offers.length ? (
      <table className="min-w-full text-sm">
        <thead>
          <tr className="text-text-soft text-left">
            <th className="pb-3 pr-3 text-xs font-semibold uppercase tracking-[0.12em]">Role</th>
            <th className="pb-3 pr-3 text-xs font-semibold uppercase tracking-[0.12em]">Company</th>
            <th className="pb-3 pr-3 text-xs font-semibold uppercase tracking-[0.12em]">Location</th>
            <th className="pb-3 text-xs font-semibold uppercase tracking-[0.12em]">Match</th>
          </tr>
        </thead>
        <tbody>
          {offers.map((offer) => (
            <tr key={offer.id} className="align-top">
              <td className="py-3 pr-3">
                <p className="text-text-strong font-medium">{offer.title}</p>
              </td>
              <td className="text-text-soft py-3 pr-3">{offer.company}</td>
              <td className="text-text-soft py-3 pr-3">{getSafeOfferField(offer.location, 'location') ?? 'n/a'}</td>
              <td className="py-3">
                <StatusPill
                  value={offer.matchScore == null ? 'n/a' : offer.matchScore.toFixed(2)}
                  tone={offer.matchScore == null ? 'neutral' : offer.matchScore >= 0.7 ? 'success' : 'info'}
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    ) : (
      <div className="p-4">
        <EmptyState
          icon={<Inbox className="h-8 w-8" />}
          title="No opportunities yet"
          description="Open Automation to start the first update, then return here once new roles arrive."
        />
      </div>
    )}
  </DataTableShell>
);
