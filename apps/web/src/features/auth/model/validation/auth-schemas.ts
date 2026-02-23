import { z } from 'zod';

export const loginSchema = z.object({
  email: z.string().trim().email('Provide a valid email address'),
  password: z.string().min(1, 'Password is required'),
});

export type LoginFormValues = z.infer<typeof loginSchema>;

export const registerSchema = z
  .object({
    email: z.string().trim().email('Provide a valid email address'),
    code: z
      .string()
      .trim()
      .regex(/^\d{6}$/, 'Verification code must contain 6 digits'),
    password: z.string().min(8, 'Password must contain at least 8 characters'),
    confirmPassword: z.string().min(8, 'Confirm password must contain at least 8 characters'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords must match',
    path: ['confirmPassword'],
  });

export type RegisterFormValues = z.infer<typeof registerSchema>;
