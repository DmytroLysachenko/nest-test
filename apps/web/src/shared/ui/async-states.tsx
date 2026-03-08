import { Skeleton } from '@repo/ui/components/skeleton';

import { Button } from '@/shared/ui/button';
import { Card } from '@/shared/ui/card';

type PageLoadingStateProps = {
  title?: string;
  subtitle?: string;
};

type SectionLoadingStateProps = {
  title: string;
  description?: string;
  rows?: number;
};

type AsyncErrorStateProps = {
  title: string;
  message: string;
  retryLabel?: string;
  onRetry?: () => void;
};

export const PageLoadingState = ({
  title = 'Loading workspace',
  subtitle = 'Preparing your latest dashboard data...',
}: PageLoadingStateProps) => (
  <main className="app-page space-y-6">
    <header className="app-hero flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
      <div className="relative z-10 w-full space-y-3">
        <Skeleton className="h-6 w-32 rounded-full" />
        <div className="space-y-2">
          <Skeleton className="h-10 w-64 rounded-md" />
          <Skeleton className="h-4 w-96 rounded-md" />
        </div>
      </div>
    </header>
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {Array.from({ length: 4 }).map((_, index) => (
        <Card key={index} title=" " contentClassName="space-y-2">
          <Skeleton className="mb-4 h-4 w-24 rounded-md" />
          <Skeleton className="h-10 w-32 rounded-md" />
          <Skeleton className="mt-4 h-6 w-20 rounded-full" />
        </Card>
      ))}
    </div>
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1.8fr)_minmax(320px,1fr)]">
      <Skeleton className="h-96 rounded-[1.5rem]" />
      <Skeleton className="h-96 rounded-[1.5rem]" />
    </div>
  </main>
);

export const SectionLoadingState = ({ title, description, rows = 3 }: SectionLoadingStateProps) => (
  <Card title={title} description={description}>
    <div className="mt-2 space-y-3">
      {Array.from({ length: rows }).map((_, index) => (
        <Skeleton key={index} className="h-10 rounded-2xl" style={{ width: `${100 - (index % 3) * 15}%` }} />
      ))}
    </div>
  </Card>
);

export const PageErrorState = ({ title, message, retryLabel = 'Retry', onRetry }: AsyncErrorStateProps) => (
  <main className="app-page">
    <Card title={title} description={message} className="border-app-danger-border bg-app-danger-soft">
      {onRetry ? (
        <Button type="button" variant="destructive" onClick={onRetry}>
          {retryLabel}
        </Button>
      ) : null}
    </Card>
  </main>
);

export const SectionErrorState = ({ title, message, retryLabel = 'Retry', onRetry }: AsyncErrorStateProps) => (
  <Card title={title} description={message} className="border-app-danger-border bg-app-danger-soft">
    {onRetry ? (
      <Button type="button" variant="destructive" className="h-9" onClick={onRetry}>
        {retryLabel}
      </Button>
    ) : null}
  </Card>
);
