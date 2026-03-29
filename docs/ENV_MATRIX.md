# Environment Matrix

Canonical environment-variable inventory for local development, GitHub Actions CI/CD, Secret Manager, and Cloud Run runtime.

Last updated: 2026-03-11

## Rules

1. Local development uses per-app `.env` files copied from `.env.example`.
2. Production runtime uses:
   - Cloud Run plain env vars for non-secrets
   - Secret Manager-backed env vars for secrets
3. GitHub `production` variables and secrets are the CI/CD source of truth for production config. GitHub Actions applies that managed contract into Cloud Run and Secret Manager.
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
| Production managed secrets | GitHub `production` secrets -> Secret Manager via deploy workflow |
| Production deploy contract | GitHub `production` vars/secrets + `.github/workflows/*` + `scripts/deploy-cloud-run-prod.sh` |

## API

| Variable | Local | Prod | Secret | Runtime owner | Notes |
|---|---|---|---|---|---|
| `HOST` | required | required | no | Cloud Run env | `0.0.0.0` in production |
| `PORT` | optional | platform | no | Cloud Run platform | Cloud Run provides this automatically |
| `NODE_ENV` | required | required | no | Cloud Run env | `production` in prod |
| `ACCESS_TOKEN_SECRET` | required | required | yes | Secret Manager | JWT signing secret |
| `ACCESS_TOKEN_EXPIRATION` | required | required | no | Cloud Run env | default `15m` |
| `REFRESH_TOKEN_SECRET` | required | required | yes | Secret Manager | JWT signing secret |
| `REFRESH_TOKEN_EXPIRATION` | required | required | no | Cloud Run env | default `30d` |
| `MAIL_HOST` | required | required | no | Cloud Run env | default deploy value `smtp.sendgrid.net` |
| `MAIL_PORT` | required | required | no | Cloud Run env | default `587` |
| `MAIL_SECURE` | required | required | no | Cloud Run env | default `false` |
| `MAIL_USERNAME` | required | required | yes | Secret Manager | SMTP username |
| `MAIL_PASSWORD` | required | required | yes | Secret Manager | SMTP password |
| `DATABASE_URL` | required | required | yes | Secret Manager | production Postgres connection |
| `GOOGLE_OAUTH_CLIENT_ID` | optional local | required prod | no | Cloud Run env | also used by web build/runtime |
| `GOOGLE_OAUTH_CLIENT_SECRET` | optional local | required prod | yes | Secret Manager | API token verification/linking |
| `GCS_BUCKET` | required | required | no | Cloud Run env | document storage bucket |
| `GCP_PROJECT_ID` | optional local | required prod | no | Cloud Run env | Vertex/GCS project |
| `GCP_CLIENT_EMAIL` | optional | no | no | local only | keep empty on Cloud Run unless explicit JSON creds used |
| `GCP_PRIVATE_KEY` | optional | no | yes if used | local only | keep empty on Cloud Run unless explicit JSON creds used |
| `GCP_LOCATION` | optional local | required prod | no | Cloud Run env | Vertex AI region |
| `GEMINI_MODEL` | optional local | required prod | no | Cloud Run env | production must be explicitly managed |
| `ALLOWED_ORIGINS` | required | required | no | Cloud Run env | no `*` in prod |
| `API_PREFIX` | required | required | no | Cloud Run env | should stay `api` |
| `WORKER_TASK_PROVIDER` | optional local | required prod | no | Cloud Run env | `http` local, `cloud-tasks` prod |
| `WORKER_TASK_URL` | optional local | required prod | no | Cloud Run env | worker `/tasks` endpoint |
| `WORKER_AUTH_TOKEN` | optional local | optional prod | yes | Secret Manager | used in shared-token worker auth mode |
| `WORKER_TASKS_PROJECT_ID` | optional local | required prod | no | Cloud Run env | Cloud Tasks project id |
| `WORKER_TASKS_LOCATION` | optional local | required prod | no | Cloud Run env | Cloud Tasks location |
| `WORKER_TASKS_QUEUE` | optional local | required prod | no | Cloud Run env | queue name |
| `WORKER_TASKS_SERVICE_ACCOUNT_EMAIL` | optional | optional | no | Cloud Run env | OIDC enqueue mode |
| `WORKER_TASKS_OIDC_AUDIENCE` | optional | optional | no | Cloud Run env | OIDC enqueue mode |
| `WORKER_CALLBACK_URL` | optional | optional | no | Cloud Run env | usually derived automatically |
| `WORKER_CALLBACK_TOKEN` | optional local | optional prod | yes | Secret Manager | shared-token callback mode |
| `WORKER_CALLBACK_OIDC_AUDIENCE` | optional | optional | no | Cloud Run env | OIDC callback mode |
| `WORKER_CALLBACK_OIDC_SERVICE_ACCOUNT_EMAIL` | optional | optional | no | Cloud Run env | OIDC callback mode |
| `WORKER_CALLBACK_SIGNING_SECRET` | optional | optional | yes | Secret Manager | optional HMAC callback hardening |
| `WORKER_CALLBACK_SIGNATURE_TOLERANCE_SEC` | optional | optional | no | Cloud Run env | default `300` |
| `WORKER_REQUEST_TIMEOUT_MS` | optional | optional | no | Cloud Run env | default `5000` |
| `WORKER_TASK_MAX_PAYLOAD_BYTES` | optional | optional | no | Cloud Run env | default `262144` |
| `API_BODY_LIMIT` | optional | optional | no | Cloud Run env | default `1mb` |
| `DISK_HEALTH_THRESHOLD` | optional | optional | no | Cloud Run env | default `0.98` |
| `API_THROTTLE_*` | optional | optional | no | Cloud Run env | API throttle tuning |
| `AUTH_*_THROTTLE_*` | optional | optional | no | Cloud Run env | auth throttle tuning |
| `SCRAPE_*` | optional | optional | no | Cloud Run env | scrape lifecycle tuning |
| `AUTO_SCORE_*` | optional | optional | no | Cloud Run env | ingest-time scoring tuning |
| `NOTEBOOK_*` | optional | optional | no | Cloud Run env | notebook ranking tuning |
| `WORKSPACE_SUMMARY_CACHE_TTL_SEC` | optional | optional | no | Cloud Run env | workspace cache tuning |
| `JOB_SOURCE_DIAGNOSTICS_WINDOW_HOURS` | optional | optional | no | Cloud Run env | diagnostics default window |
| `DOCUMENT_DIAGNOSTICS_WINDOW_HOURS` | optional | optional | no | Cloud Run env | diagnostics default window |
| `SCHEDULER_AUTH_TOKEN` | optional local | required prod | yes | Secret Manager | schedule trigger auth |
| `SCHEDULER_TRIGGER_BATCH_SIZE` | optional | optional | no | Cloud Run env | default `20` |
| `OPS_INTERNAL_TOKEN` | optional local | required prod | yes | Secret Manager | internal ops auth |

## Worker

| Variable | Local | Prod | Secret | Runtime owner | Notes |
|---|---|---|---|---|---|
| `NODE_ENV` | required | required | no | Cloud Run env | `production` in prod |
| `WORKER_ALLOWED_ORIGINS` | required | required | no | Cloud Run env | no `*` in prod |
| `WORKER_LOG_LEVEL` | optional | optional | no | Cloud Run env | default `info` |
| `WORKER_PORT` | local only | no | no | local only | Cloud Run uses `PORT` |
| `QUEUE_PROVIDER` | required | required | no | Cloud Run env | `local` dev, `cloud-tasks` prod |
| `TASKS_AUTH_TOKEN` | optional local | optional prod | yes | Secret Manager | shared-token ingress auth |
| `TASKS_PROJECT_ID` | optional local | required prod | no | Cloud Run env | Cloud Tasks project id |
| `TASKS_LOCATION` | optional local | required prod | no | Cloud Run env | Cloud Tasks location |
| `TASKS_QUEUE` | optional local | required prod | no | Cloud Run env | queue name |
| `TASKS_URL` | optional local | required prod | no | Cloud Run env | worker `/tasks` URL |
| `TASKS_SERVICE_ACCOUNT_EMAIL` | optional | optional | no | Cloud Run env | OIDC ingress mode |
| `TASKS_OIDC_AUDIENCE` | optional | optional | no | Cloud Run env | OIDC ingress mode |
| `WORKER_CALLBACK_URL` | optional | required prod | no | Cloud Run env | API callback endpoint |
| `WORKER_CALLBACK_TOKEN` | optional local | optional prod | yes | Secret Manager | shared-token callback mode |
| `WORKER_CALLBACK_OIDC_AUDIENCE` | optional | optional | no | Cloud Run env | OIDC callback mode |
| `WORKER_CALLBACK_SIGNING_SECRET` | optional | optional | yes | Secret Manager | optional HMAC callback hardening |
| `WORKER_CALLBACK_RETRY_*` | optional | optional | no | Cloud Run env | callback retry tuning |
| `WORKER_HEARTBEAT_INTERVAL_MS` | optional | optional | no | Cloud Run env | heartbeat cadence |
| `WORKER_DEAD_LETTER_DIR` | optional | optional | no | Cloud Run env | default `data/dead-letter` |
| `WORKER_MAX_BODY_BYTES` | optional | optional | no | Cloud Run env | default `262144` |
| `DATABASE_URL` | optional | optional | yes | Secret Manager | only if worker DB features are used |
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
  - `GCP_WORKER_BASE_URL`
  - `GCP_WEB_BASE_URL`
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
  - `ALLOWED_ORIGINS`
  - `WORKER_TASKS_QUEUE`
  - `WORKER_TASKS_DLQ`
  - `TASKS_MAX_ATTEMPTS`
  - `TASKS_MIN_BACKOFF_SEC`
  - `TASKS_MAX_BACKOFF_SEC`
  - `TASKS_MAX_DOUBLINGS`
  - `TASKS_MAX_RETRY_DURATION_SEC`
  - `WORKER_ALLOWED_ORIGINS`
  - `API_THROTTLE_TTL_MS`
  - `API_THROTTLE_LIMIT`
  - `AUTH_LOGIN_THROTTLE_TTL_MS`
  - `AUTH_LOGIN_THROTTLE_LIMIT`
  - `AUTH_REFRESH_THROTTLE_TTL_MS`
  - `AUTH_REFRESH_THROTTLE_LIMIT`
  - `AUTH_REGISTER_THROTTLE_TTL_MS`
  - `AUTH_REGISTER_THROTTLE_LIMIT`
  - `AUTH_OTP_THROTTLE_TTL_MS`
  - `AUTH_OTP_THROTTLE_LIMIT`
  - `WEB_QUERY_STALE_TIME_MS`
  - `WEB_QUERY_REFETCH_ON_WINDOW_FOCUS`
  - `WEB_QUERY_DIAGNOSTICS_REFETCH_MS`

### GitHub production secrets

- Deploy auth:
  - `GCP_WORKLOAD_IDENTITY_PROVIDER`
  - `GCP_DEPLOYER_SERVICE_ACCOUNT`
- Runtime secrets synced into Secret Manager:
  - `DATABASE_URL`
  - `ACCESS_TOKEN_SECRET`
  - `REFRESH_TOKEN_SECRET`
  - `MAIL_USERNAME`
  - `MAIL_PASSWORD`
  - `GOOGLE_OAUTH_CLIENT_SECRET`
  - `WORKER_SHARED_TOKEN`
  - `WORKER_CALLBACK_TOKEN`
  - `SCHEDULER_AUTH_TOKEN`
  - `OPS_INTERNAL_TOKEN`

## Current Simplification Path

1. Treat GitHub `production` variables and secrets as the only writable production control plane.
2. Use `.env.prod` files only as local/operator reference templates, not as the deployed source of truth.
3. Let CI/CD push the managed contract into Cloud Run and Secret Manager.
4. Keep Cloud Run console edits only for emergency hotfixes and backport them into GitHub config immediately.
