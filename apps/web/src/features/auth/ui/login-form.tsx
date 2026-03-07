'use client';

import Link from 'next/link';
import { useState } from 'react';

import { useLoginForm } from '@/features/auth/model/hooks/use-login-form';
import { buildGoogleOauthUrl } from '@/features/auth/model/utils/google-oauth';
import { Button } from '@/shared/ui/button';
import { Input } from '@/shared/ui/input';
import { Label } from '@/shared/ui/label';

export const LoginForm = () => {
  const loginForm = useLoginForm();
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const {
    register,
    formState: { errors },
  } = loginForm.form;

  const startGoogleOauth = async () => {
    setIsGoogleLoading(true);
    try {
      const redirectUri = `${window.location.origin}/auth/callback/google`;
      window.location.href = await buildGoogleOauthUrl(redirectUri);
    } catch {
      setIsGoogleLoading(false);
    }
  };

  return (
    <form
      className="border-border/80 bg-card/95 flex w-full flex-col gap-4 rounded-[1.75rem] border p-7 shadow-[0_24px_60px_-36px_color-mix(in_oklab,var(--text-strong)_18%,transparent)] backdrop-blur-md"
      onSubmit={loginForm.submit}
    >
      <h1 className="text-foreground text-2xl font-semibold">Sign in</h1>
      <p className="text-muted-foreground text-sm">Use your account to access the JobSeeker dashboard.</p>

      <div className="app-field-group">
        <Label htmlFor="login-email" className="app-inline-label">
          Email
        </Label>
        <Input id="login-email" type="email" placeholder="you@example.com" {...register('email')} />
        {errors.email?.message ? <p className="text-app-danger text-sm">{errors.email.message}</p> : null}
      </div>

      <div className="app-field-group">
        <Label htmlFor="login-password" className="app-inline-label">
          Password
        </Label>
        <Input id="login-password" type="password" placeholder="********" {...register('password')} />
        {errors.password?.message ? <p className="text-app-danger text-sm">{errors.password.message}</p> : null}
      </div>

      {errors.root?.message ? <p className="text-app-danger text-sm">{errors.root.message}</p> : null}

      <Button type="submit" disabled={loginForm.isSubmitting}>
        {loginForm.isSubmitting ? 'Signing in...' : 'Sign in'}
      </Button>
      <Button
        type="button"
        variant="outline"
        onClick={startGoogleOauth}
        disabled={loginForm.isSubmitting || isGoogleLoading}
      >
        {isGoogleLoading ? 'Redirecting...' : 'Continue with Google'}
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
