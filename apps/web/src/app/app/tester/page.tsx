import { notFound } from 'next/navigation';

import { TesterGate } from '@/features/tester';
import { env } from '@/shared/config/env';

const testerEnabled = process.env.NODE_ENV !== 'production' && env.NEXT_PUBLIC_ENABLE_TESTER;

export default function AppTesterRoute() {
  if (!testerEnabled) {
    notFound();
  }

  return <TesterGate />;
}
