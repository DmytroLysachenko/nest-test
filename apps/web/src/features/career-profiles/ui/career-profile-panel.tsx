'use client';

import { useCareerProfilePanel } from '@/features/career-profiles/model/hooks/use-career-profile-panel';
import { Button } from '@/shared/ui/button';
import { Card } from '@/shared/ui/card';
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
        className="flex flex-col gap-3"
        onSubmit={(event) => {
          event.preventDefault();
          if (disabled) {
            return;
          }
          void careerProfilePanel.submit(event);
        }}
      >
        <Label htmlFor="career-profile-instructions" className="text-text-soft">
          Optional generation instructions
        </Label>
        <Textarea
          id="career-profile-instructions"
          className="min-h-24"
          placeholder="Focus on backend system design and production incident response."
          {...register('instructions')}
        />
        {errors.instructions?.message ? <p className="text-app-danger text-sm">{errors.instructions.message}</p> : null}
        {errors.root?.message ? <p className="text-app-danger text-sm">{errors.root.message}</p> : null}
        <Button type="submit" disabled={disabled || careerProfilePanel.isSubmitting}>
          {careerProfilePanel.isSubmitting ? 'Generating...' : 'Generate profile'}
        </Button>
        {disabled && disabledReason ? <p className="text-app-warning text-sm">{disabledReason}</p> : null}
      </form>

      {careerProfilePanel.latestQuery.data ? (
        <div className="mt-5 space-y-3 text-sm">
          <div className="border-border bg-surface-muted rounded-md border p-3">
            <p className="text-text-strong font-semibold">Markdown</p>
            <pre className="text-text-soft mt-2 max-h-48 overflow-auto whitespace-pre-wrap">
              {careerProfilePanel.latestQuery.data.content || 'No content'}
            </pre>
          </div>

          <details className="border-border bg-surface-muted rounded-md border p-3">
            <summary className="text-text-strong cursor-pointer font-semibold">Structured JSON</summary>
            <pre className="text-text-soft mt-2 max-h-48 overflow-auto whitespace-pre-wrap">
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
