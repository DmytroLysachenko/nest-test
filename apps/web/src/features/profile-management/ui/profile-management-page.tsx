'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

import { DocumentsPanel } from '@/features/documents';
import { useRequireAuth } from '@/features/auth/model/context/auth-context';
import { useAccountDeletion } from '@/features/profile-management/model/hooks/use-account-deletion';
import { useProfileManagementData } from '@/features/profile-management/model/hooks/use-profile-management-data';
import { CareerProfileVersionsCard } from '@/features/profile-management/ui/components/career-profile-versions-card';
import { DocumentsReadinessCard } from '@/features/profile-management/ui/components/documents-readiness-card';
import { ProfileInputEditorCard } from '@/features/profile-management/ui/components/profile-input-editor-card';
import { ProfileQualityCard } from '@/features/profile-management/ui/components/profile-quality-card';
import { formatDateTime } from '@/shared/lib/utils/date-format';
import { usePrivateDashboardData } from '@/shared/lib/dashboard/private-dashboard-data-context';
import { useAppUiStore } from '@/shared/store/app-ui-store';
import { WorkspaceSplashState } from '@/shared/ui/async-states';
import { Button } from '@/shared/ui/button';
import { Card } from '@/shared/ui/card';
import { ConfirmActionDialog } from '@/shared/ui/confirm-action-dialog';
import { HeroHeader } from '@/shared/ui/dashboard-primitives';
import { WorkflowRecoveryPanel } from '@/shared/ui/workflow-recovery-panel';
import { WorkflowRouteBlock } from '@/shared/ui/workflow-route-block';

export const ProfileManagementPage = () => {
  const router = useRouter();
  const auth = useRequireAuth();
  const { deleteAccountMutation } = useAccountDeletion();
  const {
    summary,
    latestCareerProfile,
    latestProfileInput,
    documents: sharedDocuments,
    isBootstrapping,
  } = usePrivateDashboardData();
  const setLastVisitedSection = useAppUiStore((state) => state.setLastVisitedSection);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

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
  } = useProfileManagementData({
    token: auth.token,
    sharedLatestProfileInput: latestProfileInput,
    sharedDocuments,
    sharedLatestCareerProfile: latestCareerProfile,
  });

  if (!auth.token || isBootstrapping || !summary) {
    return (
      <WorkspaceSplashState
        title="Opening profile"
        subtitle="Restoring your target roles, ready documents, and the latest generated profile."
      />
    );
  }

  if (summary.workflow.needsOnboarding) {
    return (
      <WorkflowRouteBlock
        summary={summary}
        route="profile"
        title="Profile is locked"
        fallbackDescription="Finish setup before editing your active profile."
        fallbackActionLabel="Go to home"
        onNavigate={(href) => router.push(href)}
      />
    );
  }

  const documents = documentsQuery.data ?? [];
  const readyDocumentsCount = documents.filter((document) => document.extractionStatus === 'READY').length;
  const canGenerate = readyDocumentsCount > 0;
  const generationState = latestCareerProfileQuery.data?.generationState ?? null;
  const primaryBlocker = summary.blockerDetails?.[0] ?? null;
  const profileQualityEmptyDescription = primaryBlocker
    ? primaryBlocker.description
    : generationState === 'RUNNING'
      ? 'Profile generation is in progress. Quality details will appear when it finishes.'
      : generationState === 'QUEUED'
        ? 'Profile generation is queued. Quality details will appear when it starts and finishes.'
        : 'Generate a ready profile to unlock quality details.';

  return (
    <main className="app-page space-y-6">
      <HeroHeader
        eyebrow="Profile"
        title="Keep your source of truth clean"
        subtitle="This page is for target roles, documents, and profile generation. Everything else should stay secondary."
        meta={
          <>
            <span className="app-badge">{readyDocumentsCount} ready documents</span>
            <span className="app-badge">
              {generationState === 'RUNNING'
                ? 'Generating now'
                : generationState === 'QUEUED'
                  ? 'Generation queued'
                  : canGenerate
                    ? 'Ready to generate'
                    : 'Needs documents'}
            </span>
          </>
        }
        action={
          <Link href="/">
            <Button variant="secondary">Go to home</Button>
          </Link>
        }
      />

      <section className="grid gap-4 lg:grid-cols-[minmax(0,1.25fr)_minmax(300px,0.75fr)]">
        <ProfileInputEditorCard
          initialTargetRoles={latestProfileInputQuery.data?.targetRoles}
          initialNotes={latestProfileInputQuery.data?.notes ?? ''}
          onSubmit={(payload) => saveProfileInputMutation.mutate(payload)}
          isSaving={saveProfileInputMutation.isPending}
          errorMessage={errors.saveProfileInput}
        />
        <div className="space-y-4">
          <DocumentsReadinessCard documents={documents} />
          <Card title="Generation readiness" description="The minimum you need before creating a fresh version.">
            <div className="space-y-3 text-sm">
              <div className="app-inset-stack">
                <p className="text-text-strong font-semibold">Ready documents</p>
                <p className="text-text-soft mt-2">
                  {readyDocumentsCount > 0
                    ? `${readyDocumentsCount} document${readyDocumentsCount === 1 ? '' : 's'} are ready to use.`
                    : 'Upload and extract at least one document first.'}
                </p>
              </div>
              <div className="app-inset-stack">
                <p className="text-text-strong font-semibold">Current generation state</p>
                <p className="text-text-soft mt-2">
                  {generationState === 'RUNNING'
                    ? 'A new version is being generated right now.'
                    : generationState === 'QUEUED'
                      ? 'A new version is waiting to start.'
                      : latestCareerProfileQuery.data
                        ? 'A profile is already available.'
                        : 'No generated profile yet.'}
                </p>
              </div>
            </div>
          </Card>
        </div>
      </section>

      <WorkflowRecoveryPanel blockers={summary.blockerDetails ?? []} title="Fix profile blockers" />

      <DocumentsPanel token={auth.token} documentsQuery={documentsQuery} />

      <section className="grid gap-4 lg:grid-cols-[minmax(0,1.2fr)_minmax(320px,0.8fr)]">
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
        <ProfileQualityCard
          quality={careerProfileQualityQuery.data}
          emptyDescription={profileQualityEmptyDescription}
        />
      </section>

      <Card title="Account settings" description="Rarely used account actions live here, away from the main workflow.">
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-start">
          <div className="space-y-3 text-sm">
            <div className="app-inset-stack">
              <p className="text-text-soft text-xs uppercase tracking-[0.18em]">Last login</p>
              <p className="text-text-strong mt-2">
                {auth.user?.lastLoginAt ? formatDateTime(auth.user.lastLoginAt) : 'No login timestamp yet'}
              </p>
            </div>
            <div className="app-inset-stack">
              <p className="text-text-soft text-xs uppercase tracking-[0.18em]">Account state</p>
              <p className="text-text-strong mt-2">{auth.user?.isActive === false ? 'Inactive' : 'Active'}</p>
            </div>
          </div>

          <div className="app-inset-stack space-y-3 text-sm lg:max-w-sm">
            <p className="text-text-strong font-semibold">Delete account</p>
            <p className="text-text-soft">
              This removes access immediately and should only be used when you want to close the account entirely.
            </p>
            {deleteAccountMutation.isError ? (
              <p className="text-danger text-sm">Unable to delete the account right now. Retry later.</p>
            ) : null}
            <Button
              type="button"
              variant="destructive"
              disabled={deleteAccountMutation.isPending}
              onClick={() => {
                setIsDeleteDialogOpen(true);
              }}
            >
              {deleteAccountMutation.isPending ? 'Deleting account...' : 'Delete account'}
            </Button>
          </div>
        </div>
      </Card>

      <ConfirmActionDialog
        open={isDeleteDialogOpen}
        title="Delete account?"
        description="This will soft-delete the account, revoke active sessions, and redirect you to login."
        confirmLabel="Delete account"
        onCancel={() => {
          setIsDeleteDialogOpen(false);
        }}
        onConfirm={() => {
          setIsDeleteDialogOpen(false);
          deleteAccountMutation.mutate();
        }}
      />
    </main>
  );
};
