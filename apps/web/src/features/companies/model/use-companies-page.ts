'use client';

import { useEffect, useMemo, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';

import { listCompanies } from '@/features/companies/api/companies-api';
import { useDebouncedValue } from '@/shared/lib/hooks/use-debounced-value';
import { queryKeys } from '@/shared/lib/query/query-keys';
import { buildPathWithQuery } from '@/shared/lib/utils/url-normalizers';
import { toOptionalTrimmedString } from '@/shared/lib/utils/input-normalizers';

type UseCompaniesPageArgs = {
  token: string;
  initialSearch?: string | null;
  initialLocation?: string | null;
  initialPage?: number;
};

export const COMPANY_PAGE_SIZE = 20;
const DEFAULT_PAGE = 1;

export const useCompaniesPage = ({
  token,
  initialSearch = null,
  initialLocation = null,
  initialPage = DEFAULT_PAGE,
}: UseCompaniesPageArgs) => {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [search, setSearch] = useState(initialSearch ?? '');
  const [location, setLocation] = useState(initialLocation ?? '');
  const [page, setPage] = useState(Math.max(DEFAULT_PAGE, initialPage));
  const debouncedSearch = useDebouncedValue(search, 400);
  const debouncedLocation = useDebouncedValue(location, 400);
  const normalizedSearch = toOptionalTrimmedString(debouncedSearch);
  const normalizedLocation = toOptionalTrimmedString(debouncedLocation);
  const offset = (page - 1) * COMPANY_PAGE_SIZE;

  const params = useMemo(
    () => ({
      search: normalizedSearch,
      location: normalizedLocation,
      limit: COMPANY_PAGE_SIZE,
      offset,
    }),
    [normalizedLocation, normalizedSearch, offset],
  );

  useEffect(() => {
    setPage(DEFAULT_PAGE);
  }, [normalizedSearch, normalizedLocation]);

  useEffect(() => {
    const nextPath = buildPathWithQuery(pathname, {
      search: normalizedSearch,
      location: normalizedLocation,
      page: page > DEFAULT_PAGE ? page : null,
    });
    const currentPath = searchParams?.toString() ? `${pathname}?${searchParams.toString()}` : pathname;

    if (nextPath !== currentPath) {
      router.replace(nextPath, { scroll: false });
    }
  }, [normalizedLocation, normalizedSearch, page, pathname, router, searchParams]);

  const listQuery = useQuery({
    queryKey: queryKeys.companies.list(token, params),
    queryFn: () => listCompanies(token, params),
    enabled: Boolean(token),
  });

  const total = listQuery.data?.total ?? 0;

  return {
    listQuery,
    search,
    location,
    page,
    offset,
    total,
    setSearch,
    setLocation,
    setPage: (nextPage: number) => setPage(Math.max(DEFAULT_PAGE, nextPage)),
    resetFilters: () => {
      setSearch('');
      setLocation('');
      setPage(DEFAULT_PAGE);
    },
    canPrev: page > DEFAULT_PAGE,
    canNext: offset + COMPANY_PAGE_SIZE < total,
  };
};
