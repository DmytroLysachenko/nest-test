'use client';

import { useEffect, useState } from 'react';
import { Label } from '@repo/ui/components/label';

import { Button } from '@/shared/ui/button';
import { Card } from '@/shared/ui/card';
import { Input } from '@/shared/ui/input';
import { Textarea } from '@/shared/ui/textarea';

type ProfileInputEditorCardProps = {
  initialTargetRoles?: string;
  initialNotes?: string;
  onSubmit: (payload: { targetRoles: string; notes?: string }) => void;
  isSaving: boolean;
  errorMessage: string | null;
};

export const ProfileInputEditorCard = ({
  initialTargetRoles,
  initialNotes,
  onSubmit,
  isSaving,
  errorMessage,
}: ProfileInputEditorCardProps) => {
  const [targetRoles, setTargetRoles] = useState(initialTargetRoles ?? '');
  const [notes, setNotes] = useState(initialNotes ?? '');

  useEffect(() => {
    setTargetRoles(initialTargetRoles ?? '');
    setNotes(initialNotes ?? '');
  }, [initialNotes, initialTargetRoles]);

  return (
    <Card
      title="Profile Input"
      description="Update target roles and search notes. Saving input does not regenerate profile automatically."
    >
      <form
        className="flex flex-col gap-3"
        onSubmit={(event) => {
          event.preventDefault();
          onSubmit({ targetRoles, notes: notes || undefined });
        }}
      >
        <Label htmlFor="pm-target-roles">
          Target roles
          <Input
            id="pm-target-roles"
            className="mt-1"
            value={targetRoles}
            onChange={(event) => setTargetRoles(event.target.value)}
            placeholder="Frontend Developer, Fullstack Developer"
            required
          />
        </Label>

        <Label htmlFor="pm-notes">
          Notes
          <Textarea
            id="pm-notes"
            className="mt-1 min-h-24"
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            placeholder="Preferred work mode, salary, location, contracts..."
          />
        </Label>

        {errorMessage ? <p className="text-sm text-rose-600">{errorMessage}</p> : null}
        <Button type="submit" disabled={isSaving}>
          {isSaving ? 'Saving...' : 'Save profile input'}
        </Button>
      </form>
    </Card>
  );
};
