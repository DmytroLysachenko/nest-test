'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useMutation } from '@tanstack/react-query';

import { deleteCurrentUser } from '@/features/auth/api/auth-api';
import { useRequireAuth } from '@/features/auth/model/context/auth-context';
import { useProfileManagementData } from '@/features/profile-management/model/hooks/use-profile-management-data';
import { CareerProfileVersionsCard } from '@/features/profile-management/ui/components/career-profile-versions-card';
import { DocumentsReadinessCard } from '@/features/profile-management/ui/components/documents-readiness-card';
import { ProfileInputEditorCard } from '@/features/profile-management/ui/components/profile-input-editor-card';
import { ProfileQualityCard } from '@/features/profile-management/ui/components/profile-quality-card';
import { DocumentsPanel } from '@/features/documents';
import { usePrivateDashboardData } from '@/shared/lib/dashboard/private-dashboard-data-context';
import { useAppUiStore } from '@/shared/store/app-ui-store';
import { HeroHeader } from '@/shared/ui/dashboard-primitives';
import { GuidancePanel, JourneySteps } from '@/shared/ui/guidance-panels';
import { WorkspaceSplashState } from '@/shared/ui/async-states';
import { Card } from '@/shared/ui/card';
import { Button } from '@/shared/ui/button';
import { ConfirmActionDialog } from '@/shared/ui/confirm-action-dialog';
import { WorkflowRecoveryPanel } from '@/shared/ui/workflow-recovery-panel';
import { WorkflowRouteBlock } from '@/shared/ui/workflow-route-block';

export const ProfileManagementPage = () => {
  const router = useRouter();
  const auth = useRequireAuth();
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

  const deleteAccountMutation = useMutation({
    mutationFn: async () => {
      if (!auth.token) {
        throw new Error('Missing session token');
      }
      return deleteCurrentUser(auth.token);
    },
    onSuccess: () => {
      auth.clearSession();
      router.replace('/login');
    },
  });

  if (!auth.token) {
    return (
      <WorkspaceSplashState
        title="Opening Profile Studio"
        subtitle="Restoring your profile inputs, ready documents, and active profile version..."
      />
    );
  }

  if (isBootstrapping || !summary) {
    return (
      <WorkspaceSplashState
        title="Opening Profile Studio"
        subtitle="Restoring your profile inputs, ready documents, and active profile version..."
      />
    );
  }

  if (summary.workflow.needsOnboarding) {
    return (
      <WorkflowRouteBlock
        summary={summary}
        route="profile"
        title="Profile Studio is locked"
        fallbackDescription="Complete the required setup steps before editing your active profile workflow."
        fallbackActionLabel="Open dashboard"
        onNavigate={(href) => router.push(href)}
      />
    );
  }

  const documents = documentsQuery.data ?? [];
  const readyDocumentsCount = documents.filter((document) => document.extractionStatus === 'READY').length;
  const canGenerate = readyDocumentsCount > 0;
  const primaryBlocker = summary?.blockerDetails?.[0] ?? null;
  const profileQualityEmptyDescription = primaryBlocker
    ? primaryBlocker.description
    : 'Generate a READY career profile to unlock quality diagnostics.';

  return (
    <main className="app-page">
      <HeroHeader
        eyebrow="Profile Studio"
        title="Profile Management"
        subtitle="Keep source documents, profile input, and generated profile versions aligned so the app can score jobs consistently without refetching the same setup over and over."
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

      <GuidancePanel
        eyebrow="How this page works"
        title="Edit the source of truth first"
        description="Change role targets and notes here, keep at least one ready document available, then generate a fresh profile version only when the underlying context actually changed."
        tone="info"
      />

      <JourneySteps
        title="Profile update flow"
        description="This keeps profile quality stable and avoids confusing downstream results."
        steps={[
          {
            key: 'inputs',
            title: 'Adjust profile input',
            description: 'Update role targets, notes, and preferences only when your search direction changes.',
            status: latestProfileInputQuery.data ? 'done' : 'active',
          },
          {
            key: 'documents',
            title: 'Confirm ready documents',
            description: 'Your CV and other source documents should be uploaded and successfully extracted.',
            status: readyDocumentsCount > 0 ? 'done' : 'active',
          },
          {
            key: 'generate',
            title: 'Generate only when needed',
            description: 'Create a new profile version after meaningful changes instead of regenerating unnecessarily.',
            status: latestCareerProfileQuery.data?.status === 'READY' ? 'done' : 'upcoming',
          },
        ]}
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
        blockers={summary?.blockerDetails ?? []}
        title="Profile Recovery"
        description="Use the current server-driven blockers to unblock profile generation and document readiness."
      />

      <div className="grid gap-4 lg:grid-cols-2">
        <Card title="Account Activity" description="Operational account state that helps support and debugging.">
          <div className="space-y-3 text-sm">
            <div className="app-muted-panel">
              <p className="text-text-soft text-xs uppercase tracking-[0.18em]">Last login</p>
              <p className="text-text-strong mt-2">
                {auth.user?.lastLoginAt ? new Date(auth.user.lastLoginAt).toLocaleString() : 'No login timestamp yet'}
              </p>
            </div>
            <div className="app-muted-panel">
              <p className="text-text-soft text-xs uppercase tracking-[0.18em]">Account state</p>
              <p className="text-text-strong mt-2">{auth.user?.isActive === false ? 'Inactive' : 'Active'}</p>
              <p className="text-text-soft mt-1">
                Soft-deleted accounts lose access immediately but keep operational history for support use.
              </p>
            </div>
          </div>
        </Card>

        <Card
          title="Danger Zone"
          description="Use this only when you want to close the account and revoke current sessions."
        >
          <div className="app-muted-panel space-y-3 text-sm">
            <p className="text-text-soft">
              Deleting the account is a soft delete. You will lose access immediately, but historical workflow and
              operational records remain available for support diagnostics.
            </p>
            {deleteAccountMutation.isError ? (
              <p className="text-danger text-sm">
                Unable to delete the account right now. Retry after current work settles.
              </p>
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
        </Card>
      </div>

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
