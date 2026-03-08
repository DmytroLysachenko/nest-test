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
      className="border-border/80 bg-surface/95 flex w-full flex-col gap-4 rounded-[1.75rem] border p-7 shadow-[0_12px_40px_-24px_color-mix(in_oklab,var(--text-strong)_14%,transparent)] backdrop-blur-md"
      onSubmit={registerForm.submit}
    >
      <h1 className="text-foreground text-2xl font-semibold">Create account</h1>
      <p className="text-muted-foreground text-sm">Request a verification code first, then complete registration.</p>

      <div className="app-field-group">
        <Label htmlFor="register-email" className="app-inline-label">
          Email
        </Label>
        <Input id="register-email" type="email" placeholder="you@example.com" {...register('email')} />
        {errors.email?.message ? <p className="text-app-danger text-sm">{errors.email.message}</p> : null}
      </div>

      <Button
        type="button"
        variant="secondary"
        onClick={registerForm.requestCode}
        disabled={registerForm.isSendingCode}
      >
        {registerForm.isSendingCode ? 'Sending code...' : 'Send verification code'}
      </Button>

      <div className="app-field-group">
        <Label htmlFor="register-code" className="app-inline-label">
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
        {errors.code?.message ? <p className="text-app-danger text-sm">{errors.code.message}</p> : null}
      </div>

      <div className="app-field-group">
        <Label htmlFor="register-password" className="app-inline-label">
          Password
        </Label>
        <Input id="register-password" type="password" {...register('password')} />
        {errors.password?.message ? <p className="text-app-danger text-sm">{errors.password.message}</p> : null}
      </div>

      <div className="app-field-group">
        <Label htmlFor="register-confirm-password" className="app-inline-label">
          Confirm password
        </Label>
        <Input id="register-confirm-password" type="password" {...register('confirmPassword')} />
        {errors.confirmPassword?.message ? (
          <p className="text-app-danger text-sm">{errors.confirmPassword.message}</p>
        ) : null}
      </div>

      {registerForm.status ? <p className="text-app-success text-sm">{registerForm.status}</p> : null}
      {errors.root?.message ? <p className="text-app-danger text-sm">{errors.root.message}</p> : null}

      <Button type="submit" disabled={registerForm.isSubmitting}>
        {registerForm.isSubmitting ? 'Creating account...' : 'Create account'}
      </Button>

      <p className="text-muted-foreground text-sm">
        Already registered?{' '}
        <Link className="text-foreground font-semibold underline" href="/login">
          Sign in
        </Link>
      </p>
    </form>
  );
};
