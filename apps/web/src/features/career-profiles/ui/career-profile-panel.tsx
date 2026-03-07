'use client';

import { useCareerProfilePanel } from '@/features/career-profiles/model/hooks/use-career-profile-panel';
import { Button } from '@/shared/ui/button';
import { Card } from '@/shared/ui/card';
import { InspectorRow } from '@/shared/ui/inspector-row';
import { Label } from '@/shared/ui/label';
import { Textarea } from '@/shared/ui/textarea';

type CareerProfilePanelProps = {
  token: string;
  disabled?: boolean;
  disabledReason?: string;
};

export const CareerProfilePanel = ({ token, disabled = false, disabledReason }: CareerProfilePanelProps) => {
  const careerProfilePanel = useCareerProfilePanel(token);
  const {
    register,
    formState: { errors },
  } = careerProfilePanel.form;

  return (
    <Card title="Career profile" description="Generate and inspect the latest active profile (markdown + JSON).">
      <form
        className="flex flex-col gap-4"
        onSubmit={(event) => {
          event.preventDefault();
          if (disabled) {
            return;
          }
          void careerProfilePanel.submit(event);
        }}
      >
        <div className="app-field-group">
          <Label htmlFor="career-profile-instructions" className="app-inline-label">
            Optional generation instructions
          </Label>
          <Textarea
            id="career-profile-instructions"
            className="min-h-24"
            placeholder="Focus on backend system design and production incident response."
            {...register('instructions')}
          />
        </div>
        {errors.instructions?.message ? <p className="text-app-danger text-sm">{errors.instructions.message}</p> : null}
        {errors.root?.message ? <p className="text-app-danger text-sm">{errors.root.message}</p> : null}
        <div className="app-toolbar flex items-center justify-between gap-3">
          {disabled && disabledReason ? <p className="text-app-warning text-sm">{disabledReason}</p> : <span />}
          <Button type="submit" disabled={disabled || careerProfilePanel.isSubmitting}>
            {careerProfilePanel.isSubmitting ? 'Generating...' : 'Generate profile'}
          </Button>
        </div>
      </form>

      {careerProfilePanel.latestQuery.data ? (
        <div className="mt-5 space-y-3 text-sm">
          <div className="app-muted-panel">
            <InspectorRow label="Status" value={careerProfilePanel.latestQuery.data.status} className="mb-3" />
            <p className="text-text-strong font-semibold">Markdown</p>
            <pre className="text-text-soft mt-2 max-h-48 overflow-auto whitespace-pre-wrap">
              {careerProfilePanel.latestQuery.data.content || 'No content'}
            </pre>
          </div>

          <details className="app-muted-panel">
            <summary className="text-text-strong cursor-pointer font-semibold">Structured JSON</summary>
            <pre className="app-code mt-2 whitespace-pre-wrap">
              {JSON.stringify(careerProfilePanel.latestQuery.data.contentJson ?? {}, null, 2)}
            </pre>
          </details>
        </div>
      ) : (
        <p className="text-text-soft mt-5 text-sm">No generated profile yet.</p>
      )}
    </Card>
  );
};
