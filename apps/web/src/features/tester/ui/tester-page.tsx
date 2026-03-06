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
    return <main className="app-page flex max-w-6xl flex-col gap-4" />;
  }

  const {
    register,
    formState: { errors },
    watch,
  } = testerPage.form;

  return (
    <main className="app-page flex max-w-6xl flex-col gap-4">
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
              className="app-select"
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
              <p className="text-muted-foreground text-xs">{testerPage.selectedPreset.notes}</p>
            ) : null}
          </div>

          <div className="space-y-2">
            <p className="text-foreground text-sm font-medium">Environment targets</p>
            <p className="text-muted-foreground text-xs">API base: {testerPage.targets.apiBaseUrl}</p>
            <p className="text-muted-foreground text-xs">Worker base: {testerPage.targets.workerBaseUrl}</p>
            <p className="text-muted-foreground text-xs">
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
              <select id="tester-service" className="app-select" {...register('service')}>
                <option value="api">API</option>
                <option value="worker">Worker</option>
              </select>
            </div>

            <div className="space-y-1">
              <Label htmlFor="tester-method">Method</Label>
              <select id="tester-method" className="app-select" {...register('method')}>
                <option value="GET">GET</option>
                <option value="POST">POST</option>
                <option value="PUT">PUT</option>
                <option value="PATCH">PATCH</option>
                <option value="DELETE">DELETE</option>
              </select>
            </div>

            <div className="space-y-1">
              <Label htmlFor="tester-api-auth">Attach API bearer token</Label>
              <select id="tester-api-auth" className="app-select" {...register('useApiToken')}>
                <option value="yes">yes</option>
                <option value="no">no</option>
              </select>
            </div>
          </div>

          <div className="space-y-1">
            <Label htmlFor="tester-path">Path</Label>
            <Input id="tester-path" placeholder="/job-sources/runs" {...register('path')} />
            {errors.path?.message ? <p className="text-app-danger text-sm">{errors.path.message}</p> : null}
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

          {testerPage.error ? <p className="text-app-danger text-sm">{testerPage.error}</p> : null}
          {errors.root?.message ? <p className="text-app-danger text-sm">{errors.root.message}</p> : null}
          <Button type="submit" disabled={testerPage.mutation.isPending}>
            {testerPage.mutation.isPending ? 'Sending...' : 'Send request'}
          </Button>
        </form>
      </Card>

      <Card title="Last Result" description="Request and response payloads for the latest run.">
        {testerPage.mutation.data ? (
          <div className="space-y-4">
            <div className="space-y-1">
              <p className="text-foreground text-sm font-semibold">Request</p>
              <pre className="app-code max-h-80">{testerPage.formatJson(testerPage.mutation.data.request)}</pre>
            </div>
            <div className="space-y-1">
              <p className="text-foreground text-sm font-semibold">
                Response: {testerPage.mutation.data.response.status}{' '}
                {testerPage.mutation.data.response.ok ? '(ok)' : '(error)'}
              </p>
              <pre className="app-code">{testerPage.formatJson(testerPage.mutation.data.response)}</pre>
            </div>
          </div>
        ) : (
          <p className="text-muted-foreground text-sm">No requests sent yet.</p>
        )}
      </Card>
    </main>
  );
};
