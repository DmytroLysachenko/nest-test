'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';

import { loginWithGoogle } from '@/features/auth/api/auth-api';
import { useAuth } from '@/features/auth/model/context/auth-context';
import {
  GOOGLE_OAUTH_CODE_VERIFIER_KEY,
  GOOGLE_OAUTH_NONCE_KEY,
  GOOGLE_OAUTH_STATE_KEY,
} from '@/features/auth/model/utils/google-oauth';
import { WorkflowFeedback } from '@/shared/ui/workflow-feedback';

export default function GoogleAuthCallbackPage() {
  const router = useRouter();
  const auth = useAuth();
  const [error, setError] = useState<string | null>(null);

  const nonce = useMemo(() => window.sessionStorage.getItem(GOOGLE_OAUTH_NONCE_KEY) ?? undefined, []);
  const expectedState = useMemo(() => window.sessionStorage.getItem(GOOGLE_OAUTH_STATE_KEY) ?? undefined, []);
  const codeVerifier = useMemo(() => window.sessionStorage.getItem(GOOGLE_OAUTH_CODE_VERIFIER_KEY) ?? undefined, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const callbackError = params.get('error');
    if (callbackError) {
      setError(`Google login failed: ${callbackError}.`);
      return;
    }

    const code = params.get('code');
    const state = params.get('state');
    if (!code) {
      setError('Google authorization code not found in callback URL.');
      return;
    }
    if (!state || !expectedState || state !== expectedState) {
      setError('Google login state validation failed.');
      return;
    }

    loginWithGoogle({
      code,
      codeVerifier,
      redirectUri: `${window.location.origin}/auth/callback/google`,
      nonce,
    })
      .then((payload) => {
        auth.setSession(payload.accessToken, payload.refreshToken, payload.user);
        window.sessionStorage.removeItem(GOOGLE_OAUTH_NONCE_KEY);
        window.sessionStorage.removeItem(GOOGLE_OAUTH_STATE_KEY);
        window.sessionStorage.removeItem(GOOGLE_OAUTH_CODE_VERIFIER_KEY);
        router.replace('/');
      })
      .catch((cause) => {
        const message = cause instanceof Error ? cause.message : 'Google login failed.';
        setError(message);
      });
  }, [auth, codeVerifier, expectedState, nonce, router]);

  return (
    <main className="app-page flex min-h-[40vh] items-center justify-center">
      <div className="border-border/80 bg-card/95 w-full max-w-md rounded-2xl border p-6 shadow-sm backdrop-blur-sm">
        <h1 className="text-foreground text-lg font-semibold">Google Sign In</h1>
        {error ? (
          <WorkflowFeedback
            title="Google sign-in did not complete"
            description={`${error} Return to login and retry the Google flow once the session state is clean.`}
            tone="danger"
            actionLabel="Back to login"
            onAction={() => router.replace('/login')}
            className="mt-4 p-4 sm:p-5"
          />
        ) : (
          <p className="text-muted-foreground mt-3 text-sm">Completing authentication...</p>
        )}
      </div>
    </main>
  );
}
