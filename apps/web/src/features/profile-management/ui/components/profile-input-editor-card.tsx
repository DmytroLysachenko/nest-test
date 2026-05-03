'use client';

import { useProfileInputEditorForm } from '@/features/profile-management/model/hooks/use-profile-input-editor-form';
import { toOptionalTrimmedString } from '@/shared/lib/utils/input-normalizers';
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
        className="flex flex-col gap-5"
        onSubmit={form.handleSubmit((values) => {
          onSubmit({
            targetRoles: values.targetRoles,
            notes: toOptionalTrimmedString(values.notes),
          });
        })}
      >
        <section className="app-tonal-section space-y-4">
          <div className="space-y-1">
            <p className="text-text-soft text-xs uppercase tracking-[0.16em]">Primary input</p>
            <p className="text-text-strong text-lg font-semibold">Keep role intent sharp before generating a profile</p>
            <p className="text-text-soft text-sm">
              This should stay concise and decisive. Wider context belongs in notes, not in the target role list.
            </p>
          </div>

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
        </section>

        <section className="space-y-3">
          <div className="app-open-section border-border/45 border-t pt-3">
            <p className="text-text-soft text-xs uppercase tracking-[0.16em]">Supporting context</p>
            <p className="text-text-soft mt-1 text-sm">
              Capture constraints, non-negotiables, and context that should influence filtering or ranking.
            </p>
          </div>
          <div className="app-field-group">
            <Label htmlFor="pm-notes" className="app-inline-label">
              Notes
            </Label>
            <Textarea
              id="pm-notes"
              className="min-h-36"
              placeholder="Preferred work mode, salary, location, contracts..."
              {...register('notes')}
            />
            {errors.notes?.message ? (
              <WorkflowInlineNotice title="Notes need correction" description={errors.notes.message} tone="danger" />
            ) : null}
          </div>
        </section>

        {errorMessage ? (
          <WorkflowInlineNotice title="Unable to save profile input" description={errorMessage} tone="danger" />
        ) : null}
        <div className="border-border/45 flex flex-wrap items-center justify-between gap-3 border-t pt-4">
          <p className="text-text-soft text-sm">
            Save input first. Regeneration stays explicit and should only happen after the target direction looks right.
          </p>
          <Button type="submit" disabled={isSaving}>
            {isSaving ? 'Saving...' : 'Save profile input'}
          </Button>
        </div>
      </form>
    </Card>
  );
};
