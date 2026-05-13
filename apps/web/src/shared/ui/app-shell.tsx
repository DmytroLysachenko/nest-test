'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';
import {
  ArrowLeft,
  BriefcaseBusiness,
  Building2,
  CalendarCheck2,
  ClipboardList,
  Home,
  KanbanSquare,
  Shield,
  TestTube2,
  UserRound,
} from 'lucide-react';

import { env } from '@/shared/config/env';
import { usePrivateDashboardData } from '@/shared/lib/dashboard/private-dashboard-data-context';
import { Button } from '@/shared/ui/button';

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
  icon: React.ReactNode;
  hidden?: boolean;
};

const testerEnabled = process.env.NODE_ENV !== 'production' && env.NEXT_PUBLIC_ENABLE_TESTER;

const baseNavItems: AppNavItem[] = [
  { href: '/', label: 'Home', icon: <Home className="h-4 w-4" /> },
  { href: '/planning', label: 'Automation', icon: <CalendarCheck2 className="h-4 w-4" /> },
  { href: '/opportunities', label: 'Opportunities', icon: <BriefcaseBusiness className="h-4 w-4" /> },
  { href: '/notebook', label: 'Notebook', icon: <KanbanSquare className="h-4 w-4" /> },
  { href: '/companies', label: 'Companies', icon: <Building2 className="h-4 w-4" /> },
  { href: '/activity', label: 'Progress', icon: <ClipboardList className="h-4 w-4" /> },
  { href: '/profile', label: 'Profile', icon: <UserRound className="h-4 w-4" /> },
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
  onNavigate,
}: {
  pathname: string;
  items: AppNavItem[];
  readinessScore?: number;
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
            <p className="text-sidebar-foreground/65 mt-1 text-xs">Focused job-search workspace</p>
          </div>
        </div>
        <p className="text-sidebar-foreground/72 text-sm leading-6">
          {readinessScore == null
            ? 'Move between setup, review, and notebook work without digging through admin-style controls.'
            : readinessScore >= 80
              ? 'Your workspace is ready for review, tracking, and follow-up work.'
              : 'Finish the remaining setup steps, then the rest of the workspace will stay simple.'}
        </p>
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
              className={`inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-xl ${
                active ? 'text-sidebar-primary-foreground bg-white/15' : 'text-sidebar-foreground/70 bg-white/70'
              }`}
            >
              {item.icon}
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
  const { summary } = usePrivateDashboardData();
  const workspaceReady = summary?.workflow.needsOnboarding === undefined ? true : !summary.workflow.needsOnboarding;

  const navItems = useMemo(() => {
    const items: AppNavItem[] = [
      ...baseNavItems.map((item) =>
        item.href === '/notebook' ||
        item.href === '/opportunities' ||
        item.href === '/companies' ||
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
      items.push({ href: '/tester', label: 'Tester', icon: <TestTube2 className="h-4 w-4" /> });
    }
    if (userRole === 'admin') {
      items.push({ href: '/ops', label: 'Admin', icon: <Shield className="h-4 w-4" /> });
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
          <AppShellSidebar pathname={pathname} items={navItems} readinessScore={summary?.health.readinessScore} />
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
            onNavigate={() => setMobileOpen(false)}
          />
        </aside>
      )}

      <div className="app-shell-content">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 top-0 h-48 bg-[radial-gradient(70%_70%_at_50%_0%,color-mix(in_oklab,var(--primary)_8%,transparent),transparent_72%)]"
        />
        <header className="app-shell-header sticky top-0 z-20">
          <div className="px-4 md:px-6 xl:px-9">
            <div className="flex min-h-[4.75rem] flex-wrap items-center gap-3 py-3 md:min-h-[5rem]">
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

              <div className="flex min-w-0 flex-1 items-center gap-2 md:gap-3">
                {!hideSidebar && (
                  <Button
                    type="button"
                    variant="secondary"
                    className="h-9 w-9 shrink-0 px-0"
                    aria-label="Go back"
                    onClick={() => router.back()}
                  >
                    <ArrowLeft className="h-4 w-4" />
                  </Button>
                )}
                <div className="min-w-0">
                  <p className="text-text-strong truncate text-lg font-semibold leading-tight tracking-[-0.02em]">
                    {activePage}
                  </p>
                  <p className="text-text-soft text-xs">
                    {workspaceReady
                      ? 'Use the main product routes to review jobs, track applications, and keep the profile current.'
                      : 'Finish setup to unlock the rest of the workspace.'}
                  </p>
                </div>
              </div>

              <div className="ml-auto flex items-center gap-2">
                <div className="border-border/45 bg-surface-elevated/75 hidden rounded-full border px-3.5 py-2 md:block">
                  <p className="text-text-soft text-[11px] uppercase tracking-[0.14em]">Workspace</p>
                  <p className="text-text-strong max-w-48 truncate text-sm font-medium">{userEmail ?? 'anonymous'}</p>
                </div>
                <Button type="button" variant="destructive" className="h-10 px-4" onClick={onSignOut}>
                  Sign out
                </Button>
              </div>
            </div>
            {!hideSidebar ? (
              <nav
                className="border-border/45 flex gap-2 overflow-x-auto border-t py-3 xl:hidden"
                aria-label="Workspace routes"
              >
                {navItems.map((item) => {
                  const active = getIsActive(pathname, item.href);
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={`inline-flex shrink-0 items-center gap-2 rounded-full border px-3 py-2 text-xs font-semibold transition-colors ${
                        active
                          ? 'border-primary/20 bg-primary/10 text-primary'
                          : 'border-border/55 bg-surface-elevated/82 text-text-soft hover:bg-surface-muted/70 hover:text-text-strong'
                      }`}
                    >
                      <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-white/70">
                        {item.icon}
                      </span>
                      <span>{item.label}</span>
                    </Link>
                  );
                })}
              </nav>
            ) : null}
          </div>
        </header>
        {children}
      </div>
    </div>
  );
};
