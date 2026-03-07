import type { ReactNode } from 'react';

type AuthPageShellProps = {
  children: ReactNode;
};

export const AuthPageShell = ({ children }: AuthPageShellProps) => (
  <main className="mx-auto flex min-h-screen w-full max-w-7xl items-center justify-center px-4 py-10">
    <section className="grid w-full max-w-6xl gap-8 lg:grid-cols-[minmax(0,1.05fr)_minmax(380px,460px)] lg:items-center">
      <div className="app-hero hidden min-h-[540px] lg:flex lg:flex-col lg:justify-between">
        <div className="relative z-10 max-w-xl space-y-5">
          <span className="app-badge border-primary/20 bg-primary/10 text-primary rounded-full px-3 py-1">
            Career Search OS
          </span>
          <div className="space-y-3">
            <h1 className="app-title text-4xl md:text-5xl">A sharper operating system for modern job search.</h1>
            <p className="app-subtitle text-base">
              Build a stronger profile, automate sourcing, and review opportunities in a workspace designed for focused
              execution instead of spreadsheet drift.
            </p>
          </div>
        </div>

        <div className="relative z-10 grid gap-3 md:grid-cols-3">
          <div className="app-muted-panel">
            <p className="text-text-soft text-xs uppercase tracking-[0.14em]">Profile</p>
            <p className="text-text-strong mt-2 font-semibold">Structured inputs</p>
          </div>
          <div className="app-muted-panel">
            <p className="text-text-soft text-xs uppercase tracking-[0.14em]">Sourcing</p>
            <p className="text-text-strong mt-2 font-semibold">Reliable scrape runs</p>
          </div>
          <div className="app-muted-panel">
            <p className="text-text-soft text-xs uppercase tracking-[0.14em]">Notebook</p>
            <p className="text-text-strong mt-2 font-semibold">Fast offer triage</p>
          </div>
        </div>
      </div>

      <section className="w-full max-w-md space-y-4 justify-self-center">
        <header className="space-y-2 text-center lg:text-left">
          <p className="text-text-strong text-2xl font-semibold">JobSeeker</p>
          <p className="text-text-soft text-sm">Commercial-grade workspace for focused job search execution.</p>
        </header>
        {children}
      </section>
    </section>
  </main>
);
