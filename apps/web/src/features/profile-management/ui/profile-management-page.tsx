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
    return <main className="app-page text-muted-foreground text-sm">Checking session...</main>;
  }

  const documents = documentsQuery.data ?? [];
  const readyDocumentsCount = documents.filter((document) => document.extractionStatus === 'READY').length;
  const canGenerate = readyDocumentsCount > 0;

  return (
    <main className="app-page flex flex-col gap-6">
      <header className="app-page-header flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="app-title text-2xl">Profile Management</h1>
          <p className="app-subtitle mt-1">
            Manage profile input, documents readiness, and career profile version lifecycle.
          </p>
        </div>
        <Link
          className="border-border bg-card text-secondary-foreground rounded-xl border px-3 py-2 text-xs font-medium"
          href="/"
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
