'use client';

import { useProfileInputEditorForm } from '@/features/profile-management/model/hooks/use-profile-input-editor-form';
import { Button } from '@/shared/ui/button';
import { Card } from '@/shared/ui/card';
import { Input } from '@/shared/ui/input';
import { Label } from '@/shared/ui/label';
import { Textarea } from '@/shared/ui/textarea';
import { WorkflowInlineNotice } from '@/shared/ui/workflow-feedback';

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
        className="flex flex-col gap-4"
        onSubmit={form.handleSubmit((values) => {
          onSubmit({
            targetRoles: values.targetRoles,
            notes: values.notes?.trim() ? values.notes.trim() : undefined,
          });
        })}
      >
        <div className="app-field-group">
          <Label htmlFor="pm-target-roles" className="app-inline-label">
            Target roles
          </Label>
          <Input
            id="pm-target-roles"
            placeholder="Frontend Developer, Fullstack Developer"
            {...register('targetRoles')}
          />
          <p className="text-text-soft text-xs">
            Use a concise comma-separated list of the roles you want the system to prioritize.
          </p>
          {errors.targetRoles?.message ? (
            <WorkflowInlineNotice
              title="Target roles need correction"
              description={errors.targetRoles.message}
              tone="danger"
            />
          ) : null}
        </div>

        <div className="app-field-group">
          <Label htmlFor="pm-notes" className="app-inline-label">
            Notes
          </Label>
          <Textarea
            id="pm-notes"
            className="min-h-28"
            placeholder="Preferred work mode, salary, location, contracts..."
            {...register('notes')}
          />
          <p className="text-text-soft text-xs">
            Capture constraints, non-negotiables, and context that should influence filtering or ranking.
          </p>
          {errors.notes?.message ? (
            <WorkflowInlineNotice title="Notes need correction" description={errors.notes.message} tone="danger" />
          ) : null}
        </div>

        {errorMessage ? (
          <WorkflowInlineNotice title="Unable to save profile input" description={errorMessage} tone="danger" />
        ) : null}
        <Button type="submit" disabled={isSaving}>
          {isSaving ? 'Saving...' : 'Save profile input'}
        </Button>
      </form>
    </Card>
  );
};
