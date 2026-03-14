import type { QueryKey, UseQueryOptions } from '@tanstack/react-query';

type Token = string | null | undefined;

type BuildAuthedQueryOptionsInput<TQueryFnData, TData = TQueryFnData> = {
  token: Token;
  queryKey: QueryKey;
  queryFn: (token: string) => Promise<TQueryFnData>;
  enabled?: boolean;
  refetchInterval?: UseQueryOptions<TQueryFnData, Error, TData>['refetchInterval'];
  refetchOnWindowFocus?: UseQueryOptions<TQueryFnData, Error, TData>['refetchOnWindowFocus'];
  refetchOnReconnect?: UseQueryOptions<TQueryFnData, Error, TData>['refetchOnReconnect'];
  select?: (data: TQueryFnData) => TData;
  staleTime?: number;
  gcTime?: number;
};

/**
 * Standardizes authenticated TanStack Query options.
 *
 * Ensures consistency for token handling, conditional enabling, and caching policies.
 */
export const buildAuthedQueryOptions = <TQueryFnData, TData = TQueryFnData>({
  token,
  queryKey,
  queryFn,
  enabled = true,
  refetchInterval,
  refetchOnWindowFocus,
  refetchOnReconnect,
  select,
  staleTime,
  gcTime,
}: BuildAuthedQueryOptionsInput<TQueryFnData, TData>): UseQueryOptions<TQueryFnData, Error, TData> => ({
  queryKey,
  queryFn: () => queryFn(token as string),
  enabled: Boolean(token) && enabled,
  ...(refetchInterval !== undefined ? { refetchInterval } : {}),
  ...(refetchOnWindowFocus !== undefined ? { refetchOnWindowFocus } : {}),
  ...(refetchOnReconnect !== undefined ? { refetchOnReconnect } : {}),
  ...(select ? { select } : {}),
  ...(staleTime !== undefined ? { staleTime } : {}),
  ...(gcTime !== undefined ? { gcTime } : {}),
});
