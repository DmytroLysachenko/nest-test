'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useMutation } from '@tanstack/react-query';
import { Label } from '@repo/ui/components/label';
import { useEffect, useState } from 'react';

import { login } from '@/features/auth/api/auth-api';
import { useAuth } from '@/features/auth/model/auth-context';
import { ApiError } from '@/shared/lib/http/api-error';
import { Button } from '@/shared/ui/button';
import { Input } from '@/shared/ui/input';

export const LoginForm = () => {
  const router = useRouter();
  const auth = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const mutation = useMutation({
    mutationFn: login,
    onSuccess: (response) => {
      auth.setSession(response.accessToken, response.refreshToken, response.user);
      router.push('/app');
    },
    onError: (err: unknown) => {
      if (err instanceof ApiError) {
        setError(err.message);
        return;
      }
      setError('Login failed');
    },
  });

  if (!mounted) {
    return <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-6 shadow-sm" />;
  }

  return (
    <form
      className="flex w-full max-w-md flex-col gap-3 rounded-xl border border-slate-200 bg-white p-6 shadow-sm"
      onSubmit={(event) => {
        event.preventDefault();
        setError(null);
        mutation.mutate({ email, password });
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
          value={email}
          onChange={(event) => setEmail(event.target.value)}
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
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          placeholder="********"
          required
        />
      </Label>

      {error ? <p className="text-sm text-rose-600">{error}</p> : null}

      <Button type="submit" disabled={mutation.isPending}>
        {mutation.isPending ? 'Signing in...' : 'Sign in'}
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
