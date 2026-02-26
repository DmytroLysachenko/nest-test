import { zodResolver } from '@hookform/resolvers/zod';
import type { FieldValues, Resolver } from 'react-hook-form';

/**
 * Centralized resolver bridge for RHF + Zod typing compatibility.
 * Keeps schema usage consistent across feature hooks.
 */
export const zodFormResolver = <TFieldValues extends FieldValues>(schema: unknown): Resolver<TFieldValues> =>
  zodResolver(schema as never) as Resolver<TFieldValues>;
