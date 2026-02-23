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
        <Label htmlFor="profile-target-roles" className="text-slate-700">
          Target roles
        </Label>
        <Input
          id="profile-target-roles"
          placeholder="Backend Engineer, NestJS Developer"
          {...register('targetRoles')}
        />
        {errors.targetRoles?.message ? <p className="text-sm text-rose-600">{errors.targetRoles.message}</p> : null}

        <Label htmlFor="profile-notes" className="text-slate-700">
          Notes
        </Label>
        <Textarea
          id="profile-notes"
          className="min-h-28"
          placeholder="Preferred location, salary range, role priorities..."
          {...register('notes')}
        />
        {errors.notes?.message ? <p className="text-sm text-rose-600">{errors.notes.message}</p> : null}

        {errors.root?.message ? <p className="text-sm text-rose-600">{errors.root.message}</p> : null}
        <Button type="submit" disabled={profileInputPanel.isSubmitting}>
          {profileInputPanel.isSubmitting ? 'Saving...' : 'Save profile input'}
        </Button>
      </form>

      <div className="mt-5 rounded-md border border-dashed border-slate-300 bg-slate-50 p-3 text-sm">
        <p className="font-semibold text-slate-800">Latest input</p>
        {profileInputPanel.latestQuery.data ? (
          <div className="mt-2 space-y-1 text-slate-700">
            <p>
              <span className="font-medium">Roles:</span> {profileInputPanel.latestQuery.data.targetRoles}
            </p>
            <p>
              <span className="font-medium">Notes:</span> {profileInputPanel.latestQuery.data.notes || 'n/a'}
            </p>
            {profileInputPanel.latestQuery.data.normalizedInput?.searchPreferences ? (
              <details className="mt-2">
                <summary className="cursor-pointer font-medium text-slate-800">Normalized search preferences</summary>
                <pre className="mt-2 whitespace-pre-wrap rounded-md bg-white p-2 text-xs text-slate-700">
                  {JSON.stringify(profileInputPanel.latestQuery.data.normalizedInput.searchPreferences, null, 2)}
                </pre>
              </details>
            ) : null}
          </div>
        ) : (
          <p className="mt-2 text-slate-500">No profile input yet.</p>
        )}
      </div>
    </Card>
  );
};
