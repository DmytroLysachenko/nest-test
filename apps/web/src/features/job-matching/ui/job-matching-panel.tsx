'use client';

import { FolderSearch } from 'lucide-react';

import { useJobMatchingPanel } from '@/features/job-matching/model/hooks/use-job-matching-panel';
import { Button } from '@/shared/ui/button';
import { Card } from '@/shared/ui/card';
import { Input } from '@/shared/ui/input';
import { InspectorRow } from '@/shared/ui/inspector-row';
import { Label } from '@/shared/ui/label';
import { Textarea } from '@/shared/ui/textarea';
import { EmptyState } from '@/shared/ui/empty-state';
import { WorkflowFeedback, WorkflowInlineNotice } from '@/shared/ui/workflow-feedback';

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
        className="flex flex-col gap-4"
        onSubmit={(event) => {
          event.preventDefault();
          if (disabled) {
            return;
          }
          void jobMatchingPanel.submit(event);
        }}
      >
        <WorkflowInlineNotice
          title="Use this for spot checks"
          description="This panel is best for validating how one role maps to your current profile before you change broader sourcing or notebook strategy."
          tone="info"
        />
        <div className="app-field-group">
          <Label htmlFor="job-description" className="app-inline-label">
            Job description
          </Label>
          <Textarea
            id="job-description"
            className="min-h-28"
            placeholder="Paste a full job description..."
            {...register('jobDescription')}
          />
        </div>
        {errors.jobDescription?.message ? (
          <WorkflowInlineNotice
            title="Job description is required"
            description={errors.jobDescription.message}
            tone="danger"
          />
        ) : null}

        <div className="app-field-group">
          <Label htmlFor="job-min-score" className="app-inline-label">
            Minimum score
          </Label>
          <Input id="job-min-score" className="max-w-24" type="number" min={0} max={100} {...register('minScore')} />
        </div>
        {errors.minScore?.message ? (
          <WorkflowInlineNotice
            title="Minimum score needs correction"
            description={errors.minScore.message}
            tone="danger"
          />
        ) : null}

        {errors.root?.message ? (
          <WorkflowFeedback
            title="Unable to score this role"
            description={errors.root.message}
            tone="danger"
            className="p-4 sm:p-5"
          />
        ) : null}
        <div className="app-toolbar flex items-center justify-between gap-3">
          {disabled && disabledReason ? (
            <WorkflowInlineNotice
              title="Matching is currently blocked"
              description={disabledReason}
              tone="warning"
              className="max-w-xl"
            />
          ) : (
            <span />
          )}
          <Button type="submit" disabled={disabled || jobMatchingPanel.isSubmitting}>
            {jobMatchingPanel.isSubmitting ? 'Scoring...' : 'Score job'}
          </Button>
        </div>
      </form>

      {jobMatchingPanel.scoreResult ? (
        <div className="app-muted-panel mt-5 space-y-3 text-sm">
          <InspectorRow label="Latest score" value={String(jobMatchingPanel.scoreResult.score.score)} />
          <InspectorRow label="Match" value={jobMatchingPanel.scoreResult.isMatch ? 'Yes' : 'No'} />
          {jobMatchingPanel.scoreResult.breakdown ? (
            <div className="mt-2 space-y-1">
              <p className="text-text-strong font-medium">Score breakdown</p>
              {Object.entries(jobMatchingPanel.scoreResult.breakdown).map(([key, value]) => (
                <InspectorRow key={key} label={key} value={String(value)} />
              ))}
            </div>
          ) : null}
          {jobMatchingPanel.scoreResult.missingPreferences?.length ? (
            <WorkflowInlineNotice
              title="Some profile preferences were missing during scoring"
              description={`Missing preferences: ${jobMatchingPanel.scoreResult.missingPreferences.join(', ')}`}
              tone="warning"
            />
          ) : null}
          <details className="mt-2">
            <summary className="text-text-strong cursor-pointer font-medium">Explanation</summary>
            <pre className="app-code mt-2 whitespace-pre-wrap">
              {JSON.stringify(jobMatchingPanel.scoreResult.explanation, null, 2)}
            </pre>
          </details>
        </div>
      ) : null}

      <div className="mt-5 space-y-2">
        <p className="text-text-strong text-sm font-semibold">History</p>
        {jobMatchingPanel.historyQuery.data?.items?.length ? (
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          jobMatchingPanel.historyQuery.data.items.map((item: any) => (
            <article key={item.id} className="app-muted-panel space-y-3 text-sm">
              <InspectorRow label="Score" value={`${item.score} | ${item.isMatch ? 'Match' : 'No match'}`} />
              <InspectorRow label="Profile version" value={String(item.profileVersion)} />
            </article>
          ))
        ) : (
          <EmptyState
            icon={<FolderSearch className="h-8 w-8" />}
            title="No scoring history"
            description="Manually evaluate a job description to see the results here."
          />
        )}
      </div>
    </Card>
  );
};
