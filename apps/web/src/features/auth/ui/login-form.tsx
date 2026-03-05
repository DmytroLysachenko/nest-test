'use client';

import Link from 'next/link';

import { useLoginForm } from '@/features/auth/model/hooks/use-login-form';
import { GOOGLE_OAUTH_NONCE_KEY, buildGoogleOauthUrl } from '@/features/auth/model/utils/google-oauth';
import { Button } from '@/shared/ui/button';
import { Input } from '@/shared/ui/input';
import { Label } from '@/shared/ui/label';

export const LoginForm = () => {
  const loginForm = useLoginForm();
  const {
    register,
    formState: { errors },
  } = loginForm.form;

  const startGoogleOauth = () => {
    const nonce = crypto.randomUUID();
    window.sessionStorage.setItem(GOOGLE_OAUTH_NONCE_KEY, nonce);
    const redirectUri = `${window.location.origin}/auth/callback/google`;
    window.location.href = buildGoogleOauthUrl(nonce, redirectUri);
  };

  return (
    <form
      className="border-border/80 bg-card/95 flex w-full flex-col gap-3 rounded-2xl border p-7 shadow-sm backdrop-blur-sm"
      onSubmit={loginForm.submit}
    >
      <h1 className="text-foreground text-2xl font-semibold">Sign in</h1>
      <p className="text-muted-foreground text-sm">Use your account to access the JobSeeker dashboard.</p>

      <Label htmlFor="login-email" className="text-foreground/90">
        Email
      </Label>
      <Input id="login-email" type="email" placeholder="you@example.com" {...register('email')} />
      {errors.email?.message ? <p className="text-app-danger text-sm">{errors.email.message}</p> : null}

      <Label htmlFor="login-password" className="text-foreground/90">
        Password
      </Label>
      <Input id="login-password" type="password" placeholder="********" {...register('password')} />
      {errors.password?.message ? <p className="text-app-danger text-sm">{errors.password.message}</p> : null}

      {errors.root?.message ? <p className="text-app-danger text-sm">{errors.root.message}</p> : null}

      <Button type="submit" disabled={loginForm.isSubmitting}>
        {loginForm.isSubmitting ? 'Signing in...' : 'Sign in'}
      </Button>
      <Button type="button" variant="outline" onClick={startGoogleOauth} disabled={loginForm.isSubmitting}>
        Continue with Google
      </Button>

      <p className="text-muted-foreground text-sm">
        No account yet?{' '}
        <Link className="text-foreground font-semibold underline" href="/register">
          Register
        </Link>
      </p>
    </form>
  );
};
