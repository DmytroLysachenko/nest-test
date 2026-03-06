import { PageLoadingState } from '@/shared/ui/async-states';

export default function AuthLoading() {
  return <PageLoadingState title="Preparing secure login" subtitle="Loading authentication context..." />;
}
