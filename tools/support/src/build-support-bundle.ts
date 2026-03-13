import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// eslint-disable-next-line import-x/no-unresolved
import { Pool } from 'pg';

import { parseCliArguments } from './cli-args';
import { getSupportQueryDefinition } from './query-catalog';
import { loadSupportConfig } from './support-config';

type BundleRecipe = 'scrape-incident' | 'user-incident' | 'correlation';

async function fetchJson(baseUrl: string, bearerToken: string, pathName: string) {
  const response = await fetch(`${baseUrl}${pathName}`, {
    headers: {
      Authorization: `Bearer ${bearerToken}`,
    },
  });

  const text = await response.text();
  if (!response.ok) {
    throw new Error(`Support API request failed for ${pathName}: ${response.status} ${text}`);
  }

  return text ? (JSON.parse(text) as Record<string, unknown>) : {};
}

async function executeQuery(pool: Pool, queryId: string, values: Record<string, string | undefined>) {
  const definition = getSupportQueryDefinition(queryId);
  const query = definition.sql({
    runId: values['runId'],
    requestId: values['requestId'],
    traceId: values['traceId'],
    userId: values['userId'],
  });
  const result = await pool.query(query.text, query.values);
  return {
    queryId,
    rowCount: result.rowCount,
    rows: result.rows,
  };
}

function ensureOutputDirectory() {
  const supportDirectory = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
  const repoRoot = path.resolve(supportDirectory, '..', '..');
  const outputDirectory = path.resolve(repoRoot, '.support-local', 'output');
  fs.mkdirSync(outputDirectory, { recursive: true });
  return outputDirectory;
}

async function buildScrapeIncidentBundle(pool: Pool, apiBaseUrl: string, apiBearerToken: string, runId: string) {
  const apiBundle = await fetchJson(apiBaseUrl, apiBearerToken, `/ops/support/scrape-runs/${runId}`);
  const run = apiBundle['run'] as Record<string, unknown>;
  const traceId = typeof run?.['traceId'] === 'string' ? (run['traceId'] as string) : undefined;
  const callbackEvents = Array.isArray(apiBundle['callbackEvents'])
    ? (apiBundle['callbackEvents'] as Array<Record<string, unknown>>)
    : [];
  const firstRequestId = callbackEvents.find((item) => typeof item['requestId'] === 'string')?.['requestId'] as
    | string
    | undefined;

  return {
    recipe: 'scrape-incident',
    generatedAt: new Date().toISOString(),
    api: apiBundle,
    database: {
      run: await executeQuery(pool, 'run-by-id', { runId }),
      runEvents: await executeQuery(pool, 'run-events-by-run-id', { runId }),
      callbackEvents: await executeQuery(pool, 'callback-events-by-run-id', { runId }),
      apiRequestEventsByRequestId: firstRequestId
        ? await executeQuery(pool, 'api-request-events-by-request-id', { requestId: firstRequestId })
        : null,
      apiRequestEventsByTraceId: traceId
        ? await executeQuery(pool, 'api-request-events-by-trace-id', { traceId })
        : null,
    },
  };
}

async function buildUserIncidentBundle(pool: Pool, apiBaseUrl: string, apiBearerToken: string, userId: string) {
  const apiBundle = await fetchJson(apiBaseUrl, apiBearerToken, `/ops/support/users/${userId}`);

  return {
    recipe: 'user-incident',
    generatedAt: new Date().toISOString(),
    api: apiBundle,
    database: {
      schedule: await executeQuery(pool, 'user-schedule-by-user-id', { userId }),
      apiRequestEvents: await executeQuery(pool, 'api-request-events-by-user-id', { userId }),
    },
  };
}

async function buildCorrelationBundle(
  pool: Pool,
  apiBaseUrl: string,
  apiBearerToken: string,
  values: Record<string, string | undefined>,
) {
  const query = new URLSearchParams();
  if (values['requestId']) query.set('requestId', values['requestId']);
  if (values['traceId']) query.set('traceId', values['traceId']);
  if (values['runId']) query.set('sourceRunId', values['runId']);
  if (values['userId']) query.set('userId', values['userId']);
  const apiBundle = await fetchJson(apiBaseUrl, apiBearerToken, `/ops/support/correlate?${query.toString()}`);

  return {
    recipe: 'correlation',
    generatedAt: new Date().toISOString(),
    api: apiBundle,
    database: {
      apiRequestEventsByRequestId: values['requestId']
        ? await executeQuery(pool, 'api-request-events-by-request-id', { requestId: values['requestId'] })
        : null,
      apiRequestEventsByTraceId: values['traceId']
        ? await executeQuery(pool, 'api-request-events-by-trace-id', { traceId: values['traceId'] })
        : null,
      runById: values['runId'] ? await executeQuery(pool, 'run-by-id', { runId: values['runId'] }) : null,
      runEventsByRunId: values['runId']
        ? await executeQuery(pool, 'run-events-by-run-id', { runId: values['runId'] })
        : null,
      userSchedule: values['userId']
        ? await executeQuery(pool, 'user-schedule-by-user-id', { userId: values['userId'] })
        : null,
    },
  };
}

async function main() {
  const argumentsMap = parseCliArguments(process.argv.slice(2));
  const recipe = argumentsMap['recipe'] as BundleRecipe | undefined;
  if (!recipe) {
    throw new Error('Missing required argument: --recipe');
  }

  const config = loadSupportConfig();
  const pool = new Pool({ connectionString: config.databaseUrl });

  try {
    let bundle: Record<string, unknown>;
    if (recipe === 'scrape-incident') {
      if (!argumentsMap['run-id']) {
        throw new Error('Missing required argument: --run-id');
      }
      bundle = await buildScrapeIncidentBundle(pool, config.apiBaseUrl, config.apiBearerToken, argumentsMap['run-id']);
    } else if (recipe === 'user-incident') {
      if (!argumentsMap['user-id']) {
        throw new Error('Missing required argument: --user-id');
      }
      bundle = await buildUserIncidentBundle(pool, config.apiBaseUrl, config.apiBearerToken, argumentsMap['user-id']);
    } else if (recipe === 'correlation') {
      if (
        !argumentsMap['request-id'] &&
        !argumentsMap['trace-id'] &&
        !argumentsMap['run-id'] &&
        !argumentsMap['user-id']
      ) {
        throw new Error('Correlation recipe needs one of --request-id, --trace-id, --run-id, or --user-id');
      }
      bundle = await buildCorrelationBundle(pool, config.apiBaseUrl, config.apiBearerToken, {
        requestId: argumentsMap['request-id'],
        traceId: argumentsMap['trace-id'],
        runId: argumentsMap['run-id'],
        userId: argumentsMap['user-id'],
      });
    } else {
      throw new Error(`Unsupported recipe: ${recipe}`);
    }

    const outputDirectory = ensureOutputDirectory();
    const identity =
      argumentsMap['run-id'] ??
      argumentsMap['user-id'] ??
      argumentsMap['trace-id'] ??
      argumentsMap['request-id'] ??
      'support';
    const outputPath = path.resolve(outputDirectory, `${recipe}-${identity}.json`);
    fs.writeFileSync(outputPath, JSON.stringify(bundle, null, 2));
    process.stdout.write(`${outputPath}\n`);
  } finally {
    await pool.end();
  }
}

void main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : 'Unknown support bundle failure';
  process.stderr.write(`${message}\n`);
  process.exitCode = 1;
});
