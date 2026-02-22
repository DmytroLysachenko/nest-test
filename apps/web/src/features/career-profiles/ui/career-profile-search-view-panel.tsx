'use client';

import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Label } from '@repo/ui/components/label';

import { getCareerProfilesSearchView } from '@/features/career-profiles/api/career-profiles-api';
import { ApiError } from '@/shared/lib/http/api-error';
import { Button } from '@/shared/ui/button';
import { Card } from '@/shared/ui/card';
import { Input } from '@/shared/ui/input';

import type { CareerProfileSearchViewItemDto } from '@/shared/types/api';

type CareerProfileSearchViewPanelProps = {
  token: string;
};

const defaultFilters = {
  status: 'READY' as 'PENDING' | 'READY' | 'FAILED',
  isActive: true,
  seniority: '',
  role: '',
  keyword: '',
  technology: '',
  limit: 10,
  offset: 0,
};

export const CareerProfileSearchViewPanel = ({ token }: CareerProfileSearchViewPanelProps) => {
  const [filters, setFilters] = useState(defaultFilters);
  const [error, setError] = useState<string | null>(null);
  const [rows, setRows] = useState<CareerProfileSearchViewItemDto[]>([]);
  const [total, setTotal] = useState<number>(0);

  const mutation = useMutation({
    mutationFn: async () =>
      getCareerProfilesSearchView(token, {
        status: filters.status,
        isActive: filters.isActive,
        seniority: filters.seniority || undefined,
        role: filters.role || undefined,
        keyword: filters.keyword || undefined,
        technology: filters.technology || undefined,
        limit: filters.limit,
        offset: filters.offset,
      }),
    onSuccess: (data) => {
      setRows(data.items);
      setTotal(data.total);
      setError(null);
    },
    onError: (err) => {
      if (err instanceof ApiError) {
        setError(err.message);
        return;
      }
      if (err instanceof Error) {
        setError(err.message);
        return;
      }
      setError('Failed to load search-view data.');
    },
  });

  return (
    <Card
      title="Career Profiles Search View"
      description="Query denormalized profile fields (seniority, target roles, keywords, technologies) for quick validation."
    >
      <form
        className="space-y-3"
        onSubmit={(event) => {
          event.preventDefault();
          mutation.mutate();
        }}
      >
        <div className="grid gap-3 md:grid-cols-4">
          <div className="space-y-1">
            <Label htmlFor="cp-status">Status</Label>
            <select
              id="cp-status"
              value={filters.status}
              onChange={(event) =>
                setFilters((prev) => ({ ...prev, status: event.target.value as 'PENDING' | 'READY' | 'FAILED' }))
              }
              className="h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm"
            >
              <option value="READY">READY</option>
              <option value="PENDING">PENDING</option>
              <option value="FAILED">FAILED</option>
            </select>
          </div>
          <div className="space-y-1">
            <Label htmlFor="cp-active">Is active</Label>
            <select
              id="cp-active"
              value={filters.isActive ? 'true' : 'false'}
              onChange={(event) => setFilters((prev) => ({ ...prev, isActive: event.target.value === 'true' }))}
              className="h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm"
            >
              <option value="true">true</option>
              <option value="false">false</option>
            </select>
          </div>
          <div className="space-y-1">
            <Label htmlFor="cp-seniority">Seniority</Label>
            <Input
              id="cp-seniority"
              value={filters.seniority}
              onChange={(event) => setFilters((prev) => ({ ...prev, seniority: event.target.value }))}
              placeholder="mid"
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="cp-role">Role</Label>
            <Input
              id="cp-role"
              value={filters.role}
              onChange={(event) => setFilters((prev) => ({ ...prev, role: event.target.value }))}
              placeholder="frontend"
            />
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-4">
          <div className="space-y-1">
            <Label htmlFor="cp-keyword">Keyword</Label>
            <Input
              id="cp-keyword"
              value={filters.keyword}
              onChange={(event) => setFilters((prev) => ({ ...prev, keyword: event.target.value }))}
              placeholder="react"
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="cp-technology">Technology</Label>
            <Input
              id="cp-technology"
              value={filters.technology}
              onChange={(event) => setFilters((prev) => ({ ...prev, technology: event.target.value }))}
              placeholder="typescript"
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="cp-limit">Limit</Label>
            <Input
              id="cp-limit"
              type="number"
              min={1}
              max={100}
              value={filters.limit}
              onChange={(event) =>
                setFilters((prev) => ({ ...prev, limit: Math.max(1, Math.min(100, Number(event.target.value) || 10)) }))
              }
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="cp-offset">Offset</Label>
            <Input
              id="cp-offset"
              type="number"
              min={0}
              value={filters.offset}
              onChange={(event) =>
                setFilters((prev) => ({ ...prev, offset: Math.max(0, Number(event.target.value) || 0) }))
              }
            />
          </div>
        </div>

        {error ? <p className="text-sm text-rose-600">{error}</p> : null}
        <div className="flex items-center gap-2">
          <Button type="submit" disabled={mutation.isPending}>
            {mutation.isPending ? 'Loading...' : 'Load search view'}
          </Button>
          <span className="text-xs text-slate-500">Total: {total}</span>
        </div>
      </form>

      <div className="mt-4 overflow-x-auto">
        <table className="min-w-full border-collapse text-xs">
          <thead>
            <tr className="border-b border-slate-200 text-left text-slate-700">
              <th className="px-2 py-2">Profile</th>
              <th className="px-2 py-2">Status</th>
              <th className="px-2 py-2">Seniority</th>
              <th className="px-2 py-2">Roles</th>
              <th className="px-2 py-2">Keywords</th>
              <th className="px-2 py-2">Technologies</th>
            </tr>
          </thead>
          <tbody>
            {rows.length > 0 ? (
              rows.map((item) => (
                <tr key={item.id} className="border-b border-slate-100 align-top text-slate-700">
                  <td className="px-2 py-2">
                    <div>{item.id}</div>
                    <div className="text-[11px] text-slate-500">v{item.version}</div>
                  </td>
                  <td className="px-2 py-2">
                    {item.status} / {item.isActive ? 'active' : 'inactive'}
                  </td>
                  <td className="px-2 py-2">{item.primarySeniority ?? '-'}</td>
                  <td className="px-2 py-2">{item.targetRoles.slice(0, 5).join(', ') || '-'}</td>
                  <td className="px-2 py-2">{item.searchableKeywords.slice(0, 8).join(', ') || '-'}</td>
                  <td className="px-2 py-2">{item.searchableTechnologies.slice(0, 8).join(', ') || '-'}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td className="px-2 py-3 text-slate-500" colSpan={6}>
                  No rows loaded yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </Card>
  );
};
