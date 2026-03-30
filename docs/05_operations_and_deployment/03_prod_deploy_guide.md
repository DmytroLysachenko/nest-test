# Production Deployment Guide (GCP + Cloud Run)

Step-by-step checklist to deploy this monorepo to production and keep it auto-updated from `main`.

Last updated: 2026-03-03

## 1) One-time GCP bootstrap

1. Set your shell variables:
   - `PROJECT_ID=<your-gcp-project>`
   - `REGION=<your-region>` (example: `us-central1`)
   - `GAR_REPOSITORY=<artifact-registry-repo>`
   - `API_SERVICE=<cloud-run-api-service-name>`
   - `WORKER_SERVICE=<cloud-run-worker-service-name>`
   - `WEB_SERVICE=<cloud-run-web-service-name>`
   - `BUCKET_NAME=<existing-gcs-bucket>`
2. Enable required APIs:
   - `gcloud services enable run.googleapis.com artifactregistry.googleapis.com secretmanager.googleapis.com cloudtasks.googleapis.com iamcredentials.googleapis.com`
3. Create Artifact Registry Docker repo (if missing):
   - `gcloud artifacts repositories create $GAR_REPOSITORY --repository-format=docker --location=$REGION`
4. Create Cloud Tasks queue:
   - `gcloud tasks queues create worker-scrape --location=$REGION`

## 2) Service accounts and IAM

1. Create deployer SA for GitHub Actions:
   - `deployer@${PROJECT_ID}.iam.gserviceaccount.com`
2. Grant deployer roles:
   - `roles/run.admin`
   - `roles/artifactregistry.writer`
   - `roles/iam.serviceAccountUser`
3. Create runtime SA(s):
   - API runtime SA
   - Worker runtime SA
   - Web runtime SA
4. Grant runtime permissions:
   - API runtime: Secret Manager accessor, Cloud Tasks enqueuer.
   - Worker runtime: Secret Manager accessor.
   - Web runtime: minimum required runtime access.

## 3) Secret Manager values

Create secrets and versions for values used by API/Worker:

1. `DATABASE_URL`
2. `ACCESS_TOKEN_SECRET`
3. `REFRESH_TOKEN_SECRET`
4. `MAIL_USERNAME`
5. `MAIL_PASSWORD`
6. Optional hardening:
   - `WORKER_AUTH_TOKEN`
   - `WORKER_CALLBACK_SIGNING_SECRET`

## 4) Configure Cloud Run runtime env

Use `docs/05_operations_and_deployment/04_gcp_deploy_matrix.md` as canonical source.

Required core values:

1. API:
   - `NODE_ENV=production`
   - `HOST=0.0.0.0`
   - `GCS_BUCKET=<BUCKET_NAME>`
   - `ALLOWED_ORIGINS=https://<your-web-domain>`
   - `WORKER_TASK_PROVIDER=cloud-tasks`
   - `WORKER_TASK_URL=https://<worker-url>/tasks`
   - `WORKER_TASKS_PROJECT_ID=<PROJECT_ID>`
   - `WORKER_TASKS_LOCATION=<REGION>`
   - `WORKER_TASKS_QUEUE=worker-scrape`
2. Worker:
   - `NODE_ENV=production`
   - `QUEUE_PROVIDER=cloud-tasks`
   - `TASKS_PROJECT_ID=<PROJECT_ID>`
   - `TASKS_LOCATION=<REGION>`
   - `TASKS_QUEUE=worker-scrape`
   - `TASKS_URL=https://<worker-url>/tasks`
   - `DATABASE_URL=<same production database>`
3. Web:
   - `NODE_ENV=production`
   - `NEXT_PUBLIC_API_URL=https://<api-url>/api`
   - `NEXT_PUBLIC_WORKER_URL=https://<worker-url>`
   - `NEXT_PUBLIC_ENABLE_TESTER=false`

## 5) Configure GitHub Actions OIDC and production config

1. Create Workload Identity Pool + Provider in GCP.
2. Allow your GitHub repo to impersonate `GCP_DEPLOYER_SERVICE_ACCOUNT`.
3. Add GitHub production variables:
   - `GCP_PROJECT_ID`
   - `GCP_REGION`
   - `GAR_REPOSITORY`
   - `GCP_API_SERVICE`
   - `GCP_WORKER_SERVICE`
   - `GCP_WEB_SERVICE`
   - `GCS_BUCKET`
   - Core runtime vars:
     - `GOOGLE_OAUTH_CLIENT_ID`
     - `GEMINI_MODEL`
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
   - Optional runtime vars:
     - `GCP_API_RUNTIME_SERVICE_ACCOUNT`
     - `GCP_WORKER_RUNTIME_SERVICE_ACCOUNT`
     - `GCP_WEB_RUNTIME_SERVICE_ACCOUNT`
     - `ACCESS_TOKEN_EXPIRATION` (default `15m`)
     - `REFRESH_TOKEN_EXPIRATION` (default `30d`)
     - `MAIL_HOST` (default `smtp.sendgrid.net`)
     - `MAIL_PORT` (default `587`)
     - `MAIL_SECURE` (default `false`)
      - `WORKER_TASKS_QUEUE` (default `worker-scrape`)
      - `ALLOWED_ORIGINS` (optional; if empty, workflow auto-uses deployed web URL)
4. Add GitHub production secrets for app runtime:
   - `DATABASE_URL` (Neon connection string)
   - `ACCESS_TOKEN_SECRET`
   - `REFRESH_TOKEN_SECRET`
   - `MAIL_USERNAME`
   - `MAIL_PASSWORD`
   - `GOOGLE_OAUTH_CLIENT_SECRET`
   - `WORKER_SHARED_TOKEN`
   - `WORKER_CALLBACK_TOKEN`
   - `SCHEDULER_AUTH_TOKEN`
   - `OPS_INTERNAL_TOKEN`

## 6) CI/CD behavior in this repo

Current pipeline after this setup:

1. Push to `main` (or `master`) triggers `CI Verify`.
2. If `CI Verify` succeeds, `Deploy Prod On Main` workflow runs automatically.
3. It builds/pushes Docker images (`api`, `worker`, `web`) tagged with commit SHA.
4. It syncs runtime secrets to Secret Manager.
5. It deploys Worker -> API -> Web, resolves service URLs dynamically, finalizes callback/CORS config, and verifies health.

Cost profile defaults:

1. `min-instances=0` for all services (cold starts enabled to minimize idle cost).
2. API/Web memory `512Mi`, Worker memory `1Gi`.
3. Max instances capped at `2` per service by default.

## 7) First production test

1. Commit and push a small change to `main`.
2. Confirm workflows:
   - `CI Verify` -> green
   - `Deploy Prod On Main` -> green
3. Run smoke against production:
   - `API_BASE_URL=<api-url> WORKER_BASE_URL=<worker-url> WEB_BASE_URL=<web-url> SMOKE_SKIP_SEED=true pnpm smoke:e2e`

## 8) Rollback

1. Find previous working image tag (commit SHA) in Artifact Registry.
2. Redeploy specific service revision:
   - `gcloud run deploy <service> --image=<region>-docker.pkg.dev/<project>/<repo>/<app>:<old_sha> --region=<region> --project=<project>`
3. Verify health:
   - `GET <api-url>/health`
   - `GET <worker-url>/health`
   - `GET <web-url>/health`
