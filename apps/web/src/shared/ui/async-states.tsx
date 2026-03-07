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
  <main className="app-page space-y-4">
    <header className="app-page-header">
      <h1 className="app-title">{title}</h1>
      <p className="app-subtitle mt-1">{subtitle}</p>
    </header>
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {Array.from({ length: 4 }).map((_, index) => (
        <Card key={index} title=" " contentClassName="space-y-2">
          <Skeleton className="h-7 w-24 rounded-md" />
          <Skeleton className="h-4 w-32 rounded-md" />
          <Skeleton className="h-6 w-20 rounded-full" />
        </Card>
      ))}
    </div>
    <div className="grid gap-4 xl:grid-cols-[1.9fr_1fr]">
      <Skeleton className="h-72 rounded-2xl" />
      <Skeleton className="h-72 rounded-2xl" />
    </div>
  </main>
);

export const SectionLoadingState = ({ title, description, rows = 3 }: SectionLoadingStateProps) => (
  <Card title={title} description={description}>
    <div className="space-y-2">
      {Array.from({ length: rows }).map((_, index) => (
        <Skeleton key={index} className="h-11 w-full rounded-2xl" />
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
