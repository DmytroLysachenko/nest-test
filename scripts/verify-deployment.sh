#!/usr/bin/env bash
set -euo pipefail

require_var() {
  local name="$1"
  if [[ -z "${!name:-}" ]]; then
    echo "Missing required env var: $name" >&2
    exit 1
  fi
}

check_health() {
  local url="$1"
  local name="$2"
  local code
  code="$(curl -sS -o /tmp/${name}-health.json -w "%{http_code}" "${url}")"
  if [[ "${code}" != "200" ]]; then
    echo "${name} health check failed: status=${code} url=${url}" >&2
    cat "/tmp/${name}-health.json" >&2 || true
    exit 1
  fi
  echo "${name} health check OK (${url})"
}

require_var API_BASE_URL
require_var WORKER_BASE_URL
require_var WEB_BASE_URL

check_health "${API_BASE_URL%/}/health" "api"
check_health "${WORKER_BASE_URL%/}/health" "worker"
check_health "${WEB_BASE_URL%/}/health" "web"

echo "Deployment verification passed."
