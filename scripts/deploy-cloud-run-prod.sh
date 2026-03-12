#!/usr/bin/env bash
set -euo pipefail

require_var() {
  local name="$1"
  if [[ -z "${!name:-}" ]]; then
    echo "Missing required env var: $name" >&2
    exit 1
  fi
}

upsert_secret() {
  local name="$1"
  local value="$2"
  if ! gcloud secrets describe "$name" --project="$GCP_PROJECT_ID" >/dev/null 2>&1; then
    gcloud secrets create "$name" --project="$GCP_PROJECT_ID" --replication-policy="automatic" >/dev/null
  fi
  printf "%s" "$value" | gcloud secrets versions add "$name" --project="$GCP_PROJECT_ID" --data-file=- >/dev/null
}

resolve_service_url() {
  local service="$1"
  gcloud run services describe "$service" --project="$GCP_PROJECT_ID" --region="$GCP_REGION" --format='value(status.url)' 2>/dev/null || true
}

resolve_service_urls_csv() {
  local service="$1"
  local urls_raw=""
  local status_url=""

  urls_raw="$(gcloud run services describe "$service" --project="$GCP_PROJECT_ID" --region="$GCP_REGION" --format="value(metadata.annotations.'run.googleapis.com/urls')" 2>/dev/null || true)"
  urls_raw="${urls_raw//[[:space:]]/}"
  urls_raw="${urls_raw#[}"
  urls_raw="${urls_raw%]}"
  urls_raw="${urls_raw//\"/}"

  if [[ -n "$urls_raw" ]]; then
    echo "$urls_raw"
    return
  fi

  status_url="$(resolve_service_url "$service")"
  echo "$status_url"
}

merge_csv_unique() {
  local merged=""
  local csv=""
  local value=""
  local values=()

  for csv in "$@"; do
    [[ -z "$csv" ]] && continue
    IFS=',' read -r -a values <<< "$csv"
    for value in "${values[@]}"; do
      value="$(echo "$value" | xargs)"
      [[ -z "$value" ]] && continue
      if [[ ",$merged," != *",$value,"* ]]; then
        if [[ -z "$merged" ]]; then
          merged="$value"
        else
          merged="${merged},${value}"
        fi
      fi
    done
  done

  echo "$merged"
}

ensure_tasks_queue() {
  local queue_name="$1"
  local location="$2"
  local max_attempts="$3"
  local min_backoff_sec="$4"
  local max_backoff_sec="$5"
  local max_doublings="$6"
  local max_retry_duration_sec="$7"

  gcloud tasks queues describe "$queue_name" --location="$location" --project="$GCP_PROJECT_ID" >/dev/null 2>&1 || \
    gcloud tasks queues create "$queue_name" --location="$location" --project="$GCP_PROJECT_ID" >/dev/null

  gcloud tasks queues update "$queue_name" \
    --location="$location" \
    --project="$GCP_PROJECT_ID" \
    --max-attempts="$max_attempts" \
    --min-backoff="${min_backoff_sec}s" \
    --max-backoff="${max_backoff_sec}s" \
    --max-doublings="$max_doublings" \
    --max-retry-duration="${max_retry_duration_sec}s" \
    >/dev/null
}

resolve_service_sha() {
  local service="$1"
  gcloud run services describe "$service" \
    --project="$GCP_PROJECT_ID" \
    --region="$GCP_REGION" \
    --format='value(spec.template.spec.containers[0].image)' 2>/dev/null | rev | cut -d: -f1 | rev || echo ""
}

upsert_scheduler_job() {
  local job_name="$1"
  local schedule="$2"
  local timezone="$3"
  local uri="$4"
  local token="$5"

  echo "Syncing scheduler job: $job_name ($schedule)"
  
  # We use ^|^ delimiter to safely handle the space in "Bearer token".
  # Also using --update-headers as per gcloud documentation.
  local headers="^|^Authorization=Bearer ${token}|Content-Type=application/json"

  if gcloud scheduler jobs describe "$job_name" --project="$GCP_PROJECT_ID" --location="$GCP_REGION" >/dev/null 2>&1; then
    gcloud scheduler jobs update http "$job_name" \
      --project="$GCP_PROJECT_ID" \
      --location="$GCP_REGION" \
      --schedule="$schedule" \
      --time-zone="$timezone" \
      --uri="$uri" \
      --http-method=POST \
      --update-headers="$headers" \
      --message-body='{}' \
      --attempt-deadline=30s \
      >/dev/null
  else
    gcloud scheduler jobs create http "$job_name" \
      --project="$GCP_PROJECT_ID" \
      --location="$GCP_REGION" \
      --schedule="$schedule" \
      --time-zone="$timezone" \
      --uri="$uri" \
      --http-method=POST \
      --headers="$headers" \
      --message-body='{}' \
      --attempt-deadline=30s \
      >/dev/null
  fi
}

ensure_service_enabled() {
  local service="$1"
  if ! gcloud services list --enabled --project="$GCP_PROJECT_ID" --format='value(config.name)' | grep -qx "$service"; then
    gcloud services enable "$service" --project="$GCP_PROJECT_ID" >/dev/null
  fi
}

require_var GCP_PROJECT_ID
require_var GCP_REGION
require_var GAR_REPOSITORY
require_var RELEASE_SHA
require_var GCP_API_SERVICE
require_var GCP_WORKER_SERVICE
require_var GCP_WEB_SERVICE
require_var GCS_BUCKET

DEPLOY_API="${DEPLOY_API:-true}"
DEPLOY_WORKER="${DEPLOY_WORKER:-true}"
DEPLOY_WEB="${DEPLOY_WEB:-true}"

if [[ "$DEPLOY_API" != "true" && "$DEPLOY_WORKER" != "true" && "$DEPLOY_WEB" != "true" ]]; then
  echo "No services marked for deployment. Skipping."
  exit 0
fi

if [[ "$DEPLOY_API" == "true" || "$DEPLOY_WORKER" == "true" ]]; then
  require_var WORKER_SHARED_TOKEN
  require_var WORKER_CALLBACK_TOKEN
fi

if [[ "$DEPLOY_API" == "true" ]]; then
  require_var DATABASE_URL
  require_var ACCESS_TOKEN_SECRET
  require_var REFRESH_TOKEN_SECRET
  require_var MAIL_USERNAME
  require_var MAIL_PASSWORD
  require_var GEMINI_MODEL
  require_var GOOGLE_OAUTH_CLIENT_ID
  require_var GOOGLE_OAUTH_CLIENT_SECRET
  require_var SCHEDULER_AUTH_TOKEN
  require_var OPS_INTERNAL_TOKEN
fi

MAIL_HOST="${MAIL_HOST:-smtp.sendgrid.net}"
MAIL_PORT="${MAIL_PORT:-587}"
MAIL_SECURE="${MAIL_SECURE:-false}"
ACCESS_TOKEN_EXPIRATION="${ACCESS_TOKEN_EXPIRATION:-15m}"
REFRESH_TOKEN_EXPIRATION="${REFRESH_TOKEN_EXPIRATION:-30d}"
WORKER_TASKS_QUEUE="${WORKER_TASKS_QUEUE:-worker-scrape}"
WORKER_TASKS_DLQ="${WORKER_TASKS_DLQ:-worker-scrape-dlq}"
TASKS_MAX_ATTEMPTS="${TASKS_MAX_ATTEMPTS:-8}"
TASKS_MIN_BACKOFF_SEC="${TASKS_MIN_BACKOFF_SEC:-5}"
TASKS_MAX_BACKOFF_SEC="${TASKS_MAX_BACKOFF_SEC:-300}"
TASKS_MAX_DOUBLINGS="${TASKS_MAX_DOUBLINGS:-5}"
TASKS_MAX_RETRY_DURATION_SEC="${TASKS_MAX_RETRY_DURATION_SEC:-1800}"
ALLOWED_ORIGINS="${ALLOWED_ORIGINS:-}"
WORKER_ALLOWED_ORIGINS="${WORKER_ALLOWED_ORIGINS:-${ALLOWED_ORIGINS:-https://example.com}}"
API_THROTTLE_TTL_MS="${API_THROTTLE_TTL_MS:-60000}"
API_THROTTLE_LIMIT="${API_THROTTLE_LIMIT:-60}"
AUTH_LOGIN_THROTTLE_TTL_MS="${AUTH_LOGIN_THROTTLE_TTL_MS:-60000}"
AUTH_LOGIN_THROTTLE_LIMIT="${AUTH_LOGIN_THROTTLE_LIMIT:-5}"
AUTH_REFRESH_THROTTLE_TTL_MS="${AUTH_REFRESH_THROTTLE_TTL_MS:-60000}"
AUTH_REFRESH_THROTTLE_LIMIT="${AUTH_REFRESH_THROTTLE_LIMIT:-10}"
AUTH_REGISTER_THROTTLE_TTL_MS="${AUTH_REGISTER_THROTTLE_TTL_MS:-60000}"
AUTH_REGISTER_THROTTLE_LIMIT="${AUTH_REGISTER_THROTTLE_LIMIT:-3}"
AUTH_OTP_THROTTLE_TTL_MS="${AUTH_OTP_THROTTLE_TTL_MS:-60000}"
AUTH_OTP_THROTTLE_LIMIT="${AUTH_OTP_THROTTLE_LIMIT:-3}"
WEB_QUERY_STALE_TIME_MS="${WEB_QUERY_STALE_TIME_MS:-30000}"
WEB_QUERY_REFETCH_ON_WINDOW_FOCUS="${WEB_QUERY_REFETCH_ON_WINDOW_FOCUS:-false}"
WEB_QUERY_DIAGNOSTICS_REFETCH_MS="${WEB_QUERY_DIAGNOSTICS_REFETCH_MS:-60000}"

# DEFAULT SCHEDULES: Dramatically reduced to save budget and allow 0-scaling
SCHEDULER_JOB_NAME="${SCHEDULER_JOB_NAME:-job-seek-schedule-trigger}"
SCHEDULER_CRON="${SCHEDULER_CRON:-0 */12 * * *}" # Every 12 hours instead of 4
SCHEDULER_TIMEZONE="${SCHEDULER_TIMEZONE:-Europe/Warsaw}"

OPS_RECONCILE_JOB_NAME="${OPS_RECONCILE_JOB_NAME:-job-seek-reconcile-stale-runs}"
OPS_RECONCILE_CRON="${OPS_RECONCILE_CRON:-0 2 * * *}" # Every 24 hours (at 2:00 AM) instead of 6
OPS_RECONCILE_TIMEZONE="${OPS_RECONCILE_TIMEZONE:-Europe/Warsaw}"

IMAGE_BASE="${GCP_REGION}-docker.pkg.dev/${GCP_PROJECT_ID}/${GAR_REPOSITORY}"
API_RUNTIME_SA="${GCP_API_RUNTIME_SERVICE_ACCOUNT:-api-runtime@${GCP_PROJECT_ID}.iam.gserviceaccount.com}"
WORKER_RUNTIME_SA="${GCP_WORKER_RUNTIME_SERVICE_ACCOUNT:-worker-runtime@${GCP_PROJECT_ID}.iam.gserviceaccount.com}"
WEB_RUNTIME_SA="${GCP_WEB_RUNTIME_SERVICE_ACCOUNT:-web-runtime@${GCP_PROJECT_ID}.iam.gserviceaccount.com}"

if [[ "$DEPLOY_API" == "true" || "$DEPLOY_WORKER" == "true" ]]; then
  echo "Ensuring runtime infra..."
  ensure_tasks_queue \
    "$WORKER_TASKS_QUEUE" \
    "$GCP_REGION" \
    "$TASKS_MAX_ATTEMPTS" \
    "$TASKS_MIN_BACKOFF_SEC" \
    "$TASKS_MAX_BACKOFF_SEC" \
    "$TASKS_MAX_DOUBLINGS" \
    "$TASKS_MAX_RETRY_DURATION_SEC"
  ensure_tasks_queue \
    "$WORKER_TASKS_DLQ" \
    "$GCP_REGION" \
    "$TASKS_MAX_ATTEMPTS" \
    "$TASKS_MIN_BACKOFF_SEC" \
    "$TASKS_MAX_BACKOFF_SEC" \
    "$TASKS_MAX_DOUBLINGS" \
    "$TASKS_MAX_RETRY_DURATION_SEC"
fi

echo "Syncing runtime secrets..."
if [[ "$DEPLOY_API" == "true" ]]; then
  upsert_secret "app-database-url" "$DATABASE_URL"
  upsert_secret "app-access-token-secret" "$ACCESS_TOKEN_SECRET"
  upsert_secret "app-refresh-token-secret" "$REFRESH_TOKEN_SECRET"
  upsert_secret "app-mail-username" "$MAIL_USERNAME"
  upsert_secret "app-mail-password" "$MAIL_PASSWORD"
  upsert_secret "app-google-oauth-client-secret" "$GOOGLE_OAUTH_CLIENT_SECRET"
fi
if [[ "$DEPLOY_API" == "true" || "$DEPLOY_WORKER" == "true" ]]; then
  upsert_secret "app-worker-shared-token" "$WORKER_SHARED_TOKEN"
  upsert_secret "app-worker-callback-token" "$WORKER_CALLBACK_TOKEN"
fi
if [[ "$DEPLOY_API" == "true" ]]; then
  upsert_secret "app-scheduler-auth-token" "$SCHEDULER_AUTH_TOKEN"
  upsert_secret "app-ops-internal-token" "$OPS_INTERNAL_TOKEN"
fi

API_URL="$(resolve_service_url "$GCP_API_SERVICE")"
WORKER_URL="$(resolve_service_url "$GCP_WORKER_SERVICE")"
WEB_URL="$(resolve_service_url "$GCP_WEB_SERVICE")"
WEB_URLS_CSV="$(resolve_service_urls_csv "$GCP_WEB_SERVICE")"

if [[ "$DEPLOY_WORKER" == "true" ]]; then
  CURRENT_WORKER_SHA="$(resolve_service_sha "$GCP_WORKER_SERVICE")"
  if [[ "$CURRENT_WORKER_SHA" == "$RELEASE_SHA" ]]; then
    echo "Worker is already at SHA $RELEASE_SHA. Skipping deploy."
  else
    echo "Deploy worker (pass 1)..."
    WORKER_TASK_URL="https://example.com/tasks"
    if [[ -n "$WORKER_URL" ]]; then
      WORKER_TASK_URL="${WORKER_URL%/}/tasks"
    fi

    gcloud run deploy "$GCP_WORKER_SERVICE" \
      --project="$GCP_PROJECT_ID" \
      --region="$GCP_REGION" \
      --platform=managed \
      --image="${IMAGE_BASE}/worker:${RELEASE_SHA}" \
      --allow-unauthenticated \
      --service-account="$WORKER_RUNTIME_SA" \
      --min-instances=0 \
      --max-instances=2 \
      --cpu=1 \
      --memory=1Gi \
      --set-secrets="TASKS_AUTH_TOKEN=app-worker-shared-token:latest,WORKER_CALLBACK_TOKEN=app-worker-callback-token:latest" \
      --set-env-vars="^|^NODE_ENV=production|WORKER_ALLOWED_ORIGINS=${WORKER_ALLOWED_ORIGINS}|QUEUE_PROVIDER=cloud-tasks|TASKS_PROJECT_ID=${GCP_PROJECT_ID}|TASKS_LOCATION=${GCP_REGION}|TASKS_QUEUE=${WORKER_TASKS_QUEUE}|TASKS_URL=${WORKER_TASK_URL}|PLAYWRIGHT_HEADLESS=true|WORKER_MAX_CONCURRENT_TASKS=1|WORKER_MAX_QUEUE_SIZE=20|WORKER_TASK_TIMEOUT_MS=180000" \
      >/dev/null
  fi

  WORKER_URL="$(resolve_service_url "$GCP_WORKER_SERVICE")"
  if [[ -z "$WORKER_URL" ]]; then
    echo "Unable to resolve worker URL after deploy." >&2
    exit 1
  fi
fi

if [[ "$DEPLOY_API" == "true" ]]; then
  if [[ -z "$WORKER_URL" ]]; then
    WORKER_URL="$(resolve_service_url "$GCP_WORKER_SERVICE")"
  fi
  if [[ -z "$WORKER_URL" ]]; then
    echo "Worker URL is required to deploy API." >&2
    exit 1
  fi

  CURRENT_API_SHA="$(resolve_service_sha "$GCP_API_SERVICE")"
  if [[ "$CURRENT_API_SHA" == "$RELEASE_SHA" ]]; then
    echo "API is already at SHA $RELEASE_SHA. Skipping deploy."
  else
    echo "Deploy api..."
    API_ALLOWED_ORIGINS="$(merge_csv_unique "$ALLOWED_ORIGINS" "$WEB_URLS_CSV")"
    if [[ -z "$API_ALLOWED_ORIGINS" ]]; then
      API_ALLOWED_ORIGINS="https://example.com"
    fi

    gcloud run deploy "$GCP_API_SERVICE" \
      --project="$GCP_PROJECT_ID" \
      --region="$GCP_REGION" \
      --platform=managed \
      --image="${IMAGE_BASE}/api:${RELEASE_SHA}" \
      --allow-unauthenticated \
      --service-account="$API_RUNTIME_SA" \
      --min-instances=0 \
      --max-instances=2 \
      --cpu=1 \
      --memory=512Mi \
      --set-secrets="DATABASE_URL=app-database-url:latest,ACCESS_TOKEN_SECRET=app-access-token-secret:latest,REFRESH_TOKEN_SECRET=app-refresh-token-secret:latest,MAIL_USERNAME=app-mail-username:latest,MAIL_PASSWORD=app-mail-password:latest,GOOGLE_OAUTH_CLIENT_SECRET=app-google-oauth-client-secret:latest,WORKER_AUTH_TOKEN=app-worker-shared-token:latest,WORKER_CALLBACK_TOKEN=app-worker-callback-token:latest,SCHEDULER_AUTH_TOKEN=app-scheduler-auth-token:latest,OPS_INTERNAL_TOKEN=app-ops-internal-token:latest" \
      --set-env-vars="^|^NODE_ENV=production|HOST=0.0.0.0|ACCESS_TOKEN_EXPIRATION=${ACCESS_TOKEN_EXPIRATION}|REFRESH_TOKEN_EXPIRATION=${REFRESH_TOKEN_EXPIRATION}|MAIL_HOST=${MAIL_HOST}|MAIL_PORT=${MAIL_PORT}|MAIL_SECURE=${MAIL_SECURE}|GCS_BUCKET=${GCS_BUCKET}|GCP_PROJECT_ID=${GCP_PROJECT_ID}|GCP_LOCATION=${GCP_REGION}|GEMINI_MODEL=${GEMINI_MODEL}|GOOGLE_OAUTH_CLIENT_ID=${GOOGLE_OAUTH_CLIENT_ID}|API_PREFIX=api|ALLOWED_ORIGINS=${API_ALLOWED_ORIGINS}|API_THROTTLE_TTL_MS=${API_THROTTLE_TTL_MS}|API_THROTTLE_LIMIT=${API_THROTTLE_LIMIT}|AUTH_LOGIN_THROTTLE_TTL_MS=${AUTH_LOGIN_THROTTLE_TTL_MS}|AUTH_LOGIN_THROTTLE_LIMIT=${AUTH_LOGIN_THROTTLE_LIMIT}|AUTH_REFRESH_THROTTLE_TTL_MS=${AUTH_REFRESH_THROTTLE_TTL_MS}|AUTH_REFRESH_THROTTLE_LIMIT=${AUTH_REFRESH_THROTTLE_LIMIT}|AUTH_REGISTER_THROTTLE_TTL_MS=${AUTH_REGISTER_THROTTLE_TTL_MS}|AUTH_REGISTER_THROTTLE_LIMIT=${AUTH_REGISTER_THROTTLE_LIMIT}|AUTH_OTP_THROTTLE_TTL_MS=${AUTH_OTP_THROTTLE_TTL_MS}|AUTH_OTP_THROTTLE_LIMIT=${AUTH_OTP_THROTTLE_LIMIT}|WORKER_TASK_PROVIDER=cloud-tasks|WORKER_TASK_URL=${WORKER_URL}/tasks|WORKER_TASKS_PROJECT_ID=${GCP_PROJECT_ID}|WORKER_TASKS_LOCATION=${GCP_REGION}|WORKER_TASKS_QUEUE=${WORKER_TASKS_QUEUE}" \
      >/dev/null
  fi

  API_URL="$(resolve_service_url "$GCP_API_SERVICE")"
  if [[ -z "$API_URL" ]]; then
    echo "Unable to resolve API URL after deploy." >&2
    exit 1
  fi
fi

if [[ "$DEPLOY_WEB" == "true" ]]; then
  if [[ -z "$API_URL" ]]; then
    API_URL="$(resolve_service_url "$GCP_API_SERVICE")"
  fi
  if [[ -z "$WORKER_URL" ]]; then
    WORKER_URL="$(resolve_service_url "$GCP_WORKER_SERVICE")"
  fi
  if [[ -z "$API_URL" || -z "$WORKER_URL" ]]; then
    echo "API and Worker URLs are required to deploy Web." >&2
    exit 1
  fi

  CURRENT_WEB_SHA="$(resolve_service_sha "$GCP_WEB_SERVICE")"
  if [[ "$CURRENT_WEB_SHA" == "$RELEASE_SHA" ]]; then
    echo "Web is already at SHA $RELEASE_SHA. Skipping deploy."
  else
    echo "Deploy web..."
    gcloud run deploy "$GCP_WEB_SERVICE" \
      --project="$GCP_PROJECT_ID" \
      --region="$GCP_REGION" \
      --platform=managed \
      --image="${IMAGE_BASE}/web:${RELEASE_SHA}" \
      --allow-unauthenticated \
      --service-account="$WEB_RUNTIME_SA" \
      --min-instances=0 \
      --max-instances=2 \
      --cpu=1 \
      --memory=512Mi \
      --set-env-vars="^|^NODE_ENV=production|NEXT_PUBLIC_API_URL=${API_URL}/api|NEXT_PUBLIC_WORKER_URL=${WORKER_URL}|NEXT_PUBLIC_ENABLE_TESTER=false|NEXT_PUBLIC_QUERY_STALE_TIME_MS=${WEB_QUERY_STALE_TIME_MS}|NEXT_PUBLIC_QUERY_REFETCH_ON_WINDOW_FOCUS=${WEB_QUERY_REFETCH_ON_WINDOW_FOCUS}|NEXT_PUBLIC_QUERY_DIAGNOSTICS_REFETCH_MS=${WEB_QUERY_DIAGNOSTICS_REFETCH_MS}" \
      >/dev/null
  fi

  WEB_URL="$(resolve_service_url "$GCP_WEB_SERVICE")"
  if [[ -z "$WEB_URL" ]]; then
    echo "Unable to resolve Web URL after deploy." >&2
    exit 1
  fi
fi

if [[ "$DEPLOY_WORKER" == "true" ]]; then
  if [[ -z "$API_URL" ]]; then
    API_URL="$(resolve_service_url "$GCP_API_SERVICE")"
  fi
  if [[ -z "$API_URL" || -z "$WORKER_URL" ]]; then
    echo "API and Worker URLs are required to finalize worker callback URL." >&2
    exit 1
  fi

  echo "Finalize worker callback URL..."
  gcloud run deploy "$GCP_WORKER_SERVICE" \
    --project="$GCP_PROJECT_ID" \
    --region="$GCP_REGION" \
    --platform=managed \
    --image="${IMAGE_BASE}/worker:${RELEASE_SHA}" \
    --allow-unauthenticated \
    --service-account="$WORKER_RUNTIME_SA" \
    --min-instances=0 \
    --max-instances=2 \
    --cpu=1 \
    --memory=1Gi \
    --set-secrets="TASKS_AUTH_TOKEN=app-worker-shared-token:latest,WORKER_CALLBACK_TOKEN=app-worker-callback-token:latest" \
    --set-env-vars="^|^NODE_ENV=production|WORKER_ALLOWED_ORIGINS=${WORKER_ALLOWED_ORIGINS}|QUEUE_PROVIDER=cloud-tasks|TASKS_PROJECT_ID=${GCP_PROJECT_ID}|TASKS_LOCATION=${GCP_REGION}|TASKS_QUEUE=${WORKER_TASKS_QUEUE}|TASKS_URL=${WORKER_TASK_URL}|WORKER_CALLBACK_URL=${API_URL}/api/job-sources/complete|PLAYWRIGHT_HEADLESS=true|WORKER_MAX_CONCURRENT_TASKS=1|WORKER_MAX_QUEUE_SIZE=20|WORKER_TASK_TIMEOUT_MS=180000" \
    >/dev/null
fi

if [[ "$DEPLOY_API" == "true" ]]; then
  WEB_URLS_CSV="$(resolve_service_urls_csv "$GCP_WEB_SERVICE")"
  FINAL_API_ALLOWED_ORIGINS="$(merge_csv_unique "$ALLOWED_ORIGINS" "$WEB_URLS_CSV")"
  if [[ -n "$FINAL_API_ALLOWED_ORIGINS" ]]; then
    echo "Finalize API allowed origins from deployed web URLs..."
    # Always run final sync if deploy was requested, to ensure allowed origins are fresh
    gcloud run deploy "$GCP_API_SERVICE" \
      --project="$GCP_PROJECT_ID" \
      --region="$GCP_REGION" \
      --platform=managed \
      --image="${IMAGE_BASE}/api:${RELEASE_SHA}" \
      --allow-unauthenticated \
      --service-account="$API_RUNTIME_SA" \
      --min-instances=0 \
      --max-instances=2 \
      --cpu=1 \
      --memory=512Mi \
      --set-secrets="DATABASE_URL=app-database-url:latest,ACCESS_TOKEN_SECRET=app-access-token-secret:latest,REFRESH_TOKEN_SECRET=app-refresh-token-secret:latest,MAIL_USERNAME=app-mail-username:latest,MAIL_PASSWORD=app-mail-password:latest,GOOGLE_OAUTH_CLIENT_SECRET=app-google-oauth-client-secret:latest,WORKER_AUTH_TOKEN=app-worker-shared-token:latest,WORKER_CALLBACK_TOKEN=app-worker-callback-token:latest,SCHEDULER_AUTH_TOKEN=app-scheduler-auth-token:latest,OPS_INTERNAL_TOKEN=app-ops-internal-token:latest" \
      --set-env-vars="^|^NODE_ENV=production|HOST=0.0.0.0|ACCESS_TOKEN_EXPIRATION=${ACCESS_TOKEN_EXPIRATION}|REFRESH_TOKEN_EXPIRATION=${REFRESH_TOKEN_EXPIRATION}|MAIL_HOST=${MAIL_HOST}|MAIL_PORT=${MAIL_PORT}|MAIL_SECURE=${MAIL_SECURE}|GCS_BUCKET=${GCS_BUCKET}|GCP_PROJECT_ID=${GCP_PROJECT_ID}|GCP_LOCATION=${GCP_REGION}|GEMINI_MODEL=${GEMINI_MODEL}|GOOGLE_OAUTH_CLIENT_ID=${GOOGLE_OAUTH_CLIENT_ID}|API_PREFIX=api|ALLOWED_ORIGINS=${FINAL_API_ALLOWED_ORIGINS}|API_THROTTLE_TTL_MS=${API_THROTTLE_TTL_MS}|API_THROTTLE_LIMIT=${API_THROTTLE_LIMIT}|AUTH_LOGIN_THROTTLE_TTL_MS=${AUTH_LOGIN_THROTTLE_TTL_MS}|AUTH_LOGIN_THROTTLE_LIMIT=${AUTH_LOGIN_THROTTLE_LIMIT}|AUTH_REFRESH_THROTTLE_TTL_MS=${AUTH_REFRESH_THROTTLE_TTL_MS}|AUTH_REFRESH_THROTTLE_LIMIT=${AUTH_REFRESH_THROTTLE_LIMIT}|AUTH_REGISTER_THROTTLE_TTL_MS=${AUTH_REGISTER_THROTTLE_TTL_MS}|AUTH_REGISTER_THROTTLE_LIMIT=${AUTH_REGISTER_THROTTLE_LIMIT}|AUTH_OTP_THROTTLE_TTL_MS=${AUTH_OTP_THROTTLE_TTL_MS}|AUTH_OTP_THROTTLE_LIMIT=${AUTH_OTP_THROTTLE_LIMIT}|WORKER_TASK_PROVIDER=cloud-tasks|WORKER_TASK_URL=${WORKER_URL}/tasks|WORKER_TASKS_PROJECT_ID=${GCP_PROJECT_ID}|WORKER_TASKS_LOCATION=${GCP_REGION}|WORKER_TASKS_QUEUE=${WORKER_TASKS_QUEUE}" \
      >/dev/null
  fi
fi

if [[ "$DEPLOY_API" == "true" ]]; then
  ensure_service_enabled "cloudscheduler.googleapis.com"
  echo "Ensure Cloud Scheduler trigger job..."
  upsert_scheduler_job \
    "$SCHEDULER_JOB_NAME" \
    "$SCHEDULER_CRON" \
    "$SCHEDULER_TIMEZONE" \
    "${API_URL}/api/job-sources/schedule/trigger" \
    "$SCHEDULER_AUTH_TOKEN"
  echo "Ensure Cloud Scheduler stale-run reconcile job..."
  upsert_scheduler_job \
    "$OPS_RECONCILE_JOB_NAME" \
    "$OPS_RECONCILE_CRON" \
    "$OPS_RECONCILE_TIMEZONE" \
    "${API_URL}/api/ops/reconcile-stale-runs" \
    "$OPS_INTERNAL_TOKEN"
fi

echo "API_URL=${API_URL}"
echo "WORKER_URL=${WORKER_URL}"
echo "WEB_URL=${WEB_URL}"

VERIFY_API="$DEPLOY_API" VERIFY_WORKER="$DEPLOY_WORKER" VERIFY_WEB="$DEPLOY_WEB" API_BASE_URL="$API_URL" WORKER_BASE_URL="$WORKER_URL" WEB_BASE_URL="$WEB_URL" ./scripts/verify-deployment.sh
