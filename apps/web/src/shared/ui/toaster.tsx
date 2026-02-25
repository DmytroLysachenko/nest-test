'use client';

import { Toaster } from 'sonner';

export const AppToaster = () => (
  <Toaster
    richColors
    position="top-right"
    toastOptions={{
      duration: 3500,
    }}
  />
);
