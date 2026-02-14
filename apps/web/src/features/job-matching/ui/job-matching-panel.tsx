'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Label } from '@repo/ui/components/label';
import { useState } from 'react';

import { getJobMatchHistory, scoreJob } from '@/features/job-matching/api/job-matching-api';
import { ApiError } from '@/shared/lib/http/api-error';
import { Button } from '@/shared/ui/button';
import { Card } from '@/shared/ui/card';
import { Input } from '@/shared/ui/input';
import { Textarea } from '@/shared/ui/textarea';

type JobMatchingPanelProps = {
  token: string;
};

export const JobMatchingPanel = ({ token }: JobMatchingPanelProps) => {
  const queryClient = useQueryClient();
  const [jobDescription, setJobDescription] = useState('');
  const [minScore, setMinScore] = useState('60');
  const [error, setError] = useState<string | null>(null);

  const historyQuery = useQuery({
    queryKey: ['job-matching', 'history', token],
    queryFn: () => getJobMatchHistory(token),
  });

  const scoreMutation = useMutation({
    mutationFn: () =>
      scoreJob(token, {
        jobDescription,
        minScore: minScore ? Number(minScore) : undefined,
      }),
    onSuccess: async () => {
      setError(null);
      await queryClient.invalidateQueries({ queryKey: ['job-matching', 'history', token] });
    },
    onError: (err: unknown) => {
      setError(err instanceof ApiError ? err.message : 'Scoring failed');
    },
  });

  return (
    <Card title="Job matching" description="Score a job description and track matching history.">
      <form
        className="flex flex-col gap-3"
        onSubmit={(event) => {
          event.preventDefault();
          setError(null);
          scoreMutation.mutate();
        }}
      >
        <Label htmlFor="job-description" className="text-slate-700">
          Job description
          <Textarea
            id="job-description"
            className="mt-1 min-h-28"
            value={jobDescription}
            onChange={(event) => setJobDescription(event.target.value)}
            placeholder="Paste a full job description..."
            required
          />
        </Label>
        <Label htmlFor="job-min-score" className="text-slate-700">
          Minimum score
          <Input
            id="job-min-score"
            className="mt-1 max-w-24"
            type="number"
            min={0}
            max={100}
            value={minScore}
            onChange={(event) => setMinScore(event.target.value)}
          />
        </Label>
        {error ? <p className="text-sm text-rose-600">{error}</p> : null}
        <Button type="submit" disabled={scoreMutation.isPending}>
          {scoreMutation.isPending ? 'Scoring...' : 'Score job'}
        </Button>
      </form>

      {scoreMutation.data ? (
        <div className="mt-5 rounded-md border border-slate-200 bg-slate-50 p-3 text-sm">
          <p className="font-semibold text-slate-900">Latest score: {scoreMutation.data.score.score}</p>
          <p className="text-slate-700">Match: {scoreMutation.data.isMatch ? 'Yes' : 'No'}</p>
          <details className="mt-2">
            <summary className="cursor-pointer font-medium text-slate-800">Explanation</summary>
            <pre className="mt-2 whitespace-pre-wrap text-slate-700">
              {JSON.stringify(scoreMutation.data.explanation, null, 2)}
            </pre>
          </details>
        </div>
      ) : null}

      <div className="mt-5 space-y-2">
        <p className="text-sm font-semibold text-slate-800">History</p>
        {historyQuery.data?.items?.length ? (
          historyQuery.data.items.map((item) => (
            <article
              key={item.id}
              className="rounded-md border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700"
            >
              <p className="font-medium text-slate-900">
                Score: {item.score} | Match: {item.isMatch ? 'Yes' : 'No'}
              </p>
              <p>Profile version: {item.profileVersion}</p>
            </article>
          ))
        ) : (
          <p className="text-sm text-slate-500">No scoring history yet.</p>
        )}
      </div>
    </Card>
  );
};
