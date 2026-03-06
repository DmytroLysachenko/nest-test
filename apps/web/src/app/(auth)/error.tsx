'use client';

import { PageErrorState } from '@/shared/ui/async-states';

export default function AuthError({
  error,
  reset,
}: Readonly<{
  error: Error & { digest?: string };
  reset: () => void;
}>) {
  return (
    <PageErrorState
      title="Authentication screen failed"
      message={error.message || 'Unexpected error while loading sign-in pages.'}
      retryLabel="Reload auth view"
      onRetry={reset}
    />
  );
}
