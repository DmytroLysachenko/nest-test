import type { ReactNode } from 'react';

type AuthPageShellProps = {
  children: ReactNode;
};

export const AuthPageShell = ({ children }: AuthPageShellProps) => (
  <main className="mx-auto flex min-h-screen w-full max-w-5xl items-center justify-center px-4 py-10">
    <section className="grid w-full max-w-4xl gap-8 lg:grid-cols-[minmax(0,0.9fr)_minmax(380px,460px)] lg:items-center">
      <div className="hidden lg:block">
        <div className="space-y-4">
          <span className="app-badge">JobSeeker</span>
          <h1 className="app-title text-4xl">Focused job search, one place.</h1>
          <p className="app-subtitle text-base">
            Sign in to manage your profile, review opportunities, and keep applications moving.
          </p>
        </div>
      </div>

      <section className="w-full max-w-md space-y-4 justify-self-center">
        <header className="space-y-2 text-center lg:text-left">
          <p className="text-text-strong text-2xl font-semibold">JobSeeker</p>
          <p className="text-text-soft text-sm">Sign in to continue.</p>
        </header>
        {children}
      </section>
    </section>
  </main>
);
