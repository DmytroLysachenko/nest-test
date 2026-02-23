'use client';

import { useJobMatchingPanel } from '@/features/job-matching/model/hooks/use-job-matching-panel';
import { Button } from '@/shared/ui/button';
import { Card } from '@/shared/ui/card';
import { Input } from '@/shared/ui/input';
import { Label } from '@/shared/ui/label';
import { Textarea } from '@/shared/ui/textarea';

type JobMatchingPanelProps = {
  token: string;
  disabled?: boolean;
  disabledReason?: string;
};

export const JobMatchingPanel = ({ token, disabled = false, disabledReason }: JobMatchingPanelProps) => {
  const jobMatchingPanel = useJobMatchingPanel(token);
  const {
    register,
    formState: { errors },
  } = jobMatchingPanel.form;

  return (
    <Card title="Job matching" description="Score a job description and track matching history.">
      <form
        className="flex flex-col gap-3"
        onSubmit={(event) => {
          event.preventDefault();
          if (disabled) {
            return;
          }
          void jobMatchingPanel.submit(event);
        }}
      >
        <Label htmlFor="job-description" className="text-slate-700">
          Job description
        </Label>
        <Textarea
          id="job-description"
          className="min-h-28"
          placeholder="Paste a full job description..."
          {...register('jobDescription')}
        />
        {errors.jobDescription?.message ? (
          <p className="text-sm text-rose-600">{errors.jobDescription.message}</p>
        ) : null}

        <Label htmlFor="job-min-score" className="text-slate-700">
          Minimum score
        </Label>
        <Input id="job-min-score" className="max-w-24" type="number" min={0} max={100} {...register('minScore')} />
        {errors.minScore?.message ? <p className="text-sm text-rose-600">{errors.minScore.message}</p> : null}

        {errors.root?.message ? <p className="text-sm text-rose-600">{errors.root.message}</p> : null}
        <Button type="submit" disabled={disabled || jobMatchingPanel.isSubmitting}>
          {jobMatchingPanel.isSubmitting ? 'Scoring...' : 'Score job'}
        </Button>
        {disabled && disabledReason ? <p className="text-sm text-amber-700">{disabledReason}</p> : null}
      </form>

      {jobMatchingPanel.scoreResult ? (
        <div className="mt-5 rounded-md border border-slate-200 bg-slate-50 p-3 text-sm">
          <p className="font-semibold text-slate-900">Latest score: {jobMatchingPanel.scoreResult.score.score}</p>
          <p className="text-slate-700">Match: {jobMatchingPanel.scoreResult.isMatch ? 'Yes' : 'No'}</p>
          {jobMatchingPanel.scoreResult.breakdown ? (
            <div className="mt-2 space-y-1">
              <p className="font-medium text-slate-800">Score breakdown</p>
              {Object.entries(jobMatchingPanel.scoreResult.breakdown).map(([key, value]) => (
                <div
                  key={key}
                  className="flex items-center justify-between rounded bg-white px-2 py-1 text-xs text-slate-700"
                >
                  <span>{key}</span>
                  <span>{value}</span>
                </div>
              ))}
            </div>
          ) : null}
          {jobMatchingPanel.scoreResult.missingPreferences?.length ? (
            <p className="mt-2 text-xs text-amber-700">
              Missing preferences: {jobMatchingPanel.scoreResult.missingPreferences.join(', ')}
            </p>
          ) : null}
          <details className="mt-2">
            <summary className="cursor-pointer font-medium text-slate-800">Explanation</summary>
            <pre className="mt-2 whitespace-pre-wrap text-slate-700">
              {JSON.stringify(jobMatchingPanel.scoreResult.explanation, null, 2)}
            </pre>
          </details>
        </div>
      ) : null}

      <div className="mt-5 space-y-2">
        <p className="text-sm font-semibold text-slate-800">History</p>
        {jobMatchingPanel.historyQuery.data?.items?.length ? (
          jobMatchingPanel.historyQuery.data.items.map((item) => (
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
