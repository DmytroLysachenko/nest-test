import type { ReactNode } from 'react';

type AuthPageShellProps = {
  children: ReactNode;
};

export const AuthPageShell = ({ children }: AuthPageShellProps) => (
  <main className="mx-auto flex min-h-screen w-full max-w-7xl items-center justify-center px-4 py-10">
    <section className="w-full max-w-md space-y-3">
      <header className="text-center">
        <p className="text-text-strong text-2xl font-semibold">JobSeeker</p>
        <p className="text-text-soft text-sm">Commercial-grade workspace for focused job search execution.</p>
      </header>
      {children}
    </section>
  </main>
);
