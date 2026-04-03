#!/usr/bin/env bash
set -euo pipefail

MODE="${1:-deploy-prod-on-main}"

require_var() {
  local name="$1"
  if [[ -z "${!name:-}" ]]; then
    echo "Missing required env var: ${name}" >&2
    exit 1
  fi
}

require_https_url() {
  local name="$1"
  local value="${!name:-}"
  case "$value" in
    https://*) return 0 ;;
    *)
      echo "Expected ${name} to be https URL, got: ${value}" >&2
      exit 1
      ;;
  esac
}

require_common() {
  require_var GCP_PROJECT_ID
  require_var GCP_REGION
  require_var GAR_REPOSITORY
  require_var GCP_API_SERVICE
  require_var GCP_WORKER_SERVICE
  require_var GCP_WEB_SERVICE
  require_var GCP_WORKLOAD_IDENTITY_PROVIDER
  require_var GCP_DEPLOYER_SERVICE_ACCOUNT
}

case "$MODE" in
  deploy-prod-on-main)
    require_common
    require_var RELEASE_SHA
    require_var GCS_BUCKET
    require_var GEMINI_MODEL
    require_var GOOGLE_OAUTH_CLIENT_ID
    require_var GCP_WEB_BASE_URL
    require_var GOOGLE_OAUTH_CLIENT_SECRET
    require_var SCHEDULER_AUTH_TOKEN
    require_var OPS_INTERNAL_TOKEN
    ;;
  promote-to-prod)
    require_common
    require_var RELEASE_SHA
    require_var GCS_BUCKET
    require_var GEMINI_MODEL
    require_var GOOGLE_OAUTH_CLIENT_ID
    require_var GCP_WEB_BASE_URL
    require_var GOOGLE_OAUTH_CLIENT_SECRET
    require_var SCHEDULER_AUTH_TOKEN
    require_var OPS_INTERNAL_TOKEN
    ;;
  *)
    echo "Unknown mode: ${MODE}" >&2
    exit 1
    ;;
esac

echo "Deploy contract validation passed for mode=${MODE}"
