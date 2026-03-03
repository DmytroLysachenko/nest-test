# GCP Deploy Matrix

Canonical runtime/deploy contract for Google Cloud Run production deployments.

Last updated: 2026-03-03

## 1) Repository-Level CI/CD Inputs

### Required GitHub Variables (`vars.*`)

| Name | Used by | Notes |
|---|---|---|
| `GCP_PROJECT_ID` | release-candidate, promote-to-prod | GCP project id |
| `GCP_REGION` | release-candidate, promote-to-prod | Cloud Run + Artifact Registry region |
| `GAR_REPOSITORY` | release-candidate, promote-to-prod | Artifact Registry Docker repository |
| `GCP_API_SERVICE` | promote-to-prod | Cloud Run service name for API |
| `GCP_WORKER_SERVICE` | promote-to-prod | Cloud Run service name for Worker |
| `GCP_WEB_SERVICE` | promote-to-prod | Cloud Run service name for Web |
| `GCP_API_BASE_URL` | promote-to-prod | Public API base URL (`https://...`) |
| `GCP_WORKER_BASE_URL` | promote-to-prod | Public Worker base URL (`https://...`) |
| `GCP_WEB_BASE_URL` | promote-to-prod | Public Web base URL (`https://...`) |

### Required GitHub Secrets (`secrets.*`)

| Name | Used by | Notes |
|---|---|---|
| `GCP_WORKLOAD_IDENTITY_PROVIDER` | release-candidate, promote-to-prod | GitHub OIDC provider resource |
| `GCP_DEPLOYER_SERVICE_ACCOUNT` | release-candidate, promote-to-prod | CI deployer service account email |

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
| `WORKER_REQUEST_TIMEOUT_MS` | `5000` | API wait timeout for worker accept response |

### Cloud Run Service Settings (Recommended Baseline)

| Setting | Value |
|---|---|
| Ingress | all (or internal+LB if fronted) |
| Authentication | allow unauthenticated (public API/web flow) |
| Min instances | 1 |
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

### Cloud Run Service Settings (Recommended Baseline)

| Setting | Value |
|---|---|
| Ingress | all (or internal if API and worker are private) |
| Authentication | allow unauthenticated only if token/oidc enforced at app level |
| Min instances | 1 |
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

### Cloud Run Service Settings (Recommended Baseline)

| Setting | Value |
|---|---|
| Ingress | all |
| Authentication | allow unauthenticated |
| Min instances | 1 |
| CPU | 1 |
| Memory | 512Mi |

## 3) Promotion Input Validation Rules

`Promote To Prod` workflow expects:

1. `release_sha` must be full 40-char git SHA.
2. `GCP_API_BASE_URL`, `GCP_WORKER_BASE_URL`, `GCP_WEB_BASE_URL` must be `https://`.
3. All required `vars.*` and `secrets.*` listed above must be present.

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
