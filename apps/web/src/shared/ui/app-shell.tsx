'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';

import { env } from '@/shared/config/env';
import { usePrivateDashboardData } from '@/shared/lib/dashboard/private-dashboard-data-context';
import { Button } from '@/shared/ui/button';
import { Input } from '@/shared/ui/input';

type AppShellProps = {
  children: React.ReactNode;
  userEmail: string | null | undefined;
  userRole?: string | null;
  onSignOut: () => void;
  hideSidebar?: boolean;
};

type AppNavItem = {
  href: string;
  label: string;
  shortLabel: string;
  hidden?: boolean;
};

const testerEnabled = process.env.NODE_ENV !== 'production' && env.NEXT_PUBLIC_ENABLE_TESTER;

const baseNavItems: AppNavItem[] = [
  { href: '/', label: 'Dashboard', shortLabel: 'DB' },
  { href: '/planning', label: 'Planning', shortLabel: 'PL' },
  { href: '/opportunities', label: 'Opportunities', shortLabel: 'OC' },
  { href: '/notebook', label: 'Notebook', shortLabel: 'NB' },
  { href: '/activity', label: 'Activity Board', shortLabel: 'AC' },
  { href: '/profile', label: 'Profile Studio', shortLabel: 'PS' },
];

const getIsActive = (pathname: string, href: string) => {
  if (href === '/') {
    return pathname === '/';
  }
  return pathname === href || pathname.startsWith(`${href}/`);
};

const AppShellSidebar = ({
  pathname,
  items,
  readinessScore,
  nextActionTitle,
  nextRunAt,
  onNavigate,
}: {
  pathname: string;
  items: AppNavItem[];
  readinessScore?: number;
  nextActionTitle?: string;
  nextRunAt?: string | null;
  onNavigate?: () => void;
}) => (
  <>
    <div className="px-5 py-6">
      <div className="bg-sidebar-accent rounded-[1.9rem] p-4 shadow-[0_24px_46px_-34px_color-mix(in_oklab,var(--text-strong)_18%,transparent)]">
        <div className="mb-4 flex items-center gap-3">
          <span className="bg-sidebar-primary text-sidebar-primary-foreground inline-flex h-11 w-11 items-center justify-center rounded-2xl text-sm font-semibold">
            JS
          </span>
          <div>
            <p className="text-sidebar-foreground text-xl font-semibold tracking-tight">JobSeeker</p>
            <p className="text-sidebar-foreground/65 mt-1 text-xs">Career intelligence workspace</p>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="rounded-[1rem] bg-white/60 px-3 py-2">
            <p className="text-sidebar-foreground/55">Readiness</p>
            <p className="text-sidebar-foreground mt-1 font-medium">
              {readinessScore == null ? 'n/a' : `${readinessScore}%`}
            </p>
          </div>
          <div className="rounded-[1rem] bg-white/60 px-3 py-2">
            <p className="text-sidebar-foreground/55">Next run</p>
            <p className="text-sidebar-foreground mt-1 font-medium">
              {nextRunAt ? new Date(nextRunAt).toLocaleDateString() : 'manual'}
            </p>
          </div>
        </div>
        <div className="mt-3 rounded-[1.2rem] bg-white/70 p-3">
          <p className="text-sidebar-foreground/55 text-[11px] uppercase tracking-[0.14em]">Next best move</p>
          <p className="text-sidebar-foreground mt-2 text-sm leading-5">
            {nextActionTitle ?? 'Review dashboard priorities'}
          </p>
        </div>
      </div>
    </div>
    <nav className="space-y-1.5 px-3 py-5">
      <p className="text-sidebar-foreground/45 px-3 pb-2 text-[11px] uppercase tracking-[0.18em]">Workspace</p>
      {items.map((item) => {
        const active = getIsActive(pathname, item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`app-shell-sidebar-link ${active ? 'app-shell-sidebar-link-active' : ''}`}
            onClick={onNavigate}
          >
            <span
              className={`inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-[10px] font-semibold ${
                active ? 'text-sidebar-primary-foreground bg-white/15' : 'text-sidebar-foreground/70 bg-white/70'
              }`}
            >
              {item.shortLabel}
            </span>
            <span className="flex-1">{item.label}</span>
            {active ? (
              <span className="bg-sidebar-primary-foreground/85 h-2 w-2 rounded-full" aria-hidden="true" />
            ) : null}
          </Link>
        );
      })}
    </nav>
  </>
);

export const AppShell = ({ children, userEmail, userRole, onSignOut, hideSidebar }: AppShellProps) => {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);
  const { summary, scrapeSchedule } = usePrivateDashboardData();
  const workspaceReady = summary?.workflow.needsOnboarding === undefined ? true : !summary.workflow.needsOnboarding;

  const navItems = useMemo(() => {
    const items: AppNavItem[] = [
      ...baseNavItems.map((item) =>
        item.href === '/notebook' ||
        item.href === '/opportunities' ||
        item.href === '/planning' ||
        item.href === '/activity'
          ? {
              ...item,
              hidden: !workspaceReady,
            }
          : item,
      ),
    ];

    if (testerEnabled) {
      items.push({ href: '/tester', label: 'Tester', shortLabel: 'TS' });
    }
    if (userRole === 'admin') {
      items.push({ href: '/ops', label: 'Ops', shortLabel: 'OP' });
    }

    return items.filter((item) => !item.hidden);
  }, [userRole, workspaceReady]);

  const activePage = hideSidebar
    ? 'Setup Workspace'
    : (navItems.find((item) => getIsActive(pathname, item.href))?.label ?? 'Workspace');

  return (
    <div className="app-shell">
      {!hideSidebar && (
        <aside className="bg-sidebar/85 text-sidebar-foreground sticky top-0 hidden h-screen w-72 overflow-y-auto xl:block">
          <AppShellSidebar
            pathname={pathname}
            items={navItems}
            readinessScore={summary?.health.readinessScore}
            nextActionTitle={summary?.nextAction?.title}
            nextRunAt={scrapeSchedule?.nextRunAt}
          />
        </aside>
      )}

      {!hideSidebar && mobileOpen ? (
        <button
          type="button"
          className="fixed inset-0 z-30 bg-black/35 lg:hidden"
          aria-label="Close navigation"
          onClick={() => setMobileOpen(false)}
        />
      ) : null}

      {!hideSidebar && (
        <aside
          className={`bg-sidebar text-sidebar-foreground fixed inset-y-0 left-0 z-40 w-72 overflow-y-auto transition-transform xl:hidden ${
            mobileOpen ? 'translate-x-0' : '-translate-x-full'
          }`}
        >
          <AppShellSidebar
            pathname={pathname}
            items={navItems}
            readinessScore={summary?.health.readinessScore}
            nextActionTitle={summary?.nextAction?.title}
            nextRunAt={scrapeSchedule?.nextRunAt}
            onNavigate={() => setMobileOpen(false)}
          />
        </aside>
      )}

      <div className="app-shell-content">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 top-0 h-48 bg-[radial-gradient(70%_70%_at_50%_0%,color-mix(in_oklab,var(--primary)_8%,transparent),transparent_72%)]"
        />
        <header className="sticky top-0 z-20 px-4 pt-4 md:px-6 md:pt-5">
          <div className="bg-surface-ghost rounded-[1.9rem] px-4 py-3 shadow-[0_16px_38px_-24px_color-mix(in_oklab,var(--text-strong)_12%,transparent)] backdrop-blur-xl md:px-5">
            <div className="flex flex-wrap items-center gap-3">
              {!hideSidebar && (
                <Button
                  type="button"
                  variant="secondary"
                  className="h-9 w-9 px-0 xl:hidden"
                  aria-label="Open navigation"
                  onClick={() => setMobileOpen(true)}
                >
                  <span className="text-sm">=</span>
                </Button>
              )}

              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  {!hideSidebar && (
                    <Button
                      type="button"
                      variant="secondary"
                      className="h-9 w-9 px-0"
                      aria-label="Go back"
                      onClick={() => router.back()}
                    >
                      <span className="text-base leading-none">{'<'}</span>
                    </Button>
                  )}
                  <div>
                    <p className="text-text-strong text-lg font-semibold leading-tight tracking-[-0.02em]">
                      {activePage}
                    </p>
                    <p className="text-text-soft text-xs">{summary?.nextAction?.title ?? 'JobSeeker command center'}</p>
                  </div>
                </div>
              </div>

              {!hideSidebar && (
                <div className="relative ml-auto hidden min-w-[320px] max-w-[520px] flex-1 xl:block">
                  <Input
                    placeholder="Search jobs, notes, companies..."
                    className="bg-surface-elevated/92 h-11 rounded-2xl pl-4"
                  />
                </div>
              )}

              <div className="ml-auto flex items-center gap-2">
                <div className="bg-surface-elevated/92 hidden rounded-[1.1rem] px-3.5 py-2 md:block">
                  <p className="text-text-soft text-[11px] uppercase tracking-[0.14em]">Workspace</p>
                  <p className="text-text-strong max-w-48 truncate text-sm font-medium">{userEmail ?? 'anonymous'}</p>
                </div>
                <Button type="button" variant="destructive" className="h-10 px-4" onClick={onSignOut}>
                  Sign out
                </Button>
              </div>
            </div>
          </div>
        </header>
        {children}
      </div>
    </div>
  );
};
