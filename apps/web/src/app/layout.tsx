import { Plus_Jakarta_Sans, Sora } from 'next/font/google';

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
  title: 'Career Search Assistant',
  description: 'User-facing app for profile input, documents, profile generation, and job scoring.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${bodyFont.variable} ${headingFont.variable} bg-background text-foreground min-h-screen antialiased`}
      >
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
