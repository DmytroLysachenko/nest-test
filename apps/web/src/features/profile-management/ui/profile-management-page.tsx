'use client';

import Link from 'next/link';
import { useEffect } from 'react';

import { useRequireAuth } from '@/features/auth/model/context/auth-context';
import { useProfileManagementData } from '@/features/profile-management/model/hooks/use-profile-management-data';
import { CareerProfileVersionsCard } from '@/features/profile-management/ui/components/career-profile-versions-card';
import { DocumentsReadinessCard } from '@/features/profile-management/ui/components/documents-readiness-card';
import { ProfileInputEditorCard } from '@/features/profile-management/ui/components/profile-input-editor-card';
import { ProfileQualityCard } from '@/features/profile-management/ui/components/profile-quality-card';
import { DocumentsPanel } from '@/features/documents';
import { useAppUiStore } from '@/shared/store/app-ui-store';

export const ProfileManagementPage = () => {
  const auth = useRequireAuth();
  const setLastVisitedSection = useAppUiStore((state) => state.setLastVisitedSection);

  useEffect(() => {
    setLastVisitedSection('profile');
  }, [setLastVisitedSection]);

  const {
    latestProfileInputQuery,
    documentsQuery,
    latestCareerProfileQuery,
    careerProfileQualityQuery,
    selectedProfileDocumentsQuery,
    careerProfileVersionsQuery,
    saveProfileInputMutation,
    generateProfileMutation,
    restoreProfileMutation,
    errors,
  } = useProfileManagementData({ token: auth.token });

  if (!auth.token) {
    return <main className="mx-auto max-w-6xl px-4 py-10 text-sm text-slate-500">Checking session...</main>;
  }

  const documents = documentsQuery.data ?? [];
  const readyDocumentsCount = documents.filter((document) => document.extractionStatus === 'READY').length;
  const canGenerate = readyDocumentsCount > 0;

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-6 md:py-8">
      <header className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-4">
        <div>
          <h1 className="text-lg font-semibold text-slate-900">Profile Management</h1>
          <p className="text-sm text-slate-700">
            Manage profile input, documents readiness, and career profile version lifecycle.
          </p>
        </div>
        <Link
          className="rounded-md border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-700"
          href="/app"
        >
          Back to workspace
        </Link>
      </header>

      <div className="grid gap-4 lg:grid-cols-2">
        <ProfileInputEditorCard
          initialTargetRoles={latestProfileInputQuery.data?.targetRoles}
          initialNotes={latestProfileInputQuery.data?.notes ?? ''}
          onSubmit={(payload) => saveProfileInputMutation.mutate(payload)}
          isSaving={saveProfileInputMutation.isPending}
          errorMessage={errors.saveProfileInput}
        />
        <DocumentsReadinessCard documents={documents} />
      </div>

      <DocumentsPanel token={auth.token} />

      <CareerProfileVersionsCard
        latestProfile={latestCareerProfileQuery.data ?? null}
        versions={careerProfileVersionsQuery.data}
        latestProfileDocuments={selectedProfileDocumentsQuery.data ?? []}
        canGenerate={canGenerate}
        isGenerating={generateProfileMutation.isPending}
        isRestoring={restoreProfileMutation.isPending}
        onGenerate={(payload) => generateProfileMutation.mutate(payload)}
        onRestore={(careerProfileId) => restoreProfileMutation.mutate(careerProfileId)}
        generateErrorMessage={errors.generateProfile}
        restoreErrorMessage={errors.restoreProfile}
      />

      <ProfileQualityCard quality={careerProfileQualityQuery.data} />
    </main>
  );
};
