'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

import { DocumentsPanel } from '@/features/documents';
import { useOnboardingPage } from '@/features/onboarding/model/hooks/use-onboarding-page';
import { Button } from '@/shared/ui/button';
import { Card } from '@/shared/ui/card';
import { Input } from '@/shared/ui/input';
import { Label } from '@/shared/ui/label';
import { TagInput } from '@/shared/ui/tag-input';
import { Textarea } from '@/shared/ui/textarea';

const seniorityValues = ['intern', 'junior', 'mid', 'senior', 'lead', 'manager'] as const;
const workModes = ['remote', 'hybrid', 'onsite', 'mobile'] as const;
const contractTypes = ['uop', 'b2b', 'mandate', 'specific-task', 'internship'] as const;

const ToggleGroup = <T extends string>({
  values,
  selected,
  onToggle,
}: {
  values: readonly T[];
  selected: T[];
  onToggle: (value: T) => void;
}) => (
  <div className="flex flex-wrap gap-2">
    {values.map((value) => {
      const isActive = selected.includes(value);
      return (
        <button
          key={value}
          type="button"
          className={`rounded-full border px-3 py-1 text-xs ${
            isActive ? 'border-slate-900 bg-slate-900 text-white' : 'border-slate-300 bg-white text-slate-700'
          }`}
          onClick={() => onToggle(value)}
        >
          {value}
        </button>
      );
    })}
  </div>
);

const StepIndicator = ({ step }: { step: 1 | 2 | 3 }) => (
  <div className="grid gap-2 md:grid-cols-3">
    {[
      { id: 1, label: '1. Preferences' },
      { id: 2, label: '2. Documents' },
      { id: 3, label: '3. Review & generate' },
    ].map((item) => (
      <div
        key={item.id}
        className={`rounded-lg border p-3 text-sm ${
          step === item.id
            ? 'border-slate-900 bg-slate-900 text-white'
            : step > item.id
              ? 'border-emerald-300 bg-emerald-50 text-emerald-900'
              : 'border-slate-200 bg-slate-50 text-slate-600'
        }`}
      >
        {item.label}
      </div>
    ))}
  </div>
);

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
      router.replace('/app');
    }
  }, [onboarding.latestCareerProfileQuery.data?.status, router]);

  if (!onboarding.auth.token) {
    return <main className="mx-auto max-w-5xl px-4 py-8 text-sm text-slate-500">Checking session...</main>;
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
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-4 px-4 py-6">
      <Card
        title="Build your job-search profile"
        description="Follow the guided flow: define preferences, upload documents, review data, then generate profile."
      >
        <StepIndicator step={onboarding.step} />
      </Card>

      {onboarding.step === 1 ? (
        <Card
          title="Step 1: Job preferences"
          description="Provide role, domain, skills and constraints. This input is persisted locally until generation."
        >
          <form className="space-y-4" onSubmit={onboarding.saveStepOne}>
            <p className="text-xs text-slate-500">
              Fields marked by behavior are required for progressing. Optional notes improve profile quality.
            </p>
            <TagInput
              label="1) Positions you want to apply for"
              placeholder="e.g. Frontend Developer"
              values={current.desiredPositions}
              onChange={(next) => setValue('desiredPositions', next, { shouldValidate: true })}
            />
            {errors.desiredPositions?.message ? (
              <p className="text-sm text-rose-600">{errors.desiredPositions.message}</p>
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
            {errors.coreSkills?.message ? <p className="text-sm text-rose-600">{errors.coreSkills.message}</p> : null}

            <div className="space-y-2">
              <Label htmlFor="experienceYearsInRole">4) Experience in this role (years)</Label>
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

            <div className="space-y-2">
              <p className="text-sm font-medium text-slate-800">Target seniority</p>
              <ToggleGroup
                values={seniorityValues}
                selected={current.targetSeniority}
                onToggle={(value) =>
                  toggle(current.targetSeniority, value, (next) =>
                    setValue('targetSeniority', next, { shouldValidate: true }),
                  )
                }
              />
            </div>

            <div className="space-y-2">
              <p className="text-sm font-medium text-slate-800">Hard work-mode constraints</p>
              <ToggleGroup
                values={workModes}
                selected={current.hardWorkModes}
                onToggle={(value) =>
                  toggle(current.hardWorkModes, value, (next) =>
                    setValue('hardWorkModes', next, { shouldValidate: true }),
                  )
                }
              />
            </div>

            <div className="space-y-2">
              <p className="text-sm font-medium text-slate-800">Soft work-mode preferences</p>
              <ToggleGroup
                values={workModes}
                selected={current.softWorkModes}
                onToggle={(value) =>
                  toggle(current.softWorkModes, value, (next) =>
                    setValue('softWorkModes', next, { shouldValidate: true }),
                  )
                }
              />
            </div>

            <div className="space-y-2">
              <p className="text-sm font-medium text-slate-800">Hard contract constraints</p>
              <ToggleGroup
                values={contractTypes}
                selected={current.hardContractTypes}
                onToggle={(value) =>
                  toggle(current.hardContractTypes, value, (next) =>
                    setValue('hardContractTypes', next, { shouldValidate: true }),
                  )
                }
              />
            </div>

            <div className="space-y-2">
              <p className="text-sm font-medium text-slate-800">Soft contract preferences</p>
              <ToggleGroup
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
              <div className="space-y-2">
                <Label htmlFor="section-notes-positions">Optional notes for positions</Label>
                <Textarea id="section-notes-positions" {...register('sectionNotes.positions')} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="section-notes-skills">Optional notes for skills</Label>
                <Textarea id="section-notes-skills" {...register('sectionNotes.skills')} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="section-notes-domains">Optional notes for domains</Label>
                <Textarea id="section-notes-domains" {...register('sectionNotes.domains')} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="section-notes-preferences">Optional notes for constraints/preferences</Label>
                <Textarea id="section-notes-preferences" {...register('sectionNotes.preferences')} />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="general-notes">General notes</Label>
              <Textarea id="general-notes" className="min-h-24" {...register('generalNotes')} />
            </div>

            <div className="flex items-center justify-between gap-3">
              <div className="space-y-1">
                <p className="text-xs text-slate-500">Draft is saved automatically in local storage.</p>
                {onboarding.stepOneForm.formState.isDirty ? (
                  <p className="text-xs text-amber-700">You have unsaved local changes in this step.</p>
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
            <p className="text-sm text-slate-600">
              Supported now: PDF upload. After extraction, move to review and generation.
            </p>
            <DocumentsPanel token={onboarding.auth.token} />
            <div className="flex items-center justify-between gap-2">
              <Button variant="secondary" type="button" onClick={() => onboarding.setStep(1)}>
                Back to preferences
              </Button>
              <Button type="button" onClick={() => onboarding.setStep(3)} disabled={!onboarding.hasReadyDocument}>
                Continue to review
              </Button>
            </div>
            {!onboarding.hasReadyDocument ? (
              <p className="text-sm text-amber-700">
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
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm">
              <p className="font-semibold text-slate-900">Input summary</p>
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

            <div className="space-y-2">
              <Label htmlFor="generation-instructions">Optional AI generation instructions</Label>
              <Textarea
                id="generation-instructions"
                className="min-h-24"
                value={onboarding.draft.generationInstructions}
                onChange={(event) => onboarding.patchDraft({ generationInstructions: event.target.value })}
              />
            </div>

            <div className="flex items-center justify-between gap-2">
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
            {onboarding.generationError ? <p className="text-sm text-rose-600">{onboarding.generationError}</p> : null}
          </div>
        </Card>
      ) : null}
    </main>
  );
};
