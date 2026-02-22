import type { ReactNode } from 'react';

type AuthPageShellProps = {
  children: ReactNode;
};

export const AuthPageShell = ({ children }: AuthPageShellProps) => (
  <main className="mx-auto flex min-h-screen w-full max-w-6xl items-center justify-center px-4 py-10">{children}</main>
);
