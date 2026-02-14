'use client';

import { useMemo, useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Label } from '@repo/ui/components/label';

import { runTesterRequest } from '@/features/tester/api/tester-api';
import { testerEndpointPresets } from '@/features/tester/model/endpoint-presets';
import { env } from '@/shared/config/env';
import { ApiError } from '@/shared/lib/http/api-error';
import { Button } from '@/shared/ui/button';
import { Card } from '@/shared/ui/card';
import { Input } from '@/shared/ui/input';
import { Textarea } from '@/shared/ui/textarea';

type TesterPageProps = {
  token: string;
};

const formatJson = (value: unknown) => JSON.stringify(value, null, 2);
const defaultPreset = testerEndpointPresets[0];

export const TesterPage = ({ token }: TesterPageProps) => {
  if (!defaultPreset) {
    throw new Error('No tester endpoint presets configured.');
  }

  const [selectedPresetId, setSelectedPresetId] = useState(defaultPreset.id);

  const selectedPreset = useMemo(
    () => testerEndpointPresets.find((preset) => preset.id === selectedPresetId) ?? defaultPreset,
    [selectedPresetId],
  );

  const [service, setService] = useState(selectedPreset.service);
  const [method, setMethod] = useState(selectedPreset.method);
  const [path, setPath] = useState(selectedPreset.path);
  const [useApiToken, setUseApiToken] = useState(Boolean(selectedPreset.requiresAuth));
  const [workerToken, setWorkerToken] = useState('');
  const [headersText, setHeadersText] = useState('');
  const [bodyText, setBodyText] = useState(selectedPreset.defaultBody ? formatJson(selectedPreset.defaultBody) : '');
  const [error, setError] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: async () =>
      runTesterRequest({
        service,
        method,
        path,
        token: useApiToken ? token : null,
        workerToken: workerToken.trim() || null,
        extraHeadersText: headersText,
        bodyText,
        apiBaseUrl: env.NEXT_PUBLIC_API_URL,
        workerBaseUrl: env.NEXT_PUBLIC_WORKER_URL,
      }),
    onError: (err: unknown) => {
      if (err instanceof ApiError) {
        setError(err.message);
        return;
      }

      if (err instanceof Error) {
        setError(err.message);
        return;
      }

      setError('Request failed.');
    },
    onSuccess: () => {
      setError(null);
    },
  });

  const applyPreset = () => {
    if (!selectedPreset) {
      return;
    }

    setService(selectedPreset.service);
    setMethod(selectedPreset.method);
    setPath(selectedPreset.path);
    setUseApiToken(Boolean(selectedPreset.requiresAuth));
    setBodyText(selectedPreset.defaultBody ? formatJson(selectedPreset.defaultBody) : '');
    setHeadersText('');
    setError(null);
  };

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-4 px-4 py-6 md:py-8">
      <Card
        title="E2E Tester"
        description="Internal-only testing panel for API and worker endpoints. Run requests, inspect payloads, and verify persisted state using read endpoints."
      >
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="tester-preset">Endpoint preset</Label>
            <select
              id="tester-preset"
              value={selectedPresetId}
              onChange={(event) => setSelectedPresetId(event.target.value)}
              className="h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm"
            >
              {testerEndpointPresets.map((preset) => (
                <option key={preset.id} value={preset.id}>
                  {preset.label}
                </option>
              ))}
            </select>
            <Button type="button" variant="secondary" onClick={applyPreset}>
              Apply preset
            </Button>
            {selectedPreset?.notes ? <p className="text-xs text-slate-500">{selectedPreset.notes}</p> : null}
          </div>

          <div className="space-y-2">
            <p className="text-sm font-medium text-slate-800">Environment targets</p>
            <p className="text-xs text-slate-600">API base: {env.NEXT_PUBLIC_API_URL}</p>
            <p className="text-xs text-slate-600">Worker base: {env.NEXT_PUBLIC_WORKER_URL}</p>
            <p className="text-xs text-slate-600">User token attached: {useApiToken ? 'yes' : 'no'}</p>
          </div>
        </div>
      </Card>

      <Card title="Request" description="Edit and send request payloads.">
        <form
          className="space-y-3"
          onSubmit={(event) => {
            event.preventDefault();
            mutation.mutate();
          }}
        >
          <div className="grid gap-3 md:grid-cols-3">
            <div className="space-y-1">
              <Label htmlFor="tester-service">Service</Label>
              <select
                id="tester-service"
                value={service}
                onChange={(event) => setService(event.target.value as 'api' | 'worker')}
                className="h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm"
              >
                <option value="api">API</option>
                <option value="worker">Worker</option>
              </select>
            </div>

            <div className="space-y-1">
              <Label htmlFor="tester-method">Method</Label>
              <select
                id="tester-method"
                value={method}
                onChange={(event) => setMethod(event.target.value as 'GET' | 'POST' | 'PATCH' | 'DELETE')}
                className="h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm"
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
                value={useApiToken ? 'yes' : 'no'}
                onChange={(event) => setUseApiToken(event.target.value === 'yes')}
                className="h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm"
              >
                <option value="yes">yes</option>
                <option value="no">no</option>
              </select>
            </div>
          </div>

          <div className="space-y-1">
            <Label htmlFor="tester-path">Path</Label>
            <Input
              id="tester-path"
              value={path}
              onChange={(event) => setPath(event.target.value)}
              placeholder="/job-sources/runs"
            />
          </div>

          <div className="space-y-1">
            <Label htmlFor="tester-worker-token">Worker token (optional)</Label>
            <Input
              id="tester-worker-token"
              value={workerToken}
              onChange={(event) => setWorkerToken(event.target.value)}
              placeholder="Used as Bearer token for worker requests"
            />
          </div>

          <div className="space-y-1">
            <Label htmlFor="tester-extra-headers">Extra headers (JSON object)</Label>
            <Textarea
              id="tester-extra-headers"
              value={headersText}
              onChange={(event) => setHeadersText(event.target.value)}
              placeholder='{"x-request-id": "manual-test-1"}'
              rows={3}
            />
          </div>

          <div className="space-y-1">
            <Label htmlFor="tester-body">Body (JSON)</Label>
            <Textarea
              id="tester-body"
              value={bodyText}
              onChange={(event) => setBodyText(event.target.value)}
              placeholder="{}"
              rows={10}
            />
          </div>

          {error ? <p className="text-sm text-rose-600">{error}</p> : null}
          <Button type="submit" disabled={mutation.isPending}>
            {mutation.isPending ? 'Sending...' : 'Send request'}
          </Button>
        </form>
      </Card>

      <Card title="Last Result" description="Request and response payloads for the latest run.">
        {mutation.data ? (
          <div className="space-y-4">
            <div className="space-y-1">
              <p className="text-sm font-semibold text-slate-900">Request</p>
              <pre className="max-h-80 overflow-auto rounded-md border border-slate-200 bg-slate-50 p-3 text-xs text-slate-800">
                {formatJson(mutation.data.request)}
              </pre>
            </div>
            <div className="space-y-1">
              <p className="text-sm font-semibold text-slate-900">
                Response: {mutation.data.response.status} {mutation.data.response.ok ? '(ok)' : '(error)'}
              </p>
              <pre className="max-h-96 overflow-auto rounded-md border border-slate-200 bg-slate-50 p-3 text-xs text-slate-800">
                {formatJson(mutation.data.response)}
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
