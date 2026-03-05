'use client';

import { useProfileGenerationInstructionsForm } from '@/features/profile-management/model/hooks/use-profile-generation-instructions-form';
import { Button } from '@/shared/ui/button';
import { Card } from '@/shared/ui/card';
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
        <Label htmlFor="pm-generation-instructions">Optional generation instructions</Label>
        <Textarea
          id="pm-generation-instructions"
          className="min-h-20"
          placeholder="Highlight frontend + transferable backend competencies."
          {...generationForm.register('instructions')}
        />
        {generateErrorMessage ? <p className="text-app-danger text-sm">{generateErrorMessage}</p> : null}
        <Button type="submit" disabled={!canGenerate || isGenerating}>
          {isGenerating ? 'Generating...' : 'Generate new profile version'}
        </Button>
        {!canGenerate ? (
          <p className="text-app-warning text-sm">
            At least one extracted document is required before generating a profile.
          </p>
        ) : null}
      </form>

      <div className="border-border bg-surface-muted mt-4 rounded-md border p-3 text-sm">
        <p className="text-text-strong font-semibold">Active profile</p>
        {latestProfile ? (
          <div className="text-text-soft mt-2 space-y-1">
            <p>
              Version: <span className="font-medium">v{latestProfile.version}</span>
            </p>
            <p>
              Status: <span className="font-medium">{latestProfile.status}</span>
            </p>
            <p>Linked documents: {latestProfileDocuments.length}</p>
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
            <article key={item.id} className="border-border bg-surface-elevated rounded-md border p-3 text-sm">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="text-text-soft">
                  <p className="text-text-strong font-semibold">
                    v{item.version} {item.isActive ? '(active)' : ''}
                  </p>
                  <p>Status: {item.status}</p>
                  <p>Created: {new Date(item.createdAt).toLocaleString()}</p>
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
