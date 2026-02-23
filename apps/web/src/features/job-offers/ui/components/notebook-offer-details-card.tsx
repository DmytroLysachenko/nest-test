'use client';

import Link from 'next/link';

import { useNotebookOfferDetailsDrafts } from '@/features/job-offers/model/hooks/use-notebook-offer-details-drafts';
import { Button } from '@/shared/ui/button';
import { Card } from '@/shared/ui/card';
import { Input } from '@/shared/ui/input';
import { Label } from '@/shared/ui/label';
import { Textarea } from '@/shared/ui/textarea';

import type { getJobOfferHistory } from '@/features/job-offers/api/job-offers-api';
import type { JobOfferListItemDto, JobOfferStatus } from '@/shared/types/api';

const STATUSES: JobOfferStatus[] = ['NEW', 'SEEN', 'SAVED', 'APPLIED', 'DISMISSED'];

type NotebookOfferDetailsCardProps = {
  offer: JobOfferListItemDto | null;
  history: Awaited<ReturnType<typeof getJobOfferHistory>> | undefined;
  isBusy: boolean;
  onStatusChange: (status: JobOfferStatus) => void;
  onSaveMeta: (notes: string, tags: string[]) => void;
  onRescore: () => void;
};

export const NotebookOfferDetailsCard = ({
  offer,
  history,
  isBusy,
  onStatusChange,
  onSaveMeta,
  onRescore,
}: NotebookOfferDetailsCardProps) => {
  const drafts = useNotebookOfferDetailsDrafts({ offer });

  if (!offer) {
    return (
      <Card title="Offer details" description="Select an offer from the list to inspect and edit it.">
        <p className="text-sm text-slate-500">No offer selected.</p>
      </Card>
    );
  }

  const matchMeta = offer.matchMeta ?? {};

  return (
    <Card title="Offer details" description={offer.title}>
      <div className="space-y-3 text-sm">
        <p className="text-slate-700">
          {offer.company ?? 'Unknown company'} | {offer.location ?? 'Unknown location'}
        </p>
        <p className="text-slate-700">
          Current status: <span className="font-semibold">{offer.status}</span>
        </p>
        <p className="text-slate-700">
          Current score: <span className="font-semibold">{offer.matchScore ?? 'n/a'}</span>
        </p>

        <div className="flex flex-wrap gap-2">
          {STATUSES.map((status) => (
            <Button
              key={status}
              type="button"
              variant="secondary"
              disabled={isBusy}
              onClick={() => onStatusChange(status)}
            >
              {status}
            </Button>
          ))}
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
              href="/app/tester"
              className="inline-flex items-center rounded-md border border-slate-300 px-3 py-2 text-xs text-slate-700"
            >
              Open tester for run: {offer.sourceRunId.slice(0, 8)}
            </Link>
          ) : null}
        </div>

        <details className="rounded-md border border-slate-200 bg-slate-50 p-2">
          <summary className="cursor-pointer font-medium text-slate-800">Score explanation (matchMeta)</summary>
          <pre className="mt-2 max-h-48 overflow-auto text-xs text-slate-700">{JSON.stringify(matchMeta, null, 2)}</pre>
        </details>

        <details className="rounded-md border border-slate-200 bg-slate-50 p-2">
          <summary className="cursor-pointer font-medium text-slate-800">Description</summary>
          <pre className="mt-2 max-h-48 overflow-auto whitespace-pre-wrap text-xs text-slate-700">
            {offer.description}
          </pre>
        </details>

        {history ? (
          <details className="rounded-md border border-slate-200 bg-slate-50 p-2" open>
            <summary className="cursor-pointer font-medium text-slate-800">Status history</summary>
            <div className="mt-2 space-y-1 text-xs text-slate-700">
              {(history.statusHistory ?? []).map((entry, index) => (
                <p key={`${entry.status}-${entry.changedAt}-${index}`}>
                  {entry.changedAt}: {entry.status}
                </p>
              ))}
            </div>
          </details>
        ) : null}
      </div>
    </Card>
  );
};
