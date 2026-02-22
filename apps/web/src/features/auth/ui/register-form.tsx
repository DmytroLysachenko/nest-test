'use client';

import Link from 'next/link';
import { Label } from '@repo/ui/components/label';

import { useRegisterForm } from '@/features/auth/model/use-register-form';
import { Button } from '@/shared/ui/button';
import { Input } from '@/shared/ui/input';

export const RegisterForm = () => {
  const registerForm = useRegisterForm();

  return (
    <form
      className="flex w-full max-w-md flex-col gap-3 rounded-xl border border-slate-200 bg-white p-6 shadow-sm"
      onSubmit={(event) => {
        event.preventDefault();
        registerForm.submit();
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
          value={registerForm.email}
          onChange={(event) => registerForm.setEmail(event.target.value)}
          placeholder="you@example.com"
          required
        />
      </Label>

      <Button
        type="button"
        variant="secondary"
        onClick={registerForm.requestCode}
        disabled={registerForm.isSendingCode || !registerForm.canRequestCode}
      >
        {registerForm.isSendingCode ? 'Sending code...' : 'Send verification code'}
      </Button>

      <Label htmlFor="register-code" className="text-slate-700">
        Verification code
        <Input
          id="register-code"
          className="mt-1"
          value={registerForm.code}
          onChange={(event) => registerForm.setCode(event.target.value)}
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
          value={registerForm.password}
          onChange={(event) => registerForm.setPassword(event.target.value)}
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
          value={registerForm.confirmPassword}
          onChange={(event) => registerForm.setConfirmPassword(event.target.value)}
          minLength={8}
          required
        />
      </Label>

      {registerForm.status ? <p className="text-sm text-emerald-700">{registerForm.status}</p> : null}
      {registerForm.error ? <p className="text-sm text-rose-600">{registerForm.error}</p> : null}

      <Button type="submit" disabled={registerForm.isSubmitting}>
        {registerForm.isSubmitting ? 'Creating account...' : 'Create account'}
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
