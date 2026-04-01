'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { ExternalLink, Pointer } from 'lucide-react';

import { useNotebookOfferDetailsDrafts } from '@/features/job-offers/model/hooks/use-notebook-offer-details-drafts';
import { Button } from '@/shared/ui/button';
import { Card } from '@/shared/ui/card';
import { ConfirmActionDialog } from '@/shared/ui/confirm-action-dialog';
import { DataFreshnessBadge } from '@/shared/ui/data-freshness-badge';
import { WorkflowInlineNotice } from '@/shared/ui/workflow-feedback';
import { Input } from '@/shared/ui/input';
import { Label } from '@/shared/ui/label';
import { Textarea } from '@/shared/ui/textarea';
import { EmptyState } from '@/shared/ui/empty-state';

import { OfferStructuredDetailsPanel } from './offer-structured-details-panel';

import type { getJobOfferHistory } from '@/features/job-offers/api/job-offers-api';
import type { JobOfferListItemDto, JobOfferPrepPacketDto, JobOfferStatus } from '@/shared/types/api';

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
  prepPacket: JobOfferPrepPacketDto | null;
  historyError: string | null;
  updatedAt: number | null | undefined;
  isBusy: boolean;
  onStatusChange: (status: JobOfferStatus) => void;
  onSaveMeta: (notes: string, tags: string[]) => void;
  onSavePipeline: (pipelineMeta: Record<string, unknown>) => void;
  onCompleteFollowUp: (nextAction?: 'clear' | 'tomorrow' | 'in3days' | 'in1week') => void;
  onSnoozeFollowUp: (durationHours: number) => void;
  onClearFollowUp: () => void;
  onSaveFeedback: (score: number, notes: string) => void;
  onRescore: () => void;
  onGeneratePrep: (instructions?: string) => void;
  isGeneratingPrep?: boolean;
};

export const NotebookOfferDetailsCard = ({
  offer,
  history,
  prepPacket,
  historyError,
  updatedAt,
  isBusy,
  onStatusChange,
  onSaveMeta,
  onSavePipeline,
  onCompleteFollowUp,
  onSnoozeFollowUp,
  onClearFollowUp,
  onRescore,
}: NotebookOfferDetailsCardProps) => {
  const [pendingConfirmStatus, setPendingConfirmStatus] = useState<JobOfferStatus | null>(null);
  const [pipelineMetaStr, setPipelineMetaStr] = useState<string>(
    offer?.pipelineMeta ? JSON.stringify(offer.pipelineMeta, null, 2) : '',
  );
  const drafts = useNotebookOfferDetailsDrafts({ offer });

  useEffect(() => {
    setPipelineMetaStr(offer?.pipelineMeta ? JSON.stringify(offer.pipelineMeta, null, 2) : '');
  }, [offer?.id, offer?.pipelineMeta]);

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
  const followUpAt =
    offer.followUpAt ?? (pipelineMeta && typeof pipelineMeta.followUpAt === 'string' ? pipelineMeta.followUpAt : '');
  const applicationUrl =
    offer.applicationUrl ??
    (pipelineMeta && typeof pipelineMeta.applicationUrl === 'string' ? pipelineMeta.applicationUrl : '');
  const nextStep =
    offer.nextStep ?? (pipelineMeta && typeof pipelineMeta.nextStep === 'string' ? pipelineMeta.nextStep : '');
  const contactName =
    offer.contactName ?? (pipelineMeta && typeof pipelineMeta.contactName === 'string' ? pipelineMeta.contactName : '');
  const followUpNote =
    offer.followUpNote ??
    (pipelineMeta && typeof pipelineMeta.followUpNote === 'string' ? pipelineMeta.followUpNote : '');
  const followUpState = offer.followUpState ?? 'none';
  const followUpSummary =
    followUpState === 'due'
      ? 'Follow-up is overdue. Handle this before widening the funnel.'
      : followUpState === 'upcoming'
        ? 'Follow-up is scheduled soon. Prepare the message and next materials now.'
        : offer.status === 'APPLIED' || offer.status === 'INTERVIEWING' || offer.status === 'OFFER'
          ? 'No follow-up is scheduled yet. Add a date, next step, and note so this role does not drift.'
          : 'Capture the next step early so this role stays actionable if it becomes a keeper.';

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
                className={`app-badge ${
                  offer.followUpState === 'due'
                    ? 'border-app-danger-border bg-app-danger-soft text-app-danger'
                    : 'border-app-warning-border bg-app-warning-soft text-app-warning'
                }`}
              >
                Follow-up {offer.followUpState}
              </span>
            ) : null}
            <DataFreshnessBadge updatedAt={updatedAt} label="Offer data" />
          </div>
          <p className="text-secondary-foreground font-medium">
            {offer.company ?? 'Unknown company'} | {offer.location ?? 'Unknown location'}
          </p>
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          <div className="app-inset-stack space-y-2">
            <p className="text-text-soft text-xs uppercase tracking-[0.16em]">Next action</p>
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
                <ExternalLink className="ml-1 h-3.5 w-3.5" />
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

        <OfferStructuredDetailsPanel structuredDetails={offer.structuredDetails} />

        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="secondary" size="sm" disabled={isBusy} onClick={onRescore}>
            Re-score
          </Button>
          {offer.url ? (
            <Link
              href={offer.url}
              target="_blank"
              rel="noreferrer"
              className="border-border bg-surface-muted/50 text-text-soft hover:bg-surface-muted inline-flex items-center rounded-xl border px-3 py-1.5 text-[11px] transition-colors"
            >
              Open source listing
              <ExternalLink className="ml-1 h-3.5 w-3.5" />
            </Link>
          ) : null}
          {offer.sourceRunId ? (
            <Link
              href="/tester"
              className="border-border bg-surface-muted/50 text-text-soft hover:bg-surface-muted inline-flex items-center rounded-xl border px-3 py-1.5 text-[11px] transition-colors"
            >
              Run: {offer.sourceRunId.slice(0, 8)}
            </Link>
          ) : null}
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

        <section className="app-inset-stack space-y-3">
          <div className="space-y-1">
            <p className="text-text-soft text-xs uppercase tracking-[0.16em]">Follow-up plan</p>
            <p className="text-text-strong text-sm font-semibold">Keep one clear next move attached to this role</p>
          </div>
          {!['APPLIED', 'INTERVIEWING', 'OFFER', 'REJECTED'].includes(offer.status) ? (
            <WorkflowInlineNotice
              title="This role is still in early triage"
              description="You can already capture the next step or a follow-up date now, but these fields become most useful once the offer is saved, applied, or interviewing."
              tone="info"
            />
          ) : null}
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
          <div className="flex flex-wrap gap-2">
            <Button type="button" size="sm" disabled={isBusy || !hasPipelineDraftChanges} onClick={handleSavePipeline}>
              Save follow-up plan
            </Button>
            <Button type="button" size="sm" variant="secondary" disabled={isBusy} onClick={() => onCompleteFollowUp()}>
              Mark follow-up done
            </Button>
            <Button type="button" size="sm" variant="secondary" disabled={isBusy} onClick={() => onSnoozeFollowUp(72)}>
              Snooze 3 days
            </Button>
            <Button type="button" size="sm" variant="ghost" disabled={isBusy} onClick={onClearFollowUp}>
              Clear follow-up
            </Button>
            <p className="text-text-soft self-center text-xs">
              Keep dates, contact context, and the next touch in one place so the role does not drift.
            </p>
          </div>
        </section>

        <section className="app-inset-stack space-y-3">
          <div className="space-y-1">
            <p className="text-text-soft text-xs uppercase tracking-[0.16em]">Prep packet</p>
            <p className="text-text-strong text-sm font-semibold">
              A scan-friendly briefing for the next reply or interview
            </p>
          </div>
          {prepPacket ? (
            <div className="space-y-3">
              <div className="grid gap-3 md:grid-cols-2">
                <div className="app-muted-panel space-y-2">
                  <p className="text-text-soft text-xs uppercase tracking-[0.16em]">Why this role fits</p>
                  {prepPacket.profile?.headline ? (
                    <p className="text-text-strong text-sm">
                      {prepPacket.profile.headline} aligned to {prepPacket.offer.title}.
                    </p>
                  ) : (
                    <p className="text-text-soft text-sm">Profile summary is not available yet for this packet.</p>
                  )}
                  {prepPacket.profile?.summary ? (
                    <p className="text-text-soft text-sm leading-6">{prepPacket.profile.summary}</p>
                  ) : null}
                </div>
                <div className="app-muted-panel space-y-2">
                  <p className="text-text-soft text-xs uppercase tracking-[0.16em]">What to mention next</p>
                  {prepPacket.talkingPoints.length ? (
                    prepPacket.talkingPoints.map((point) => (
                      <p key={point} className="text-text-soft text-sm leading-6">
                        {point}
                      </p>
                    ))
                  ) : (
                    <p className="text-text-soft text-sm">
                      No talking points yet. Add next-step context or notes first.
                    </p>
                  )}
                </div>
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                <div className="app-muted-panel space-y-2">
                  <p className="text-text-soft text-xs uppercase tracking-[0.16em]">Verify before replying</p>
                  {prepPacket.verifyBeforeReply.map((item) => (
                    <p key={item} className="text-text-soft text-sm leading-6">
                      {item}
                    </p>
                  ))}
                </div>
                <div className="app-muted-panel space-y-2">
                  <p className="text-text-soft text-xs uppercase tracking-[0.16em]">Role-specific signals</p>
                  {prepPacket.profile?.targetRoles.length ? (
                    <p className="text-text-soft text-sm leading-6">
                      Target roles: {prepPacket.profile.targetRoles.join(', ')}
                    </p>
                  ) : null}
                  {prepPacket.profile?.searchableKeywords.length ? (
                    <p className="text-text-soft text-sm leading-6">
                      Keywords: {prepPacket.profile.searchableKeywords.join(', ')}
                    </p>
                  ) : null}
                  {!prepPacket.profile?.targetRoles.length && !prepPacket.profile?.searchableKeywords.length ? (
                    <p className="text-text-soft text-sm">No profile-derived signals are ready yet.</p>
                  ) : null}
                </div>
              </div>
            </div>
          ) : (
            <WorkflowInlineNotice
              title="Prep packet is loading"
              description="This workspace will show the role fit, next talking points, and reply checklist once the packet is available."
              tone="info"
            />
          )}
        </section>

        <section className="app-inset-stack space-y-3">
          <div className="space-y-1">
            <p className="text-text-soft text-xs uppercase tracking-[0.16em]">Notes and tags</p>
            <p className="text-text-strong text-sm font-semibold">
              Capture why this role matters before the context fades
            </p>
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

          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              size="sm"
              disabled={
                isBusy ||
                (drafts.notesDraft === (offer.notes ?? '') && drafts.tagsDraft === (offer.tags?.join(', ') ?? ''))
              }
              onClick={() => onSaveMeta(drafts.notesDraft, drafts.normalizedTags)}
            >
              Save notes and tags
            </Button>
          </div>
        </section>

        <details className="group">
          <summary className="text-text-strong hover:text-primary cursor-pointer text-sm font-medium transition-colors">
            Advanced metadata
          </summary>
          <div className="mt-3 space-y-3">
            <p className="text-text-soft text-xs">
              Use raw JSON only for fields that do not belong in the structured workflow controls above.
            </p>
            <div className="app-field-group">
              <Label htmlFor="pipeline-meta" className="app-inline-label">
                Pipeline Metadata (JSON)
              </Label>
              <Textarea
                id="pipeline-meta"
                rows={5}
                value={pipelineMetaStr}
                onChange={(event) => setPipelineMetaStr(event.target.value)}
                placeholder='{ "interviewDate": "2026-04-01" }'
                className="font-mono text-xs"
              />
            </div>
            <Button
              type="button"
              size="sm"
              variant="secondary"
              disabled={isBusy || !hasPipelineDraftChanges}
              onClick={handleSavePipeline}
            >
              Save metadata JSON
            </Button>
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

        {historyError ? (
          <WorkflowInlineNotice title="History is temporarily unavailable" description={historyError} tone="danger" />
        ) : null}

        {history ? (
          <details className="group" open>
            <summary className="text-text-strong hover:text-primary cursor-pointer text-sm font-medium transition-colors">
              Status history
            </summary>
            <div className="mt-3 space-y-2">
              {(history.statusHistory ?? []).length ? (
                (history.statusHistory ?? []).map((entry, index) => (
                  <div
                    key={`${entry.status}-${entry.changedAt}-${index}`}
                    className="border-border/60 bg-surface-muted/35 flex items-start justify-between gap-4 rounded-2xl border px-4 py-3"
                  >
                    <div>
                      <p className="text-text-strong text-sm font-semibold">Moved to {entry.status}</p>
                      <p className="text-text-soft mt-1 text-xs">{new Date(entry.changedAt).toLocaleString()}</p>
                    </div>
                    <span className="app-badge">{entry.status}</span>
                  </div>
                ))
              ) : (
                <p className="text-text-soft text-sm">No status changes recorded yet for this role.</p>
              )}
            </div>
          </details>
        ) : null}

        <details className="group">
          <summary className="text-text-strong hover:text-primary cursor-pointer text-sm font-medium transition-colors">
            Advanced fit diagnostics
          </summary>
          <div className="mt-3 space-y-3">
            <p className="text-text-soft text-xs">
              This is internal match metadata. Keep it out of the normal review flow unless you are debugging why a role
              was ranked this way.
            </p>
            <pre className="app-code">{JSON.stringify(matchMeta, null, 2)}</pre>
          </div>
        </details>
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
