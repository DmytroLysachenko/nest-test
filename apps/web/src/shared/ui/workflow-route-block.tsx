'use client';

import type { WorkspaceSummaryDto } from '@/shared/types/api';

import { WorkflowBlockedState } from '@/shared/ui/workflow-blocked-state';

type WorkflowRouteBlockProps = {
  summary: WorkspaceSummaryDto;
  route: string;
  title: string;
  fallbackDescription: string;
  fallbackActionLabel: string;
  onNavigate: (href: string) => void;
};

export const WorkflowRouteBlock = ({
  summary,
  route,
  title,
  fallbackDescription,
  fallbackActionLabel,
  onNavigate,
}: WorkflowRouteBlockProps) => {
  const primaryBlocker =
    summary.blockerDetails?.find((blocker) => blocker.blockedRoutes.includes(route)) ?? summary.blockerDetails?.[0];

  return (
    <WorkflowBlockedState
      title={title}
      description={primaryBlocker?.description ?? fallbackDescription}
      actionLabel={primaryBlocker?.ctaLabel ?? fallbackActionLabel}
      onAction={() => onNavigate(primaryBlocker?.href ?? '/')}
      breakdown={summary.readinessBreakdown}
    />
  );
};
