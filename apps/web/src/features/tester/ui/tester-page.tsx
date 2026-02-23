'use client';

import { CareerProfileSearchViewPanel } from '@/features/career-profiles';
import { useTesterPage } from '@/features/tester/model/hooks/use-tester-page';
import { testerEndpointPresets } from '@/features/tester/model/endpoint-presets';
import { Button } from '@/shared/ui/button';
import { Card } from '@/shared/ui/card';
import { Input } from '@/shared/ui/input';
import { Label } from '@/shared/ui/label';
import { Textarea } from '@/shared/ui/textarea';

type TesterPageProps = {
  token: string;
};

export const TesterPage = ({ token }: TesterPageProps) => {
  const testerPage = useTesterPage(token);

  if (!testerPage.mounted) {
    return <main className="mx-auto flex w-full max-w-6xl flex-col gap-4 px-4 py-6 md:py-8" />;
  }

  const {
    register,
    formState: { errors },
    watch,
  } = testerPage.form;

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-4 px-4 py-6 md:py-8">
      <CareerProfileSearchViewPanel token={token} />

      <Card
        title="E2E Tester"
        description="Internal-only testing panel for API and worker endpoints. Run requests, inspect payloads, and verify persisted state using read endpoints."
      >
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="tester-preset">Endpoint preset</Label>
            <select
              id="tester-preset"
              value={testerPage.selectedPresetId}
              onChange={(event) => testerPage.setSelectedPresetId(event.target.value)}
              className="h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm"
            >
              {testerEndpointPresets.map((preset) => (
                <option key={preset.id} value={preset.id}>
                  {preset.label}
                </option>
              ))}
            </select>
            <Button type="button" variant="secondary" onClick={testerPage.applyPreset}>
              Apply preset
            </Button>
            {testerPage.selectedPreset?.notes ? (
              <p className="text-xs text-slate-500">{testerPage.selectedPreset.notes}</p>
            ) : null}
          </div>

          <div className="space-y-2">
            <p className="text-sm font-medium text-slate-800">Environment targets</p>
            <p className="text-xs text-slate-600">API base: {testerPage.targets.apiBaseUrl}</p>
            <p className="text-xs text-slate-600">Worker base: {testerPage.targets.workerBaseUrl}</p>
            <p className="text-xs text-slate-600">
              User token attached: {watch('useApiToken') === 'yes' ? 'yes' : 'no'}
            </p>
          </div>
        </div>
      </Card>

      <Card title="Request" description="Edit and send request payloads.">
        <form className="space-y-3" onSubmit={testerPage.submit}>
          <div className="grid gap-3 md:grid-cols-3">
            <div className="space-y-1">
              <Label htmlFor="tester-service">Service</Label>
              <select
                id="tester-service"
                className="h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm"
                {...register('service')}
              >
                <option value="api">API</option>
                <option value="worker">Worker</option>
              </select>
            </div>

            <div className="space-y-1">
              <Label htmlFor="tester-method">Method</Label>
              <select
                id="tester-method"
                className="h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm"
                {...register('method')}
              >
                <option value="GET">GET</option>
                <option value="POST">POST</option>
                <option value="PATCH">PATCH</option>
                <option value="DELETE">DELETE</option>
              </select>
            </div>

            <div className="space-y-1">
              <Label htmlFor="tester-api-auth">Attach API bearer token</Label>
              <select
                id="tester-api-auth"
                className="h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm"
                {...register('useApiToken')}
              >
                <option value="yes">yes</option>
                <option value="no">no</option>
              </select>
            </div>
          </div>

          <div className="space-y-1">
            <Label htmlFor="tester-path">Path</Label>
            <Input id="tester-path" placeholder="/job-sources/runs" {...register('path')} />
            {errors.path?.message ? <p className="text-sm text-rose-600">{errors.path.message}</p> : null}
          </div>

          <div className="space-y-1">
            <Label htmlFor="tester-worker-token">Worker token (optional)</Label>
            <Input
              id="tester-worker-token"
              placeholder="Used as Bearer token for worker requests"
              {...register('workerToken')}
            />
          </div>

          <div className="space-y-1">
            <Label htmlFor="tester-extra-headers">Extra headers (JSON object)</Label>
            <Textarea
              id="tester-extra-headers"
              rows={3}
              placeholder='{"x-request-id": "manual-test-1"}'
              {...register('headersText')}
            />
          </div>

          <div className="space-y-1">
            <Label htmlFor="tester-body">Body (JSON)</Label>
            <Textarea id="tester-body" rows={10} placeholder="{}" {...register('bodyText')} />
          </div>

          {testerPage.error ? <p className="text-sm text-rose-600">{testerPage.error}</p> : null}
          {errors.root?.message ? <p className="text-sm text-rose-600">{errors.root.message}</p> : null}
          <Button type="submit" disabled={testerPage.mutation.isPending}>
            {testerPage.mutation.isPending ? 'Sending...' : 'Send request'}
          </Button>
        </form>
      </Card>

      <Card title="Last Result" description="Request and response payloads for the latest run.">
        {testerPage.mutation.data ? (
          <div className="space-y-4">
            <div className="space-y-1">
              <p className="text-sm font-semibold text-slate-900">Request</p>
              <pre className="max-h-80 overflow-auto rounded-md border border-slate-200 bg-slate-50 p-3 text-xs text-slate-800">
                {testerPage.formatJson(testerPage.mutation.data.request)}
              </pre>
            </div>
            <div className="space-y-1">
              <p className="text-sm font-semibold text-slate-900">
                Response: {testerPage.mutation.data.response.status}{' '}
                {testerPage.mutation.data.response.ok ? '(ok)' : '(error)'}
              </p>
              <pre className="max-h-96 overflow-auto rounded-md border border-slate-200 bg-slate-50 p-3 text-xs text-slate-800">
                {testerPage.formatJson(testerPage.mutation.data.response)}
              </pre>
            </div>
          </div>
        ) : (
          <p className="text-sm text-slate-500">No requests sent yet.</p>
        )}
      </Card>
    </main>
  );
};
