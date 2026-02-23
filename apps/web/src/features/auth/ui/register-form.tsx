'use client';

import Link from 'next/link';

import { useRegisterForm } from '@/features/auth/model/hooks/use-register-form';
import { Button } from '@/shared/ui/button';
import { Input } from '@/shared/ui/input';
import { Label } from '@/shared/ui/label';

export const RegisterForm = () => {
  const registerForm = useRegisterForm();
  const {
    register,
    formState: { errors },
  } = registerForm.form;

  return (
    <form
      className="flex w-full max-w-md flex-col gap-3 rounded-xl border border-slate-200 bg-white p-6 shadow-sm"
      onSubmit={registerForm.submit}
    >
      <h1 className="text-xl font-semibold text-slate-900">Create account</h1>
      <p className="text-sm text-slate-500">Request a verification code first, then complete registration.</p>

      <Label htmlFor="register-email" className="text-slate-700">
        Email
      </Label>
      <Input id="register-email" type="email" placeholder="you@example.com" {...register('email')} />
      {errors.email?.message ? <p className="text-sm text-rose-600">{errors.email.message}</p> : null}

      <Button
        type="button"
        variant="secondary"
        onClick={registerForm.requestCode}
        disabled={registerForm.isSendingCode}
      >
        {registerForm.isSendingCode ? 'Sending code...' : 'Send verification code'}
      </Button>

      <Label htmlFor="register-code" className="text-slate-700">
        Verification code
      </Label>
      <Input
        id="register-code"
        placeholder="6 digits"
        inputMode="numeric"
        autoComplete="one-time-code"
        maxLength={6}
        {...register('code')}
      />
      {errors.code?.message ? <p className="text-sm text-rose-600">{errors.code.message}</p> : null}

      <Label htmlFor="register-password" className="text-slate-700">
        Password
      </Label>
      <Input id="register-password" type="password" {...register('password')} />
      {errors.password?.message ? <p className="text-sm text-rose-600">{errors.password.message}</p> : null}

      <Label htmlFor="register-confirm-password" className="text-slate-700">
        Confirm password
      </Label>
      <Input id="register-confirm-password" type="password" {...register('confirmPassword')} />
      {errors.confirmPassword?.message ? (
        <p className="text-sm text-rose-600">{errors.confirmPassword.message}</p>
      ) : null}

      {registerForm.status ? <p className="text-sm text-emerald-700">{registerForm.status}</p> : null}
      {errors.root?.message ? <p className="text-sm text-rose-600">{errors.root.message}</p> : null}

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
