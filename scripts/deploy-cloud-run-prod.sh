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
fi

MAIL_HOST="${MAIL_HOST:-smtp.sendgrid.net}"
MAIL_PORT="${MAIL_PORT:-587}"
MAIL_SECURE="${MAIL_SECURE:-false}"
ACCESS_TOKEN_EXPIRATION="${ACCESS_TOKEN_EXPIRATION:-15m}"
REFRESH_TOKEN_EXPIRATION="${REFRESH_TOKEN_EXPIRATION:-30d}"
WORKER_TASKS_QUEUE="${WORKER_TASKS_QUEUE:-worker-scrape}"
ALLOWED_ORIGINS="${ALLOWED_ORIGINS:-}"

IMAGE_BASE="${GCP_REGION}-docker.pkg.dev/${GCP_PROJECT_ID}/${GAR_REPOSITORY}"
API_RUNTIME_SA="${GCP_API_RUNTIME_SERVICE_ACCOUNT:-api-runtime@${GCP_PROJECT_ID}.iam.gserviceaccount.com}"
WORKER_RUNTIME_SA="${GCP_WORKER_RUNTIME_SERVICE_ACCOUNT:-worker-runtime@${GCP_PROJECT_ID}.iam.gserviceaccount.com}"
WEB_RUNTIME_SA="${GCP_WEB_RUNTIME_SERVICE_ACCOUNT:-web-runtime@${GCP_PROJECT_ID}.iam.gserviceaccount.com}"

if [[ "$DEPLOY_API" == "true" || "$DEPLOY_WORKER" == "true" ]]; then
  echo "Ensuring runtime infra..."
  gcloud tasks queues describe "$WORKER_TASKS_QUEUE" --location="$GCP_REGION" --project="$GCP_PROJECT_ID" >/dev/null 2>&1 || \
    gcloud tasks queues create "$WORKER_TASKS_QUEUE" --location="$GCP_REGION" --project="$GCP_PROJECT_ID" >/dev/null
fi

echo "Syncing runtime secrets..."
if [[ "$DEPLOY_API" == "true" ]]; then
  upsert_secret "app-database-url" "$DATABASE_URL"
  upsert_secret "app-access-token-secret" "$ACCESS_TOKEN_SECRET"
  upsert_secret "app-refresh-token-secret" "$REFRESH_TOKEN_SECRET"
  upsert_secret "app-mail-username" "$MAIL_USERNAME"
  upsert_secret "app-mail-password" "$MAIL_PASSWORD"
fi
if [[ "$DEPLOY_API" == "true" || "$DEPLOY_WORKER" == "true" ]]; then
  upsert_secret "app-worker-shared-token" "$WORKER_SHARED_TOKEN"
  upsert_secret "app-worker-callback-token" "$WORKER_CALLBACK_TOKEN"
fi

API_URL="$(resolve_service_url "$GCP_API_SERVICE")"
WORKER_URL="$(resolve_service_url "$GCP_WORKER_SERVICE")"
WEB_URL="$(resolve_service_url "$GCP_WEB_SERVICE")"

if [[ "$DEPLOY_WORKER" == "true" ]]; then
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
    --set-env-vars="NODE_ENV=production,QUEUE_PROVIDER=cloud-tasks,TASKS_PROJECT_ID=${GCP_PROJECT_ID},TASKS_LOCATION=${GCP_REGION},TASKS_QUEUE=${WORKER_TASKS_QUEUE},TASKS_URL=${WORKER_TASK_URL},PLAYWRIGHT_HEADLESS=true,WORKER_MAX_CONCURRENT_TASKS=1,WORKER_MAX_QUEUE_SIZE=20,WORKER_TASK_TIMEOUT_MS=180000" \
    >/dev/null

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

  echo "Deploy api..."
  API_ALLOWED_ORIGINS="$ALLOWED_ORIGINS"
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
    --set-secrets="DATABASE_URL=app-database-url:latest,ACCESS_TOKEN_SECRET=app-access-token-secret:latest,REFRESH_TOKEN_SECRET=app-refresh-token-secret:latest,MAIL_USERNAME=app-mail-username:latest,MAIL_PASSWORD=app-mail-password:latest,WORKER_AUTH_TOKEN=app-worker-shared-token:latest,WORKER_CALLBACK_TOKEN=app-worker-callback-token:latest" \
    --set-env-vars="NODE_ENV=production,HOST=0.0.0.0,ACCESS_TOKEN_EXPIRATION=${ACCESS_TOKEN_EXPIRATION},REFRESH_TOKEN_EXPIRATION=${REFRESH_TOKEN_EXPIRATION},MAIL_HOST=${MAIL_HOST},MAIL_PORT=${MAIL_PORT},MAIL_SECURE=${MAIL_SECURE},GCS_BUCKET=${GCS_BUCKET},GCP_PROJECT_ID=${GCP_PROJECT_ID},GCP_LOCATION=${GCP_REGION},API_PREFIX=api,ALLOWED_ORIGINS=${API_ALLOWED_ORIGINS},WORKER_TASK_PROVIDER=cloud-tasks,WORKER_TASK_URL=${WORKER_URL}/tasks,WORKER_TASKS_PROJECT_ID=${GCP_PROJECT_ID},WORKER_TASKS_LOCATION=${GCP_REGION},WORKER_TASKS_QUEUE=${WORKER_TASKS_QUEUE}" \
    >/dev/null

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
    --set-env-vars="NODE_ENV=production,NEXT_PUBLIC_API_URL=${API_URL}/api,NEXT_PUBLIC_WORKER_URL=${WORKER_URL},NEXT_PUBLIC_ENABLE_TESTER=false" \
    >/dev/null

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
    --set-env-vars="NODE_ENV=production,QUEUE_PROVIDER=cloud-tasks,TASKS_PROJECT_ID=${GCP_PROJECT_ID},TASKS_LOCATION=${GCP_REGION},TASKS_QUEUE=${WORKER_TASKS_QUEUE},TASKS_URL=${WORKER_URL}/tasks,WORKER_CALLBACK_URL=${API_URL}/api/job-sources/complete,PLAYWRIGHT_HEADLESS=true,WORKER_MAX_CONCURRENT_TASKS=1,WORKER_MAX_QUEUE_SIZE=20,WORKER_TASK_TIMEOUT_MS=180000" \
    >/dev/null
fi

if [[ "$DEPLOY_API" == "true" && -z "$ALLOWED_ORIGINS" ]]; then
  if [[ -z "$WEB_URL" ]]; then
    WEB_URL="$(resolve_service_url "$GCP_WEB_SERVICE")"
  fi

  if [[ -n "$WEB_URL" ]]; then
    echo "Finalize API allowed origins from deployed web URL..."
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
      --set-secrets="DATABASE_URL=app-database-url:latest,ACCESS_TOKEN_SECRET=app-access-token-secret:latest,REFRESH_TOKEN_SECRET=app-refresh-token-secret:latest,MAIL_USERNAME=app-mail-username:latest,MAIL_PASSWORD=app-mail-password:latest,WORKER_AUTH_TOKEN=app-worker-shared-token:latest,WORKER_CALLBACK_TOKEN=app-worker-callback-token:latest" \
      --set-env-vars="NODE_ENV=production,HOST=0.0.0.0,ACCESS_TOKEN_EXPIRATION=${ACCESS_TOKEN_EXPIRATION},REFRESH_TOKEN_EXPIRATION=${REFRESH_TOKEN_EXPIRATION},MAIL_HOST=${MAIL_HOST},MAIL_PORT=${MAIL_PORT},MAIL_SECURE=${MAIL_SECURE},GCS_BUCKET=${GCS_BUCKET},GCP_PROJECT_ID=${GCP_PROJECT_ID},GCP_LOCATION=${GCP_REGION},API_PREFIX=api,ALLOWED_ORIGINS=${WEB_URL},WORKER_TASK_PROVIDER=cloud-tasks,WORKER_TASK_URL=${WORKER_URL}/tasks,WORKER_TASKS_PROJECT_ID=${GCP_PROJECT_ID},WORKER_TASKS_LOCATION=${GCP_REGION},WORKER_TASKS_QUEUE=${WORKER_TASKS_QUEUE}" \
      >/dev/null
  fi
fi

echo "API_URL=${API_URL}"
echo "WORKER_URL=${WORKER_URL}"
echo "WEB_URL=${WEB_URL}"

VERIFY_API="$DEPLOY_API" VERIFY_WORKER="$DEPLOY_WORKER" VERIFY_WEB="$DEPLOY_WEB" API_BASE_URL="$API_URL" WORKER_BASE_URL="$WORKER_URL" WEB_BASE_URL="$WEB_URL" ./scripts/verify-deployment.sh
