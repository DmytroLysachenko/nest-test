import type { QueryKey, UseQueryOptions } from '@tanstack/react-query';

type Token = string | null | undefined;

type BuildAuthedQueryOptionsInput<TQueryFnData, TData = TQueryFnData> = {
  token: Token;
  queryKey: QueryKey;
  queryFn: (token: string) => Promise<TQueryFnData>;
  enabled?: boolean;
  refetchInterval?: UseQueryOptions<TQueryFnData, Error, TData>['refetchInterval'];
  select?: (data: TQueryFnData) => TData;
};

export const buildAuthedQueryOptions = <TQueryFnData, TData = TQueryFnData>({
  token,
  queryKey,
  queryFn,
  enabled = true,
  refetchInterval,
  select,
}: BuildAuthedQueryOptionsInput<TQueryFnData, TData>): UseQueryOptions<TQueryFnData, Error, TData> => ({
  queryKey,
  queryFn: () => queryFn(token as string),
  enabled: Boolean(token) && enabled,
  ...(refetchInterval !== undefined ? { refetchInterval } : {}),
  ...(select ? { select } : {}),
});
