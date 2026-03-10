'use client';

import Link from 'next/link';
import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';

import { useRequireAuth } from '@/features/auth/model/context/auth-context';
import { useProfileManagementData } from '@/features/profile-management/model/hooks/use-profile-management-data';
import { CareerProfileVersionsCard } from '@/features/profile-management/ui/components/career-profile-versions-card';
import { DocumentsReadinessCard } from '@/features/profile-management/ui/components/documents-readiness-card';
import { ProfileInputEditorCard } from '@/features/profile-management/ui/components/profile-input-editor-card';
import { ProfileQualityCard } from '@/features/profile-management/ui/components/profile-quality-card';
import { DocumentsPanel } from '@/features/documents';
import { getWorkspaceSummary } from '@/features/workspace/api/workspace-api';
import { buildAuthedQueryOptions } from '@/shared/lib/query/authed-query-options';
import { QUERY_GC_TIME, QUERY_STALE_TIME } from '@/shared/lib/query/query-constants';
import { queryKeys } from '@/shared/lib/query/query-keys';
import { useAppUiStore } from '@/shared/store/app-ui-store';
import { HeroHeader } from '@/shared/ui/dashboard-primitives';
import { WorkflowRecoveryPanel } from '@/shared/ui/workflow-recovery-panel';

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
  const workspaceSummaryQuery = useQuery(
    buildAuthedQueryOptions({
      token: auth.token,
      queryKey: queryKeys.workflow.summary(auth.token),
      queryFn: getWorkspaceSummary,
      enabled: Boolean(auth.token),
      staleTime: QUERY_STALE_TIME.CORE_DATA,
      gcTime: QUERY_GC_TIME.LONG_LIVED,
    }),
  );

  if (!auth.token) {
    return <main className="app-page text-muted-foreground text-sm">Checking session...</main>;
  }

  const documents = documentsQuery.data ?? [];
  const readyDocumentsCount = documents.filter((document) => document.extractionStatus === 'READY').length;
  const canGenerate = readyDocumentsCount > 0;
  const primaryBlocker = workspaceSummaryQuery.data?.blockerDetails?.[0] ?? null;
  const profileQualityEmptyDescription = primaryBlocker
    ? primaryBlocker.description
    : 'Generate a READY career profile to unlock quality diagnostics.';

  return (
    <main className="app-page">
      <HeroHeader
        eyebrow="Profile Studio"
        title="Profile Management"
        subtitle="Keep your source material, profile input, and generated career profile versions aligned so matching quality stays predictable."
        meta={
          <>
            <span className="app-badge">Ready documents: {readyDocumentsCount}</span>
            <span className="app-badge">Generation: {canGenerate ? 'Available' : 'Blocked'}</span>
          </>
        }
        action={
          <Link
            className="border-border bg-card text-secondary-foreground rounded-xl border px-3 py-2 text-xs font-medium"
            href="/"
          >
            Back to workspace
          </Link>
        }
      />

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

      <WorkflowRecoveryPanel
        blockers={workspaceSummaryQuery.data?.blockerDetails ?? []}
        title="Profile Recovery"
        description="Use the current server-driven blockers to unblock profile generation and document readiness."
      />

      <DocumentsPanel token={auth.token} documentsQuery={documentsQuery} />

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

      <ProfileQualityCard quality={careerProfileQualityQuery.data} emptyDescription={profileQualityEmptyDescription} />
    </main>
  );
};
