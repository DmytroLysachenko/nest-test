'use client';

import Link from 'next/link';

import { useLoginForm } from '@/features/auth/model/hooks/use-login-form';
import { Button } from '@/shared/ui/button';
import { Input } from '@/shared/ui/input';
import { Label } from '@/shared/ui/label';

export const LoginForm = () => {
  const loginForm = useLoginForm();
  const {
    register,
    formState: { errors },
  } = loginForm.form;

  return (
    <form
      className="flex w-full max-w-md flex-col gap-3 rounded-xl border border-slate-200 bg-white p-6 shadow-sm"
      onSubmit={loginForm.submit}
    >
      <h1 className="text-xl font-semibold text-slate-900">Sign in</h1>
      <p className="text-sm text-slate-500">Use your account to access the workflow dashboard.</p>

      <Label htmlFor="login-email" className="text-slate-700">
        Email
      </Label>
      <Input id="login-email" type="email" placeholder="you@example.com" {...register('email')} />
      {errors.email?.message ? <p className="text-sm text-rose-600">{errors.email.message}</p> : null}

      <Label htmlFor="login-password" className="text-slate-700">
        Password
      </Label>
      <Input id="login-password" type="password" placeholder="********" {...register('password')} />
      {errors.password?.message ? <p className="text-sm text-rose-600">{errors.password.message}</p> : null}

      {errors.root?.message ? <p className="text-sm text-rose-600">{errors.root.message}</p> : null}

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
