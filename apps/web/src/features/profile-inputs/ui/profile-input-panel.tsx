'use client';

import { useProfileInputPanel } from '@/features/profile-inputs/model/hooks/use-profile-input-panel';
import { Button } from '@/shared/ui/button';
import { Card } from '@/shared/ui/card';
import { Input } from '@/shared/ui/input';
import { Label } from '@/shared/ui/label';
import { Textarea } from '@/shared/ui/textarea';
import { WorkflowFeedback, WorkflowInlineNotice } from '@/shared/ui/workflow-feedback';

type ProfileInputPanelProps = {
  token: string;
};

export const ProfileInputPanel = ({ token }: ProfileInputPanelProps) => {
  const profileInputPanel = useProfileInputPanel(token);
  const {
    register,
    formState: { errors },
  } = profileInputPanel.form;
  const latestInput = profileInputPanel.latestQuery.data;

  return (
    <Card
      title="Profile input"
      description="Capture the role direction and constraints that should influence every new profile version."
    >
      <form className="flex flex-col gap-3" onSubmit={profileInputPanel.submit}>
        <WorkflowInlineNotice
          title="Update this only when your search direction changes"
          description="Treat this as stable source context. Small job-by-job preferences belong in notebook notes, not here."
          tone="info"
        />
        <Label htmlFor="profile-target-roles" className="text-text-soft">
          Target roles
        </Label>
        <Input
          id="profile-target-roles"
          placeholder="Backend Engineer, NestJS Developer"
          {...register('targetRoles')}
        />
        {errors.targetRoles?.message ? (
          <WorkflowInlineNotice
            title="Target roles need correction"
            description={errors.targetRoles.message}
            tone="danger"
          />
        ) : null}

        <Label htmlFor="profile-notes" className="text-text-soft">
          Notes
        </Label>
        <Textarea
          id="profile-notes"
          className="min-h-28"
          placeholder="Preferred location, salary range, role priorities..."
          {...register('notes')}
        />
        {errors.notes?.message ? (
          <WorkflowInlineNotice title="Notes need correction" description={errors.notes.message} tone="danger" />
        ) : null}

        {errors.root?.message ? (
          <WorkflowFeedback
            title="Unable to save profile input"
            description={errors.root.message}
            tone="danger"
            className="p-4 sm:p-5"
          />
        ) : null}
        <Button type="submit" disabled={profileInputPanel.isSubmitting}>
          {profileInputPanel.isSubmitting ? 'Saving...' : 'Save profile input'}
        </Button>
      </form>

      <div className="border-border bg-surface-muted mt-5 rounded-md border border-dashed p-3 text-sm">
        <p className="text-text-strong font-semibold">Latest saved context</p>
        {profileInputPanel.latestErrorMessage ? (
          <WorkflowInlineNotice
            title="Latest input is temporarily unavailable"
            description={profileInputPanel.latestErrorMessage}
            tone="warning"
            className="mt-3"
          />
        ) : latestInput ? (
          <div className="text-text-soft mt-2 space-y-1">
            <p>
              <span className="font-medium">Roles:</span> {latestInput.targetRoles}
            </p>
            <p>
              <span className="font-medium">Notes:</span> {latestInput.notes || 'n/a'}
            </p>
            {latestInput.normalizedInput?.searchPreferences ? (
              <details className="mt-2">
                <summary className="text-text-strong cursor-pointer font-medium">Normalized search preferences</summary>
                <pre className="bg-surface-elevated text-text-soft mt-2 whitespace-pre-wrap rounded-md p-2 text-xs">
                  {JSON.stringify(latestInput.normalizedInput.searchPreferences, null, 2)}
                </pre>
              </details>
            ) : null}
          </div>
        ) : (
          <WorkflowFeedback
            title="No saved profile input yet"
            description="Save your target roles and baseline notes first so profile generation has stable direction before you create a new version."
            tone="info"
            className="mt-3 p-4 sm:p-5"
          />
        )}
      </div>
    </Card>
  );
};
