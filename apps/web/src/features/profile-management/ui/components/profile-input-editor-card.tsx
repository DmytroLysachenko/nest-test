'use client';

import { useProfileInputEditorForm } from '@/features/profile-management/model/hooks/use-profile-input-editor-form';
import { Button } from '@/shared/ui/button';
import { Card } from '@/shared/ui/card';
import { Input } from '@/shared/ui/input';
import { Label } from '@/shared/ui/label';
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
  const form = useProfileInputEditorForm({ initialTargetRoles, initialNotes });
  const {
    register,
    formState: { errors },
  } = form;

  return (
    <Card
      title="Profile Input"
      description="Update target roles and search notes. Saving input does not regenerate profile automatically."
    >
      <form
        className="flex flex-col gap-3"
        onSubmit={form.handleSubmit((values) => {
          onSubmit({
            targetRoles: values.targetRoles,
            notes: values.notes?.trim() ? values.notes.trim() : undefined,
          });
        })}
      >
        <Label htmlFor="pm-target-roles">Target roles</Label>
        <Input
          id="pm-target-roles"
          placeholder="Frontend Developer, Fullstack Developer"
          {...register('targetRoles')}
        />
        {errors.targetRoles?.message ? <p className="text-sm text-rose-600">{errors.targetRoles.message}</p> : null}

        <Label htmlFor="pm-notes">Notes</Label>
        <Textarea
          id="pm-notes"
          className="min-h-24"
          placeholder="Preferred work mode, salary, location, contracts..."
          {...register('notes')}
        />
        {errors.notes?.message ? <p className="text-sm text-rose-600">{errors.notes.message}</p> : null}

        {errorMessage ? <p className="text-sm text-rose-600">{errorMessage}</p> : null}
        <Button type="submit" disabled={isSaving}>
          {isSaving ? 'Saving...' : 'Save profile input'}
        </Button>
      </form>
    </Card>
  );
};
