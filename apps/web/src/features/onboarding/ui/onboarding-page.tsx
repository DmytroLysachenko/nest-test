'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

import { DocumentsPanel } from '@/features/documents';
import { useOnboardingPage } from '@/features/onboarding/model/hooks/use-onboarding-page';
import { Button } from '@/shared/ui/button';
import { ChoiceChipGroup } from '@/shared/ui/choice-chip-group';
import { Card } from '@/shared/ui/card';
import { HeroHeader } from '@/shared/ui/dashboard-primitives';
import { Input } from '@/shared/ui/input';
import { Label } from '@/shared/ui/label';
import { StepProgress } from '@/shared/ui/step-progress';
import { TagInput } from '@/shared/ui/tag-input';
import { Textarea } from '@/shared/ui/textarea';

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
    return <main className="app-page text-muted-foreground max-w-5xl text-sm">Checking session...</main>;
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
        subtitle="Define search preferences, upload source documents, and generate a career profile that powers better sourcing and matching decisions."
        meta={
          <>
            <span className="app-badge">Step {onboarding.step} of 3</span>
            <span className="app-badge">Ready docs: {onboarding.hasReadyDocument ? 'yes' : 'no'}</span>
          </>
        }
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
          description="Provide role, domain, skills and constraints. This input is persisted locally until generation."
        >
          <form className="space-y-4" onSubmit={onboarding.saveStepOne}>
            <div className="app-muted-panel">
              <p className="text-text-soft text-sm">
                Fields required for progression are enforced by validation. Optional notes improve profile quality and
                retrieval context.
              </p>
            </div>
            <TagInput
              label="1) Positions you want to apply for"
              placeholder="e.g. Frontend Developer"
              values={current.desiredPositions}
              onChange={(next) => setValue('desiredPositions', next, { shouldValidate: true })}
            />
            {errors.desiredPositions?.message ? (
              <p className="text-app-danger text-sm">{errors.desiredPositions.message}</p>
            ) : null}

            <TagInput
              label="2) Job fields/domains"
              placeholder="e.g. IT, Marketing, Cybersecurity"
              values={current.jobDomains}
              onChange={(next) => setValue('jobDomains', next, { shouldValidate: true })}
            />

            <TagInput
              label="3) Core skills/technologies (5-10 recommended)"
              placeholder="e.g. TypeScript"
              values={current.coreSkills}
              onChange={(next) => setValue('coreSkills', next, { shouldValidate: true })}
            />
            {errors.coreSkills?.message ? <p className="text-app-danger text-sm">{errors.coreSkills.message}</p> : null}

            <div className="app-field-group">
              <Label htmlFor="experienceYearsInRole" className="app-inline-label">
                4) Experience in this role (years)
              </Label>
              <Input
                id="experienceYearsInRole"
                type="number"
                min={0}
                max={60}
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

            <div className="app-field-group">
              <p className="app-inline-label">Hard work-mode constraints</p>
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
              <p className="app-inline-label">Soft work-mode preferences</p>
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
              <p className="app-inline-label">Hard contract constraints</p>
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
              <p className="app-inline-label">Soft contract preferences</p>
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

            <div className="grid gap-3 md:grid-cols-2">
              <div className="app-field-group">
                <Label htmlFor="section-notes-positions" className="app-inline-label">
                  Optional notes for positions
                </Label>
                <Textarea id="section-notes-positions" {...register('sectionNotes.positions')} />
              </div>
              <div className="app-field-group">
                <Label htmlFor="section-notes-skills" className="app-inline-label">
                  Optional notes for skills
                </Label>
                <Textarea id="section-notes-skills" {...register('sectionNotes.skills')} />
              </div>
              <div className="app-field-group">
                <Label htmlFor="section-notes-domains" className="app-inline-label">
                  Optional notes for domains
                </Label>
                <Textarea id="section-notes-domains" {...register('sectionNotes.domains')} />
              </div>
              <div className="app-field-group">
                <Label htmlFor="section-notes-preferences" className="app-inline-label">
                  Optional notes for constraints/preferences
                </Label>
                <Textarea id="section-notes-preferences" {...register('sectionNotes.preferences')} />
              </div>
            </div>

            <div className="app-field-group">
              <Label htmlFor="general-notes" className="app-inline-label">
                General notes
              </Label>
              <Textarea id="general-notes" className="min-h-24" {...register('generalNotes')} />
            </div>

            <div className="app-toolbar flex items-center justify-between gap-3">
              <div className="space-y-1">
                <p className="text-muted-foreground text-xs">Draft is saved automatically in local storage.</p>
                {onboarding.stepOneForm.formState.isDirty ? (
                  <p className="text-app-warning text-xs">You have unsaved local changes in this step.</p>
                ) : null}
              </div>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => {
                    const server = onboarding.onboardingDraftQuery.data?.payload as
                      | Record<string, unknown>
                      | null
                      | undefined;
                    if (!server) {
                      return;
                    }
                    onboarding.patchDraft({
                      desiredPositions: Array.isArray(server.desiredPositions)
                        ? (server.desiredPositions as string[])
                        : [],
                      jobDomains: Array.isArray(server.jobDomains) ? (server.jobDomains as string[]) : [],
                      coreSkills: Array.isArray(server.coreSkills) ? (server.coreSkills as string[]) : [],
                      experienceYearsInRole:
                        typeof server.experienceYearsInRole === 'number' ? server.experienceYearsInRole : null,
                      targetSeniority: Array.isArray(server.targetSeniority)
                        ? (server.targetSeniority as Array<'intern' | 'junior' | 'mid' | 'senior' | 'lead' | 'manager'>)
                        : [],
                      hardWorkModes: Array.isArray(server.hardWorkModes)
                        ? (server.hardWorkModes as Array<'remote' | 'hybrid' | 'onsite' | 'mobile'>)
                        : [],
                      softWorkModes: Array.isArray(server.softWorkModes)
                        ? (server.softWorkModes as Array<'remote' | 'hybrid' | 'onsite' | 'mobile'>)
                        : [],
                      hardContractTypes: Array.isArray(server.hardContractTypes)
                        ? (server.hardContractTypes as Array<
                            'uop' | 'b2b' | 'mandate' | 'specific-task' | 'internship'
                          >)
                        : [],
                      softContractTypes: Array.isArray(server.softContractTypes)
                        ? (server.softContractTypes as Array<
                            'uop' | 'b2b' | 'mandate' | 'specific-task' | 'internship'
                          >)
                        : [],
                      sectionNotes: {
                        positions:
                          typeof server.sectionNotes === 'object' &&
                          server.sectionNotes &&
                          'positions' in server.sectionNotes
                            ? String((server.sectionNotes as Record<string, unknown>).positions ?? '')
                            : '',
                        domains:
                          typeof server.sectionNotes === 'object' &&
                          server.sectionNotes &&
                          'domains' in server.sectionNotes
                            ? String((server.sectionNotes as Record<string, unknown>).domains ?? '')
                            : '',
                        skills:
                          typeof server.sectionNotes === 'object' &&
                          server.sectionNotes &&
                          'skills' in server.sectionNotes
                            ? String((server.sectionNotes as Record<string, unknown>).skills ?? '')
                            : '',
                        experience:
                          typeof server.sectionNotes === 'object' &&
                          server.sectionNotes &&
                          'experience' in server.sectionNotes
                            ? String((server.sectionNotes as Record<string, unknown>).experience ?? '')
                            : '',
                        preferences:
                          typeof server.sectionNotes === 'object' &&
                          server.sectionNotes &&
                          'preferences' in server.sectionNotes
                            ? String((server.sectionNotes as Record<string, unknown>).preferences ?? '')
                            : '',
                      },
                      generalNotes: typeof server.generalNotes === 'string' ? server.generalNotes : '',
                    });
                    onboarding.stepOneForm.reset({
                      desiredPositions: Array.isArray(server.desiredPositions)
                        ? (server.desiredPositions as string[])
                        : [],
                      jobDomains: Array.isArray(server.jobDomains) ? (server.jobDomains as string[]) : [],
                      coreSkills: Array.isArray(server.coreSkills) ? (server.coreSkills as string[]) : [],
                      experienceYearsInRole:
                        typeof server.experienceYearsInRole === 'number' ? server.experienceYearsInRole : null,
                      targetSeniority: Array.isArray(server.targetSeniority)
                        ? (server.targetSeniority as Array<'intern' | 'junior' | 'mid' | 'senior' | 'lead' | 'manager'>)
                        : [],
                      hardWorkModes: Array.isArray(server.hardWorkModes)
                        ? (server.hardWorkModes as Array<'remote' | 'hybrid' | 'onsite' | 'mobile'>)
                        : [],
                      softWorkModes: Array.isArray(server.softWorkModes)
                        ? (server.softWorkModes as Array<'remote' | 'hybrid' | 'onsite' | 'mobile'>)
                        : [],
                      hardContractTypes: Array.isArray(server.hardContractTypes)
                        ? (server.hardContractTypes as Array<
                            'uop' | 'b2b' | 'mandate' | 'specific-task' | 'internship'
                          >)
                        : [],
                      softContractTypes: Array.isArray(server.softContractTypes)
                        ? (server.softContractTypes as Array<
                            'uop' | 'b2b' | 'mandate' | 'specific-task' | 'internship'
                          >)
                        : [],
                      sectionNotes: {
                        positions:
                          typeof server.sectionNotes === 'object' &&
                          server.sectionNotes &&
                          'positions' in server.sectionNotes
                            ? String((server.sectionNotes as Record<string, unknown>).positions ?? '')
                            : '',
                        domains:
                          typeof server.sectionNotes === 'object' &&
                          server.sectionNotes &&
                          'domains' in server.sectionNotes
                            ? String((server.sectionNotes as Record<string, unknown>).domains ?? '')
                            : '',
                        skills:
                          typeof server.sectionNotes === 'object' &&
                          server.sectionNotes &&
                          'skills' in server.sectionNotes
                            ? String((server.sectionNotes as Record<string, unknown>).skills ?? '')
                            : '',
                        experience:
                          typeof server.sectionNotes === 'object' &&
                          server.sectionNotes &&
                          'experience' in server.sectionNotes
                            ? String((server.sectionNotes as Record<string, unknown>).experience ?? '')
                            : '',
                        preferences:
                          typeof server.sectionNotes === 'object' &&
                          server.sectionNotes &&
                          'preferences' in server.sectionNotes
                            ? String((server.sectionNotes as Record<string, unknown>).preferences ?? '')
                            : '',
                      },
                      generalNotes: typeof server.generalNotes === 'string' ? server.generalNotes : '',
                    });
                  }}
                  disabled={!onboarding.onboardingDraftQuery.data?.payload}
                >
                  Load server draft
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={async () => {
                    onboarding.stepOneForm.reset({
                      desiredPositions: [],
                      jobDomains: [],
                      coreSkills: [],
                      experienceYearsInRole: null,
                      targetSeniority: [],
                      hardWorkModes: [],
                      softWorkModes: [],
                      hardContractTypes: [],
                      softContractTypes: [],
                      sectionNotes: {
                        positions: '',
                        domains: '',
                        skills: '',
                        experience: '',
                        preferences: '',
                      },
                      generalNotes: '',
                    });
                    onboarding.patchDraft({
                      desiredPositions: [],
                      jobDomains: [],
                      coreSkills: [],
                      experienceYearsInRole: null,
                      targetSeniority: [],
                      hardWorkModes: [],
                      softWorkModes: [],
                      hardContractTypes: [],
                      softContractTypes: [],
                      sectionNotes: {
                        positions: '',
                        domains: '',
                        skills: '',
                        experience: '',
                        preferences: '',
                      },
                      generalNotes: '',
                    });
                    onboarding.clearDraftMutation.mutate();
                  }}
                >
                  Clear draft (local + server)
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => {
                    onboarding.stepOneForm.reset({
                      desiredPositions: onboarding.draft.desiredPositions,
                      jobDomains: onboarding.draft.jobDomains,
                      coreSkills: onboarding.draft.coreSkills,
                      experienceYearsInRole: onboarding.draft.experienceYearsInRole,
                      targetSeniority: onboarding.draft.targetSeniority,
                      hardWorkModes: onboarding.draft.hardWorkModes,
                      softWorkModes: onboarding.draft.softWorkModes,
                      hardContractTypes: onboarding.draft.hardContractTypes,
                      softContractTypes: onboarding.draft.softContractTypes,
                      sectionNotes: onboarding.draft.sectionNotes,
                      generalNotes: onboarding.draft.generalNotes,
                    });
                  }}
                >
                  Reset step values
                </Button>
                <Button type="submit">Continue to documents</Button>
              </div>
            </div>
          </form>
        </Card>
      ) : null}

      {onboarding.step === 2 ? (
        <Card
          title="Step 2: Upload CV / LinkedIn export"
          description="Upload PDF files and run extraction. Content quality matters more than format details."
        >
          <div className="space-y-4">
            <div className="app-muted-panel">
              <p className="text-muted-foreground text-sm">
                Supported now: PDF upload. After extraction, move to review and generation.
              </p>
            </div>
            <DocumentsPanel token={onboarding.auth.token} />
            <div className="app-toolbar flex items-center justify-between gap-2">
              <Button variant="secondary" type="button" onClick={() => onboarding.setStep(1)}>
                Back to preferences
              </Button>
              <Button type="button" onClick={() => onboarding.setStep(3)} disabled={!onboarding.hasReadyDocument}>
                Continue to review
              </Button>
            </div>
            {!onboarding.hasReadyDocument ? (
              <p className="text-app-warning text-sm">
                At least one document must reach READY extraction status before generation.
              </p>
            ) : null}
          </div>
        </Card>
      ) : null}

      {onboarding.step === 3 ? (
        <Card
          title="Step 3: Review and generate profile"
          description="Check all data before running AI generation. You can always go back and edit."
        >
          <div className="space-y-4">
            <div className="app-muted-panel text-sm">
              <p className="text-foreground font-semibold">Input summary</p>
              <p className="mt-1">
                <span className="font-medium">Positions:</span> {onboarding.draft.desiredPositions.join(', ') || 'n/a'}
              </p>
              <p>
                <span className="font-medium">Domains:</span> {onboarding.draft.jobDomains.join(', ') || 'n/a'}
              </p>
              <p>
                <span className="font-medium">Skills:</span> {onboarding.draft.coreSkills.join(', ') || 'n/a'}
              </p>
              <p>
                <span className="font-medium">Experience:</span>{' '}
                {onboarding.draft.experienceYearsInRole == null
                  ? 'n/a'
                  : `${onboarding.draft.experienceYearsInRole} years`}
              </p>
            </div>

            <div className="app-field-group">
              <Label htmlFor="generation-instructions" className="app-inline-label">
                Optional AI generation instructions
              </Label>
              <Textarea
                id="generation-instructions"
                className="min-h-24"
                value={onboarding.draft.generationInstructions}
                onChange={(event) => onboarding.patchDraft({ generationInstructions: event.target.value })}
              />
            </div>

            <div className="app-toolbar flex items-center justify-between gap-2">
              <Button variant="secondary" type="button" onClick={() => onboarding.setStep(2)}>
                Back to documents
              </Button>
              <Button
                type="button"
                onClick={() => onboarding.submitProfileMutation.mutate()}
                disabled={onboarding.submitProfileMutation.isPending || !onboarding.hasReadyDocument}
              >
                {onboarding.submitProfileMutation.isPending
                  ? 'Generating profile...'
                  : 'Generate profile and open dashboard'}
              </Button>
            </div>
            {onboarding.generationError ? (
              <p className="text-app-danger text-sm">{onboarding.generationError}</p>
            ) : null}
          </div>
        </Card>
      ) : null}
    </main>
  );
};
