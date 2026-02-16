'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Label } from '@repo/ui/components/label';
import { useState } from 'react';

import { generateCareerProfile, getLatestCareerProfile } from '@/features/career-profiles/api/career-profiles-api';
import { ApiError } from '@/shared/lib/http/api-error';
import { Button } from '@/shared/ui/button';
import { Card } from '@/shared/ui/card';
import { Textarea } from '@/shared/ui/textarea';

type CareerProfilePanelProps = {
  token: string;
  disabled?: boolean;
  disabledReason?: string;
};

export const CareerProfilePanel = ({ token, disabled = false, disabledReason }: CareerProfilePanelProps) => {
  const queryClient = useQueryClient();
  const [instructions, setInstructions] = useState('');
  const [error, setError] = useState<string | null>(null);

  const latestQuery = useQuery({
    queryKey: ['career-profiles', 'latest', token],
    queryFn: () => getLatestCareerProfile(token),
  });

  const generateMutation = useMutation({
    mutationFn: () => generateCareerProfile(token, { instructions: instructions || undefined }),
    onSuccess: async () => {
      setError(null);
      await queryClient.invalidateQueries({ queryKey: ['career-profiles', 'latest', token] });
    },
    onError: (err: unknown) => {
      setError(err instanceof ApiError ? err.message : 'Career profile generation failed');
    },
  });

  return (
    <Card title="Career profile" description="Generate and inspect the latest active profile (markdown + JSON).">
      <form
        className="flex flex-col gap-3"
        onSubmit={(event) => {
          event.preventDefault();
          if (disabled) {
            return;
          }
          setError(null);
          generateMutation.mutate();
        }}
      >
        <Label htmlFor="career-profile-instructions" className="text-slate-700">
          Optional generation instructions
          <Textarea
            id="career-profile-instructions"
            className="mt-1 min-h-24"
            value={instructions}
            onChange={(event) => setInstructions(event.target.value)}
            placeholder="Focus on backend system design and production incident response."
          />
        </Label>
        {error ? <p className="text-sm text-rose-600">{error}</p> : null}
        <Button type="submit" disabled={disabled || generateMutation.isPending}>
          {generateMutation.isPending ? 'Generating...' : 'Generate profile'}
        </Button>
        {disabled && disabledReason ? <p className="text-sm text-amber-700">{disabledReason}</p> : null}
      </form>

      {latestQuery.data ? (
        <div className="mt-5 space-y-3 text-sm">
          <div className="rounded-md border border-slate-200 bg-slate-50 p-3">
            <p className="font-semibold text-slate-800">Markdown</p>
            <pre className="mt-2 max-h-48 overflow-auto whitespace-pre-wrap text-slate-700">
              {latestQuery.data.content || 'No content'}
            </pre>
          </div>

          <details className="rounded-md border border-slate-200 bg-slate-50 p-3">
            <summary className="cursor-pointer font-semibold text-slate-800">Structured JSON</summary>
            <pre className="mt-2 max-h-48 overflow-auto whitespace-pre-wrap text-slate-700">
              {JSON.stringify(latestQuery.data.contentJson ?? {}, null, 2)}
            </pre>
          </details>
        </div>
      ) : (
        <p className="mt-5 text-sm text-slate-500">No generated profile yet.</p>
      )}
    </Card>
  );
};
