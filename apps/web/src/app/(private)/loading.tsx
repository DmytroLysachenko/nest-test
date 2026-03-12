import { WorkspaceSplashState } from '@/shared/ui/async-states';

export default function PrivateLoading() {
  return (
    <WorkspaceSplashState
      title="Loading JobSeeker"
      subtitle="Restoring your workspace, cached profile context, and latest operator state..."
    />
  );
}
