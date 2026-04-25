'use client';

import { useProfileGenerationInstructionsForm } from '@/features/profile-management/model/hooks/use-profile-generation-instructions-form';
import { formatDateTime } from '@/shared/lib/utils/date-format';
import { Button } from '@/shared/ui/button';
import { Card } from '@/shared/ui/card';
import { InspectorRow } from '@/shared/ui/inspector-row';
import { Label } from '@/shared/ui/label';
import { Textarea } from '@/shared/ui/textarea';
import { WorkflowInlineNotice } from '@/shared/ui/workflow-feedback';

import type { CareerProfileDto, CareerProfileListDto, DocumentDto } from '@/shared/types/api';

type CareerProfileVersionsCardProps = {
  latestProfile: CareerProfileDto | null;
  versions: CareerProfileListDto | undefined;
  latestProfileDocuments: DocumentDto[];
  canGenerate: boolean;
  isGenerating: boolean;
  isRestoring: boolean;
  onGenerate: (payload: { instructions?: string }) => void;
  onRestore: (careerProfileId: string) => void;
  generateErrorMessage: string | null;
  restoreErrorMessage: string | null;
};

export const CareerProfileVersionsCard = ({
  latestProfile,
  versions,
  latestProfileDocuments,
  canGenerate,
  isGenerating,
  isRestoring,
  onGenerate,
  onRestore,
  generateErrorMessage,
  restoreErrorMessage,
}: CareerProfileVersionsCardProps) => {
  const generationForm = useProfileGenerationInstructionsForm();
  const activeGenerationState = latestProfile?.generationState ?? null;
  const isGenerationActive = activeGenerationState === 'QUEUED' || activeGenerationState === 'RUNNING';
  const getProfileStatusLabel = (value: string) => {
    if (value === 'READY') {
      return 'Ready';
    }
    if (value === 'PENDING') {
      return 'In progress';
    }
    if (value === 'FAILED') {
      return 'Needs attention';
    }
    return value;
  };
  const getGenerationStateLabel = (value: string) => {
    if (value === 'RUNNING') {
      return 'Creating now';
    }
    if (value === 'QUEUED') {
      return 'Queued';
    }
    if (value === 'READY') {
      return 'Ready';
    }
    if (value === 'FAILED') {
      return 'Needs attention';
    }
    return value;
  };

  return (
    <Card
      title="Profile versions"
      description="Each update creates a new version. Older versions stay available if you need to switch back."
    >
      <form
        className="space-y-3"
        onSubmit={generationForm.handleSubmit((values) => {
          onGenerate({ instructions: values.instructions?.trim() ? values.instructions.trim() : undefined });
        })}
      >
        <div className="app-field-group">
          <Label htmlFor="pm-generation-instructions" className="app-inline-label">
            Optional generation instructions
          </Label>
          <Textarea
            id="pm-generation-instructions"
            className="min-h-20"
            placeholder="Highlight frontend + transferable backend competencies."
            {...generationForm.register('instructions')}
          />
        </div>
        {generateErrorMessage ? (
          <WorkflowInlineNotice
            title="Profile generation needs attention"
            description={generateErrorMessage}
            tone="danger"
          />
        ) : null}
        <div className="app-toolbar flex items-center justify-between gap-3">
          {!canGenerate ? (
            <p className="text-app-warning text-sm">
              At least one extracted document is required before generating a profile.
            </p>
          ) : isGenerationActive ? (
            <p className="text-text-soft text-sm">
              {activeGenerationState === 'RUNNING'
                ? 'A new profile is being created right now. Wait for it to finish before starting another version.'
                : 'A new profile is queued to start. Wait for it to finish before creating another version.'}
            </p>
          ) : (
            <span />
          )}
          <Button type="submit" disabled={!canGenerate || isGenerating || isGenerationActive}>
            {isGenerating || isGenerationActive
              ? activeGenerationState === 'RUNNING'
                ? 'Generation running...'
                : 'Generation queued...'
              : 'Generate new profile version'}
          </Button>
        </div>
      </form>

      <div className="app-muted-panel mt-4 space-y-3 text-sm">
        <p className="text-text-strong font-semibold">Active profile</p>
        {latestProfile ? (
          <div className="space-y-2">
            <InspectorRow label="Version" value={`v${latestProfile.version}`} />
            <InspectorRow label="Status" value={getProfileStatusLabel(latestProfile.status)} />
            <InspectorRow label="Update state" value={getGenerationStateLabel(latestProfile.generationState)} />
            <InspectorRow label="Queued" value={formatDateTime(latestProfile.generationQueuedAt)} />
            <InspectorRow label="Started" value={formatDateTime(latestProfile.generationStartedAt)} />
            <InspectorRow label="Attempts" value={String(latestProfile.generationAttemptCount)} />
            <InspectorRow label="Linked documents" value={String(latestProfileDocuments.length)} />
          </div>
        ) : (
          <p className="text-text-soft mt-2">No active profile found.</p>
        )}
      </div>

      <div className="mt-4 space-y-2">
        <p className="text-text-strong text-sm font-semibold">Version history</p>
        {restoreErrorMessage ? (
          <WorkflowInlineNotice title="Profile restore failed" description={restoreErrorMessage} tone="danger" />
        ) : null}
        {versions?.items?.length ? (
          versions.items.map((item) => (
            <article key={item.id} className="app-muted-panel space-y-3 text-sm">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="w-full space-y-2">
                  <InspectorRow label="Version" value={`v${item.version}${item.isActive ? ' (active)' : ''}`} />
                  <InspectorRow label="Status" value={getProfileStatusLabel(item.status)} />
                  <InspectorRow label="Update state" value={getGenerationStateLabel(item.generationState)} />
                  <InspectorRow label="Queued" value={formatDateTime(item.generationQueuedAt)} />
                  <InspectorRow label="Started" value={formatDateTime(item.generationStartedAt)} />
                  <InspectorRow label="Attempts" value={String(item.generationAttemptCount)} />
                  <InspectorRow label="Created" value={formatDateTime(item.createdAt)} />
                </div>
                {!item.isActive ? (
                  <Button type="button" variant="secondary" disabled={isRestoring} onClick={() => onRestore(item.id)}>
                    Restore
                  </Button>
                ) : null}
              </div>
            </article>
          ))
        ) : (
          <p className="text-text-soft text-sm">No profile versions yet.</p>
        )}
      </div>
    </Card>
  );
};
