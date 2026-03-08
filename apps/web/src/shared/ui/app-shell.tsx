'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';

import { useWorkflowState } from '@/features/workflow/model/use-workflow-state';
import { env } from '@/shared/config/env';
import { Button } from '@/shared/ui/button';
import { Input } from '@/shared/ui/input';

type AppShellProps = {
  children: React.ReactNode;
  userEmail: string | null | undefined;
  token: string | null;
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
  { href: '/notebook', label: 'Notebook', shortLabel: 'NB' },
  { href: '/profile', label: 'Profile Studio', shortLabel: 'PS' },
  { href: '/onboarding', label: 'Onboarding', shortLabel: 'OB' },
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
  onNavigate,
}: {
  pathname: string;
  items: AppNavItem[];
  onNavigate?: () => void;
}) => (
  <>
    <div className="border-sidebar-border border-b px-5 py-6">
      <div className="border-white/8 bg-white/4 rounded-2xl border p-4">
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
          <div className="bg-white/4 rounded-xl px-3 py-2">
            <p className="text-sidebar-foreground/55">Focus</p>
            <p className="text-sidebar-foreground mt-1 font-medium">Triage</p>
          </div>
          <div className="bg-white/4 rounded-xl px-3 py-2">
            <p className="text-sidebar-foreground/55">Mode</p>
            <p className="text-sidebar-foreground mt-1 font-medium">Live</p>
          </div>
        </div>
      </div>
    </div>
    <nav className="space-y-1.5 px-3 py-5">
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
                active ? 'text-sidebar-primary-foreground bg-white/15' : 'bg-sidebar-accent text-sidebar-foreground/70'
              }`}
            >
              {item.shortLabel}
            </span>
            <span className="flex-1">{item.label}</span>
            {active ? <span className="h-2 w-2 rounded-full bg-white/90" aria-hidden="true" /> : null}
          </Link>
        );
      })}
    </nav>
  </>
);

export const AppShell = ({ children, userEmail, token, onSignOut, hideSidebar }: AppShellProps) => {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);
  const workflow = useWorkflowState(token);

  const navItems = useMemo(() => {
    const items: AppNavItem[] = [
      ...baseNavItems.map((item) =>
        item.href === '/notebook'
          ? {
              ...item,
              hidden: !workflow.allowNotebook,
            }
          : item,
      ),
    ];

    if (testerEnabled) {
      items.push({ href: '/tester', label: 'Tester', shortLabel: 'TS' });
    }

    return items.filter((item) => !item.hidden);
  }, [workflow.allowNotebook]);

  const activePage = hideSidebar
    ? 'Setup Workspace'
    : (navItems.find((item) => getIsActive(pathname, item.href))?.label ?? 'Workspace');

  return (
    <div className="app-shell">
      {!hideSidebar && (
        <aside className="border-sidebar-border bg-sidebar text-sidebar-foreground sticky top-0 hidden h-screen w-80 overflow-y-auto border-r lg:block">
          <AppShellSidebar pathname={pathname} items={navItems} />
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
          className={`border-sidebar-border bg-sidebar text-sidebar-foreground fixed inset-y-0 left-0 z-40 w-80 overflow-y-auto border-r transition-transform lg:hidden ${
            mobileOpen ? 'translate-x-0' : '-translate-x-full'
          }`}
        >
          <AppShellSidebar pathname={pathname} items={navItems} onNavigate={() => setMobileOpen(false)} />
        </aside>
      )}

      <div className="app-shell-content">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 top-0 h-48 bg-[radial-gradient(70%_70%_at_50%_0%,color-mix(in_oklab,var(--primary)_8%,transparent),transparent_72%)]"
        />
        <header className="sticky top-0 z-20 px-4 pt-4 md:px-6 md:pt-5">
          <div className="border-border/70 bg-surface/82 rounded-[1.75rem] border px-4 py-3 shadow-[0_20px_50px_-36px_color-mix(in_oklab,var(--text-strong)_18%,transparent)] backdrop-blur-md md:px-5">
            <div className="flex flex-wrap items-center gap-3">
              {!hideSidebar && (
                <Button
                  type="button"
                  variant="secondary"
                  className="h-9 w-9 px-0 lg:hidden"
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
                    <p className="text-text-soft text-xs">JobSeeker command center</p>
                  </div>
                </div>
              </div>

              {!hideSidebar && (
                <div className="relative ml-auto hidden min-w-[320px] max-w-[520px] flex-1 xl:block">
                  <Input placeholder="Search jobs, notes, companies..." className="bg-surface-elevated/90 pl-4" />
                </div>
              )}

              <div className="ml-auto flex items-center gap-2">
                <div className="border-border bg-surface-elevated/88 hidden rounded-2xl border px-3.5 py-2 md:block">
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
