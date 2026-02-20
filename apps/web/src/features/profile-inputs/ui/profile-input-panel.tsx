'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Label } from '@repo/ui/components/label';
import { useState } from 'react';

import { createProfileInput, getLatestProfileInput } from '@/features/profile-inputs/api/profile-inputs-api';
import { ApiError } from '@/shared/lib/http/api-error';
import { Button } from '@/shared/ui/button';
import { Card } from '@/shared/ui/card';
import { Input } from '@/shared/ui/input';
import { Textarea } from '@/shared/ui/textarea';

type ProfileInputPanelProps = {
  token: string;
};

export const ProfileInputPanel = ({ token }: ProfileInputPanelProps) => {
  const queryClient = useQueryClient();
  const [targetRoles, setTargetRoles] = useState('');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState<string | null>(null);

  const latestQuery = useQuery({
    queryKey: ['profile-inputs', 'latest', token],
    queryFn: () => getLatestProfileInput(token),
  });

  const createMutation = useMutation({
    mutationFn: () =>
      createProfileInput(token, {
        targetRoles,
        notes: notes || undefined,
      }),
    onSuccess: () => {
      setTargetRoles('');
      setNotes('');
      setError(null);
      queryClient.invalidateQueries({ queryKey: ['profile-inputs', 'latest', token] });
    },
    onError: (err: unknown) => {
      setError(err instanceof ApiError ? err.message : 'Failed to save profile input');
    },
  });

  return (
    <Card title="Profile input" description="Define your target roles and personal notes for profile generation.">
      <form
        className="flex flex-col gap-3"
        onSubmit={(event) => {
          event.preventDefault();
          setError(null);
          createMutation.mutate();
        }}
      >
        <Label htmlFor="profile-target-roles" className="text-slate-700">
          Target roles
          <Input
            id="profile-target-roles"
            className="mt-1"
            value={targetRoles}
            onChange={(event) => setTargetRoles(event.target.value)}
            placeholder="Backend Engineer, NestJS Developer"
            required
          />
        </Label>

        <Label htmlFor="profile-notes" className="text-slate-700">
          Notes
          <Textarea
            id="profile-notes"
            className="mt-1 min-h-28"
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            placeholder="Preferred location, salary range, role priorities..."
          />
        </Label>

        {error ? <p className="text-sm text-rose-600">{error}</p> : null}
        <Button type="submit" disabled={createMutation.isPending}>
          {createMutation.isPending ? 'Saving...' : 'Save profile input'}
        </Button>
      </form>

      <div className="mt-5 rounded-md border border-dashed border-slate-300 bg-slate-50 p-3 text-sm">
        <p className="font-semibold text-slate-800">Latest input</p>
        {latestQuery.data ? (
          <div className="mt-2 space-y-1 text-slate-700">
            <p>
              <span className="font-medium">Roles:</span> {latestQuery.data.targetRoles}
            </p>
            <p>
              <span className="font-medium">Notes:</span> {latestQuery.data.notes || 'n/a'}
            </p>
            {latestQuery.data.normalizedInput?.searchPreferences ? (
              <details className="mt-2">
                <summary className="cursor-pointer font-medium text-slate-800">Normalized search preferences</summary>
                <pre className="mt-2 whitespace-pre-wrap rounded-md bg-white p-2 text-xs text-slate-700">
                  {JSON.stringify(latestQuery.data.normalizedInput.searchPreferences, null, 2)}
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
