'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';

import { useAuth } from '@/features/auth/model/context/auth-context';
import { env } from '@/shared/config/env';
import { Button } from '@/shared/ui/button';
import { Input } from '@/shared/ui/input';

const testerEnabled = process.env.NODE_ENV !== 'production' && env.NEXT_PUBLIC_ENABLE_TESTER;

const navItems = [
  { href: '/', label: 'Dashboard' },
  { href: '/notebook', label: 'Notebook' },
  { href: '/profile', label: 'Profile' },
  { href: '/onboarding', label: 'Onboarding' },
];

const getIsActive = (pathname: string, href: string) => {
  if (href === '/') {
    return pathname === '/';
  }
  return pathname === href || pathname.startsWith(`${href}/`);
};

const getPageLabel = (pathname: string) => {
  const allItems = testerEnabled ? [...navItems, { href: '/tester', label: 'Tester' }] : navItems;
  const current = allItems.find((item) => getIsActive(pathname, item.href));
  return current?.label ?? 'Workspace';
};

export const AppSidebar = () => {
  const pathname = usePathname();
  const items = testerEnabled ? [...navItems, { href: '/tester', label: 'Tester' }] : navItems;

  return (
    <aside className="border-sidebar-border bg-sidebar text-sidebar-foreground hidden min-h-screen w-72 border-r lg:flex lg:flex-col">
      <div className="border-sidebar-border border-b px-6 py-7">
        <p className="text-sidebar-foreground/70 text-sm">Promage</p>
        <p className="text-sidebar-foreground mt-1 text-xl font-semibold">Workflow</p>
      </div>

      <div className="space-y-3 px-4 py-6">
        <Button className="bg-primary text-primary-foreground w-full justify-start" type="button">
          + Create new project
        </Button>
        <nav className="space-y-1">
          {items.map((item) => {
            const active = getIsActive(pathname, item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-2 rounded-xl px-3 py-2 text-sm transition ${
                  active
                    ? 'bg-sidebar-primary text-sidebar-primary-foreground'
                    : 'text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </aside>
  );
};

export const AppHeader = () => {
  const pathname = usePathname();
  const router = useRouter();
  const auth = useAuth();

  const items = testerEnabled ? [...navItems, { href: '/tester', label: 'Tester' }] : navItems;
  const pageLabel = getPageLabel(pathname);

  return (
    <header className="border-border/70 bg-card/80 sticky top-0 z-10 border-b backdrop-blur-sm">
      <div className="flex flex-wrap items-center gap-3 px-4 py-3 md:px-6">
        <div className="text-foreground mr-1 text-2xl font-semibold">{pageLabel}</div>

        <div className="relative ml-auto hidden min-w-[280px] max-w-[420px] flex-1 md:block">
          <Input placeholder="Search for anything..." />
        </div>

        <nav className="flex flex-wrap items-center gap-2 lg:hidden">
          {items.map((item) => {
            const active = getIsActive(pathname, item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`rounded-md px-3 py-2 text-sm ${
                  active
                    ? 'bg-primary text-primary-foreground rounded-full px-3 py-1.5'
                    : 'border-border bg-card text-secondary-foreground rounded-full border px-3 py-1.5'
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="ml-auto flex items-center gap-2">
          <div className="border-border bg-card text-muted-foreground hidden rounded-full border px-3 py-1 text-xs md:flex">
            {auth.user?.email ?? 'anonymous'}
          </div>
          <Button type="button" variant="secondary" className="h-9 px-3" onClick={() => router.back()}>
            Back
          </Button>
          <Button type="button" variant="secondary" className="h-9 px-3" onClick={() => router.forward()}>
            Forward
          </Button>
          <Button
            type="button"
            variant="destructive"
            className="h-9 px-3"
            onClick={() => {
              auth.clearSession();
              router.replace('/login');
            }}
          >
            Sign out
          </Button>
        </div>
      </div>
    </header>
  );
};
