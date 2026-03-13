// eslint-disable-next-line import-x/no-unresolved
import { Pool } from 'pg';

import { parseCliArguments } from './cli-args';
import { getSupportQueryDefinition, type SupportQueryContext } from './query-catalog';
import { loadSupportConfig } from './support-config';

async function main() {
  const argumentsMap = parseCliArguments(process.argv.slice(2));
  const queryId = argumentsMap['query-id'];

  if (!queryId) {
    throw new Error('Missing required argument: --query-id');
  }

  const queryContext: SupportQueryContext = {
    runId: argumentsMap['run-id'],
    requestId: argumentsMap['request-id'],
    traceId: argumentsMap['trace-id'],
    userId: argumentsMap['user-id'],
  };

  const definition = getSupportQueryDefinition(queryId);
  for (const requiredArgument of definition.requiredArguments) {
    if (!queryContext[requiredArgument]) {
      throw new Error(
        `Missing required argument for ${queryId}: --${requiredArgument.replace(/[A-Z]/g, (match) => `-${match.toLowerCase()}`)}`,
      );
    }
  }

  const config = loadSupportConfig();
  const pool = new Pool({ connectionString: config.databaseUrl });

  try {
    const query = definition.sql(queryContext);
    const result = await pool.query(query.text, query.values);
    process.stdout.write(
      `${JSON.stringify(
        {
          queryId,
          rowCount: result.rowCount,
          rows: result.rows,
        },
        null,
        2,
      )}\n`,
    );
  } finally {
    await pool.end();
  }
}

void main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : 'Unknown support query failure';
  process.stderr.write(`${message}\n`);
  process.exitCode = 1;
});
