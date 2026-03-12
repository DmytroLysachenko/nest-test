'use client';

import { useEffect, useState } from 'react';
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

const loadingLabels = [
  'Negotiating with the hiring universe',
  'Calibrating the serious-job-search machine',
  'Warming up your command center',
  'Asking the dashboard to behave professionally',
];

const loadingTips = [
  'Tip: track only the jobs you would genuinely interview for. High-volume saves usually create noise, not momentum.',
  'Tip: if a scrape starts failing, tighten the profile intent first before widening source filters.',
  'Tip: strict-mode triage should happen before explore-mode browsing, otherwise you bury the best leads.',
  'Tip: follow-up reminders matter more than new discoveries once your pipeline is active.',
  'Tip: update your profile only when your target actually changes. Constant re-generation usually lowers signal quality.',
];

export const WorkspaceSplashState = ({
  title = 'Loading JobSeeker',
  subtitle = 'Restoring your private workspace without hammering the API...',
}: PageLoadingStateProps) => {
  const [labelIndex, setLabelIndex] = useState(0);
  const [tipIndex, setTipIndex] = useState(0);

  useEffect(() => {
    const labelTimer = window.setInterval(() => {
      setLabelIndex((current) => (current + 1) % loadingLabels.length);
    }, 2400);

    return () => {
      window.clearInterval(labelTimer);
    };
  }, []);

  return (
    <main className="app-page flex min-h-[72vh] items-center justify-center">
      <div className="border-border/70 bg-surface/92 relative w-full max-w-2xl overflow-hidden rounded-[2rem] border px-6 py-10 shadow-[0_24px_80px_-48px_rgba(15,23,42,0.55)] backdrop-blur-xl sm:px-10">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-8 top-0 h-32 rounded-full bg-[radial-gradient(circle_at_top,color-mix(in_oklab,var(--primary)_18%,transparent),transparent_68%)] blur-2xl"
        />
        <div className="relative flex flex-col items-center text-center">
          <div className="relative mb-6 flex h-20 w-20 items-center justify-center">
            <span className="border-primary/15 absolute inset-0 rounded-full border" />
            <span className="border-primary/25 absolute inset-[10px] animate-ping rounded-full border" />
            <span className="border-primary border-t-primary/30 h-14 w-14 animate-spin rounded-full border-4" />
          </div>

          <span className="app-badge mb-4">{loadingLabels[labelIndex]}</span>
          <h1 className="text-text-strong text-3xl font-semibold tracking-[-0.04em]">{title}</h1>
          <p className="text-text-soft mt-3 max-w-xl text-sm leading-7 sm:text-base">{subtitle}</p>

          <div className="border-border/70 bg-surface-elevated/90 mt-7 w-full rounded-[1.6rem] border p-5 text-left">
            <p className="text-text-soft text-[11px] uppercase tracking-[0.18em]">Job search tip</p>
            <p className="text-text-strong mt-3 text-sm leading-7 sm:text-[15px]">{loadingTips[tipIndex]}</p>
            <div className="mt-4 flex justify-between gap-3">
              <p className="text-text-soft text-xs">Click for another tip while the workspace syncs.</p>
              <Button
                type="button"
                variant="secondary"
                className="h-9"
                onClick={() => setTipIndex((current) => (current + 1) % loadingTips.length)}
              >
                Another tip
              </Button>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
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
