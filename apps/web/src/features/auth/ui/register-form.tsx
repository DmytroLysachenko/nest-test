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
      className="border-border/80 bg-card/95 flex w-full flex-col gap-3 rounded-2xl border p-7 shadow-sm backdrop-blur-sm"
      onSubmit={registerForm.submit}
    >
      <h1 className="text-foreground text-2xl font-semibold">Create account</h1>
      <p className="text-muted-foreground text-sm">Request a verification code first, then complete registration.</p>

      <Label htmlFor="register-email" className="text-foreground/90">
        Email
      </Label>
      <Input id="register-email" type="email" placeholder="you@example.com" {...register('email')} />
      {errors.email?.message ? <p className="text-app-danger text-sm">{errors.email.message}</p> : null}

      <Button
        type="button"
        variant="secondary"
        onClick={registerForm.requestCode}
        disabled={registerForm.isSendingCode}
      >
        {registerForm.isSendingCode ? 'Sending code...' : 'Send verification code'}
      </Button>

      <Label htmlFor="register-code" className="text-foreground/90">
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

      <Label htmlFor="register-password" className="text-foreground/90">
        Password
      </Label>
      <Input id="register-password" type="password" {...register('password')} />
      {errors.password?.message ? <p className="text-app-danger text-sm">{errors.password.message}</p> : null}

      <Label htmlFor="register-confirm-password" className="text-foreground/90">
        Confirm password
      </Label>
      <Input id="register-confirm-password" type="password" {...register('confirmPassword')} />
      {errors.confirmPassword?.message ? (
        <p className="text-app-danger text-sm">{errors.confirmPassword.message}</p>
      ) : null}

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
