'use client';

import { useCareerProfilePanel } from '@/features/career-profiles/model/hooks/use-career-profile-panel';
import { Button } from '@/shared/ui/button';
import { Card } from '@/shared/ui/card';
import { InspectorRow } from '@/shared/ui/inspector-row';
import { Label } from '@/shared/ui/label';
import { Textarea } from '@/shared/ui/textarea';
import { WorkflowFeedback, WorkflowInlineNotice } from '@/shared/ui/workflow-feedback';

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
  const latestProfile = careerProfilePanel.latestQuery.data;

  return (
    <Card
      title="Career profile"
      description="Generate a fresh profile only after documents or profile input changed in a meaningful way."
    >
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
        <WorkflowInlineNotice
          title="Regenerate deliberately"
          description="A new version should reflect actual source changes. Avoid churn so downstream offer scoring stays comparable."
          tone="info"
        />
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
        {errors.instructions?.message ? (
          <WorkflowInlineNotice
            title="Generation instructions need correction"
            description={errors.instructions.message}
            tone="danger"
          />
        ) : null}
        {errors.root?.message ? (
          <WorkflowFeedback
            title="Unable to generate a new profile version"
            description={errors.root.message}
            tone="danger"
            className="p-4 sm:p-5"
          />
        ) : null}
        <div className="app-toolbar flex items-center justify-between gap-3">
          {disabled && disabledReason ? (
            <WorkflowInlineNotice
              title="Generation is currently blocked"
              description={disabledReason}
              tone="warning"
              className="max-w-xl"
            />
          ) : (
            <span />
          )}
          <Button type="submit" disabled={disabled || careerProfilePanel.isSubmitting}>
            {careerProfilePanel.isSubmitting ? 'Generating...' : 'Generate profile'}
          </Button>
        </div>
      </form>

      {careerProfilePanel.latestErrorMessage ? (
        <WorkflowInlineNotice
          title="Latest profile snapshot is temporarily unavailable"
          description={careerProfilePanel.latestErrorMessage}
          tone="warning"
          className="mt-5"
        />
      ) : latestProfile ? (
        <div className="mt-5 space-y-3 text-sm">
          <div className="app-muted-panel">
            <InspectorRow label="Status" value={latestProfile.status} className="mb-3" />
            <p className="text-text-strong font-semibold">Default profile view</p>
            <pre className="text-text-soft mt-2 max-h-48 overflow-auto whitespace-pre-wrap">
              {latestProfile.content || 'No content'}
            </pre>
          </div>

          <details className="app-muted-panel">
            <summary className="text-text-strong cursor-pointer font-semibold">Structured JSON</summary>
            <p className="text-text-soft mt-2 text-xs leading-5">
              Keep this for validation and support work. The markdown view above is the primary workflow surface.
            </p>
            <pre className="app-code mt-2 whitespace-pre-wrap">
              {JSON.stringify(latestProfile.contentJson ?? {}, null, 2)}
            </pre>
          </details>
        </div>
      ) : (
        <WorkflowFeedback
          title="No generated profile yet"
          description="Once documents are ready and your profile input is stable, generate the first profile version here. That version becomes the baseline for matching and notebook review."
          tone="info"
          className="mt-5"
        />
      )}
    </Card>
  );
};
