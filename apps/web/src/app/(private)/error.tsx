'use client';

import { PageErrorState } from '@/shared/ui/async-states';

export default function PrivateError({
  error,
  reset,
}: Readonly<{
  error: Error & { digest?: string };
  reset: () => void;
}>) {
  return (
    <PageErrorState
      title="Something went wrong in JobSeeker"
      message={error.message || 'Unexpected UI error while rendering this page.'}
      retryLabel="Try again"
      onRetry={reset}
    />
  );
}
