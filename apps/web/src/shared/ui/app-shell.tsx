'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';

import { env } from '@/shared/config/env';
import { Button } from '@/shared/ui/button';
import { Input } from '@/shared/ui/input';

type AppShellProps = {
  children: React.ReactNode;
  userEmail: string | null | undefined;
  onSignOut: () => void;
};

type AppNavItem = {
  href: string;
  label: string;
  shortLabel: string;
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
    <div className="border-sidebar-border border-b px-5 py-5">
      <p className="text-sidebar-foreground text-xl font-semibold tracking-tight">JobSeeker</p>
      <p className="text-sidebar-foreground/65 mt-1 text-xs">Career intelligence workspace</p>
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
              className={`inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-[10px] font-semibold ${
                active ? 'bg-primary/15 text-primary-foreground/95' : 'bg-sidebar-accent text-sidebar-foreground/70'
              }`}
            >
              {item.shortLabel}
            </span>
            <span>{item.label}</span>
          </Link>
        );
      })}
    </nav>
  </>
);

export const AppShell = ({ children, userEmail, onSignOut }: AppShellProps) => {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);

  const navItems = useMemo(
    () => (testerEnabled ? [...baseNavItems, { href: '/tester', label: 'Tester', shortLabel: 'TS' }] : baseNavItems),
    [],
  );

  const activePage = navItems.find((item) => getIsActive(pathname, item.href))?.label ?? 'Workspace';

  return (
    <div className="app-shell">
      <aside className="border-sidebar-border bg-sidebar text-sidebar-foreground hidden min-h-screen w-72 border-r lg:block">
        <AppShellSidebar pathname={pathname} items={navItems} />
      </aside>

      {mobileOpen ? (
        <button
          type="button"
          className="fixed inset-0 z-30 bg-black/35 lg:hidden"
          aria-label="Close navigation"
          onClick={() => setMobileOpen(false)}
        />
      ) : null}

      <aside
        className={`border-sidebar-border bg-sidebar text-sidebar-foreground fixed inset-y-0 left-0 z-40 w-72 border-r transition-transform lg:hidden ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <AppShellSidebar pathname={pathname} items={navItems} onNavigate={() => setMobileOpen(false)} />
      </aside>

      <div className="app-shell-content">
        <header className="border-border/70 bg-surface/85 sticky top-0 z-20 border-b backdrop-blur-sm">
          <div className="flex flex-wrap items-center gap-3 px-4 py-3 md:px-6">
            <Button
              type="button"
              variant="secondary"
              className="h-9 w-9 px-0 lg:hidden"
              aria-label="Open navigation"
              onClick={() => setMobileOpen(true)}
            >
              <span className="text-sm">=</span>
            </Button>

            <div>
              <p className="text-text-strong text-lg font-semibold leading-tight">{activePage}</p>
              <p className="text-text-soft text-xs">JobSeeker command center</p>
            </div>

            <div className="relative ml-auto hidden min-w-[280px] max-w-[460px] flex-1 xl:block">
              <Input placeholder="Search jobs, notes, companies..." />
            </div>

            <div className="ml-auto flex items-center gap-2">
              <div className="border-border bg-surface-elevated text-text-soft hidden rounded-full border px-3 py-1 text-xs md:block">
                {userEmail ?? 'anonymous'}
              </div>
              <Button type="button" variant="outline" className="h-9 px-3" onClick={() => router.push('/notebook')}>
                Open Notebook
              </Button>
              <Button type="button" variant="secondary" className="h-9 px-3" onClick={() => router.back()}>
                Back
              </Button>
              <Button type="button" variant="destructive" className="h-9 px-3" onClick={onSignOut}>
                Sign out
              </Button>
            </div>
          </div>
        </header>
        {children}
      </div>
    </div>
  );
};
