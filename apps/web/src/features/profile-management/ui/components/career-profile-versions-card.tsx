'use client';

import { useState } from 'react';
import { Label } from '@repo/ui/components/label';

import { Button } from '@/shared/ui/button';
import { Card } from '@/shared/ui/card';
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
  const [instructions, setInstructions] = useState('');

  return (
    <Card
      title="Career Profile Versions"
      description="Updates create a new career profile version. Older versions can be restored."
    >
      <form
        className="space-y-3"
        onSubmit={(event) => {
          event.preventDefault();
          onGenerate({ instructions: instructions || undefined });
        }}
      >
        <Label htmlFor="pm-generation-instructions">
          Optional generation instructions
          <Textarea
            id="pm-generation-instructions"
            className="mt-1 min-h-20"
            value={instructions}
            onChange={(event) => setInstructions(event.target.value)}
            placeholder="Highlight frontend + transferable backend competencies."
          />
        </Label>
        {generateErrorMessage ? <p className="text-sm text-rose-600">{generateErrorMessage}</p> : null}
        <Button type="submit" disabled={!canGenerate || isGenerating}>
          {isGenerating ? 'Generating...' : 'Generate new profile version'}
        </Button>
        {!canGenerate ? (
          <p className="text-sm text-amber-700">
            At least one extracted document is required before generating a profile.
          </p>
        ) : null}
      </form>

      <div className="mt-4 rounded-md border border-slate-200 bg-slate-50 p-3 text-sm">
        <p className="font-semibold text-slate-900">Active profile</p>
        {latestProfile ? (
          <div className="mt-2 space-y-1 text-slate-700">
            <p>
              Version: <span className="font-medium">v{latestProfile.version}</span>
            </p>
            <p>
              Status: <span className="font-medium">{latestProfile.status}</span>
            </p>
            <p>Linked documents: {latestProfileDocuments.length}</p>
          </div>
        ) : (
          <p className="mt-2 text-slate-500">No active profile found.</p>
        )}
      </div>

      <div className="mt-4 space-y-2">
        <p className="text-sm font-semibold text-slate-900">Version history</p>
        {restoreErrorMessage ? <p className="text-sm text-rose-600">{restoreErrorMessage}</p> : null}
        {versions?.items?.length ? (
          versions.items.map((item) => (
            <article key={item.id} className="rounded-md border border-slate-200 bg-white p-3 text-sm">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="text-slate-700">
                  <p className="font-semibold text-slate-900">
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
          <p className="text-sm text-slate-500">No profile versions yet.</p>
        )}
      </div>
    </Card>
  );
};
