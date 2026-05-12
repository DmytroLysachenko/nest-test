# Environment Matrix

Canonical environment-variable inventory for local development, GitHub Actions CI/CD, and Cloud Run runtime.

Last updated: 2026-05-12

## Rules

1. Local development uses per-app `.env` files copied from `.env.example`.
2. Production runtime uses Cloud Run env vars for both non-secrets and deploy-managed secret values.
3. GitHub `production` variables and secrets are the CI/CD source of truth for production config. GitHub Actions applies that managed contract directly into Cloud Run.
4. Critical production behavior must not rely on code defaults alone.
5. Manual Cloud Run console edits should be treated as emergency-only and backported into CI/CD config immediately.

## Ownership

| Scope | Source of truth |
|---|---|
| Local API | `apps/api/.env` |
| Local Worker | `apps/worker/.env` |
| Local Web | `apps/web/.env` |
| Production reference templates | `apps/*/.env.prod` |
| Production managed non-secrets | GitHub `production` variables |
| Production managed secrets | GitHub `production` secrets -> Cloud Run env via deploy workflow |
| Production deploy contract | GitHub `production` vars/secrets + `.github/workflows/*` + `scripts/deploy-cloud-run-prod.sh` |

## API

| Variable | Local | Prod | Secret | Runtime owner | Notes |
|---|---|---|---|---|---|
| `HOST` | required | required | no | Cloud Run env | `0.0.0.0` in production |
| `PORT` | optional | platform | no | Cloud Run platform | Cloud Run provides this automatically |
| `NODE_ENV` | required | required | no | Cloud Run env | `production` in prod |
| `ACCESS_TOKEN_SECRET` | required | required | yes | Cloud Run env from GitHub secret | JWT signing secret |
| `ACCESS_TOKEN_EXPIRATION` | required | required | no | Cloud Run env | default `15m` |
| `REFRESH_TOKEN_SECRET` | required | required | yes | Cloud Run env from GitHub secret | JWT signing secret |
| `REFRESH_TOKEN_EXPIRATION` | required | required | no | Cloud Run env | default `30d` |
| `MAIL_HOST` | required | required | no | Cloud Run env | default deploy value `smtp.sendgrid.net` |
| `MAIL_PORT` | required | required | no | Cloud Run env | default `587` |
| `MAIL_SECURE` | required | required | no | Cloud Run env | default `false` |
| `MAIL_USERNAME` | required | required | yes | Cloud Run env from GitHub secret | SMTP username |
| `MAIL_PASSWORD` | required | required | yes | Cloud Run env from GitHub secret | SMTP password |
| `DATABASE_URL` | required | required | yes | Cloud Run env from GitHub secret | production Postgres connection |
| `GOOGLE_OAUTH_CLIENT_ID` | optional local | required prod | no | Cloud Run env | also used by web build/runtime |
| `GOOGLE_OAUTH_CLIENT_SECRET` | optional local | required prod | yes | Cloud Run env from GitHub secret | API token verification/linking |
| `GCS_BUCKET` | required | required | no | Cloud Run env | document storage bucket |
| `GCP_PROJECT_ID` | optional local | required prod | no | Cloud Run env | Vertex/GCS project |
| `GCP_CLIENT_EMAIL` | optional | no | no | local only | keep empty on Cloud Run unless explicit JSON creds used |
| `GCP_PRIVATE_KEY` | optional | no | yes if used | local only | keep empty on Cloud Run unless explicit JSON creds used |
| `GCP_LOCATION` | optional local | required prod | no | Cloud Run env | Vertex AI region |
| `GEMINI_MODEL` | optional local | required prod | no | Cloud Run env | production must be explicitly managed |
| `ALLOWED_ORIGINS` | required | required | no | Cloud Run env | legacy/manual override only; CI/CD now derives API CORS allowlist from `GCP_WEB_BASE_URL` plus deployed web URLs |
| `API_PREFIX` | required | required | no | Cloud Run env | should stay `api` |
| `WORKER_TASK_PROVIDER` | optional local | required prod | no | Cloud Run env | `http` local, `cloud-tasks` prod |
| `WORKER_TASK_URL` | optional local | required prod | no | Cloud Run env | worker `/tasks` endpoint |
| `WORKER_AUTH_TOKEN` | optional local | optional prod | yes | Cloud Run env from GitHub secret | used in shared-token worker auth mode |
| `WORKER_TASKS_PROJECT_ID` | optional local | required prod | no | Cloud Run env | Cloud Tasks project id |
| `WORKER_TASKS_LOCATION` | optional local | required prod | no | Cloud Run env | Cloud Tasks location |
| `WORKER_TASKS_QUEUE` | optional local | required prod | no | Cloud Run env | queue name |
| `WORKER_TASKS_SERVICE_ACCOUNT_EMAIL` | optional | optional | no | Cloud Run env | OIDC enqueue mode |
| `WORKER_TASKS_OIDC_AUDIENCE` | optional | optional | no | Cloud Run env | OIDC enqueue mode |
| `WORKER_CALLBACK_URL` | optional | optional | no | Cloud Run env | usually derived automatically |
| `WORKER_CALLBACK_TOKEN` | optional local | optional prod | yes | Cloud Run env from GitHub secret | shared-token callback mode |
| `WORKER_CALLBACK_OIDC_AUDIENCE` | optional | optional | no | Cloud Run env | OIDC callback mode |
| `WORKER_CALLBACK_OIDC_SERVICE_ACCOUNT_EMAIL` | optional | optional | no | Cloud Run env | OIDC callback mode |
| `WORKER_CALLBACK_SIGNING_SECRET` | optional | optional | yes | Cloud Run env from GitHub secret | optional HMAC callback hardening |
| `WORKER_CALLBACK_SIGNATURE_TOLERANCE_SEC` | optional | optional | no | Cloud Run env | default `300` |
| `WORKER_REQUEST_TIMEOUT_MS` | optional | optional | no | Cloud Run env | default `5000` |
| `WORKER_TASK_MAX_PAYLOAD_BYTES` | optional | optional | no | Cloud Run env | default `262144` |
| `API_BODY_LIMIT` | optional | optional | no | Cloud Run env | default `1mb` |
| `DISK_HEALTH_THRESHOLD` | optional | optional | no | Cloud Run env | default `0.98` |
| `API_READ_THROTTLE_*` | optional | optional | no | Cloud Run env | default/read API throttle tuning |
| `API_WRITE_THROTTLE_*` | optional | optional | no | Cloud Run env | write API throttle tuning |
| `API_WORKFLOW_THROTTLE_*` | optional | optional | no | Cloud Run env | high-frequency notebook/opportunity workflow action throttle tuning |
| `API_AUTH_THROTTLE_*` | optional | optional | no | Cloud Run env | auth API throttle tuning |
| `API_SENSITIVE_THROTTLE_*` | optional | optional | no | Cloud Run env | expensive API throttle tuning |
| `SCRAPE_*` | optional | optional | no | Cloud Run env | scrape lifecycle tuning |
| `AUTO_SCORE_*` | optional | optional | no | Cloud Run env | ingest-time scoring tuning |
| `NOTEBOOK_*` | optional | optional | no | Cloud Run env | notebook ranking tuning |
| `WORKSPACE_SUMMARY_CACHE_TTL_SEC` | optional | optional | no | Cloud Run env | workspace cache tuning |
| `JOB_SOURCE_DIAGNOSTICS_WINDOW_HOURS` | optional | optional | no | Cloud Run env | diagnostics default window |
| `JOB_OFFERS_NULL_EXPIRY_STALE_HOURS` | optional | optional | no | Cloud Run env | null-expiry offer stale cutoff in hours; default `336` |
| `DOCUMENT_DIAGNOSTICS_WINDOW_HOURS` | optional | optional | no | Cloud Run env | diagnostics default window |
| `SCHEDULER_AUTH_TOKEN` | optional local | required prod | yes | Cloud Run env from GitHub secret | schedule trigger auth |
| `SCHEDULER_TRIGGER_BATCH_SIZE` | optional | optional | no | Cloud Run env | default `20` |
| `OPS_INTERNAL_TOKEN` | optional local | required prod | yes | Cloud Run env from GitHub secret | internal ops auth |

## Worker

| Variable | Local | Prod | Secret | Runtime owner | Notes |
|---|---|---|---|---|---|
| `NODE_ENV` | required | required | no | Cloud Run env | `production` in prod |
| `WORKER_ALLOWED_ORIGINS` | required | required | no | Cloud Run env | no `*` in prod |
| `WORKER_LOG_LEVEL` | optional | optional | no | Cloud Run env | default `info` |
| `WORKER_PORT` | local only | no | no | local only | Cloud Run uses `PORT` |
| `QUEUE_PROVIDER` | required | required | no | Cloud Run env | `local` dev, `cloud-tasks` prod |
| `TASKS_AUTH_TOKEN` | optional local | optional prod | yes | Cloud Run env from GitHub secret | shared-token ingress auth |
| `TASKS_PROJECT_ID` | optional local | required prod | no | Cloud Run env | Cloud Tasks project id |
| `TASKS_LOCATION` | optional local | required prod | no | Cloud Run env | Cloud Tasks location |
| `TASKS_QUEUE` | optional local | required prod | no | Cloud Run env | queue name |
| `TASKS_URL` | optional local | required prod | no | Cloud Run env | worker `/tasks` URL |
| `TASKS_SERVICE_ACCOUNT_EMAIL` | optional | optional | no | Cloud Run env | OIDC ingress mode |
| `TASKS_OIDC_AUDIENCE` | optional | optional | no | Cloud Run env | OIDC ingress mode |
| `WORKER_CALLBACK_URL` | optional | required prod | no | Cloud Run env | API callback endpoint |
| `WORKER_CALLBACK_TOKEN` | optional local | optional prod | yes | Cloud Run env from GitHub secret | shared-token callback mode |
| `WORKER_CALLBACK_OIDC_AUDIENCE` | optional | optional | no | Cloud Run env | OIDC callback mode |
| `WORKER_CALLBACK_SIGNING_SECRET` | optional | optional | yes | Cloud Run env from GitHub secret | optional HMAC callback hardening |
| `WORKER_CALLBACK_RETRY_*` | optional | optional | no | Cloud Run env | callback retry tuning |
| `WORKER_HEARTBEAT_INTERVAL_MS` | optional | optional | no | Cloud Run env | heartbeat cadence |
| `WORKER_DEAD_LETTER_DIR` | optional | optional | no | Cloud Run env | default `data/dead-letter` |
| `WORKER_MAX_BODY_BYTES` | optional | optional | no | Cloud Run env | default `262144` |
| `DATABASE_URL` | optional | optional | yes | Cloud Run env from GitHub secret | only if worker DB features are used |
| `PLAYWRIGHT_HEADLESS` | optional | optional | no | Cloud Run env | `true` in prod |
| `PRACUJ_*` | optional | optional | no | Cloud Run env | scraper/source tuning |
| `WORKER_OUTPUT_*` | optional | optional | no | Cloud Run env | local/debug output tuning |
| `WORKER_MAX_CONCURRENT_TASKS` | optional | optional | no | Cloud Run env | default `1` prod |
| `WORKER_MAX_QUEUE_SIZE` | optional | optional | no | Cloud Run env | default `20` prod |
| `WORKER_TASK_TIMEOUT_MS` | optional | optional | no | Cloud Run env | default `180000` |
| `WORKER_SMOKE_ACCEPT_ONLY` | local/CI only | no | no | local/CI only | smoke convenience flag |

## Web

| Variable | Local | Prod | Secret | Runtime owner | Notes |
|---|---|---|---|---|---|
| `NEXT_PUBLIC_API_URL` | required | required | no | Cloud Run env | include `/api` suffix |
| `NEXT_PUBLIC_WORKER_URL` | required | required | no | Cloud Run env | tester/support tooling |
| `NEXT_PUBLIC_ENABLE_TESTER` | optional | required prod | no | Cloud Run env | should be `false` in prod |
| `NEXT_PUBLIC_GOOGLE_OAUTH_CLIENT_ID` | optional local | required prod | no | Cloud Run env / build arg | web Google OAuth flow |
| `NEXT_PUBLIC_QUERY_STALE_TIME_MS` | optional | optional | no | Cloud Run env | query cache tuning |
| `NEXT_PUBLIC_QUERY_REFETCH_ON_WINDOW_FOCUS` | optional | optional | no | Cloud Run env | query UX tuning |
| `NEXT_PUBLIC_QUERY_DIAGNOSTICS_REFETCH_MS` | optional | optional | no | Cloud Run env | diagnostics polling |

## GitHub Actions Inputs

### GitHub production variables

- Deploy metadata:
  - `GCP_PROJECT_ID`
  - `GCP_REGION`
  - `GAR_REPOSITORY`
  - `GCP_API_SERVICE`
  - `GCP_WORKER_SERVICE`
  - `GCP_WEB_SERVICE`
  - `GCP_API_BASE_URL`
  - `GCP_WEB_BASE_URL`
  - `GCP_WORKER_BASE_URL`
  - `GCP_WORKLOAD_IDENTITY_PROVIDER`
  - `GCP_DEPLOYER_SERVICE_ACCOUNT`
- API runtime non-secrets:
  - `GCS_BUCKET`
  - `GOOGLE_OAUTH_CLIENT_ID`
  - `GEMINI_MODEL`
  - `ACCESS_TOKEN_EXPIRATION`
  - `REFRESH_TOKEN_EXPIRATION`
  - `MAIL_HOST`
  - `MAIL_PORT`
  - `MAIL_SECURE`
  - `WORKER_TASKS_QUEUE`
  - `WORKER_TASKS_DLQ`
  - `WORKER_TASKS_SERVICE_ACCOUNT_EMAIL`
  - `TASKS_MAX_ATTEMPTS`
  - `TASKS_MIN_BACKOFF_SEC`
  - `TASKS_MAX_BACKOFF_SEC`
  - `TASKS_MAX_DOUBLINGS`
  - `TASKS_MAX_RETRY_DURATION_SEC`
  - `WORKER_ALLOWED_ORIGINS`
  - `API_READ_THROTTLE_TTL_MS`
  - `API_READ_THROTTLE_LIMIT`
  - `API_WRITE_THROTTLE_TTL_MS`
  - `API_WRITE_THROTTLE_LIMIT`
  - `API_WORKFLOW_THROTTLE_TTL_MS`
  - `API_WORKFLOW_THROTTLE_LIMIT`
  - `API_AUTH_THROTTLE_TTL_MS`
  - `API_AUTH_THROTTLE_LIMIT`
  - `API_SENSITIVE_THROTTLE_TTL_MS`
  - `API_SENSITIVE_THROTTLE_LIMIT`
  - `JOB_OFFERS_NULL_EXPIRY_STALE_HOURS`
  - `WEB_QUERY_STALE_TIME_MS`
  - `WEB_QUERY_REFETCH_ON_WINDOW_FOCUS`
  - `WEB_QUERY_DIAGNOSTICS_REFETCH_MS`

## Offer Expiry Contract

Production behavior for catalog offer freshness is intentionally explicit:

1. If `job_offers.expires_at` exists and is in the past, the offer is expired.
2. If `job_offers.expires_at` is null, the offer is still allowed to age out.
3. Null-expiry aging uses `job_offers.last_seen_at`, not `fetched_at`.
4. The default null-expiry stale cutoff is `336` hours (`14` days).
5. The cutoff is controlled by `JOB_OFFERS_NULL_EXPIRY_STALE_HOURS`.

Operator implications:

1. Leaving `JOB_OFFERS_NULL_EXPIRY_STALE_HOURS` unset keeps the documented default behavior.
2. Shortening the cutoff is stricter and reduces stale inventory faster, but increases the risk of hiding still-live offers from slower-refresh sources.
3. Increasing the cutoff is more conservative and reduces accidental hiding, but allows stale active inventory to persist longer after reset.
4. Expiry reconciliation currently runs on critical API read paths and ops summary paths, so the stale cutoff affects notebook, discovery, company, matching-candidate, and ops views.

Reset-readiness guidance:

1. Keep the default `336`-hour window unless observed scrape cadence proves a different source rhythm.
2. If you change the cutoff in production, update this matrix and the reset-readiness plan in the same change.
3. Do not use blank placeholders for this variable. Omit it entirely to keep the default.
4. During reset verification, compare active-offer counts against recent `last_seen_at` values before concluding expiry logic is wrong.

Quick operator rule:

- `expires_at` missing plus old `last_seen_at` is now enough for expiry.

## Workflow Action Throttle Contract

Production rate limiting is now intentionally split by user intent:

1. Read traffic uses `API_READ_THROTTLE_*`.
2. Generic writes use `API_WRITE_THROTTLE_*`.
3. High-frequency notebook and opportunities actions use `API_WORKFLOW_THROTTLE_*`.
4. Auth and sensitive endpoints keep their own stricter budgets.

Operator implications:

1. If users hit `429` while triaging normal offer queues, adjust `API_WORKFLOW_THROTTLE_*` first.
2. Do not loosen `API_AUTH_THROTTLE_*` or `API_SENSITIVE_THROTTLE_*` just to make notebook usage smoother.
3. Keep workflow throttles high enough for real review passes, but still bounded so broken polling loops remain visible.

### GitHub production secrets

- Deploy auth:
  - `GCP_WORKLOAD_IDENTITY_PROVIDER`
  - `GCP_DEPLOYER_SERVICE_ACCOUNT`
- Runtime secrets injected directly into Cloud Run env:
  - `DATABASE_URL`
  - `ACCESS_TOKEN_SECRET`
  - `REFRESH_TOKEN_SECRET`
  - `MAIL_USERNAME`
  - `MAIL_PASSWORD`
  - `GOOGLE_OAUTH_CLIENT_SECRET`
  - `WORKER_CALLBACK_TOKEN`
  - `SCHEDULER_AUTH_TOKEN`
  - `OPS_INTERNAL_TOKEN`
- Optional runtime secrets:
  - `WORKER_SHARED_TOKEN` for shared-token worker ingress; leave unset to use Cloud Tasks OIDC via `WORKER_TASKS_SERVICE_ACCOUNT_EMAIL`
- Deploy behavior:
  - CI/CD injects GitHub production secret values directly into Cloud Run runtime env vars during deploy.
  - Routine code-only deploys reuse the same GitHub secret source of truth without Secret Manager version churn.

## Current Simplification Path

1. Treat GitHub `production` variables and secrets as the only writable production control plane.
2. Use `.env.prod` files only as local/operator reference templates, not as the deployed source of truth.
3. Let CI/CD push the managed contract directly into Cloud Run.
4. Keep Cloud Run console edits only for emergency hotfixes and backport them into GitHub config immediately.
