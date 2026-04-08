export type SupportQueryContext = {
  runId?: string;
  requestId?: string;
  traceId?: string;
  userId?: string;
};

export type SupportQueryDefinition = {
  id: string;
  requiredArguments: Array<keyof SupportQueryContext>;
  sql: (context: SupportQueryContext) => { text: string; values: string[] };
};

const forbiddenSqlPattern = /\b(insert|update|delete|alter|drop|truncate|grant|revoke|create)\b/i;

function assertReadOnlySql(sqlText: string) {
  const normalizedSql = sqlText.trim();
  if (!/^(select|with)\b/i.test(normalizedSql)) {
    throw new Error('Support query catalog only allows SELECT/WITH statements');
  }
  if (forbiddenSqlPattern.test(normalizedSql)) {
    throw new Error('Support query catalog contains a forbidden non-read-only statement');
  }
}

function defineQuery(definition: SupportQueryDefinition): SupportQueryDefinition {
  const sampleArguments: SupportQueryContext = {
    runId: 'sample-run-id',
    requestId: 'sample-request-id',
    traceId: '00000000-0000-4000-8000-000000000000',
    userId: 'sample-user-id',
  };
  assertReadOnlySql(definition.sql(sampleArguments).text);
  return definition;
}

export const supportQueryCatalog: SupportQueryDefinition[] = [
  defineQuery({
    id: 'run-by-id',
    requiredArguments: ['runId'],
    sql: (context) => ({
      text: `
        select *
        from job_source_runs
        where id = $1
      `,
      values: [context.runId!],
    }),
  }),
  defineQuery({
    id: 'run-events-by-run-id',
    requiredArguments: ['runId'],
    sql: (context) => ({
      text: `
        select *
        from job_source_run_events
        where source_run_id = $1
        order by created_at desc
        limit 200
      `,
      values: [context.runId!],
    }),
  }),
  defineQuery({
    id: 'callback-events-by-run-id',
    requiredArguments: ['runId'],
    sql: (context) => ({
      text: `
        select *
        from job_source_callback_events
        where source_run_id = $1
        order by received_at desc
        limit 100
      `,
      values: [context.runId!],
    }),
  }),
  defineQuery({
    id: 'api-request-events-by-request-id',
    requiredArguments: ['requestId'],
    sql: (context) => ({
      text: `
        select *
        from api_request_events
        where request_id = $1
        order by created_at desc
        limit 100
      `,
      values: [context.requestId!],
    }),
  }),
  defineQuery({
    id: 'api-request-events-by-trace-id',
    requiredArguments: ['traceId'],
    sql: (context) => ({
      text: `
        select *
        from api_request_events
        where meta ->> 'traceId' = $1
        order by created_at desc
        limit 100
      `,
      values: [context.traceId!],
    }),
  }),
  defineQuery({
    id: 'api-request-events-by-user-id',
    requiredArguments: ['userId'],
    sql: (context) => ({
      text: `
        select *
        from api_request_events
        where user_id = $1
        order by created_at desc
        limit 100
      `,
      values: [context.userId!],
    }),
  }),
  defineQuery({
    id: 'user-schedule-by-user-id',
    requiredArguments: ['userId'],
    sql: (context) => ({
      text: `
        select *
        from scrape_schedules
        where user_id = $1
      `,
      values: [context.userId!],
    }),
  }),
  defineQuery({
    id: 'recent-failed-runs',
    requiredArguments: [],
    sql: () => ({
      text: `
        select *
        from job_source_runs
        where status = 'FAILED'
        order by finalized_at desc nulls last, created_at desc
        limit 50
      `,
      values: [],
    }),
  }),
  defineQuery({
    id: 'recent-schedule-failures',
    requiredArguments: [],
    sql: () => ({
      text: `
        select *
        from scrape_schedule_events
        where severity = 'error'
           or event_type = 'schedule_enqueue_failed'
        order by created_at desc
        limit 50
      `,
      values: [],
    }),
  }),
  defineQuery({
    id: 'redundant-company-aliases',
    requiredArguments: [],
    sql: () => ({
      text: `
        select
          ca.id,
          ca.company_id,
          c.canonical_name,
          c.normalized_name,
          ca.alias,
          ca.normalized_alias,
          ca.source,
          ca.created_at
        from company_aliases ca
        inner join companies c on c.id = ca.company_id
        where ca.normalized_alias = c.normalized_name
        order by ca.created_at desc
        limit 100
      `,
      values: [],
    }),
  }),
  defineQuery({
    id: 'suspicious-contract-taxonomy',
    requiredArguments: [],
    sql: () => ({
      text: `
        select *
        from contract_types
        where slug ~ '[,;/|]'
           or label ~ '[,;/|]'
        order by created_at desc
        limit 100
      `,
      values: [],
    }),
  }),
  defineQuery({
    id: 'empty-job-categories',
    requiredArguments: [],
    sql: () => ({
      text: `
        select
          count(*)::int as total_offers,
          count(*) filter (where job_category_id is null)::int as offers_without_category,
          count(*) filter (where details is not null)::int as offers_with_details
        from job_offers
        where source = 'PRACUJ_PL'
      `,
      values: [],
    }),
  }),
];

export function getSupportQueryDefinition(queryId: string) {
  const definition = supportQueryCatalog.find((item) => item.id === queryId);
  if (!definition) {
    throw new Error(`Unknown support query id: ${queryId}`);
  }
  return definition;
}
