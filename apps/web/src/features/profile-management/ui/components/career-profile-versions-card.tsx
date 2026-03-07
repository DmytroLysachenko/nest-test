'use client';

import { useProfileGenerationInstructionsForm } from '@/features/profile-management/model/hooks/use-profile-generation-instructions-form';
import { Button } from '@/shared/ui/button';
import { Card } from '@/shared/ui/card';
import { InspectorRow } from '@/shared/ui/inspector-row';
import { Label } from '@/shared/ui/label';
import { Textarea } from '@/shared/ui/textarea';

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

  return (
    <Card
      title="Career Profile Versions"
      description="Updates create a new career profile version. Older versions can be restored."
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
        {generateErrorMessage ? <p className="text-app-danger text-sm">{generateErrorMessage}</p> : null}
        <div className="app-toolbar flex items-center justify-between gap-3">
          {!canGenerate ? (
            <p className="text-app-warning text-sm">
              At least one extracted document is required before generating a profile.
            </p>
          ) : (
            <span />
          )}
          <Button type="submit" disabled={!canGenerate || isGenerating}>
            {isGenerating ? 'Generating...' : 'Generate new profile version'}
          </Button>
        </div>
      </form>

      <div className="app-muted-panel mt-4 space-y-3 text-sm">
        <p className="text-text-strong font-semibold">Active profile</p>
        {latestProfile ? (
          <div className="space-y-2">
            <InspectorRow label="Version" value={`v${latestProfile.version}`} />
            <InspectorRow label="Status" value={latestProfile.status} />
            <InspectorRow label="Linked documents" value={String(latestProfileDocuments.length)} />
          </div>
        ) : (
          <p className="text-text-soft mt-2">No active profile found.</p>
        )}
      </div>

      <div className="mt-4 space-y-2">
        <p className="text-text-strong text-sm font-semibold">Version history</p>
        {restoreErrorMessage ? <p className="text-app-danger text-sm">{restoreErrorMessage}</p> : null}
        {versions?.items?.length ? (
          versions.items.map((item) => (
            <article key={item.id} className="app-muted-panel space-y-3 text-sm">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="w-full space-y-2">
                  <InspectorRow
                    label="Version"
                    value={`v${item.version}${item.isActive ? ' (active)' : ''}`}
                  />
                  <InspectorRow label="Status" value={item.status} />
                  <InspectorRow label="Created" value={new Date(item.createdAt).toLocaleString()} />
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
