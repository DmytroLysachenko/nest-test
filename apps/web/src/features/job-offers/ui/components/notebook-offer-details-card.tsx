'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Pointer, Star } from 'lucide-react';

import { useNotebookOfferDetailsDrafts } from '@/features/job-offers/model/hooks/use-notebook-offer-details-drafts';
import { Button } from '@/shared/ui/button';
import { Card } from '@/shared/ui/card';
import { ConfirmActionDialog } from '@/shared/ui/confirm-action-dialog';
import { DataFreshnessBadge } from '@/shared/ui/data-freshness-badge';
import { Input } from '@/shared/ui/input';
import { InspectorRow } from '@/shared/ui/inspector-row';
import { Label } from '@/shared/ui/label';
import { Textarea } from '@/shared/ui/textarea';
import { EmptyState } from '@/shared/ui/empty-state';
import { cn } from '@repo/ui/lib/utils';

import type { getJobOfferHistory } from '@/features/job-offers/api/job-offers-api';
import type { JobOfferListItemDto, JobOfferStatus } from '@/shared/types/api';

const STATUSES: JobOfferStatus[] = [
  'NEW',
  'SEEN',
  'SAVED',
  'APPLIED',
  'INTERVIEWING',
  'OFFER',
  'REJECTED',
  'DISMISSED',
];

type NotebookOfferDetailsCardProps = {
  offer: JobOfferListItemDto | null;
  history: Awaited<ReturnType<typeof getJobOfferHistory>> | undefined;
  historyError: string | null;
  updatedAt: number | null | undefined;
  isBusy: boolean;
  onStatusChange: (status: JobOfferStatus) => void;
  onSaveMeta: (notes: string, tags: string[]) => void;
  onSaveFeedback: (score: number, notes: string) => void;
  onRescore: () => void;
};

export const NotebookOfferDetailsCard = ({
  offer,
  history,
  historyError,
  updatedAt,
  isBusy,
  onStatusChange,
  onSaveMeta,
  onSaveFeedback,
  onRescore,
}: NotebookOfferDetailsCardProps) => {
  const [pendingConfirmStatus, setPendingConfirmStatus] = useState<JobOfferStatus | null>(null);
  const [feedbackScore, setFeedbackScore] = useState<number>(offer?.aiFeedbackScore ?? 0);
  const [feedbackNotes, setFeedbackNotes] = useState<string>(offer?.aiFeedbackNotes ?? '');
  const drafts = useNotebookOfferDetailsDrafts({ offer });

  useEffect(() => {
    setFeedbackScore(offer?.aiFeedbackScore ?? 0);
    setFeedbackNotes(offer?.aiFeedbackNotes ?? '');
  }, [offer?.id, offer?.aiFeedbackScore, offer?.aiFeedbackNotes]);

  if (!offer) {
    return (
      <Card title="Offer details" description="Select an offer from the list to inspect and edit it.">
        <EmptyState
          icon={<Pointer className="h-8 w-8" />}
          title="No offer selected"
          description="Click on an offer in the list to view its full details and history."
        />
      </Card>
    );
  }

  const matchMeta = offer.matchMeta ?? {};

  return (
    <Card title="Offer details" description={offer.title}>
      <div className="space-y-4 text-sm">
        <div className="app-muted-panel space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <span className="app-badge border-primary/20 bg-primary/5 text-primary">{offer.status}</span>
            <span className="app-badge">Score {offer.matchScore ?? 'n/a'}</span>
            <DataFreshnessBadge updatedAt={updatedAt} label="Offer data" />
          </div>
          <p className="text-secondary-foreground font-medium">
            {offer.company ?? 'Unknown company'} · {offer.location ?? 'Unknown location'}
          </p>
        </div>

        <div className="flex flex-wrap gap-1.5">
          {STATUSES.map((status) => (
            <Button
              key={status}
              type="button"
              variant={offer.status === status ? 'default' : 'secondary'}
              className="h-8 px-2.5 text-[10px] font-bold tracking-wider"
              disabled={isBusy}
              onClick={() => {
                if (status === 'DISMISSED' && offer.status !== 'DISMISSED') {
                  setPendingConfirmStatus(status);
                  return;
                }
                onStatusChange(status);
              }}
            >
              {status}
            </Button>
          ))}
        </div>

        <div className="app-field-group">
          <Label htmlFor="offer-notes" className="app-inline-label">
            Notes
          </Label>
          <Textarea
            id="offer-notes"
            rows={3}
            value={drafts.notesDraft}
            onChange={(event) => drafts.setNotesDraft(event.target.value)}
            placeholder="Why this offer matters"
            className="text-xs"
          />
        </div>

        <div className="app-field-group">
          <Label htmlFor="offer-tags" className="app-inline-label">
            Tags (comma separated)
          </Label>
          <Input
            id="offer-tags"
            value={drafts.tagsDraft}
            onChange={(event) => drafts.setTagsDraft(event.target.value)}
            placeholder="backend, remote"
            className="h-9 text-xs"
          />
        </div>

        <div className="flex flex-wrap gap-2 pt-1">
          <Button
            type="button"
            size="sm"
            disabled={
              isBusy ||
              (drafts.notesDraft === (offer.notes ?? '') && drafts.tagsDraft === (offer.tags?.join(', ') ?? ''))
            }
            onClick={() => onSaveMeta(drafts.notesDraft, drafts.normalizedTags)}
          >
            Save metadata
          </Button>
          <Button type="button" variant="secondary" size="sm" disabled={isBusy} onClick={onRescore}>
            Re-score
          </Button>
          {offer.sourceRunId ? (
            <Link
              href="/tester"
              className="border-border bg-surface-muted/50 text-text-soft hover:bg-surface-muted inline-flex items-center rounded-xl border px-3 py-1.5 text-[11px] transition-colors"
            >
              Run: {offer.sourceRunId.slice(0, 8)}
            </Link>
          ) : null}
        </div>

        <div className="app-muted-panel space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-text-strong font-semibold">AI Match Feedback</h4>
            <div className="flex gap-0.5">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setFeedbackScore(star)}
                  className="p-0.5 transition-transform hover:scale-110 active:scale-95"
                >
                  <Star
                    className={cn(
                      'h-5 w-5 transition-colors',
                      feedbackScore >= star ? 'fill-amber-400 text-amber-500' : 'text-text-soft/20',
                    )}
                  />
                </button>
              ))}
            </div>
          </div>
          <Textarea
            placeholder="Help us calibrate: what did the AI get right or wrong about this match?"
            value={feedbackNotes}
            onChange={(e) => setFeedbackNotes(e.target.value)}
            className="border-border/40 min-h-20 text-xs shadow-none"
          />
          <Button
            type="button"
            variant="secondary"
            className="h-8 w-full text-xs"
            disabled={
              isBusy ||
              (feedbackScore === offer.aiFeedbackScore && feedbackNotes === offer.aiFeedbackNotes) ||
              feedbackScore === 0
            }
            onClick={() => onSaveFeedback(feedbackScore, feedbackNotes)}
          >
            Submit calibration
          </Button>
        </div>

        <details className="group">
          <summary className="text-text-strong hover:text-primary cursor-pointer text-sm font-medium transition-colors">
            Score explanation
          </summary>
          <div className="mt-3">
            <pre className="app-code">{JSON.stringify(matchMeta, null, 2)}</pre>
          </div>
        </details>

        <details className="group">
          <summary className="text-text-strong hover:text-primary cursor-pointer text-sm font-medium transition-colors">
            Job Description
          </summary>
          <div className="mt-3">
            <pre className="app-code whitespace-pre-wrap">{offer.description}</pre>
          </div>
        </details>

        {historyError ? <p className="text-app-danger text-xs">{historyError}</p> : null}

        {history ? (
          <details className="group" open>
            <summary className="text-text-strong hover:text-primary cursor-pointer text-sm font-medium transition-colors">
              Status history
            </summary>
            <div className="mt-3 space-y-2">
              {(history.statusHistory ?? []).map((entry, index) => (
                <InspectorRow
                  key={`${entry.status}-${entry.changedAt}-${index}`}
                  label={new Date(entry.changedAt).toLocaleDateString()}
                  value={entry.status}
                  className="px-3 py-2"
                />
              ))}
            </div>
          </details>
        ) : null}
      </div>

      <ConfirmActionDialog
        open={pendingConfirmStatus === 'DISMISSED'}
        title="Dismiss offer?"
        description="This moves the offer to dismissed status. You can undo later from the success toast action."
        confirmLabel="Dismiss offer"
        onCancel={() => setPendingConfirmStatus(null)}
        onConfirm={() => {
          setPendingConfirmStatus(null);
          onStatusChange('DISMISSED');
        }}
      />
    </Card>
  );
};
