'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useMutation } from '@tanstack/react-query';
import { Label } from '@repo/ui/components/label';
import { useState } from 'react';

import { register, sendRegisterCode } from '@/features/auth/api/auth-api';
import { ApiError } from '@/shared/lib/http/api-error';
import { Button } from '@/shared/ui/button';
import { Input } from '@/shared/ui/input';

export const RegisterForm = () => {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [code, setCode] = useState('');
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const sendCodeMutation = useMutation({
    mutationFn: sendRegisterCode,
    onSuccess: () => {
      setStatus('Verification code sent to your email.');
      setError(null);
    },
    onError: (err: unknown) => {
      const message = err instanceof ApiError ? err.message : 'Failed to send verification code';
      setStatus(null);
      setError(message);
    },
  });

  const registerMutation = useMutation({
    mutationFn: register,
    onSuccess: () => {
      router.push('/login');
    },
    onError: (err: unknown) => {
      const message = err instanceof ApiError ? err.message : 'Registration failed';
      setStatus(null);
      setError(message);
    },
  });

  return (
    <form
      className="flex w-full max-w-md flex-col gap-3 rounded-xl border border-slate-200 bg-white p-6 shadow-sm"
      onSubmit={(event) => {
        event.preventDefault();
        setError(null);
        setStatus(null);
        registerMutation.mutate({ email, password, confirmPassword, code });
      }}
    >
      <h1 className="text-xl font-semibold text-slate-900">Create account</h1>
      <p className="text-sm text-slate-500">Request a verification code first, then complete registration.</p>

      <Label htmlFor="register-email" className="text-slate-700">
        Email
        <Input
          id="register-email"
          className="mt-1"
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="you@example.com"
          required
        />
      </Label>

      <Button
        type="button"
        variant="secondary"
        onClick={() => sendCodeMutation.mutate(email)}
        disabled={sendCodeMutation.isPending || !email}
      >
        {sendCodeMutation.isPending ? 'Sending code...' : 'Send verification code'}
      </Button>

      <Label htmlFor="register-code" className="text-slate-700">
        Verification code
        <Input
          id="register-code"
          className="mt-1"
          value={code}
          onChange={(event) => setCode(event.target.value)}
          placeholder="6 digits"
          minLength={6}
          maxLength={6}
          required
        />
      </Label>

      <Label htmlFor="register-password" className="text-slate-700">
        Password
        <Input
          id="register-password"
          className="mt-1"
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          minLength={8}
          required
        />
      </Label>

      <Label htmlFor="register-confirm-password" className="text-slate-700">
        Confirm password
        <Input
          id="register-confirm-password"
          className="mt-1"
          type="password"
          value={confirmPassword}
          onChange={(event) => setConfirmPassword(event.target.value)}
          minLength={8}
          required
        />
      </Label>

      {status ? <p className="text-sm text-emerald-700">{status}</p> : null}
      {error ? <p className="text-sm text-rose-600">{error}</p> : null}

      <Button type="submit" disabled={registerMutation.isPending}>
        {registerMutation.isPending ? 'Creating account...' : 'Create account'}
      </Button>

      <p className="text-sm text-slate-500">
        Already registered?{' '}
        <Link className="font-semibold text-slate-900 underline" href="/login">
          Sign in
        </Link>
      </p>
    </form>
  );
};
