'use client';

import Link from 'next/link';
import { useState } from 'react';

import { useNotebookOfferDetailsDrafts } from '@/features/job-offers/model/hooks/use-notebook-offer-details-drafts';
import { Button } from '@/shared/ui/button';
import { Card } from '@/shared/ui/card';
import { ConfirmActionDialog } from '@/shared/ui/confirm-action-dialog';
import { DataFreshnessBadge } from '@/shared/ui/data-freshness-badge';
import { Input } from '@/shared/ui/input';
import { Label } from '@/shared/ui/label';
import { Textarea } from '@/shared/ui/textarea';

import type { getJobOfferHistory } from '@/features/job-offers/api/job-offers-api';
import type { JobOfferListItemDto, JobOfferStatus } from '@/shared/types/api';

const STATUSES: JobOfferStatus[] = ['NEW', 'SEEN', 'SAVED', 'APPLIED', 'DISMISSED'];

type NotebookOfferDetailsCardProps = {
  offer: JobOfferListItemDto | null;
  history: Awaited<ReturnType<typeof getJobOfferHistory>> | undefined;
  historyError: string | null;
  updatedAt: number | null | undefined;
  isBusy: boolean;
  onStatusChange: (status: JobOfferStatus) => void;
  onSaveMeta: (notes: string, tags: string[]) => void;
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
  onRescore,
}: NotebookOfferDetailsCardProps) => {
  const [pendingConfirmStatus, setPendingConfirmStatus] = useState<JobOfferStatus | null>(null);
  const drafts = useNotebookOfferDetailsDrafts({ offer });

  if (!offer) {
    return (
      <Card title="Offer details" description="Select an offer from the list to inspect and edit it.">
        <p className="text-muted-foreground text-sm">No offer selected.</p>
      </Card>
    );
  }

  const matchMeta = offer.matchMeta ?? {};

  return (
    <Card title="Offer details" description={offer.title}>
      <div className="space-y-3 text-sm">
        <p className="text-secondary-foreground">
          {offer.company ?? 'Unknown company'} | {offer.location ?? 'Unknown location'}
        </p>
        <p className="text-secondary-foreground">
          Current status: <span className="font-semibold">{offer.status}</span>
        </p>
        <p className="text-secondary-foreground">
          Current score: <span className="font-semibold">{offer.matchScore ?? 'n/a'}</span>
        </p>

        <div className="flex flex-wrap gap-2">
          {STATUSES.map((status) => (
            <Button
              key={status}
              type="button"
              variant={offer.status === status ? 'default' : 'secondary'}
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
          <DataFreshnessBadge updatedAt={updatedAt} label="Offer data" />
        </div>

        <div className="space-y-1">
          <Label htmlFor="offer-notes">Notes</Label>
          <Textarea
            id="offer-notes"
            rows={4}
            value={drafts.notesDraft}
            onChange={(event) => drafts.setNotesDraft(event.target.value)}
            placeholder="Why this offer matters"
          />
        </div>

        <div className="space-y-1">
          <Label htmlFor="offer-tags">Tags (comma separated)</Label>
          <Input
            id="offer-tags"
            value={drafts.tagsDraft}
            onChange={(event) => drafts.setTagsDraft(event.target.value)}
            placeholder="backend, remote"
          />
        </div>

        <div className="flex flex-wrap gap-2">
          <Button type="button" disabled={isBusy} onClick={() => onSaveMeta(drafts.notesDraft, drafts.normalizedTags)}>
            Save notes/tags
          </Button>
          <Button type="button" variant="secondary" disabled={isBusy} onClick={onRescore}>
            Re-score offer
          </Button>
          {offer.sourceRunId ? (
            <Link
              href="/tester"
              className="border-border bg-card text-secondary-foreground inline-flex items-center rounded-xl border px-3 py-2 text-xs"
            >
              Open tester for run: {offer.sourceRunId.slice(0, 8)}
            </Link>
          ) : null}
        </div>

        <details className="app-muted-panel">
          <summary className="text-foreground cursor-pointer font-medium">Score explanation (matchMeta)</summary>
          <pre className="text-secondary-foreground mt-2 max-h-48 overflow-auto text-xs">
            {JSON.stringify(matchMeta, null, 2)}
          </pre>
        </details>

        <details className="app-muted-panel">
          <summary className="text-foreground cursor-pointer font-medium">Description</summary>
          <pre className="text-secondary-foreground mt-2 max-h-48 overflow-auto whitespace-pre-wrap text-xs">
            {offer.description}
          </pre>
        </details>

        {historyError ? <p className="text-app-danger text-xs">{historyError}</p> : null}

        {history ? (
          <details className="app-muted-panel" open>
            <summary className="text-foreground cursor-pointer font-medium">Status history</summary>
            <div className="text-secondary-foreground mt-2 space-y-1 text-xs">
              {(history.statusHistory ?? []).map((entry, index) => (
                <p key={`${entry.status}-${entry.changedAt}-${index}`}>
                  {entry.changedAt}: {entry.status}
                </p>
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
