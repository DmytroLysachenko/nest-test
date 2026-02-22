'use client';

import Link from 'next/link';
import { Label } from '@repo/ui/components/label';
import { useEffect, useState } from 'react';

import { useLoginForm } from '@/features/auth/model/use-login-form';
import { Button } from '@/shared/ui/button';
import { Input } from '@/shared/ui/input';

export const LoginForm = () => {
  const loginForm = useLoginForm();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-6 shadow-sm" />;
  }

  return (
    <form
      className="flex w-full max-w-md flex-col gap-3 rounded-xl border border-slate-200 bg-white p-6 shadow-sm"
      onSubmit={(event) => {
        event.preventDefault();
        loginForm.submit();
      }}
    >
      <h1 className="text-xl font-semibold text-slate-900">Sign in</h1>
      <p className="text-sm text-slate-500">Use your account to access the workflow dashboard.</p>

      <Label htmlFor="login-email" className="text-slate-700">
        Email
        <Input
          id="login-email"
          className="mt-1"
          type="email"
          value={loginForm.email}
          onChange={(event) => loginForm.setEmail(event.target.value)}
          placeholder="you@example.com"
          required
        />
      </Label>

      <Label htmlFor="login-password" className="text-slate-700">
        Password
        <Input
          id="login-password"
          className="mt-1"
          type="password"
          value={loginForm.password}
          onChange={(event) => loginForm.setPassword(event.target.value)}
          placeholder="********"
          required
        />
      </Label>

      {loginForm.error ? <p className="text-sm text-rose-600">{loginForm.error}</p> : null}

      <Button type="submit" disabled={loginForm.isSubmitting}>
        {loginForm.isSubmitting ? 'Signing in...' : 'Sign in'}
      </Button>

      <p className="text-sm text-slate-500">
        No account yet?{' '}
        <Link className="font-semibold text-slate-900 underline" href="/register">
          Register
        </Link>
      </p>
    </form>
  );
};
