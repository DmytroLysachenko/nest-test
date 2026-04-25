import { Plus_Jakarta_Sans, Sora } from 'next/font/google';

import { Providers } from '@/app/providers';
import { getServerSession } from '@/shared/lib/auth/server-session';

import type { Metadata } from 'next';

import './globals.css';

const bodyFont = Plus_Jakarta_Sans({
  subsets: ['latin'],
  variable: '--font-body',
});

const headingFont = Sora({
  subsets: ['latin'],
  variable: '--font-heading',
});

export const metadata: Metadata = {
  title: 'JobSeeker',
  description: 'JobSeeker workspace for profile setup, automatic job updates, and application tracking.',
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const initialSession = await getServerSession();

  return (
    <html lang="en">
      <body
        className={`${bodyFont.variable} ${headingFont.variable} bg-background text-foreground min-h-screen antialiased`}
      >
        <Providers initialSession={initialSession}>{children}</Providers>
      </body>
    </html>
  );
}
