'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

import { DocumentsPanel } from '@/features/documents';
import { useOnboardingPage } from '@/features/onboarding/model/hooks/use-onboarding-page';
import { Button } from '@/shared/ui/button';
import { ChoiceChipGroup } from '@/shared/ui/choice-chip-group';
import { Card } from '@/shared/ui/card';
import { HeroHeader } from '@/shared/ui/dashboard-primitives';
import { GuidancePanel } from '@/shared/ui/guidance-panels';
import { Input } from '@/shared/ui/input';
import { Label } from '@/shared/ui/label';
import { StepProgress } from '@/shared/ui/step-progress';
import { TagInput } from '@/shared/ui/tag-input';
import { Textarea } from '@/shared/ui/textarea';
import { WorkspaceSplashState } from '@/shared/ui/async-states';

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
        title="Starting guided setup"
        subtitle="Restoring your first-run setup state and the documents that ground your profile..."
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
    <main className="app-page max-w-5xl">
      <HeroHeader
        eyebrow="Guided Setup"
        title="Build your job-search profile"
        subtitle="Set up the minimum high-quality context once, then the dashboard and scrape controls can stay fast and predictable instead of repeatedly re-asking the API for the same state."
        meta={
          <>
            <span className="app-badge">Step {onboarding.step} of 3</span>
            <span className="app-badge">Ready docs: {onboarding.hasReadyDocument ? 'yes' : 'no'}</span>
          </>
        }
      />

      <GuidancePanel
        eyebrow="Setup tip"
        title="You only need a clean baseline once"
        description="Complete onboarding carefully, then most of your day-to-day work moves to the dashboard and notebook. Return here only when your search direction changes materially."
        tone="success"
      />

      <Card
        title="Onboarding Flow"
        description="Follow the guided flow: define preferences, upload documents, review data, then generate profile."
      >
        <StepProgress
          currentStep={onboarding.step}
          steps={[
            { id: 1, label: '1. Preferences' },
            { id: 2, label: '2. Documents' },
            { id: 3, label: '3. Review & generate' },
          ]}
        />
      </Card>

      {onboarding.step === 1 ? (
        <Card
          title="Step 1: Job preferences"
          description="Tell us about your ideal next role. We use this to filter and score job offers."
        >
          <form className="space-y-8" onSubmit={onboarding.saveStepOne}>
            {/* Group 1: Role & Expertise */}
            <div className="space-y-5">
              <div>
                <h3 className="text-text-strong text-lg font-medium">Role & Expertise</h3>
                <p className="text-text-soft text-sm">Define the positions and skills you want to target.</p>
              </div>

              <TagInput
                label="Target Positions"
                placeholder="e.g. Frontend Developer, Software Engineer"
                values={current.desiredPositions}
                onChange={(next) => setValue('desiredPositions', next, { shouldValidate: true })}
              />
              {errors.desiredPositions?.message ? (
                <p className="text-app-danger text-sm">{errors.desiredPositions.message}</p>
              ) : null}

              <TagInput
                label="Job Domains / Industries"
                placeholder="e.g. FinTech, E-commerce, HealthTech"
                values={current.jobDomains}
                onChange={(next) => setValue('jobDomains', next, { shouldValidate: true })}
              />

              <TagInput
                label="Core Skills & Technologies"
                placeholder="e.g. React, TypeScript, Node.js"
                values={current.coreSkills}
                onChange={(next) => setValue('coreSkills', next, { shouldValidate: true })}
              />
              {errors.coreSkills?.message ? (
                <p className="text-app-danger text-sm">{errors.coreSkills.message}</p>
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
                    placeholder="e.g. 3"
                    value={current.experienceYearsInRole ?? ''}
                    onChange={(event) =>
                      setValue('experienceYearsInRole', event.target.value ? Number(event.target.value) : null, {
                        shouldValidate: true,
                      })
                    }
                  />
                </div>

                <div className="app-field-group">
                  <p className="app-inline-label">Target Seniority</p>
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

            {/* Group 2: Work Conditions */}
            <div className="border-border/60 space-y-5 border-t pt-6">
              <div>
                <h3 className="text-text-strong text-lg font-medium">Work Conditions</h3>
                <p className="text-text-soft text-sm">Specify your non-negotiables (hard) and nice-to-haves (soft).</p>
              </div>

              <div className="grid gap-5 md:grid-cols-2">
                <div className="app-field-group">
                  <p className="app-inline-label">Required Work Modes</p>
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
                  <p className="app-inline-label">Preferred Work Modes</p>
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
                  <p className="app-inline-label">Required Contract Types</p>
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
                  <p className="app-inline-label">Preferred Contract Types</p>
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

            {/* Group 3: Additional Notes */}
            <div className="border-border/60 space-y-5 border-t pt-6">
              <div>
                <h3 className="text-text-strong text-lg font-medium">Additional Context</h3>
                <p className="text-text-soft text-sm">Any extra details that the AI should consider during matching.</p>
              </div>

              <div className="app-field-group">
                <Label htmlFor="general-notes" className="app-inline-label">
                  General Notes
                </Label>
                <Textarea
                  id="general-notes"
                  className="min-h-24"
                  placeholder="e.g. I am looking for a product-led company. No crypto or gambling domains."
                  {...register('generalNotes')}
                />
              </div>

              <details className="group">
                <summary className="text-text-strong cursor-pointer text-sm font-medium">
                  Advanced section notes
                </summary>
                <div className="mt-4 grid gap-4 md:grid-cols-2">
                  <div className="app-field-group">
                    <Label htmlFor="section-notes-positions" className="app-inline-label">
                      Position Notes
                    </Label>
                    <Textarea id="section-notes-positions" {...register('sectionNotes.positions')} />
                  </div>
                  <div className="app-field-group">
                    <Label htmlFor="section-notes-skills" className="app-inline-label">
                      Skill Notes
                    </Label>
                    <Textarea id="section-notes-skills" {...register('sectionNotes.skills')} />
                  </div>
                  <div className="app-field-group">
                    <Label htmlFor="section-notes-domains" className="app-inline-label">
                      Domain Notes
                    </Label>
                    <Textarea id="section-notes-domains" {...register('sectionNotes.domains')} />
                  </div>
                  <div className="app-field-group">
                    <Label htmlFor="section-notes-preferences" className="app-inline-label">
                      Preference Notes
                    </Label>
                    <Textarea id="section-notes-preferences" {...register('sectionNotes.preferences')} />
                  </div>
                </div>
              </details>
            </div>

            <div className="app-toolbar flex items-center justify-between gap-3">
              <p className="text-text-soft text-xs">
                {onboarding.stepOneForm.formState.isDirty ? 'Unsaved changes' : 'All changes saved locally'}
              </p>
              <Button type="submit" size="lg">
                Continue to documents
              </Button>
            </div>
          </form>
        </Card>
      ) : null}

      {onboarding.step === 2 ? (
        <Card
          title="Step 2: Source Documents"
          description="Upload your resume or LinkedIn profile export to ground the AI generation."
        >
          <div className="space-y-6">
            <div className="border-border bg-surface-muted rounded-xl border p-4 text-sm">
              <h4 className="text-text-strong mb-1 font-semibold">How this works</h4>
              <p className="text-text-soft">
                We use these documents to extract your work history, education, and skills. Don&apos;t worry about
                perfect formatting—the system is designed to read raw text and structure it automatically.
              </p>
            </div>

            <DocumentsPanel token={onboarding.auth.token} />

            <div className="app-toolbar flex items-center justify-between gap-2">
              <Button variant="secondary" type="button" onClick={() => onboarding.setStep(1)}>
                Back to preferences
              </Button>
              <div className="flex items-center gap-3">
                {!onboarding.hasReadyDocument && (
                  <span className="text-app-warning text-xs font-medium">Extract at least one document</span>
                )}
                <Button type="button" onClick={() => onboarding.setStep(3)} disabled={!onboarding.hasReadyDocument}>
                  Continue to review
                </Button>
              </div>
            </div>
          </div>
        </Card>
      ) : null}

      {onboarding.step === 3 ? (
        <Card
          title="Step 3: Review & Generate"
          description="Verify your inputs before the AI builds your comprehensive career profile."
        >
          <div className="space-y-6">
            <div className="space-y-3">
              <h3 className="text-text-strong text-lg font-medium">Input Summary</h3>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="app-muted-panel text-sm">
                  <p className="text-text-soft text-xs uppercase tracking-wider">Target Roles</p>
                  <p className="text-text-strong mt-1 font-medium">
                    {onboarding.draft.desiredPositions.join(', ') || 'None specified'}
                  </p>
                </div>
                <div className="app-muted-panel text-sm">
                  <p className="text-text-soft text-xs uppercase tracking-wider">Target Domains</p>
                  <p className="text-text-strong mt-1 font-medium">
                    {onboarding.draft.jobDomains.join(', ') || 'None specified'}
                  </p>
                </div>
                <div className="app-muted-panel text-sm">
                  <p className="text-text-soft text-xs uppercase tracking-wider">Core Skills</p>
                  <p className="text-text-strong mt-1 font-medium">
                    {onboarding.draft.coreSkills.join(', ') || 'None specified'}
                  </p>
                </div>
                <div className="app-muted-panel text-sm">
                  <p className="text-text-soft text-xs uppercase tracking-wider">Role Experience</p>
                  <p className="text-text-strong mt-1 font-medium">
                    {onboarding.draft.experienceYearsInRole != null
                      ? `${onboarding.draft.experienceYearsInRole} years`
                      : 'Not specified'}
                  </p>
                </div>
              </div>
            </div>

            <div className="border-border/60 space-y-3 border-t pt-5">
              <div>
                <h3 className="text-text-strong text-lg font-medium">Custom Instructions</h3>
                <p className="text-text-soft text-sm">
                  Guide the AI on how to interpret your documents or emphasize specific traits.
                </p>
              </div>
              <div className="app-field-group">
                <Textarea
                  id="generation-instructions"
                  className="min-h-24"
                  placeholder="e.g. Focus heavily on my leadership experience. Ignore my early roles as a junior developer."
                  value={onboarding.draft.generationInstructions}
                  onChange={(event) => onboarding.patchDraft({ generationInstructions: event.target.value })}
                />
              </div>
            </div>

            <div className="app-toolbar flex items-center justify-between gap-2">
              <Button variant="secondary" type="button" onClick={() => onboarding.setStep(2)}>
                Back to documents
              </Button>
              <div className="flex items-center gap-3">
                {onboarding.generationError ? (
                  <p className="text-app-danger text-sm font-medium">{onboarding.generationError}</p>
                ) : null}
                <Button
                  type="button"
                  size="lg"
                  onClick={() => onboarding.submitProfileMutation.mutate()}
                  disabled={onboarding.submitProfileMutation.isPending || !onboarding.hasReadyDocument}
                >
                  {onboarding.submitProfileMutation.isPending ? 'Generating profile...' : 'Generate Profile'}
                </Button>
              </div>
            </div>
          </div>
        </Card>
      ) : null}
    </main>
  );
};
