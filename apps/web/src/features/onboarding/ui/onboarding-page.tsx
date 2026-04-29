'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

import { DocumentsPanel } from '@/features/documents';
import { useOnboardingPage } from '@/features/onboarding/model/hooks/use-onboarding-page';
import { WorkspaceSplashState } from '@/shared/ui/async-states';
import { Button } from '@/shared/ui/button';
import { Card } from '@/shared/ui/card';
import { ChoiceChipGroup } from '@/shared/ui/choice-chip-group';
import { HeroHeader } from '@/shared/ui/dashboard-primitives';
import { Input } from '@/shared/ui/input';
import { Label } from '@/shared/ui/label';
import { StepProgress } from '@/shared/ui/step-progress';
import { TagInput } from '@/shared/ui/tag-input';
import { Textarea } from '@/shared/ui/textarea';
import { WorkflowFeedback, WorkflowInlineNotice } from '@/shared/ui/workflow-feedback';

const seniorityValues = ['intern', 'junior', 'mid', 'senior', 'lead', 'manager'] as const;
const workModes = ['remote', 'hybrid', 'onsite', 'mobile'] as const;
const contractTypes = ['uop', 'b2b', 'mandate', 'specific-task', 'internship'] as const;

export const OnboardingPage = () => {
  const router = useRouter();
  const onboarding = useOnboardingPage();
  const {
    register,
    formState: { errors },
    watch,
    setValue,
  } = onboarding.stepOneForm;

  useEffect(() => {
    if (onboarding.latestCareerProfileQuery.data?.status === 'READY') {
      router.replace('/');
    }
  }, [onboarding.latestCareerProfileQuery.data?.status, router]);

  if (!onboarding.auth.token) {
    return (
      <WorkspaceSplashState
        title="Starting setup"
        subtitle="Restoring your first-run state and the documents used to build your profile."
      />
    );
  }

  const current = watch();
  const toggle = <T extends string>(currentValues: T[], value: T, setter: (next: T[]) => void) => {
    if (currentValues.includes(value)) {
      setter(currentValues.filter((item) => item !== value));
      return;
    }
    setter([...currentValues, value]);
  };

  return (
    <main className="app-page max-w-5xl space-y-6">
      <HeroHeader
        title="Set your direction once"
        subtitle="Add the basics here, then do the daily work in opportunities and notebook."
        meta={
          <>
            <span className="app-badge">Step {onboarding.step} of 3</span>
            <span className="app-badge">{onboarding.hasReadyDocument ? 'Documents ready' : 'Documents needed'}</span>
          </>
        }
      />

      <Card title="Setup progress" description="Complete the three steps in order.">
        <StepProgress
          currentStep={onboarding.step}
          steps={[
            { id: 1, label: 'Preferences' },
            { id: 2, label: 'Documents' },
            { id: 3, label: 'Review' },
          ]}
        />
      </Card>

      {onboarding.step === 1 ? (
        <Card title="Job preferences" description="Describe the role, conditions, and skills you want to target.">
          <form className="space-y-8" onSubmit={onboarding.saveStepOne}>
            <div className="space-y-5">
              <div>
                <h3 className="text-text-strong text-lg font-medium">Role and skills</h3>
                <p className="text-text-soft text-sm">Keep this focused on the jobs you would genuinely pursue next.</p>
              </div>

              <TagInput
                label="Target positions"
                placeholder="Frontend Developer, Software Engineer"
                values={current.desiredPositions}
                onChange={(next) => setValue('desiredPositions', next, { shouldValidate: true })}
              />
              {errors.desiredPositions?.message ? (
                <WorkflowInlineNotice
                  title="Target positions need correction"
                  description={errors.desiredPositions.message}
                  tone="danger"
                />
              ) : null}

              <TagInput
                label="Domains"
                placeholder="FinTech, E-commerce, HealthTech"
                values={current.jobDomains}
                onChange={(next) => setValue('jobDomains', next, { shouldValidate: true })}
              />

              <TagInput
                label="Core skills"
                placeholder="React, TypeScript, Node.js"
                values={current.coreSkills}
                onChange={(next) => setValue('coreSkills', next, { shouldValidate: true })}
              />
              {errors.coreSkills?.message ? (
                <WorkflowInlineNotice
                  title="Core skills need correction"
                  description={errors.coreSkills.message}
                  tone="danger"
                />
              ) : null}

              <div className="grid gap-5 md:grid-cols-2">
                <div className="app-field-group">
                  <Label htmlFor="experienceYearsInRole" className="app-inline-label">
                    Years of experience
                  </Label>
                  <Input
                    id="experienceYearsInRole"
                    type="number"
                    min={0}
                    max={60}
                    placeholder="3"
                    value={current.experienceYearsInRole ?? ''}
                    onChange={(event) =>
                      setValue('experienceYearsInRole', event.target.value ? Number(event.target.value) : null, {
                        shouldValidate: true,
                      })
                    }
                  />
                </div>

                <div className="app-field-group">
                  <p className="app-inline-label">Target seniority</p>
                  <ChoiceChipGroup
                    values={seniorityValues}
                    selected={current.targetSeniority}
                    onToggle={(value) =>
                      toggle(current.targetSeniority, value, (next) =>
                        setValue('targetSeniority', next, { shouldValidate: true }),
                      )
                    }
                  />
                </div>
              </div>
            </div>

            <div className="border-border/60 space-y-5 border-t pt-6">
              <div>
                <h3 className="text-text-strong text-lg font-medium">Work conditions</h3>
                <p className="text-text-soft text-sm">Separate hard requirements from preferences.</p>
              </div>

              <div className="grid gap-5 md:grid-cols-2">
                <div className="app-field-group">
                  <p className="app-inline-label">Required work modes</p>
                  <ChoiceChipGroup
                    values={workModes}
                    selected={current.hardWorkModes}
                    onToggle={(value) =>
                      toggle(current.hardWorkModes, value, (next) =>
                        setValue('hardWorkModes', next, { shouldValidate: true }),
                      )
                    }
                  />
                </div>
                <div className="app-field-group">
                  <p className="app-inline-label">Preferred work modes</p>
                  <ChoiceChipGroup
                    values={workModes}
                    selected={current.softWorkModes}
                    onToggle={(value) =>
                      toggle(current.softWorkModes, value, (next) =>
                        setValue('softWorkModes', next, { shouldValidate: true }),
                      )
                    }
                  />
                </div>

                <div className="app-field-group">
                  <p className="app-inline-label">Required contract types</p>
                  <ChoiceChipGroup
                    values={contractTypes}
                    selected={current.hardContractTypes}
                    onToggle={(value) =>
                      toggle(current.hardContractTypes, value, (next) =>
                        setValue('hardContractTypes', next, { shouldValidate: true }),
                      )
                    }
                  />
                </div>
                <div className="app-field-group">
                  <p className="app-inline-label">Preferred contract types</p>
                  <ChoiceChipGroup
                    values={contractTypes}
                    selected={current.softContractTypes}
                    onToggle={(value) =>
                      toggle(current.softContractTypes, value, (next) =>
                        setValue('softContractTypes', next, { shouldValidate: true }),
                      )
                    }
                  />
                </div>
              </div>
            </div>

            <div className="border-border/60 space-y-5 border-t pt-6">
              <div>
                <h3 className="text-text-strong text-lg font-medium">Extra context</h3>
                <p className="text-text-soft text-sm">
                  Only include information that changes how roles should be judged.
                </p>
              </div>

              <div className="app-field-group">
                <Label htmlFor="general-notes" className="app-inline-label">
                  Notes
                </Label>
                <Textarea
                  id="general-notes"
                  className="min-h-24"
                  placeholder="Product-led company, no crypto or gambling domains."
                  {...register('generalNotes')}
                />
              </div>

              <details className="group">
                <summary className="text-text-strong cursor-pointer text-sm font-medium">Advanced notes</summary>
                <div className="mt-4 grid gap-4 md:grid-cols-2">
                  <div className="app-field-group">
                    <Label htmlFor="section-notes-positions" className="app-inline-label">
                      Position notes
                    </Label>
                    <Textarea id="section-notes-positions" {...register('sectionNotes.positions')} />
                  </div>
                  <div className="app-field-group">
                    <Label htmlFor="section-notes-skills" className="app-inline-label">
                      Skill notes
                    </Label>
                    <Textarea id="section-notes-skills" {...register('sectionNotes.skills')} />
                  </div>
                  <div className="app-field-group">
                    <Label htmlFor="section-notes-domains" className="app-inline-label">
                      Domain notes
                    </Label>
                    <Textarea id="section-notes-domains" {...register('sectionNotes.domains')} />
                  </div>
                  <div className="app-field-group">
                    <Label htmlFor="section-notes-preferences" className="app-inline-label">
                      Preference notes
                    </Label>
                    <Textarea id="section-notes-preferences" {...register('sectionNotes.preferences')} />
                  </div>
                </div>
              </details>
            </div>

            <div className="app-toolbar flex items-center justify-between gap-3">
              <p className="text-text-soft text-xs">
                {onboarding.stepOneForm.formState.isDirty ? 'Unsaved changes' : 'Saved locally'}
              </p>
              <Button type="submit" size="lg">
                Continue
              </Button>
            </div>
          </form>
        </Card>
      ) : null}

      {onboarding.step === 2 ? (
        <Card title="Documents" description="Upload the files that ground your profile.">
          <div className="space-y-6">
            <div className="app-inset-stack text-sm">
              Add at least one document that clearly reflects your recent experience. Once extraction finishes, you can
              move to review.
            </div>

            <DocumentsPanel token={onboarding.auth.token} />

            <div className="app-toolbar flex items-center justify-between gap-2">
              <Button variant="secondary" type="button" onClick={() => onboarding.setStep(1)}>
                Back
              </Button>
              <div className="flex items-center gap-3">
                {!onboarding.hasReadyDocument ? (
                  <WorkflowInlineNotice
                    title="A ready document is still needed"
                    description="Wait for one document to finish extraction before continuing."
                    tone="warning"
                    className="max-w-sm"
                  />
                ) : null}
                <Button type="button" onClick={() => onboarding.setStep(3)} disabled={!onboarding.hasReadyDocument}>
                  Continue
                </Button>
              </div>
            </div>
          </div>
        </Card>
      ) : null}

      {onboarding.step === 3 ? (
        <Card title="Review and generate" description="Check the essentials once, then create the first profile.">
          <div className="space-y-6">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="app-inset-stack text-sm">
                <p className="text-text-soft text-xs uppercase tracking-wider">Target roles</p>
                <p className="text-text-strong mt-1 font-medium">
                  {onboarding.draft.desiredPositions.join(', ') || 'None specified'}
                </p>
              </div>
              <div className="app-inset-stack text-sm">
                <p className="text-text-soft text-xs uppercase tracking-wider">Domains</p>
                <p className="text-text-strong mt-1 font-medium">
                  {onboarding.draft.jobDomains.join(', ') || 'None specified'}
                </p>
              </div>
              <div className="app-inset-stack text-sm">
                <p className="text-text-soft text-xs uppercase tracking-wider">Core skills</p>
                <p className="text-text-strong mt-1 font-medium">
                  {onboarding.draft.coreSkills.join(', ') || 'None specified'}
                </p>
              </div>
              <div className="app-inset-stack text-sm">
                <p className="text-text-soft text-xs uppercase tracking-wider">Role experience</p>
                <p className="text-text-strong mt-1 font-medium">
                  {onboarding.draft.experienceYearsInRole != null
                    ? `${onboarding.draft.experienceYearsInRole} years`
                    : 'Not specified'}
                </p>
              </div>
            </div>

            <div className="border-border/60 space-y-3 border-t pt-5">
              <div>
                <h3 className="text-text-strong text-lg font-medium">Optional instructions</h3>
                <p className="text-text-soft text-sm">
                  Use this only if the profile should emphasize something specific.
                </p>
              </div>
              <div className="app-field-group">
                <Textarea
                  id="generation-instructions"
                  className="min-h-24"
                  placeholder="Focus on leadership experience and recent frontend work."
                  value={onboarding.draft.generationInstructions}
                  onChange={(event) => onboarding.patchDraft({ generationInstructions: event.target.value })}
                />
              </div>
            </div>

            <div className="app-toolbar flex items-center justify-between gap-2">
              <Button variant="secondary" type="button" onClick={() => onboarding.setStep(2)}>
                Back
              </Button>
              <div className="flex items-center gap-3">
                {onboarding.generationError ? (
                  <WorkflowFeedback
                    title="Unable to generate the first profile"
                    description={onboarding.generationError}
                    tone="danger"
                    className="p-4 sm:p-5"
                  />
                ) : null}
                <Button
                  type="button"
                  size="lg"
                  onClick={() => onboarding.submitProfileMutation.mutate()}
                  disabled={onboarding.submitProfileMutation.isPending || !onboarding.hasReadyDocument}
                >
                  {onboarding.submitProfileMutation.isPending ? 'Generating...' : 'Generate profile'}
                </Button>
              </div>
            </div>
          </div>
        </Card>
      ) : null}
    </main>
  );
};
