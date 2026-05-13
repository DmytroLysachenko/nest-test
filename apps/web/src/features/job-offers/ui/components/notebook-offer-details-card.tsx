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
import { getSafeOfferField } from '@/shared/lib/presentation/job-search-ui';
import { formatDateTime } from '@/shared/lib/utils/date-format';

import { OfferStructuredDetailsPanel } from './offer-structured-details-panel';
import { OfferReminderDeliveryState } from './offer-reminder-delivery-state';
import { OfferReliabilityNotice } from './offer-reliability-notice';
import { OfferCompactSourceLinks } from './offer-source-links';

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
  onRescore: () => void;
};

const normalizePipelineMetaRecord = (value: unknown) =>
  value && typeof value === 'object' && !Array.isArray(value) ? ({ ...value } as Record<string, unknown>) : {};

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
  const [pipelineDraft, setPipelineDraft] = useState<Record<string, unknown>>(
    normalizePipelineMetaRecord(offer?.pipelineMeta),
  );
  const drafts = useNotebookOfferDetailsDrafts({ offer });

  useEffect(() => {
    setPipelineDraft(normalizePipelineMetaRecord(offer?.pipelineMeta));
  }, [offer?.id, offer?.pipelineMeta]);

  if (!offer) {
    return (
      <Card
        title="Offer details"
        description="Select an offer from the list to inspect and edit it."
        className="xl:max-h-[calc(100vh-8rem)] xl:overflow-y-auto"
      >
        <EmptyState
          icon={<Pointer className="h-8 w-8" />}
          title="No offer selected"
          description="Click on an offer in the list to view its full details and history."
        />
      </Card>
    );
  }

  const pipelineMeta = normalizePipelineMetaRecord(offer.pipelineMeta);
  const hasPipelineDraftChanges = JSON.stringify(pipelineDraft) !== JSON.stringify(pipelineMeta);
  const followUpAt = offer.followUpAt ?? (typeof pipelineDraft.followUpAt === 'string' ? pipelineDraft.followUpAt : '');
  const applicationUrl =
    offer.applicationUrl ?? (typeof pipelineDraft.applicationUrl === 'string' ? pipelineDraft.applicationUrl : '');
  const nextStep = offer.nextStep ?? (typeof pipelineDraft.nextStep === 'string' ? pipelineDraft.nextStep : '');
  const contactName =
    offer.contactName ?? (typeof pipelineDraft.contactName === 'string' ? pipelineDraft.contactName : '');
  const followUpNote =
    offer.followUpNote ?? (typeof pipelineDraft.followUpNote === 'string' ? pipelineDraft.followUpNote : '');
  const followUpState = offer.followUpState ?? 'none';
  const followUpSummary =
    followUpState === 'due'
      ? 'Follow-up is overdue. Handle this before widening the funnel.'
      : followUpState === 'upcoming'
        ? 'Follow-up is scheduled soon. Prepare the message and next materials now.'
        : offer.status === 'APPLIED' || offer.status === 'INTERVIEWING' || offer.status === 'OFFER'
          ? 'No follow-up is scheduled yet. Add a date, next step, and note so this role does not drift.'
          : 'Capture the next step early so this role stays actionable if it becomes a keeper.';
  const decisionDueAt = typeof pipelineDraft.decisionDueAt === 'string' ? pipelineDraft.decisionDueAt : null;
  const prepRecommended = typeof pipelineDraft.prepRecommended === 'boolean' ? pipelineDraft.prepRecommended : false;
  const safeLocation = getSafeOfferField(offer.location, 'location');

  const setStructuredPipelineField = (field: string, value: unknown) => {
    setPipelineDraft((current) => ({
      ...current,
      [field]: value,
    }));
  };

  const handleSavePipeline = () => {
    onSavePipeline(pipelineDraft);
  };

  return (
    <Card title="Offer details" description={offer.title} className="xl:max-h-[calc(100vh-8rem)] xl:overflow-y-auto">
      <div className="space-y-4 text-sm">
        <div className="app-muted-panel space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <span className="app-badge border-primary/20 bg-primary/5 text-primary">{offer.status}</span>
            {typeof offer.matchScore === 'number' ? <span className="app-badge">Match {offer.matchScore}</span> : null}
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
            {offer.isExpired ? <span className="app-badge">Expired</span> : null}
          </div>
          <p className="text-secondary-foreground font-medium">
            {offer.company ?? 'Unknown company'}
            {safeLocation ? ` | ${safeLocation}` : ''}
          </p>
          {offer.expiresAt ? (
            <p className="text-text-soft text-xs">
              {offer.isExpired ? 'Offer expired' : 'Offer valid until'} {formatDateTime(offer.expiresAt)}
            </p>
          ) : null}
        </div>

        <OfferReliabilityNotice reliabilityContext={offer.reliabilityContext} />
        <OfferReminderDeliveryState reminderDelivery={offer.reminderDelivery} />

        <div className="grid gap-3 md:grid-cols-2">
          <div className="app-muted-panel space-y-2">
            <p className="text-text-soft text-xs uppercase tracking-[0.16em]">Next action</p>
            <p className="text-text-strong text-sm font-semibold">
              {offer.recommendedAction?.label ?? followUpSummary}
            </p>
            {offer.recommendedAction ? (
              <p className="text-text-soft text-sm">{offer.recommendedAction.reason}</p>
            ) : null}
            {nextStep ? <p className="text-text-soft text-sm">Next step: {nextStep}</p> : null}
            {followUpAt ? <p className="text-text-soft text-sm">Scheduled for: {formatDateTime(followUpAt)}</p> : null}
            {decisionDueAt ? (
              <p className="text-text-soft text-sm">Decision checkpoint: {formatDateTime(decisionDueAt)}</p>
            ) : null}
          </div>
          <div className="app-muted-panel space-y-2">
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
            {prepRecommended ? (
              <p className="text-text-soft text-sm">Prep is explicitly marked as recommended.</p>
            ) : null}
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
          <OfferCompactSourceLinks offer={offer} />
        </div>

        <div className="bg-surface-muted/54 flex flex-wrap gap-1.5 rounded-[1.35rem] p-2.5">
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

        <section className="bg-surface-muted/38 space-y-3 rounded-[1.6rem] p-4">
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
              <Label htmlFor="decision-due-at" className="app-inline-label">
                Decision due at
              </Label>
              <Input
                id="decision-due-at"
                type="datetime-local"
                value={decisionDueAt ? decisionDueAt.slice(0, 16) : ''}
                onChange={(event) =>
                  setStructuredPipelineField(
                    'decisionDueAt',
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
              <Label htmlFor="prep-recommended" className="app-inline-label">
                Prep recommended
              </Label>
              <select
                id="prep-recommended"
                className="app-select"
                value={prepRecommended ? 'yes' : 'no'}
                onChange={(event) => setStructuredPipelineField('prepRecommended', event.target.value === 'yes')}
              >
                <option value="no">No</option>
                <option value="yes">Yes</option>
              </select>
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
            <Button
              type="button"
              size="sm"
              variant="secondary"
              disabled={isBusy}
              onClick={() => onCompleteFollowUp('tomorrow')}
            >
              Done, remind tomorrow
            </Button>
            <Button
              type="button"
              size="sm"
              variant="secondary"
              disabled={isBusy}
              onClick={() => onCompleteFollowUp('in3days')}
            >
              Done, remind in 3 days
            </Button>
            <Button
              type="button"
              size="sm"
              variant="secondary"
              disabled={isBusy}
              onClick={() => onCompleteFollowUp('in1week')}
            >
              Done, remind in 1 week
            </Button>
            <Button type="button" size="sm" variant="secondary" disabled={isBusy} onClick={() => onSnoozeFollowUp(24)}>
              Snooze 1 day
            </Button>
            <Button type="button" size="sm" variant="secondary" disabled={isBusy} onClick={() => onSnoozeFollowUp(72)}>
              Snooze 3 days
            </Button>
            <Button type="button" size="sm" variant="secondary" disabled={isBusy} onClick={() => onSnoozeFollowUp(168)}>
              Snooze 1 week
            </Button>
            <Button type="button" size="sm" variant="ghost" disabled={isBusy} onClick={onClearFollowUp}>
              Clear follow-up
            </Button>
            <p className="text-text-soft self-center text-xs">
              External email can fail; notebook still keeps date, contact context, and next touch here.
            </p>
          </div>
        </section>

        <section className="bg-surface-muted/38 space-y-3 rounded-[1.6rem] p-4">
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
              {prepPacket.attentionContext ? (
                <div className="grid gap-3 md:grid-cols-2">
                  <div className="app-muted-panel space-y-2">
                    <p className="text-text-soft text-xs uppercase tracking-[0.16em]">Why act now</p>
                    <p className="text-text-strong text-sm">
                      {prepPacket.attentionContext.workflowSummary ?? 'No urgent workflow pressure yet.'}
                    </p>
                    {prepPacket.attentionContext.reasonsToActNow.map((item) => (
                      <p key={item} className="text-text-soft text-sm leading-6">
                        {item}
                      </p>
                    ))}
                  </div>
                  <div className="app-muted-panel space-y-2">
                    <p className="text-text-soft text-xs uppercase tracking-[0.16em]">Requirement highlights</p>
                    {prepPacket.requirementHighlights?.length ? (
                      prepPacket.requirementHighlights.map((item) => (
                        <p key={item} className="text-text-soft text-sm leading-6">
                          {item}
                        </p>
                      ))
                    ) : (
                      <p className="text-text-soft text-sm">No structured requirement highlights are available yet.</p>
                    )}
                  </div>
                </div>
              ) : null}
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

        <section className="bg-surface-muted/38 space-y-3 rounded-[1.6rem] p-4">
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
            Full description
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
                      <p className="text-text-soft mt-1 text-xs">{formatDateTime(entry.changedAt)}</p>
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
