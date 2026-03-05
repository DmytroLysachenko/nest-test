'use client';

import { useProfileInputPanel } from '@/features/profile-inputs/model/hooks/use-profile-input-panel';
import { Button } from '@/shared/ui/button';
import { Card } from '@/shared/ui/card';
import { Input } from '@/shared/ui/input';
import { Label } from '@/shared/ui/label';
import { Textarea } from '@/shared/ui/textarea';

type ProfileInputPanelProps = {
  token: string;
};

export const ProfileInputPanel = ({ token }: ProfileInputPanelProps) => {
  const profileInputPanel = useProfileInputPanel(token);
  const {
    register,
    formState: { errors },
  } = profileInputPanel.form;

  return (
    <Card title="Profile input" description="Define your target roles and personal notes for profile generation.">
      <form className="flex flex-col gap-3" onSubmit={profileInputPanel.submit}>
        <Label htmlFor="profile-target-roles" className="text-text-soft">
          Target roles
        </Label>
        <Input
          id="profile-target-roles"
          placeholder="Backend Engineer, NestJS Developer"
          {...register('targetRoles')}
        />
        {errors.targetRoles?.message ? <p className="text-app-danger text-sm">{errors.targetRoles.message}</p> : null}

        <Label htmlFor="profile-notes" className="text-text-soft">
          Notes
        </Label>
        <Textarea
          id="profile-notes"
          className="min-h-28"
          placeholder="Preferred location, salary range, role priorities..."
          {...register('notes')}
        />
        {errors.notes?.message ? <p className="text-app-danger text-sm">{errors.notes.message}</p> : null}

        {errors.root?.message ? <p className="text-app-danger text-sm">{errors.root.message}</p> : null}
        <Button type="submit" disabled={profileInputPanel.isSubmitting}>
          {profileInputPanel.isSubmitting ? 'Saving...' : 'Save profile input'}
        </Button>
      </form>

      <div className="border-border bg-surface-muted mt-5 rounded-md border border-dashed p-3 text-sm">
        <p className="text-text-strong font-semibold">Latest input</p>
        {profileInputPanel.latestQuery.data ? (
          <div className="text-text-soft mt-2 space-y-1">
            <p>
              <span className="font-medium">Roles:</span> {profileInputPanel.latestQuery.data.targetRoles}
            </p>
            <p>
              <span className="font-medium">Notes:</span> {profileInputPanel.latestQuery.data.notes || 'n/a'}
            </p>
            {profileInputPanel.latestQuery.data.normalizedInput?.searchPreferences ? (
              <details className="mt-2">
                <summary className="text-text-strong cursor-pointer font-medium">Normalized search preferences</summary>
                <pre className="bg-surface-elevated text-text-soft mt-2 whitespace-pre-wrap rounded-md p-2 text-xs">
                  {JSON.stringify(profileInputPanel.latestQuery.data.normalizedInput.searchPreferences, null, 2)}
                </pre>
              </details>
            ) : null}
          </div>
        ) : (
          <p className="text-text-soft mt-2">No profile input yet.</p>
        )}
      </div>
    </Card>
  );
};
