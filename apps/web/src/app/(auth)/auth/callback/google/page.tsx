'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';

import { loginWithGoogle } from '@/features/auth/api/auth-api';
import { useAuth } from '@/features/auth/model/context/auth-context';
import { GOOGLE_OAUTH_NONCE_KEY } from '@/features/auth/model/utils/google-oauth';

const extractHashParams = (hash: string) => {
  const raw = hash.startsWith('#') ? hash.slice(1) : hash;
  return new URLSearchParams(raw);
};

export default function GoogleAuthCallbackPage() {
  const router = useRouter();
  const auth = useAuth();
  const [error, setError] = useState<string | null>(null);

  const nonce = useMemo(() => window.sessionStorage.getItem(GOOGLE_OAUTH_NONCE_KEY) ?? undefined, []);

  useEffect(() => {
    const params = extractHashParams(window.location.hash);
    const idToken = params.get('id_token');
    if (!idToken) {
      setError('Google login token not found in callback URL.');
      return;
    }

    loginWithGoogle({
      idToken,
      nonce,
    })
      .then((payload) => {
        auth.setSession(payload.accessToken, payload.refreshToken, payload.user);
        window.sessionStorage.removeItem(GOOGLE_OAUTH_NONCE_KEY);
        router.replace('/');
      })
      .catch((cause) => {
        const message = cause instanceof Error ? cause.message : 'Google login failed.';
        setError(message);
      });
  }, [auth, nonce, router]);

  return (
    <main className="app-page flex min-h-[40vh] items-center justify-center">
      <div className="border-border/80 bg-card/95 w-full max-w-md rounded-2xl border p-6 shadow-sm backdrop-blur-sm">
        <h1 className="text-foreground text-lg font-semibold">Google Sign In</h1>
        {error ? (
          <p className="text-app-danger mt-3 text-sm">
            {error} Go back to{' '}
            <a className="underline" href="/login">
              login
            </a>{' '}
            and try again.
          </p>
        ) : (
          <p className="text-muted-foreground mt-3 text-sm">Completing authentication...</p>
        )}
      </div>
    </main>
  );
}
