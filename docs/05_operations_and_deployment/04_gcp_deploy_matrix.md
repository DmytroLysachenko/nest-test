# GCP Deploy Matrix

Canonical runtime/deploy contract for Google Cloud Run production deployments.

Last updated: 2026-03-29

For the complete local + production inventory, use:

- `docs/05_operations_and_deployment/05_env_matrix.md`

## 1) Repository-Level CI/CD Inputs

### Required GitHub Variables (`vars.*`)

| Name | Used by | Notes |
|---|---|---|
| `GCP_PROJECT_ID` | release-candidate, deploy-prod-on-main, promote-to-prod | GCP project id |
| `GCP_REGION` | release-candidate, deploy-prod-on-main, promote-to-prod | Cloud Run + Artifact Registry region |
| `GAR_REPOSITORY` | release-candidate, deploy-prod-on-main, promote-to-prod | Artifact Registry Docker repository |
| `GCP_API_SERVICE` | deploy-prod-on-main, promote-to-prod | Cloud Run service name for API |
| `GCP_WORKER_SERVICE` | deploy-prod-on-main, promote-to-prod | Cloud Run service name for Worker |
| `GCP_WEB_SERVICE` | deploy-prod-on-main, promote-to-prod | Cloud Run service name for Web |
| `GCP_API_BASE_URL` | release-candidate | Public API base URL (`https://...`) for web image build |
| `GCP_WORKER_BASE_URL` | release-candidate | Public Worker base URL (`https://...`) for web image build |
| `GOOGLE_OAUTH_CLIENT_ID` | release-candidate, deploy-prod-on-main, promote-to-prod | Public Google OAuth client id used by web build and API token verification |
| `GEMINI_MODEL` | deploy-prod-on-main, promote-to-prod | Vertex AI model id injected into API runtime |
| `GCS_BUCKET` | deploy-prod-on-main, promote-to-prod | document storage bucket |
| `API_THROTTLE_TTL_MS` | deploy-prod-on-main, promote-to-prod | global API throttle window |
| `API_THROTTLE_LIMIT` | deploy-prod-on-main, promote-to-prod | global API throttle limit |
| `AUTH_LOGIN_THROTTLE_TTL_MS` | deploy-prod-on-main, promote-to-prod | auth login throttle window |
| `AUTH_LOGIN_THROTTLE_LIMIT` | deploy-prod-on-main, promote-to-prod | auth login throttle limit |
| `AUTH_REFRESH_THROTTLE_TTL_MS` | deploy-prod-on-main, promote-to-prod | auth refresh throttle window |
| `AUTH_REFRESH_THROTTLE_LIMIT` | deploy-prod-on-main, promote-to-prod | auth refresh throttle limit |
| `AUTH_REGISTER_THROTTLE_TTL_MS` | deploy-prod-on-main, promote-to-prod | auth register throttle window |
| `AUTH_REGISTER_THROTTLE_LIMIT` | deploy-prod-on-main, promote-to-prod | auth register throttle limit |
| `AUTH_OTP_THROTTLE_TTL_MS` | deploy-prod-on-main, promote-to-prod | auth OTP throttle window |
| `AUTH_OTP_THROTTLE_LIMIT` | deploy-prod-on-main, promote-to-prod | auth OTP throttle limit |
| `WORKER_REQUEST_TIMEOUT_MS` | deploy-prod-on-main, promote-to-prod | API wait timeout for worker accept |
| `WORKER_TASK_MAX_PAYLOAD_BYTES` | deploy-prod-on-main, promote-to-prod | API/worker payload guardrail |
| `API_BODY_LIMIT` | deploy-prod-on-main, promote-to-prod | API body parser limit |
| `DISK_HEALTH_THRESHOLD` | deploy-prod-on-main, promote-to-prod | API health threshold |
| `SCHEDULER_TRIGGER_BATCH_SIZE` | deploy-prod-on-main, promote-to-prod | scheduler trigger batch size |
| `WORKSPACE_SUMMARY_CACHE_TTL_SEC` | deploy-prod-on-main, promote-to-prod | dashboard cache TTL |
| `JOB_SOURCE_DIAGNOSTICS_WINDOW_HOURS` | deploy-prod-on-main, promote-to-prod | job source diagnostics window |
| `DOCUMENT_DIAGNOSTICS_WINDOW_HOURS` | deploy-prod-on-main, promote-to-prod | document diagnostics window |
| `SCRAPE_DB_REUSE_HOURS` | deploy-prod-on-main, promote-to-prod | scrape DB reuse window |
| `SCRAPE_MAX_ACTIVE_RUNS_PER_USER` | deploy-prod-on-main, promote-to-prod | active scrape cap |
| `SCRAPE_DAILY_ENQUEUE_LIMIT_PER_USER` | deploy-prod-on-main, promote-to-prod | daily scrape budget |
| `SCRAPE_ENQUEUE_IDEMPOTENCY_TTL_SEC` | deploy-prod-on-main, promote-to-prod | idempotency TTL |
| `SCRAPE_MAX_RETRY_CHAIN_DEPTH` | deploy-prod-on-main, promote-to-prod | retry chain cap |
| `SCRAPE_STALE_PENDING_MINUTES` | deploy-prod-on-main, promote-to-prod | stale pending threshold |
| `SCRAPE_STALE_RUNNING_MINUTES` | deploy-prod-on-main, promote-to-prod | stale running threshold |
| `AUTO_SCORE_ON_INGEST` | deploy-prod-on-main, promote-to-prod | ingest auto-score toggle |
| `AUTO_SCORE_CONCURRENCY` | deploy-prod-on-main, promote-to-prod | auto-score concurrency |
| `AUTO_SCORE_MIN_SCORE` | deploy-prod-on-main, promote-to-prod | auto-score floor |
| `AUTO_SCORE_RETRY_ATTEMPTS` | deploy-prod-on-main, promote-to-prod | auto-score retries |
| `NOTEBOOK_APPROX_VIOLATION_PENALTY` | deploy-prod-on-main, promote-to-prod | notebook ranking tuning |
| `NOTEBOOK_APPROX_MAX_VIOLATION_PENALTY` | deploy-prod-on-main, promote-to-prod | notebook ranking tuning |
| `NOTEBOOK_APPROX_SCORED_BONUS` | deploy-prod-on-main, promote-to-prod | notebook ranking tuning |
| `NOTEBOOK_EXPLORE_UNSCORED_BASE` | deploy-prod-on-main, promote-to-prod | notebook ranking tuning |
| `NOTEBOOK_EXPLORE_RECENCY_WEIGHT` | deploy-prod-on-main, promote-to-prod | notebook ranking tuning |
| `WEB_QUERY_STALE_TIME_MS` | deploy-prod-on-main, promote-to-prod | frontend query stale time |
| `WEB_QUERY_REFETCH_ON_WINDOW_FOCUS` | deploy-prod-on-main, promote-to-prod | frontend focus refetch toggle |
| `WEB_QUERY_DIAGNOSTICS_REFETCH_MS` | deploy-prod-on-main, promote-to-prod | frontend diagnostics polling |
| `WORKER_CPU` | deploy-prod-on-main, promote-to-prod | worker Cloud Run CPU |
| `WORKER_MEMORY` | deploy-prod-on-main, promote-to-prod | worker Cloud Run memory |
| `WORKER_MAX_INSTANCES` | deploy-prod-on-main, promote-to-prod | worker max instances |
| `WORKER_MIN_INSTANCES` | deploy-prod-on-main, promote-to-prod | worker min instances |
| `SCHEDULER_JOB_NAME` | deploy-prod-on-main, promote-to-prod | Optional Cloud Scheduler job name override (default `job-seek-schedule-trigger`) |
| `SCHEDULER_CRON` | deploy-prod-on-main, promote-to-prod | Optional Cloud Scheduler cron expression (default `0 */12 * * *`) |
| `SCHEDULER_TIMEZONE` | deploy-prod-on-main, promote-to-prod | Optional Cloud Scheduler timezone (default `Europe/Warsaw`) |
| `OPS_RECONCILE_JOB_NAME` | deploy-prod-on-main, promote-to-prod | Optional reconcile job name override (default `job-seek-reconcile-stale-runs`) |
| `OPS_RECONCILE_CRON` | deploy-prod-on-main, promote-to-prod | Optional reconcile cron expression (default `0 2 * * *`) |
| `OPS_RECONCILE_TIMEZONE` | deploy-prod-on-main, promote-to-prod | Optional reconcile timezone (default `Europe/Warsaw`) |
| `WORKER_TASKS_DLQ` | deploy-prod-on-main, promote-to-prod | Optional DLQ queue name provisioned by deploy script (default `worker-scrape-dlq`) |
| `TASKS_MAX_ATTEMPTS` | deploy-prod-on-main, promote-to-prod | Optional Cloud Tasks retry max attempts (default `8`) |
| `TASKS_MIN_BACKOFF_SEC` | deploy-prod-on-main, promote-to-prod | Optional retry min backoff seconds (default `5`) |
| `TASKS_MAX_BACKOFF_SEC` | deploy-prod-on-main, promote-to-prod | Optional retry max backoff seconds (default `300`) |
| `TASKS_MAX_DOUBLINGS` | deploy-prod-on-main, promote-to-prod | Optional retry max doublings (default `5`) |
| `TASKS_MAX_RETRY_DURATION_SEC` | deploy-prod-on-main, promote-to-prod | Optional retry max duration in seconds (default `1800`) |

### Required GitHub Secrets (`secrets.*`)

| Name | Used by | Notes |
|---|---|---|
| `GOOGLE_OAUTH_CLIENT_SECRET` | deploy-prod-on-main, promote-to-prod | API Google OAuth secret |
| `DATABASE_URL` | deploy-prod-on-main, promote-to-prod | production Postgres connection |
| `ACCESS_TOKEN_SECRET` | deploy-prod-on-main, promote-to-prod | JWT signing secret |
| `REFRESH_TOKEN_SECRET` | deploy-prod-on-main, promote-to-prod | JWT signing secret |
| `MAIL_USERNAME` | deploy-prod-on-main, promote-to-prod | SMTP username |
| `MAIL_PASSWORD` | deploy-prod-on-main, promote-to-prod | SMTP password |
| `WORKER_SHARED_TOKEN` | deploy-prod-on-main, promote-to-prod | shared worker ingress token |
| `WORKER_CALLBACK_TOKEN` | deploy-prod-on-main, promote-to-prod | shared worker callback token |
| `SCHEDULER_AUTH_TOKEN` | deploy-prod-on-main, promote-to-prod | shared bearer token for `/api/job-sources/schedule/trigger` |
| `OPS_INTERNAL_TOKEN` | deploy-prod-on-main, promote-to-prod | shared bearer token for `/api/ops/reconcile-stale-runs` |

## 2) Cloud Run Runtime Contract

## API Service (`apps/api`)

### Required Runtime Environment

| Name | Source | Example | Rule |
|---|---|---|---|
| `NODE_ENV` | literal | `production` | must be `production` |
| `HOST` | literal | `0.0.0.0` | required by app env schema |
| `PORT` | Cloud Run | `8080` | auto-provided by Cloud Run |
| `DATABASE_URL` | Secret Manager | `postgresql://...` | Cloud SQL connection string |
| `ACCESS_TOKEN_SECRET` | Secret Manager | `<secret>` | non-empty |
| `ACCESS_TOKEN_EXPIRATION` | env | `15m` | jwt duration |
| `REFRESH_TOKEN_SECRET` | Secret Manager | `<secret>` | non-empty |
| `REFRESH_TOKEN_EXPIRATION` | env | `30d` | jwt duration |
| `MAIL_HOST` | env/secret | `smtp.sendgrid.net` | non-empty |
| `MAIL_PORT` | env | `587` | integer |
| `MAIL_SECURE` | env | `false` | boolean |
| `MAIL_USERNAME` | Secret Manager | `<username>` | non-empty |
| `MAIL_PASSWORD` | Secret Manager | `<password>` | non-empty |
| `GCS_BUCKET` | env | `career-assistant-prod-docs` | existing bucket |
| `GCP_PROJECT_ID` | env | `<project-id>` | Vertex/GCS project id |
| `GCP_LOCATION` | env | `europe-west1` | Vertex AI region |
| `GEMINI_MODEL` | env | `gemini-2.5-flash` | must be explicitly managed in production |
| `ALLOWED_ORIGINS` | env | `https://app.example.com` | cannot be `*` in production |
| `API_PREFIX` | env | `api` | should stay `api` |
| `WORKER_TASK_PROVIDER` | env | `cloud-tasks` | must be `cloud-tasks` in production |
| `WORKER_TASK_URL` | env | `https://worker-...run.app/tasks` | must point to worker `/tasks` |
| `WORKER_TASKS_PROJECT_ID` | env | `<project-id>` | Cloud Tasks project id |
| `WORKER_TASKS_LOCATION` | env | `us-central1` | Cloud Tasks queue location |
| `WORKER_TASKS_QUEUE` | env | `worker-scrape` | Cloud Tasks queue name |

### Recommended Runtime Environment

| Name | Example | Notes |
|---|---|---|
| `WORKER_CALLBACK_OIDC_AUDIENCE` | `https://api-...run.app` | enables OIDC callback auth for worker |
| `WORKER_CALLBACK_OIDC_SERVICE_ACCOUNT_EMAIL` | `worker-runtime@...iam.gserviceaccount.com` | pins expected worker caller identity |
| `WORKER_TASKS_SERVICE_ACCOUNT_EMAIL` | `api-enqueue@...iam.gserviceaccount.com` | worker `/tasks` OIDC caller identity |
| `WORKER_TASKS_OIDC_AUDIENCE` | `https://worker-...run.app/tasks` | explicit worker OIDC audience |
| `WORKER_AUTH_TOKEN` | `<secret>` | optional fallback if using shared bearer token instead of OIDC |
| `WORKER_CALLBACK_SIGNING_SECRET` | `<secret>` | optional HMAC callback signature defense |
| `WORKER_CALLBACK_SIGNATURE_TOLERANCE_SEC` | `300` | default is acceptable |
| `API_BODY_LIMIT` | `1mb` | ingress guardrail |
| `API_THROTTLE_TTL_MS` | `60000` | global API throttle window (ms) |
| `API_THROTTLE_LIMIT` | `120` | global API throttle request budget per window |
| `WORKER_REQUEST_TIMEOUT_MS` | `5000` | API wait timeout for worker accept response |
| `GOOGLE_OAUTH_CLIENT_ID` | `<google-client-id>` | required for `/auth/oauth/google` verification |
| `SCHEDULER_AUTH_TOKEN` | `<secret>` | required for internal schedule trigger endpoint |
| `SCHEDULER_TRIGGER_BATCH_SIZE` | `20` | max schedules processed per trigger run |
| `SCRAPE_DAILY_ENQUEUE_LIMIT_PER_USER` | `40` | per-user 24h enqueue budget guardrail |

### Cloud Run Service Settings (Recommended Baseline)

| Setting | Value |
|---|---|
| Ingress | all (or internal+LB if fronted) |
| Authentication | allow unauthenticated (public API/web flow) |
| Min instances | 0 |
| CPU | 1 |
| Memory | 512Mi |

## Worker Service (`apps/worker`)

### Required Runtime Environment

| Name | Source | Example | Rule |
|---|---|---|---|
| `NODE_ENV` | literal | `production` | must be `production` |
| `PORT` | Cloud Run | `8080` | auto-provided by Cloud Run |
| `QUEUE_PROVIDER` | env | `cloud-tasks` | must be `cloud-tasks` in production |
| `TASKS_PROJECT_ID` | env | `<project-id>` | Cloud Tasks project id |
| `TASKS_LOCATION` | env | `us-central1` | Cloud Tasks queue location |
| `TASKS_QUEUE` | env | `worker-scrape` | Cloud Tasks queue name |
| `TASKS_URL` | env | `https://worker-...run.app/tasks` | must end with `/tasks` or `/scrape` |
| `WORKER_ALLOWED_ORIGINS` | env | `https://web-...run.app` | explicit CORS allowlist; cannot be `*` in production |

### Recommended Runtime Environment

| Name | Example | Notes |
|---|---|---|
| `TASKS_SERVICE_ACCOUNT_EMAIL` | `api-enqueue@...iam.gserviceaccount.com` | preferred OIDC validation for `/tasks` |
| `TASKS_OIDC_AUDIENCE` | `https://worker-...run.app/tasks` | optional explicit audience |
| `TASKS_AUTH_TOKEN` | `<secret>` | optional shared token fallback |
| `WORKER_LOG_LEVEL` | `info` | production logging |
| `WORKER_MAX_BODY_BYTES` | `262144` | request size guardrail |
| `WORKER_MAX_CONCURRENT_TASKS` | `1` | start conservative; scale after profiling |
| `WORKER_MAX_QUEUE_SIZE` | `100` | queue backpressure |
| `WORKER_TASK_TIMEOUT_MS` | `180000` | scrape timeout |
| `WORKER_CALLBACK_URL` | `https://api-...run.app/api/job-sources/complete` | explicit callback target |
| `WORKER_CALLBACK_OIDC_AUDIENCE` | `https://api-...run.app` | preferred callback auth mode |
| `WORKER_CALLBACK_SIGNING_SECRET` | `<secret>` | optional signature hardening |
| `WORKER_CALLBACK_RETRY_ATTEMPTS` | `3` | retry budget |
| `WORKER_CALLBACK_RETRY_BACKOFF_MS` | `1000` | base retry delay |
| `WORKER_CALLBACK_RETRY_MAX_DELAY_MS` | `10000` | cap retry delay |
| `WORKER_CALLBACK_RETRY_JITTER_PCT` | `0.2` | retry jitter |
| `WORKER_HEARTBEAT_INTERVAL_MS` | `10000` | progress heartbeat cadence |
| `PLAYWRIGHT_HEADLESS` | `true` | production browser mode |

### Queue Provisioning Defaults (deploy script)

| Name | Default | Notes |
|---|---|---|
| `WORKER_TASKS_QUEUE` | `worker-scrape` | main worker ingestion queue |
| `WORKER_TASKS_DLQ` | `worker-scrape-dlq` | reserved queue for operational dead-letter flows |
| `TASKS_MAX_ATTEMPTS` | `8` | queue retry policy |
| `TASKS_MIN_BACKOFF_SEC` | `5` | queue retry policy |
| `TASKS_MAX_BACKOFF_SEC` | `300` | queue retry policy |
| `TASKS_MAX_DOUBLINGS` | `5` | queue retry policy |
| `TASKS_MAX_RETRY_DURATION_SEC` | `1800` | queue retry policy |

### Cloud Run Service Settings (Recommended Baseline)

| Setting | Value |
|---|---|
| Ingress | all (or internal if API and worker are private) |
| Authentication | allow unauthenticated only if token/oidc enforced at app level |
| Min instances | 0 |
| CPU | 1 |
| Memory | 1Gi |

## Web Service (`apps/web`)

### Required Runtime Environment

| Name | Source | Example | Rule |
|---|---|---|---|
| `NODE_ENV` | literal | `production` | must be `production` |
| `PORT` | Cloud Run | `8080` | auto-provided by Cloud Run |
| `NEXT_PUBLIC_API_URL` | env | `https://api-...run.app/api` | include `/api` suffix |
| `NEXT_PUBLIC_WORKER_URL` | env | `https://worker-...run.app` | used by tester tooling |
| `NEXT_PUBLIC_ENABLE_TESTER` | env | `false` | disable tester in production |
| `NEXT_PUBLIC_GOOGLE_OAUTH_CLIENT_ID` | build arg/env | `<google-client-id>` | enables web Google OAuth redirect flow |
| `NEXT_PUBLIC_QUERY_STALE_TIME_MS` | env | `30000` | default query cache freshness window |
| `NEXT_PUBLIC_QUERY_REFETCH_ON_WINDOW_FOCUS` | env | `false` | disable focus refetch by default |
| `NEXT_PUBLIC_QUERY_DIAGNOSTICS_REFETCH_MS` | env | `60000` | diagnostics polling interval |

### Cloud Run Service Settings (Recommended Baseline)

| Setting | Value |
|---|---|
| Ingress | all |
| Authentication | allow unauthenticated |
| Min instances | 0 |
| CPU | 1 |
| Memory | 512Mi |

## 3) Promotion Input Validation Rules

`Promote To Prod` workflow expects:

1. `release_sha` must be full 40-char git SHA.
2. All required `vars.*` and `secrets.*` listed above must be present.

## 4) First Production Rollout Sequence

1. Merge to `master` with green CI (`CI Verify`, `Smoke Gate`).
2. Create and push RC tag:
   - `git tag rc-YYYYMMDD-01`
   - `git push origin rc-YYYYMMDD-01`
3. Confirm `Release Candidate` built and pushed all three images.
4. Run `Promote To Prod` with the RC commit SHA.
5. Confirm post-deploy health verification passes.
6. Run smoke against deployed services:
   - `API_BASE_URL=<api-url> WORKER_BASE_URL=<worker-url> WEB_BASE_URL=<web-url> SMOKE_SKIP_SEED=true pnpm smoke:e2e`

## 5) Queue/Auth Contract

- API enqueue provider should be `WORKER_TASK_PROVIDER=cloud-tasks` in production.
- Worker ingress auth can be:
  - OIDC (recommended): API signs task OIDC (`WORKER_TASKS_SERVICE_ACCOUNT_EMAIL`) and worker pins `TASKS_SERVICE_ACCOUNT_EMAIL`.
  - Shared token fallback: API `WORKER_AUTH_TOKEN` + worker `TASKS_AUTH_TOKEN`.

## 6) Schedule Automation Contract

- `deploy-cloud-run-prod.sh` now upserts a Cloud Scheduler HTTP job after API deploy.
- Target endpoint: `POST ${API_URL}/api/job-sources/schedule/trigger`.
- Auth header: `Authorization: Bearer ${SCHEDULER_AUTH_TOKEN}`.
- Default cadence: every 10 minutes (`*/10 * * * *`) in `Etc/UTC`.
- Reconcile endpoint: `POST ${API_URL}/api/ops/reconcile-stale-runs`.
- Reconcile auth header: `Authorization: Bearer ${OPS_INTERNAL_TOKEN}`.
- Reconcile cadence default: every 15 minutes (`*/15 * * * *`) in `Etc/UTC`.
