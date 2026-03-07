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
        <Label htmlFor="job-description" className="text-text-soft">
          Job description
        </Label>
        <Textarea
          id="job-description"
          className="min-h-28"
          placeholder="Paste a full job description..."
          {...register('jobDescription')}
        />
        {errors.jobDescription?.message ? (
          <p className="text-app-danger text-sm">{errors.jobDescription.message}</p>
        ) : null}

        <Label htmlFor="job-min-score" className="text-text-soft">
          Minimum score
        </Label>
        <Input id="job-min-score" className="max-w-24" type="number" min={0} max={100} {...register('minScore')} />
        {errors.minScore?.message ? <p className="text-app-danger text-sm">{errors.minScore.message}</p> : null}

        {errors.root?.message ? <p className="text-app-danger text-sm">{errors.root.message}</p> : null}
        <Button type="submit" disabled={disabled || jobMatchingPanel.isSubmitting}>
          {jobMatchingPanel.isSubmitting ? 'Scoring...' : 'Score job'}
        </Button>
        {disabled && disabledReason ? <p className="text-app-warning text-sm">{disabledReason}</p> : null}
      </form>

      {jobMatchingPanel.scoreResult ? (
        <div className="border-border bg-surface-muted mt-5 rounded-md border p-3 text-sm">
          <p className="text-text-strong font-semibold">Latest score: {jobMatchingPanel.scoreResult.score.score}</p>
          <p className="text-text-soft">Match: {jobMatchingPanel.scoreResult.isMatch ? 'Yes' : 'No'}</p>
          {jobMatchingPanel.scoreResult.breakdown ? (
            <div className="mt-2 space-y-1">
              <p className="text-text-strong font-medium">Score breakdown</p>
              {Object.entries(jobMatchingPanel.scoreResult.breakdown).map(([key, value]) => (
                <div
                  key={key}
                  className="bg-surface-elevated text-text-soft flex items-center justify-between rounded px-2 py-1 text-xs"
                >
                  <span>{key}</span>
                  <span>{value}</span>
                </div>
              ))}
            </div>
          ) : null}
          {jobMatchingPanel.scoreResult.missingPreferences?.length ? (
            <p className="text-app-warning mt-2 text-xs">
              Missing preferences: {jobMatchingPanel.scoreResult.missingPreferences.join(', ')}
            </p>
          ) : null}
          <details className="mt-2">
            <summary className="text-text-strong cursor-pointer font-medium">Explanation</summary>
            <pre className="text-text-soft mt-2 whitespace-pre-wrap">
              {JSON.stringify(jobMatchingPanel.scoreResult.explanation, null, 2)}
            </pre>
          </details>
        </div>
      ) : null}

      <div className="mt-5 space-y-2">
        <p className="text-text-strong text-sm font-semibold">History</p>
        {jobMatchingPanel.historyQuery.data?.items?.length ? (
          jobMatchingPanel.historyQuery.data.items.map((item) => (
            <article
              key={item.id}
              className="border-border bg-surface-muted text-text-soft rounded-md border p-3 text-sm"
            >
              <p className="text-text-strong font-medium">
                Score: {item.score} | Match: {item.isMatch ? 'Yes' : 'No'}
              </p>
              <p>Profile version: {item.profileVersion}</p>
            </article>
          ))
        ) : (
          <p className="text-text-soft text-sm">No scoring history yet.</p>
        )}
      </div>
    </Card>
  );
};
