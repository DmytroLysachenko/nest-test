import { Plus_Jakarta_Sans, Sora } from 'next/font/google';
import { cookies } from 'next/headers';

import { Providers } from '@/app/providers';

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
  description: 'JobSeeker workspace for profile management, automated sourcing, and offer triage.',
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const cookieStore = await cookies();
  const initialSession = {
    token: cookieStore.get('career_assistant_access_token')?.value ?? null,
    user: null,
  };

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
