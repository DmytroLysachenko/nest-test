# Production Support Toolkit

Read-only local toolkit for production debugging.

Purpose:
- gather one compact incident bundle from prod API support endpoints
- run approved read-only Neon queries for correlation
- export deterministic JSON that can be attached to a Codex session

Rules:
- real support config lives only in `.support-local/`
- use a dedicated read-only production `DATABASE_URL`
- do not add free-form write SQL to this toolkit

Setup:
1. Copy [`support.config.example.json`](./support.config.example.json) into `.support-local/support.config.json`
2. Fill:
   - `apiBaseUrl`
   - `workerBaseUrl`
   - `apiBearerToken`
   - `databaseUrl`

Commands:
```bash
pnpm support:query --query-id run-by-id --run-id <run-id>
pnpm support:bundle --recipe scrape-incident --run-id <run-id>
pnpm support:bundle --recipe user-incident --user-id <user-id>
pnpm support:bundle --recipe correlation --trace-id <trace-id>
```

Output:
- bundles are written to `.support-local/output/`
- query output is printed to stdout as JSON
