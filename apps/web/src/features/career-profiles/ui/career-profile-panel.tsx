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
        <Label htmlFor="career-profile-instructions" className="text-slate-700">
          Optional generation instructions
        </Label>
        <Textarea
          id="career-profile-instructions"
          className="min-h-24"
          placeholder="Focus on backend system design and production incident response."
          {...register('instructions')}
        />
        {errors.instructions?.message ? <p className="text-sm text-rose-600">{errors.instructions.message}</p> : null}
        {errors.root?.message ? <p className="text-sm text-rose-600">{errors.root.message}</p> : null}
        <Button type="submit" disabled={disabled || careerProfilePanel.isSubmitting}>
          {careerProfilePanel.isSubmitting ? 'Generating...' : 'Generate profile'}
        </Button>
        {disabled && disabledReason ? <p className="text-sm text-amber-700">{disabledReason}</p> : null}
      </form>

      {careerProfilePanel.latestQuery.data ? (
        <div className="mt-5 space-y-3 text-sm">
          <div className="rounded-md border border-slate-200 bg-slate-50 p-3">
            <p className="font-semibold text-slate-800">Markdown</p>
            <pre className="mt-2 max-h-48 overflow-auto whitespace-pre-wrap text-slate-700">
              {careerProfilePanel.latestQuery.data.content || 'No content'}
            </pre>
          </div>

          <details className="rounded-md border border-slate-200 bg-slate-50 p-3">
            <summary className="cursor-pointer font-semibold text-slate-800">Structured JSON</summary>
            <pre className="mt-2 max-h-48 overflow-auto whitespace-pre-wrap text-slate-700">
              {JSON.stringify(careerProfilePanel.latestQuery.data.contentJson ?? {}, null, 2)}
            </pre>
          </details>
        </div>
      ) : (
        <p className="mt-5 text-sm text-slate-500">No generated profile yet.</p>
      )}
    </Card>
  );
};
