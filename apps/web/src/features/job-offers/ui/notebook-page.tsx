'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Label } from '@repo/ui/components/label';

import {
  getJobOfferHistory,
  listJobOffers,
  scoreJobOffer,
  updateJobOfferMeta,
  updateJobOfferStatus,
} from '@/features/job-offers/api/job-offers-api';
import type { JobOfferListItemDto, JobOfferStatus } from '@/shared/types/api';
import { Button } from '@/shared/ui/button';
import { Card } from '@/shared/ui/card';
import { Input } from '@/shared/ui/input';
import { Textarea } from '@/shared/ui/textarea';

const PAGE_SIZE = 20;
const STATUSES: JobOfferStatus[] = ['NEW', 'SEEN', 'SAVED', 'APPLIED', 'DISMISSED'];

type NotebookPageProps = {
  token: string;
};

export const NotebookPage = ({ token }: NotebookPageProps) => {
  const queryClient = useQueryClient();
  const [offset, setOffset] = useState(0);
  const [statusFilter, setStatusFilter] = useState<'ALL' | JobOfferStatus>('ALL');
  const [search, setSearch] = useState('');
  const [tag, setTag] = useState('');
  const [hasScore, setHasScore] = useState<'all' | 'yes' | 'no'>('all');
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const listQuery = useQuery({
    queryKey: ['job-offers', token, offset, statusFilter, search, tag, hasScore],
    queryFn: () =>
      listJobOffers(token, {
        limit: PAGE_SIZE,
        offset,
        status: statusFilter === 'ALL' ? undefined : statusFilter,
        search: search || undefined,
        tag: tag || undefined,
        hasScore: hasScore === 'all' ? undefined : hasScore === 'yes',
      }),
  });

  const selectedOffer = useMemo(
    () => listQuery.data?.items.find((item) => item.id === selectedId) ?? null,
    [listQuery.data?.items, selectedId],
  );

  const historyQuery = useQuery({
    queryKey: ['job-offers', 'history', token, selectedOffer?.id],
    queryFn: () => getJobOfferHistory(token, selectedOffer!.id),
    enabled: Boolean(selectedOffer?.id),
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: JobOfferStatus }) => updateJobOfferStatus(token, id, status),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['job-offers', token] });
      await queryClient.invalidateQueries({ queryKey: ['job-offers', 'history', token] });
    },
  });

  const metaMutation = useMutation({
    mutationFn: ({ id, notes, tags }: { id: string; notes: string; tags: string[] }) =>
      updateJobOfferMeta(token, id, { notes, tags }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['job-offers', token] });
      await queryClient.invalidateQueries({ queryKey: ['job-offers', 'history', token] });
    },
  });

  const scoreMutation = useMutation({
    mutationFn: ({ id }: { id: string }) => scoreJobOffer(token, id, 0),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['job-offers', token] });
    },
  });

  const canPrev = offset > 0;
  const canNext = (listQuery.data?.items.length ?? 0) === PAGE_SIZE;

  return (
    <main className="mx-auto flex w-full max-w-7xl flex-col gap-4 px-4 py-6 md:py-8">
      <Card
        title="Job Notebook"
        description="Review scraped offers, update workflow status, manage notes/tags, and inspect scoring output."
      >
        <div className="grid gap-3 md:grid-cols-5">
          <div className="space-y-1">
            <Label htmlFor="notebook-status">Status</Label>
            <select
              id="notebook-status"
              value={statusFilter}
              onChange={(event) => {
                setStatusFilter(event.target.value as 'ALL' | JobOfferStatus);
                setOffset(0);
              }}
              className="h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm"
            >
              <option value="ALL">ALL</option>
              {STATUSES.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <Label htmlFor="notebook-has-score">Has score</Label>
            <select
              id="notebook-has-score"
              value={hasScore}
              onChange={(event) => {
                setHasScore(event.target.value as 'all' | 'yes' | 'no');
                setOffset(0);
              }}
              className="h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm"
            >
              <option value="all">all</option>
              <option value="yes">yes</option>
              <option value="no">no</option>
            </select>
          </div>

          <div className="space-y-1">
            <Label htmlFor="notebook-tag">Tag</Label>
            <Input
              id="notebook-tag"
              value={tag}
              onChange={(event) => {
                setTag(event.target.value);
                setOffset(0);
              }}
              placeholder="backend"
            />
          </div>

          <div className="space-y-1 md:col-span-2">
            <Label htmlFor="notebook-search">Search notes/tags</Label>
            <Input
              id="notebook-search"
              value={search}
              onChange={(event) => {
                setSearch(event.target.value);
                setOffset(0);
              }}
              placeholder="nestjs"
            />
          </div>
        </div>
      </Card>

      <div className="grid gap-4 lg:grid-cols-[1.3fr_1fr]">
        <Card title="Offers" description={`Total: ${listQuery.data?.total ?? 0}`}>
          <div className="space-y-2">
            {listQuery.data?.items?.length ? (
              listQuery.data.items.map((offer) => (
                <button
                  key={offer.id}
                  type="button"
                  onClick={() => setSelectedId(offer.id)}
                  className={`w-full rounded-md border p-3 text-left text-sm transition ${selectedId === offer.id ? 'border-sky-400 bg-sky-50' : 'border-slate-200 bg-white hover:border-slate-300'}`}
                >
                  <p className="font-semibold text-slate-900">{offer.title}</p>
                  <p className="text-slate-600">{offer.company ?? 'Unknown company'}</p>
                  <p className="text-xs text-slate-500">{offer.location ?? 'Unknown location'}</p>
                  <div className="mt-2 flex flex-wrap gap-2 text-xs">
                    <span className="rounded bg-slate-100 px-2 py-1">status: {offer.status}</span>
                    <span className="rounded bg-slate-100 px-2 py-1">score: {offer.matchScore ?? 'n/a'}</span>
                    {offer.sourceRunId ? <span className="rounded bg-slate-100 px-2 py-1">run: {offer.sourceRunId.slice(0, 8)}</span> : null}
                  </div>
                </button>
              ))
            ) : (
              <p className="text-sm text-slate-500">No offers found for current filters.</p>
            )}
          </div>

          <div className="mt-4 flex items-center justify-between">
            <Button type="button" variant="secondary" disabled={!canPrev} onClick={() => setOffset((value) => Math.max(0, value - PAGE_SIZE))}>
              Previous
            </Button>
            <p className="text-xs text-slate-500">Offset: {offset}</p>
            <Button type="button" variant="secondary" disabled={!canNext} onClick={() => setOffset((value) => value + PAGE_SIZE)}>
              Next
            </Button>
          </div>
        </Card>

        <OfferDetailsPanel
          offer={selectedOffer}
          isBusy={statusMutation.isPending || metaMutation.isPending || scoreMutation.isPending}
          onStatusChange={(status) => {
            if (!selectedOffer) {
              return;
            }
            statusMutation.mutate({ id: selectedOffer.id, status });
          }}
          onSaveMeta={(notes, tags) => {
            if (!selectedOffer) {
              return;
            }
            metaMutation.mutate({ id: selectedOffer.id, notes, tags });
          }}
          onRescore={() => {
            if (!selectedOffer) {
              return;
            }
            scoreMutation.mutate({ id: selectedOffer.id });
          }}
          history={historyQuery.data}
        />
      </div>
    </main>
  );
};

type OfferDetailsPanelProps = {
  offer: JobOfferListItemDto | null;
  history: Awaited<ReturnType<typeof getJobOfferHistory>> | undefined;
  isBusy: boolean;
  onStatusChange: (status: JobOfferStatus) => void;
  onSaveMeta: (notes: string, tags: string[]) => void;
  onRescore: () => void;
};

const OfferDetailsPanel = ({ offer, history, isBusy, onStatusChange, onSaveMeta, onRescore }: OfferDetailsPanelProps) => {
  const [notesDraft, setNotesDraft] = useState('');
  const [tagsDraft, setTagsDraft] = useState('');

  useEffect(() => {
    setNotesDraft(offer?.notes ?? '');
    setTagsDraft(offer?.tags?.join(', ') ?? '');
  }, [offer?.id, offer?.notes, offer?.tags]);

  if (!offer) {
    return <Card title="Offer details" description="Select an offer from the list to inspect and edit it."><p className="text-sm text-slate-500">No offer selected.</p></Card>;
  }

  const matchMeta = offer.matchMeta ?? {};

  return (
    <Card title="Offer details" description={offer.title}>
      <div className="space-y-3 text-sm">
        <p className="text-slate-700">{offer.company ?? 'Unknown company'} | {offer.location ?? 'Unknown location'}</p>
        <p className="text-slate-700">Current status: <span className="font-semibold">{offer.status}</span></p>
        <p className="text-slate-700">Current score: <span className="font-semibold">{offer.matchScore ?? 'n/a'}</span></p>

        <div className="flex flex-wrap gap-2">
          {STATUSES.map((status) => (
            <Button key={status} type="button" variant="secondary" disabled={isBusy} onClick={() => onStatusChange(status)}>
              {status}
            </Button>
          ))}
        </div>

        <div className="space-y-1">
          <Label htmlFor="offer-notes">Notes</Label>
          <Textarea
            id="offer-notes"
            rows={4}
            value={notesDraft}
            onChange={(event) => setNotesDraft(event.target.value)}
            placeholder="Why this offer matters"
          />
        </div>

        <div className="space-y-1">
          <Label htmlFor="offer-tags">Tags (comma separated)</Label>
          <Input
            id="offer-tags"
            value={tagsDraft}
            onChange={(event) => setTagsDraft(event.target.value)}
            placeholder="backend, remote"
          />
        </div>

        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            disabled={isBusy}
            onClick={() =>
              onSaveMeta(
                notesDraft,
                tagsDraft
                  .split(',')
                  .map((tag) => tag.trim())
                  .filter(Boolean),
              )
            }
          >
            Save notes/tags
          </Button>
          <Button type="button" variant="secondary" disabled={isBusy} onClick={onRescore}>
            Re-score offer
          </Button>
          {offer.sourceRunId ? (
            <Link href={`/app/tester`} className="inline-flex items-center rounded-md border border-slate-300 px-3 py-2 text-xs text-slate-700">
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
          <pre className="mt-2 max-h-48 overflow-auto whitespace-pre-wrap text-xs text-slate-700">{offer.description}</pre>
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
