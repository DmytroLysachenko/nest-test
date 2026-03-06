import { PageLoadingState } from '@/shared/ui/async-states';

export default function PrivateLoading() {
  return <PageLoadingState title="Loading JobSeeker" subtitle="Restoring your workspace and active sessions..." />;
}
