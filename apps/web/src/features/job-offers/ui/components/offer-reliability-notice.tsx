import { WorkflowInlineNotice } from '@/shared/ui/workflow-feedback';

import type { JobOfferReliabilityContextDto } from '@/shared/types/api';

type OfferReliabilityNoticeProps = {
  reliabilityContext?: JobOfferReliabilityContextDto | null;
};

export const OfferReliabilityNotice = ({ reliabilityContext }: OfferReliabilityNoticeProps) => {
  if (!reliabilityContext || reliabilityContext.key === 'healthy') {
    return null;
  }

  return (
    <WorkflowInlineNotice
      title={reliabilityContext.label}
      description={reliabilityContext.description}
      tone={reliabilityContext.severity === 'warning' ? 'warning' : 'info'}
    />
  );
};
