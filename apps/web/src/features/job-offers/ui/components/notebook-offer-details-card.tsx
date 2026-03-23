'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Pointer, Star } from 'lucide-react';
import { cn } from '@repo/ui/lib/utils';

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
  onSavePipeline: (pipelineMeta: Record<string, unknown>) => void;
  onSaveFeedback: (score: number, notes: string) => void;
  onRescore: () => void;
  onGeneratePrep: (instructions?: string) => void;
  isGeneratingPrep?: boolean;
};

export const NotebookOfferDetailsCard = ({
  offer,
  history,
  historyError,
  updatedAt,
  isBusy,
  onStatusChange,
  onSaveMeta,
  onSavePipeline,
  onSaveFeedback,
  onRescore,
  onGeneratePrep,
  isGeneratingPrep,
}: NotebookOfferDetailsCardProps) => {
  const [pendingConfirmStatus, setPendingConfirmStatus] = useState<JobOfferStatus | null>(null);
  const [feedbackScore, setFeedbackScore] = useState<number>(offer?.aiFeedbackScore ?? 0);
  const [feedbackNotes, setFeedbackNotes] = useState<string>(offer?.aiFeedbackNotes ?? '');
  const [prepInstructions, setPrepInstructions] = useState<string>('');
  const [pipelineMetaStr, setPipelineMetaStr] = useState<string>(
    offer?.pipelineMeta ? JSON.stringify(offer.pipelineMeta, null, 2) : '',
  );
  const drafts = useNotebookOfferDetailsDrafts({ offer });

  useEffect(() => {
    setFeedbackScore(offer?.aiFeedbackScore ?? 0);
    setFeedbackNotes(offer?.aiFeedbackNotes ?? '');
    setPipelineMetaStr(offer?.pipelineMeta ? JSON.stringify(offer.pipelineMeta, null, 2) : '');
  }, [offer?.id, offer?.aiFeedbackScore, offer?.aiFeedbackNotes, offer?.pipelineMeta]);

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
  const pipelineMeta =
    offer.pipelineMeta && typeof offer.pipelineMeta === 'object' && !Array.isArray(offer.pipelineMeta)
      ? (offer.pipelineMeta as Record<string, unknown>)
      : {};
  const hasPipelineDraftChanges =
    pipelineMetaStr !== (offer.pipelineMeta ? JSON.stringify(offer.pipelineMeta, null, 2) : '');
  const followUpAt = pipelineMeta && typeof pipelineMeta.followUpAt === 'string' ? pipelineMeta.followUpAt : '';
  const applicationUrl =
    pipelineMeta && typeof pipelineMeta.applicationUrl === 'string' ? pipelineMeta.applicationUrl : '';
  const nextStep = pipelineMeta && typeof pipelineMeta.nextStep === 'string' ? pipelineMeta.nextStep : '';
  const contactName = pipelineMeta && typeof pipelineMeta.contactName === 'string' ? pipelineMeta.contactName : '';
  const followUpNote = pipelineMeta && typeof pipelineMeta.followUpNote === 'string' ? pipelineMeta.followUpNote : '';
  const followUpState = offer.followUpState ?? 'none';
  const followUpSummary =
    followUpState === 'due'
      ? 'Follow-up is overdue. Handle this before widening the funnel.'
      : followUpState === 'upcoming'
        ? 'Follow-up is scheduled soon. Prepare the message and next materials now.'
        : offer.status === 'APPLIED' || offer.status === 'INTERVIEWING' || offer.status === 'OFFER'
          ? 'No follow-up is scheduled yet. Add a date, next step, and note so this role does not drift.'
          : 'Use pipeline fields when this lead moves beyond first-pass triage.';

  const setStructuredPipelineField = (field: string, value: string | null) => {
    const current =
      pipelineMetaStr.trim() && hasPipelineDraftChanges
        ? (() => {
            try {
              const parsed = JSON.parse(pipelineMetaStr);
              return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
                ? (parsed as Record<string, unknown>)
                : { ...pipelineMeta };
            } catch {
              return { ...pipelineMeta };
            }
          })()
        : { ...pipelineMeta };

    current[field] = value;
    setPipelineMetaStr(JSON.stringify(current, null, 2));
  };

  const handleSavePipeline = () => {
    try {
      const nextPipelineMeta = pipelineMetaStr.trim() ? JSON.parse(pipelineMetaStr) : {};
      if (!nextPipelineMeta || typeof nextPipelineMeta !== 'object' || Array.isArray(nextPipelineMeta)) {
        return;
      }
      onSavePipeline(nextPipelineMeta as Record<string, unknown>);
    } catch {
      return;
    }
  };

  return (
    <Card title="Offer details" description={offer.title}>
      <div className="space-y-4 text-sm">
        <div className="app-inset-stack space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <span className="app-badge border-primary/20 bg-primary/5 text-primary">{offer.status}</span>
            <span className="app-badge">Score {offer.matchScore ?? 'n/a'}</span>
            {offer.followUpState && offer.followUpState !== 'none' ? (
              <span
                className={cn(
                  'app-badge',
                  offer.followUpState === 'due'
                    ? 'border-app-danger-border bg-app-danger-soft text-app-danger'
                    : 'border-app-warning-border bg-app-warning-soft text-app-warning',
                )}
              >
                Follow-up {offer.followUpState}
              </span>
            ) : null}
            <DataFreshnessBadge updatedAt={updatedAt} label="Offer data" />
          </div>
          <p className="text-secondary-foreground font-medium">
            {offer.company ?? 'Unknown company'} · {offer.location ?? 'Unknown location'}
          </p>
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          <div className="app-inset-stack space-y-2">
            <p className="text-text-soft text-xs uppercase tracking-[0.16em]">Action plan</p>
            <p className="text-text-strong text-sm font-semibold">{followUpSummary}</p>
            {nextStep ? <p className="text-text-soft text-sm">Next step: {nextStep}</p> : null}
            {followUpAt ? (
              <p className="text-text-soft text-sm">Scheduled for: {new Date(followUpAt).toLocaleString()}</p>
            ) : null}
          </div>
          <div className="app-inset-stack space-y-2">
            <p className="text-text-soft text-xs uppercase tracking-[0.16em]">Prep context</p>
            {contactName ? <p className="text-text-soft text-sm">Contact: {contactName}</p> : null}
            {applicationUrl ? (
              <Link
                href={applicationUrl}
                target="_blank"
                rel="noreferrer"
                className="text-primary inline-flex text-sm underline-offset-4 hover:underline"
              >
                Open application thread
              </Link>
            ) : null}
            {followUpNote ? <p className="text-text-soft text-sm">{followUpNote}</p> : null}
            {!contactName && !applicationUrl && !followUpNote ? (
              <p className="text-text-soft text-sm">
                Add recruiter details, thread URL, or follow-up notes for the next touch.
              </p>
            ) : null}
          </div>
        </div>

        <div className="bg-surface-muted/66 flex flex-wrap gap-1.5 rounded-[1.2rem] p-2">
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

        {['APPLIED', 'INTERVIEWING', 'OFFER', 'REJECTED'].includes(offer.status) && (
          <div className="app-inset-stack space-y-3">
            <div className="grid gap-3 md:grid-cols-2">
              <div className="app-field-group">
                <Label htmlFor="follow-up-at" className="app-inline-label">
                  Follow-up at
                </Label>
                <Input
                  id="follow-up-at"
                  type="datetime-local"
                  value={followUpAt ? followUpAt.slice(0, 16) : ''}
                  onChange={(event) =>
                    setStructuredPipelineField(
                      'followUpAt',
                      event.target.value ? new Date(event.target.value).toISOString() : null,
                    )
                  }
                />
              </div>

              <div className="app-field-group">
                <Label htmlFor="application-url" className="app-inline-label">
                  Application URL
                </Label>
                <Input
                  id="application-url"
                  value={applicationUrl}
                  placeholder="https://company.jobs/applications/123"
                  onChange={(event) => setStructuredPipelineField('applicationUrl', event.target.value || null)}
                />
              </div>

              <div className="app-field-group">
                <Label htmlFor="contact-name" className="app-inline-label">
                  Contact Name
                </Label>
                <Input
                  id="contact-name"
                  value={contactName}
                  placeholder="Recruiter or hiring manager"
                  onChange={(event) => setStructuredPipelineField('contactName', event.target.value || null)}
                />
              </div>

              <div className="app-field-group">
                <Label htmlFor="next-step" className="app-inline-label">
                  Next Step
                </Label>
                <Input
                  id="next-step"
                  value={nextStep}
                  placeholder="Send follow-up email"
                  onChange={(event) => setStructuredPipelineField('nextStep', event.target.value || null)}
                />
              </div>
            </div>
            <div className="app-field-group">
              <Label htmlFor="follow-up-note" className="app-inline-label">
                Follow-up note
              </Label>
              <Textarea
                id="follow-up-note"
                rows={3}
                value={followUpNote}
                placeholder="What should you mention or prepare in the next follow-up?"
                onChange={(event) => setStructuredPipelineField('followUpNote', event.target.value || null)}
              />
            </div>
            <div className="app-field-group">
              <Label htmlFor="pipeline-meta" className="app-inline-label">
                Pipeline Metadata (JSON)
              </Label>
              <Textarea
                id="pipeline-meta"
                rows={4}
                value={pipelineMetaStr}
                onChange={(event) => setPipelineMetaStr(event.target.value)}
                placeholder='{ "interviewDate": "2026-04-01" }'
                className="font-mono text-xs"
              />
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                size="sm"
                disabled={isBusy || !hasPipelineDraftChanges}
                onClick={handleSavePipeline}
              >
                Save follow-up plan
              </Button>
              <Button
                type="button"
                size="sm"
                variant="secondary"
                disabled={isBusy || !hasPipelineDraftChanges}
                onClick={handleSavePipeline}
              >
                Save pipeline metadata
              </Button>
              <p className="text-text-soft self-center text-xs">
                Use this for interview dates, recruiter notes, follow-up dates, and links.
              </p>
            </div>
          </div>
        )}

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

        {/* AI Assistant features hidden per user request to avoid accidental costs */}
        {/*
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
                      feedbackScore >= star ? 'fill-app-warning text-app-warning' : 'text-text-soft/20',
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
            Application Assistant
          </summary>
          <div className="mt-3 space-y-4">
            {!offer.prepMaterials ? (
              <div className="app-muted-panel space-y-3">
                <p className="text-text-soft text-sm">
                  Generate a tailored cover letter and interview cheat sheet for this role.
                </p>
                <Textarea
                  placeholder="Optional instructions (e.g. emphasize my backend experience)"
                  value={prepInstructions}
                  onChange={(e) => setPrepInstructions(e.target.value)}
                  className="border-border/40 min-h-16 text-xs shadow-none"
                />
                <Button
                  type="button"
                  size="sm"
                  className="w-full"
                  disabled={isBusy || isGeneratingPrep}
                  onClick={() => onGeneratePrep(prepInstructions)}
                >
                  {isGeneratingPrep ? 'Generating materials...' : 'Generate Prep Materials'}
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="app-muted-panel space-y-2">
                  <h4 className="text-text-strong text-xs font-semibold uppercase tracking-wider">Interview Focus</h4>
                  <ul className="text-text-soft list-disc space-y-1 pl-4 text-sm">
                    {(offer.prepMaterials as any).interviewFocus?.map((point: string, i: number) => (
                      <li key={i}>{point}</li>
                    ))}
                  </ul>
                </div>
                <div className="app-muted-panel space-y-2">
                  <h4 className="text-text-strong text-xs font-semibold uppercase tracking-wider">
                    Cover Letter Draft
                  </h4>
                  <pre className="text-text-soft whitespace-pre-wrap font-sans text-xs">
                    {(offer.prepMaterials as any).coverLetter}
                  </pre>
                </div>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    disabled={isBusy || isGeneratingPrep}
                    onClick={() => onGeneratePrep(prepInstructions)}
                  >
                    {isGeneratingPrep ? 'Regenerating...' : 'Regenerate'}
                  </Button>
                </div>
              </div>
            )}
          </div>
        </details>
        */}

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
