#!/usr/bin/env bash
set -euo pipefail

require_var() {
  local name="$1"
  if [[ -z "${!name:-}" ]]; then
    echo "Missing required env var: $name" >&2
    exit 1
  fi
}

VERIFY_RETRIES="${VERIFY_RETRIES:-12}"
VERIFY_DELAY_SEC="${VERIFY_DELAY_SEC:-5}"

API_REASON=""
WORKER_REASON=""
WEB_REASON=""
API_OK=false
WORKER_OK=false
WEB_OK=false

request_code() {
  local method="$1"
  local url="$2"
  local body="${3:-}"
  shift 3 || true
  local extra_curl_args=("$@")

  if [[ -n "$body" ]]; then
    curl -sS -o /tmp/verify-body.json -w "%{http_code}" -X "$method" "$url" \
      -H "Content-Type: application/json" \
      --data "$body" \
      "${extra_curl_args[@]}"
  else
    curl -sS -o /tmp/verify-body.json -w "%{http_code}" -X "$method" "$url" "${extra_curl_args[@]}"
  fi
}

with_retries() {
  local name="$1"
  local check_fn="$2"
  local attempt=1
  while (( attempt <= VERIFY_RETRIES )); do
    if "$check_fn"; then
      echo "${name} verification OK on attempt ${attempt}"
      return 0
    fi
    echo "${name} verification attempt ${attempt}/${VERIFY_RETRIES} failed"
    if (( attempt < VERIFY_RETRIES )); then
      sleep "$VERIFY_DELAY_SEC"
    fi
    attempt=$((attempt + 1))
  done
  return 1
}

verify_api() {
  local health_code
  health_code="$(request_code "GET" "${API_BASE_URL%/}/health" "")"
  if [[ "$health_code" != "200" ]]; then
    API_REASON="api-health-${health_code}"
    return 1
  fi

  local auth_probe_code
  auth_probe_code="$(request_code "GET" "${API_BASE_URL%/}/api/job-sources/runs" "")"
  if [[ "$auth_probe_code" != "401" && "$auth_probe_code" != "403" ]]; then
    API_REASON="api-auth-probe-${auth_probe_code}"
    return 1
  fi

  API_REASON=""
  return 0
}

verify_worker() {
  local health_code
  health_code="$(request_code "GET" "${WORKER_BASE_URL%/}/health" "")"
  if [[ "$health_code" != "200" ]]; then
    WORKER_REASON="worker-health-${health_code}"
    return 1
  fi

  local auth_probe_code
  auth_probe_code="$(request_code "POST" "${WORKER_BASE_URL%/}/tasks" "{}")"
  if [[ "$auth_probe_code" != "401" ]]; then
    WORKER_REASON="worker-auth-probe-${auth_probe_code}"
    return 1
  fi

  WORKER_REASON=""
  return 0
}

verify_web() {
  local health_code
  health_code="$(request_code "GET" "${WEB_BASE_URL%/}/health" "")"
  if [[ "$health_code" != "200" ]]; then
    WEB_REASON="web-health-${health_code}"
    return 1
  fi

  local web_code
  web_code="$(curl -sS -D /tmp/verify-web-headers.txt -o /tmp/verify-web-index.html -w "%{http_code}" "${WEB_BASE_URL%/}/")"
  if [[ "$web_code" != "200" && "$web_code" != "307" && "$web_code" != "308" ]]; then
    WEB_REASON="web-root-${web_code}"
    return 1
  fi
  if ! grep -qi "content-type: text/html" /tmp/verify-web-headers.txt; then
    WEB_REASON="web-root-content-type"
    return 1
  fi

  WEB_REASON=""
  return 0
}

require_var API_BASE_URL
require_var WORKER_BASE_URL
require_var WEB_BASE_URL

VERIFY_API="${VERIFY_API:-true}"
VERIFY_WORKER="${VERIFY_WORKER:-true}"
VERIFY_WEB="${VERIFY_WEB:-true}"

if [[ "${VERIFY_API}" == "true" ]]; then
  with_retries "api" verify_api && API_OK=true || API_OK=false
fi

if [[ "${VERIFY_WORKER}" == "true" ]]; then
  with_retries "worker" verify_worker && WORKER_OK=true || WORKER_OK=false
fi

if [[ "${VERIFY_WEB}" == "true" ]]; then
  with_retries "web" verify_web && WEB_OK=true || WEB_OK=false
fi

SUMMARY_FILE="${VERIFY_SUMMARY_FILE:-deployment-verify-summary.json}"
cat > "$SUMMARY_FILE" <<JSON
{
  "api": { "enabled": ${VERIFY_API}, "ok": ${API_OK}, "reason": "$(printf "%s" "$API_REASON")" },
  "worker": { "enabled": ${VERIFY_WORKER}, "ok": ${WORKER_OK}, "reason": "$(printf "%s" "$WORKER_REASON")" },
  "web": { "enabled": ${VERIFY_WEB}, "ok": ${WEB_OK}, "reason": "$(printf "%s" "$WEB_REASON")" }
}
JSON

cat "$SUMMARY_FILE"

if [[ "$VERIFY_API" == "true" && "$API_OK" != "true" ]]; then
  echo "Deployment verification failed for API: ${API_REASON}" >&2
  exit 1
fi
if [[ "$VERIFY_WORKER" == "true" && "$WORKER_OK" != "true" ]]; then
  echo "Deployment verification failed for Worker: ${WORKER_REASON}" >&2
  exit 1
fi
if [[ "$VERIFY_WEB" == "true" && "$WEB_OK" != "true" ]]; then
  echo "Deployment verification failed for Web: ${WEB_REASON}" >&2
  exit 1
fi

echo "Deployment verification passed."
