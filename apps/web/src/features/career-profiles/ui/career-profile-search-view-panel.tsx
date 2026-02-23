'use client';

import { useCareerProfileSearchViewPanel } from '@/features/career-profiles/model/hooks/use-career-profile-search-view-panel';
import { Button } from '@/shared/ui/button';
import { Card } from '@/shared/ui/card';
import { Input } from '@/shared/ui/input';
import { Label } from '@/shared/ui/label';

type CareerProfileSearchViewPanelProps = {
  token: string;
};

export const CareerProfileSearchViewPanel = ({ token }: CareerProfileSearchViewPanelProps) => {
  const searchViewPanel = useCareerProfileSearchViewPanel(token);
  const {
    register,
    formState: { errors },
  } = searchViewPanel.form;

  return (
    <Card
      title="Career Profiles Search View"
      description="Query denormalized profile fields (seniority, target roles, keywords, technologies) for quick validation."
    >
      <form className="space-y-3" onSubmit={searchViewPanel.submit}>
        <div className="grid gap-3 md:grid-cols-4">
          <div className="space-y-1">
            <Label htmlFor="cp-status">Status</Label>
            <select
              id="cp-status"
              className="h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm"
              {...register('status')}
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
              className="h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm"
              {...register('isActive')}
            >
              <option value="true">true</option>
              <option value="false">false</option>
            </select>
          </div>
          <div className="space-y-1">
            <Label htmlFor="cp-seniority">Seniority</Label>
            <Input id="cp-seniority" placeholder="mid" {...register('seniority')} />
          </div>
          <div className="space-y-1">
            <Label htmlFor="cp-role">Role</Label>
            <Input id="cp-role" placeholder="frontend" {...register('role')} />
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-4">
          <div className="space-y-1">
            <Label htmlFor="cp-keyword">Keyword</Label>
            <Input id="cp-keyword" placeholder="react" {...register('keyword')} />
          </div>
          <div className="space-y-1">
            <Label htmlFor="cp-technology">Technology</Label>
            <Input id="cp-technology" placeholder="typescript" {...register('technology')} />
          </div>
          <div className="space-y-1">
            <Label htmlFor="cp-limit">Limit</Label>
            <Input id="cp-limit" type="number" min={1} max={100} {...register('limit')} />
            {errors.limit?.message ? <p className="text-xs text-rose-600">{errors.limit.message}</p> : null}
          </div>
          <div className="space-y-1">
            <Label htmlFor="cp-offset">Offset</Label>
            <Input id="cp-offset" type="number" min={0} {...register('offset')} />
            {errors.offset?.message ? <p className="text-xs text-rose-600">{errors.offset.message}</p> : null}
          </div>
        </div>

        {errors.root?.message ? <p className="text-sm text-rose-600">{errors.root.message}</p> : null}
        <div className="flex items-center gap-2">
          <Button type="submit" disabled={searchViewPanel.isSubmitting}>
            {searchViewPanel.isSubmitting ? 'Loading...' : 'Load search view'}
          </Button>
          <span className="text-xs text-slate-500">Total: {searchViewPanel.total}</span>
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
            {searchViewPanel.rows.length > 0 ? (
              searchViewPanel.rows.map((item) => (
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
