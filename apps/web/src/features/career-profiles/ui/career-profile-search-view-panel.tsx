'use client';

import { useCareerProfileSearchViewPanel } from '@/features/career-profiles/model/hooks/use-career-profile-search-view-panel';
import { Button } from '@/shared/ui/button';
import { Card } from '@/shared/ui/card';
import { Input } from '@/shared/ui/input';
import { Label } from '@/shared/ui/label';
import { WorkflowFeedback, WorkflowInlineNotice } from '@/shared/ui/workflow-feedback';

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
      title="Career profile search view"
      description="Validate denormalized profile fields and search indexes without dropping into raw database inspection."
    >
      <form className="space-y-3" onSubmit={searchViewPanel.submit}>
        <WorkflowInlineNotice
          title="Use this to verify profile indexing, not as a primary workflow"
          description="Filter by role, seniority, keywords, or technologies to confirm the generated search view matches what matching and sourcing depend on."
          tone="info"
        />
        <div className="grid gap-3 md:grid-cols-4">
          <div className="app-field-group">
            <Label htmlFor="cp-status" className="app-inline-label">
              Status
            </Label>
            <select id="cp-status" className="app-select" {...register('status')}>
              <option value="READY">READY</option>
              <option value="PENDING">PENDING</option>
              <option value="FAILED">FAILED</option>
            </select>
          </div>
          <div className="app-field-group">
            <Label htmlFor="cp-active" className="app-inline-label">
              Is active
            </Label>
            <select id="cp-active" className="app-select" {...register('isActive')}>
              <option value="true">true</option>
              <option value="false">false</option>
            </select>
          </div>
          <div className="app-field-group">
            <Label htmlFor="cp-seniority" className="app-inline-label">
              Seniority
            </Label>
            <Input id="cp-seniority" placeholder="mid" {...register('seniority')} />
          </div>
          <div className="app-field-group">
            <Label htmlFor="cp-role" className="app-inline-label">
              Role
            </Label>
            <Input id="cp-role" placeholder="frontend" {...register('role')} />
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-4">
          <div className="app-field-group">
            <Label htmlFor="cp-keyword" className="app-inline-label">
              Keyword
            </Label>
            <Input id="cp-keyword" placeholder="react" {...register('keyword')} />
          </div>
          <div className="app-field-group">
            <Label htmlFor="cp-technology" className="app-inline-label">
              Technology
            </Label>
            <Input id="cp-technology" placeholder="typescript" {...register('technology')} />
          </div>
          <div className="app-field-group">
            <Label htmlFor="cp-limit" className="app-inline-label">
              Limit
            </Label>
            <Input id="cp-limit" type="number" min={1} max={100} {...register('limit')} />
            {errors.limit?.message ? (
              <WorkflowInlineNotice title="Limit needs correction" description={errors.limit.message} tone="danger" />
            ) : null}
          </div>
          <div className="app-field-group">
            <Label htmlFor="cp-offset" className="app-inline-label">
              Offset
            </Label>
            <Input id="cp-offset" type="number" min={0} {...register('offset')} />
            {errors.offset?.message ? (
              <WorkflowInlineNotice title="Offset needs correction" description={errors.offset.message} tone="danger" />
            ) : null}
          </div>
        </div>

        {errors.root?.message ? (
          <WorkflowFeedback
            title="Unable to load the search view"
            description={errors.root.message}
            tone="danger"
            className="p-4 sm:p-5"
          />
        ) : null}
        <div className="app-toolbar flex items-center gap-2">
          <Button type="submit" disabled={searchViewPanel.isSubmitting}>
            {searchViewPanel.isSubmitting ? 'Loading...' : 'Load search view'}
          </Button>
          <span className="text-text-soft text-xs">Total: {searchViewPanel.total}</span>
        </div>
      </form>

      {searchViewPanel.rows.length > 0 ? (
        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full border-collapse text-xs">
            <thead>
              <tr className="border-border text-text-soft border-b text-left">
                <th className="px-2 py-2">Profile</th>
                <th className="px-2 py-2">Status</th>
                <th className="px-2 py-2">Seniority</th>
                <th className="px-2 py-2">Roles</th>
                <th className="px-2 py-2">Keywords</th>
                <th className="px-2 py-2">Technologies</th>
              </tr>
            </thead>
            <tbody>
              {searchViewPanel.rows.map((item) => (
                <tr key={item.id} className="border-border text-text-soft border-b align-top">
                  <td className="px-2 py-2">
                    <div>{item.id}</div>
                    <div className="text-text-soft text-[11px]">v{item.version}</div>
                  </td>
                  <td className="px-2 py-2">
                    {item.status} / {item.isActive ? 'active' : 'inactive'}
                  </td>
                  <td className="px-2 py-2">{item.primarySeniority ?? '-'}</td>
                  <td className="px-2 py-2">{item.targetRoles.slice(0, 5).join(', ') || '-'}</td>
                  <td className="px-2 py-2">{item.searchableKeywords.slice(0, 8).join(', ') || '-'}</td>
                  <td className="px-2 py-2">{item.searchableTechnologies.slice(0, 8).join(', ') || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : searchViewPanel.hasRequested ? (
        <WorkflowFeedback
          title="No indexed rows matched this filter set"
          description="Try broadening the role or keyword filters first. If you expected a result, confirm the latest profile generation completed and the denormalized fields were refreshed."
          tone="warning"
          className="mt-4"
        />
      ) : (
        <WorkflowFeedback
          title="Search results will appear here"
          description="Run a query when you need to verify how profile data was flattened into searchable fields for downstream workflows."
          tone="info"
          className="mt-4"
        />
      )}
    </Card>
  );
};
