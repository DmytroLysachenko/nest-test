param(
  [string]$Repo = "DmytroLysachenko/nest-test",
  [string]$ProjectId = "job-seeking-service",
  [string]$Region = "europe-west1",
  [string]$GarRepository = "nest-test",
  [string]$ApiService = "job-seek-api",
  [string]$WorkerService = "job-seek-worker",
  [string]$WebService = "job-seek-web",
  [string]$Bucket = "job-seeking-bucket",
  [string]$Provider = "projects/842434374136/locations/global/workloadIdentityPools/github-pool/providers/github-provider",
  [string]$DeployerServiceAccount = "github-deployer@job-seeking-service.iam.gserviceaccount.com"
)

$ErrorActionPreference = "Stop"
$gh = "C:\Program Files\GitHub CLI\gh.exe"

if (-not (Test-Path $gh)) {
  throw "GitHub CLI not found at: $gh"
}

function Get-EnvValue {
  param([string[]]$FilePaths, [string]$Key)

  foreach ($filePath in $FilePaths) {
    if (-not (Test-Path $filePath)) {
      continue
    }

    $line = Get-Content $filePath | Where-Object { $_ -match "^\s*$Key=" } | Select-Object -First 1
    if (-not $line) {
      continue
    }

    $raw = $line.Split("=", 2)[1]
    $clean = ($raw -replace "\s+#.*$", "").Trim()

    if (
      ($clean.StartsWith('"') -and $clean.EndsWith('"')) -or
      ($clean.StartsWith("'") -and $clean.EndsWith("'"))
    ) {
      $clean = $clean.Substring(1, $clean.Length - 2)
    }

    return $clean
  }

  return $null
}

function Ensure-NonEmpty {
  param([string]$Name, [string]$Value)
  if ([string]::IsNullOrWhiteSpace($Value)) {
    throw "Missing required value: $Name"
  }
}

function Set-RepoVar {
  param([string]$Name, [string]$Value)
  if (-not [string]::IsNullOrWhiteSpace($Value)) {
    & $gh variable set $Name --repo $Repo --body $Value
  }
}

function Set-RepoSecret {
  param([string]$Name, [string]$Value)
  if (-not [string]::IsNullOrWhiteSpace($Value)) {
    & $gh secret set $Name --repo $Repo --body $Value
  }
}

$apiProdFiles = @("apps/api/.env.prod", "apps/api/.env")
$workerProdFiles = @("apps/worker/.env.prod", "apps/worker/.env")
$webProdFiles = @("apps/web/.env.prod", "apps/web/.env")

$dbUrl = Get-EnvValue $apiProdFiles "DATABASE_URL"
$accessTokenSecret = Get-EnvValue $apiProdFiles "ACCESS_TOKEN_SECRET"
$refreshTokenSecret = Get-EnvValue $apiProdFiles "REFRESH_TOKEN_SECRET"
$mailUsername = Get-EnvValue $apiProdFiles "MAIL_USERNAME"
$mailPassword = Get-EnvValue $apiProdFiles "MAIL_PASSWORD"
$mailHost = Get-EnvValue $apiProdFiles "MAIL_HOST"
$mailPort = Get-EnvValue $apiProdFiles "MAIL_PORT"
$mailSecure = Get-EnvValue $apiProdFiles "MAIL_SECURE"
$accessExp = Get-EnvValue $apiProdFiles "ACCESS_TOKEN_EXPIRATION"
$refreshExp = Get-EnvValue $apiProdFiles "REFRESH_TOKEN_EXPIRATION"
$allowedOrigins = Get-EnvValue $apiProdFiles "ALLOWED_ORIGINS"
$googleOauthClientId = Get-EnvValue $apiProdFiles "GOOGLE_OAUTH_CLIENT_ID"
$googleOauthClientSecret = Get-EnvValue $apiProdFiles "GOOGLE_OAUTH_CLIENT_SECRET"
$geminiModel = Get-EnvValue $apiProdFiles "GEMINI_MODEL"
$workerTasksQueue = Get-EnvValue $apiProdFiles "WORKER_TASKS_QUEUE"
$apiThrottleTtlMs = Get-EnvValue $apiProdFiles "API_THROTTLE_TTL_MS"
$apiThrottleLimit = Get-EnvValue $apiProdFiles "API_THROTTLE_LIMIT"
$authLoginThrottleTtlMs = Get-EnvValue $apiProdFiles "AUTH_LOGIN_THROTTLE_TTL_MS"
$authLoginThrottleLimit = Get-EnvValue $apiProdFiles "AUTH_LOGIN_THROTTLE_LIMIT"
$authRefreshThrottleTtlMs = Get-EnvValue $apiProdFiles "AUTH_REFRESH_THROTTLE_TTL_MS"
$authRefreshThrottleLimit = Get-EnvValue $apiProdFiles "AUTH_REFRESH_THROTTLE_LIMIT"
$authRegisterThrottleTtlMs = Get-EnvValue $apiProdFiles "AUTH_REGISTER_THROTTLE_TTL_MS"
$authRegisterThrottleLimit = Get-EnvValue $apiProdFiles "AUTH_REGISTER_THROTTLE_LIMIT"
$authOtpThrottleTtlMs = Get-EnvValue $apiProdFiles "AUTH_OTP_THROTTLE_TTL_MS"
$authOtpThrottleLimit = Get-EnvValue $apiProdFiles "AUTH_OTP_THROTTLE_LIMIT"
$workerRequestTimeoutMs = Get-EnvValue $apiProdFiles "WORKER_REQUEST_TIMEOUT_MS"
$workerTaskMaxPayloadBytes = Get-EnvValue $apiProdFiles "WORKER_TASK_MAX_PAYLOAD_BYTES"
$apiBodyLimit = Get-EnvValue $apiProdFiles "API_BODY_LIMIT"
$diskHealthThreshold = Get-EnvValue $apiProdFiles "DISK_HEALTH_THRESHOLD"
$schedulerTriggerBatchSize = Get-EnvValue $apiProdFiles "SCHEDULER_TRIGGER_BATCH_SIZE"
$workspaceSummaryCacheTtlSec = Get-EnvValue $apiProdFiles "WORKSPACE_SUMMARY_CACHE_TTL_SEC"
$jobSourceDiagnosticsWindowHours = Get-EnvValue $apiProdFiles "JOB_SOURCE_DIAGNOSTICS_WINDOW_HOURS"
$documentDiagnosticsWindowHours = Get-EnvValue $apiProdFiles "DOCUMENT_DIAGNOSTICS_WINDOW_HOURS"
$scrapeDbReuseHours = Get-EnvValue $apiProdFiles "SCRAPE_DB_REUSE_HOURS"
$scrapeMaxActiveRunsPerUser = Get-EnvValue $apiProdFiles "SCRAPE_MAX_ACTIVE_RUNS_PER_USER"
$scrapeDailyEnqueueLimitPerUser = Get-EnvValue $apiProdFiles "SCRAPE_DAILY_ENQUEUE_LIMIT_PER_USER"
$scrapeEnqueueIdempotencyTtlSec = Get-EnvValue $apiProdFiles "SCRAPE_ENQUEUE_IDEMPOTENCY_TTL_SEC"
$scrapeMaxRetryChainDepth = Get-EnvValue $apiProdFiles "SCRAPE_MAX_RETRY_CHAIN_DEPTH"
$scrapeStalePendingMinutes = Get-EnvValue $apiProdFiles "SCRAPE_STALE_PENDING_MINUTES"
$scrapeStaleRunningMinutes = Get-EnvValue $apiProdFiles "SCRAPE_STALE_RUNNING_MINUTES"
$autoScoreOnIngest = Get-EnvValue $apiProdFiles "AUTO_SCORE_ON_INGEST"
$autoScoreConcurrency = Get-EnvValue $apiProdFiles "AUTO_SCORE_CONCURRENCY"
$autoScoreMinScore = Get-EnvValue $apiProdFiles "AUTO_SCORE_MIN_SCORE"
$autoScoreRetryAttempts = Get-EnvValue $apiProdFiles "AUTO_SCORE_RETRY_ATTEMPTS"
$notebookApproxViolationPenalty = Get-EnvValue $apiProdFiles "NOTEBOOK_APPROX_VIOLATION_PENALTY"
$notebookApproxMaxViolationPenalty = Get-EnvValue $apiProdFiles "NOTEBOOK_APPROX_MAX_VIOLATION_PENALTY"
$notebookApproxScoredBonus = Get-EnvValue $apiProdFiles "NOTEBOOK_APPROX_SCORED_BONUS"
$notebookExploreUnscoredBase = Get-EnvValue $apiProdFiles "NOTEBOOK_EXPLORE_UNSCORED_BASE"
$notebookExploreRecencyWeight = Get-EnvValue $apiProdFiles "NOTEBOOK_EXPLORE_RECENCY_WEIGHT"

$workerAllowedOrigins = Get-EnvValue $workerProdFiles "WORKER_ALLOWED_ORIGINS"
$workerSharedToken = Get-EnvValue $workerProdFiles "TASKS_AUTH_TOKEN"
$workerCallbackToken = Get-EnvValue @($apiProdFiles + $workerProdFiles) "WORKER_CALLBACK_TOKEN"
$workerTasksDlq = Get-EnvValue @($apiProdFiles + $workerProdFiles) "WORKER_TASKS_DLQ"
$tasksMaxAttempts = Get-EnvValue @($apiProdFiles + $workerProdFiles) "TASKS_MAX_ATTEMPTS"
$tasksMinBackoffSec = Get-EnvValue @($apiProdFiles + $workerProdFiles) "TASKS_MIN_BACKOFF_SEC"
$tasksMaxBackoffSec = Get-EnvValue @($apiProdFiles + $workerProdFiles) "TASKS_MAX_BACKOFF_SEC"
$tasksMaxDoublings = Get-EnvValue @($apiProdFiles + $workerProdFiles) "TASKS_MAX_DOUBLINGS"
$tasksMaxRetryDurationSec = Get-EnvValue @($apiProdFiles + $workerProdFiles) "TASKS_MAX_RETRY_DURATION_SEC"
$workerCpu = Get-EnvValue $workerProdFiles "WORKER_CPU"
$workerMemory = Get-EnvValue $workerProdFiles "WORKER_MEMORY"
$workerMaxInstances = Get-EnvValue $workerProdFiles "WORKER_MAX_INSTANCES"
$workerMinInstances = Get-EnvValue $workerProdFiles "WORKER_MIN_INSTANCES"

$webQueryStaleTimeMs = Get-EnvValue $webProdFiles "NEXT_PUBLIC_QUERY_STALE_TIME_MS"
$webQueryRefetchOnWindowFocus = Get-EnvValue $webProdFiles "NEXT_PUBLIC_QUERY_REFETCH_ON_WINDOW_FOCUS"
$webQueryDiagnosticsRefetchMs = Get-EnvValue $webProdFiles "NEXT_PUBLIC_QUERY_DIAGNOSTICS_REFETCH_MS"

Ensure-NonEmpty "DATABASE_URL" $dbUrl
Ensure-NonEmpty "ACCESS_TOKEN_SECRET" $accessTokenSecret
Ensure-NonEmpty "REFRESH_TOKEN_SECRET" $refreshTokenSecret
Ensure-NonEmpty "MAIL_USERNAME" $mailUsername
Ensure-NonEmpty "MAIL_PASSWORD" $mailPassword
Ensure-NonEmpty "GOOGLE_OAUTH_CLIENT_ID" $googleOauthClientId
Ensure-NonEmpty "GOOGLE_OAUTH_CLIENT_SECRET" $googleOauthClientSecret
Ensure-NonEmpty "GEMINI_MODEL" $geminiModel
Ensure-NonEmpty "WORKER_SHARED_TOKEN (TASKS_AUTH_TOKEN in apps/worker/.env.prod)" $workerSharedToken
Ensure-NonEmpty "WORKER_CALLBACK_TOKEN (WORKER_CALLBACK_TOKEN in apps/api/.env.prod or apps/worker/.env.prod)" $workerCallbackToken

if ([string]::IsNullOrWhiteSpace($mailHost)) { $mailHost = "smtp.sendgrid.net" }
if ([string]::IsNullOrWhiteSpace($mailPort)) { $mailPort = "587" }
if ([string]::IsNullOrWhiteSpace($mailSecure)) { $mailSecure = "false" }
if ([string]::IsNullOrWhiteSpace($accessExp)) { $accessExp = "15m" }
if ([string]::IsNullOrWhiteSpace($refreshExp)) { $refreshExp = "30d" }
if ([string]::IsNullOrWhiteSpace($workerTasksQueue)) { $workerTasksQueue = "worker-scrape" }
if ([string]::IsNullOrWhiteSpace($workerTasksDlq)) { $workerTasksDlq = "worker-scrape-dlq" }
if ([string]::IsNullOrWhiteSpace($tasksMaxAttempts)) { $tasksMaxAttempts = "8" }
if ([string]::IsNullOrWhiteSpace($tasksMinBackoffSec)) { $tasksMinBackoffSec = "5" }
if ([string]::IsNullOrWhiteSpace($tasksMaxBackoffSec)) { $tasksMaxBackoffSec = "300" }
if ([string]::IsNullOrWhiteSpace($tasksMaxDoublings)) { $tasksMaxDoublings = "5" }
if ([string]::IsNullOrWhiteSpace($tasksMaxRetryDurationSec)) { $tasksMaxRetryDurationSec = "1800" }
if ([string]::IsNullOrWhiteSpace($apiThrottleTtlMs)) { $apiThrottleTtlMs = "60000" }
if ([string]::IsNullOrWhiteSpace($apiThrottleLimit)) { $apiThrottleLimit = "120" }
if ([string]::IsNullOrWhiteSpace($authLoginThrottleTtlMs)) { $authLoginThrottleTtlMs = "60000" }
if ([string]::IsNullOrWhiteSpace($authLoginThrottleLimit)) { $authLoginThrottleLimit = "5" }
if ([string]::IsNullOrWhiteSpace($authRefreshThrottleTtlMs)) { $authRefreshThrottleTtlMs = "60000" }
if ([string]::IsNullOrWhiteSpace($authRefreshThrottleLimit)) { $authRefreshThrottleLimit = "10" }
if ([string]::IsNullOrWhiteSpace($authRegisterThrottleTtlMs)) { $authRegisterThrottleTtlMs = "60000" }
if ([string]::IsNullOrWhiteSpace($authRegisterThrottleLimit)) { $authRegisterThrottleLimit = "3" }
if ([string]::IsNullOrWhiteSpace($authOtpThrottleTtlMs)) { $authOtpThrottleTtlMs = "60000" }
if ([string]::IsNullOrWhiteSpace($authOtpThrottleLimit)) { $authOtpThrottleLimit = "3" }
if ([string]::IsNullOrWhiteSpace($workerRequestTimeoutMs)) { $workerRequestTimeoutMs = "5000" }
if ([string]::IsNullOrWhiteSpace($workerTaskMaxPayloadBytes)) { $workerTaskMaxPayloadBytes = "262144" }
if ([string]::IsNullOrWhiteSpace($apiBodyLimit)) { $apiBodyLimit = "1mb" }
if ([string]::IsNullOrWhiteSpace($diskHealthThreshold)) { $diskHealthThreshold = "0.98" }
if ([string]::IsNullOrWhiteSpace($schedulerTriggerBatchSize)) { $schedulerTriggerBatchSize = "20" }
if ([string]::IsNullOrWhiteSpace($workspaceSummaryCacheTtlSec)) { $workspaceSummaryCacheTtlSec = "0" }
if ([string]::IsNullOrWhiteSpace($jobSourceDiagnosticsWindowHours)) { $jobSourceDiagnosticsWindowHours = "72" }
if ([string]::IsNullOrWhiteSpace($documentDiagnosticsWindowHours)) { $documentDiagnosticsWindowHours = "168" }
if ([string]::IsNullOrWhiteSpace($scrapeDbReuseHours)) { $scrapeDbReuseHours = "24" }
if ([string]::IsNullOrWhiteSpace($scrapeMaxActiveRunsPerUser)) { $scrapeMaxActiveRunsPerUser = "2" }
if ([string]::IsNullOrWhiteSpace($scrapeDailyEnqueueLimitPerUser)) { $scrapeDailyEnqueueLimitPerUser = "40" }
if ([string]::IsNullOrWhiteSpace($scrapeEnqueueIdempotencyTtlSec)) { $scrapeEnqueueIdempotencyTtlSec = "30" }
if ([string]::IsNullOrWhiteSpace($scrapeMaxRetryChainDepth)) { $scrapeMaxRetryChainDepth = "5" }
if ([string]::IsNullOrWhiteSpace($scrapeStalePendingMinutes)) { $scrapeStalePendingMinutes = "15" }
if ([string]::IsNullOrWhiteSpace($scrapeStaleRunningMinutes)) { $scrapeStaleRunningMinutes = "60" }
if ([string]::IsNullOrWhiteSpace($autoScoreOnIngest)) { $autoScoreOnIngest = "true" }
if ([string]::IsNullOrWhiteSpace($autoScoreConcurrency)) { $autoScoreConcurrency = "1" }
if ([string]::IsNullOrWhiteSpace($autoScoreMinScore)) { $autoScoreMinScore = "0" }
if ([string]::IsNullOrWhiteSpace($autoScoreRetryAttempts)) { $autoScoreRetryAttempts = "2" }
if ([string]::IsNullOrWhiteSpace($notebookApproxViolationPenalty)) { $notebookApproxViolationPenalty = "10" }
if ([string]::IsNullOrWhiteSpace($notebookApproxMaxViolationPenalty)) { $notebookApproxMaxViolationPenalty = "30" }
if ([string]::IsNullOrWhiteSpace($notebookApproxScoredBonus)) { $notebookApproxScoredBonus = "10" }
if ([string]::IsNullOrWhiteSpace($notebookExploreUnscoredBase)) { $notebookExploreUnscoredBase = "0" }
if ([string]::IsNullOrWhiteSpace($notebookExploreRecencyWeight)) { $notebookExploreRecencyWeight = "5" }
if ([string]::IsNullOrWhiteSpace($workerCpu)) { $workerCpu = "1" }
if ([string]::IsNullOrWhiteSpace($workerMemory)) { $workerMemory = "2Gi" }
if ([string]::IsNullOrWhiteSpace($workerMaxInstances)) { $workerMaxInstances = "2" }
if ([string]::IsNullOrWhiteSpace($workerMinInstances)) { $workerMinInstances = "0" }
if ([string]::IsNullOrWhiteSpace($webQueryStaleTimeMs)) { $webQueryStaleTimeMs = "30000" }
if ([string]::IsNullOrWhiteSpace($webQueryRefetchOnWindowFocus)) { $webQueryRefetchOnWindowFocus = "false" }
if ([string]::IsNullOrWhiteSpace($webQueryDiagnosticsRefetchMs)) { $webQueryDiagnosticsRefetchMs = "60000" }

Write-Host "Setting GitHub repository variables..."
Set-RepoVar "GCP_PROJECT_ID" $ProjectId
Set-RepoVar "GCP_REGION" $Region
Set-RepoVar "GAR_REPOSITORY" $GarRepository
Set-RepoVar "GCP_API_SERVICE" $ApiService
Set-RepoVar "GCP_WORKER_SERVICE" $WorkerService
Set-RepoVar "GCP_WEB_SERVICE" $WebService
Set-RepoVar "GCS_BUCKET" $Bucket
Set-RepoVar "GCP_WORKLOAD_IDENTITY_PROVIDER" $Provider
Set-RepoVar "GCP_DEPLOYER_SERVICE_ACCOUNT" $DeployerServiceAccount
Set-RepoVar "MAIL_HOST" $mailHost
Set-RepoVar "MAIL_PORT" $mailPort
Set-RepoVar "MAIL_SECURE" $mailSecure
Set-RepoVar "ACCESS_TOKEN_EXPIRATION" $accessExp
Set-RepoVar "REFRESH_TOKEN_EXPIRATION" $refreshExp
Set-RepoVar "GOOGLE_OAUTH_CLIENT_ID" $googleOauthClientId
Set-RepoVar "GEMINI_MODEL" $geminiModel
Set-RepoVar "WORKER_TASKS_QUEUE" $workerTasksQueue
Set-RepoVar "WORKER_TASKS_DLQ" $workerTasksDlq
Set-RepoVar "TASKS_MAX_ATTEMPTS" $tasksMaxAttempts
Set-RepoVar "TASKS_MIN_BACKOFF_SEC" $tasksMinBackoffSec
Set-RepoVar "TASKS_MAX_BACKOFF_SEC" $tasksMaxBackoffSec
Set-RepoVar "TASKS_MAX_DOUBLINGS" $tasksMaxDoublings
Set-RepoVar "TASKS_MAX_RETRY_DURATION_SEC" $tasksMaxRetryDurationSec
Set-RepoVar "API_THROTTLE_TTL_MS" $apiThrottleTtlMs
Set-RepoVar "API_THROTTLE_LIMIT" $apiThrottleLimit
Set-RepoVar "AUTH_LOGIN_THROTTLE_TTL_MS" $authLoginThrottleTtlMs
Set-RepoVar "AUTH_LOGIN_THROTTLE_LIMIT" $authLoginThrottleLimit
Set-RepoVar "AUTH_REFRESH_THROTTLE_TTL_MS" $authRefreshThrottleTtlMs
Set-RepoVar "AUTH_REFRESH_THROTTLE_LIMIT" $authRefreshThrottleLimit
Set-RepoVar "AUTH_REGISTER_THROTTLE_TTL_MS" $authRegisterThrottleTtlMs
Set-RepoVar "AUTH_REGISTER_THROTTLE_LIMIT" $authRegisterThrottleLimit
Set-RepoVar "AUTH_OTP_THROTTLE_TTL_MS" $authOtpThrottleTtlMs
Set-RepoVar "AUTH_OTP_THROTTLE_LIMIT" $authOtpThrottleLimit
Set-RepoVar "WORKER_REQUEST_TIMEOUT_MS" $workerRequestTimeoutMs
Set-RepoVar "WORKER_TASK_MAX_PAYLOAD_BYTES" $workerTaskMaxPayloadBytes
Set-RepoVar "API_BODY_LIMIT" $apiBodyLimit
Set-RepoVar "DISK_HEALTH_THRESHOLD" $diskHealthThreshold
Set-RepoVar "SCHEDULER_TRIGGER_BATCH_SIZE" $schedulerTriggerBatchSize
Set-RepoVar "WORKSPACE_SUMMARY_CACHE_TTL_SEC" $workspaceSummaryCacheTtlSec
Set-RepoVar "JOB_SOURCE_DIAGNOSTICS_WINDOW_HOURS" $jobSourceDiagnosticsWindowHours
Set-RepoVar "DOCUMENT_DIAGNOSTICS_WINDOW_HOURS" $documentDiagnosticsWindowHours
Set-RepoVar "SCRAPE_DB_REUSE_HOURS" $scrapeDbReuseHours
Set-RepoVar "SCRAPE_MAX_ACTIVE_RUNS_PER_USER" $scrapeMaxActiveRunsPerUser
Set-RepoVar "SCRAPE_DAILY_ENQUEUE_LIMIT_PER_USER" $scrapeDailyEnqueueLimitPerUser
Set-RepoVar "SCRAPE_ENQUEUE_IDEMPOTENCY_TTL_SEC" $scrapeEnqueueIdempotencyTtlSec
Set-RepoVar "SCRAPE_MAX_RETRY_CHAIN_DEPTH" $scrapeMaxRetryChainDepth
Set-RepoVar "SCRAPE_STALE_PENDING_MINUTES" $scrapeStalePendingMinutes
Set-RepoVar "SCRAPE_STALE_RUNNING_MINUTES" $scrapeStaleRunningMinutes
Set-RepoVar "AUTO_SCORE_ON_INGEST" $autoScoreOnIngest
Set-RepoVar "AUTO_SCORE_CONCURRENCY" $autoScoreConcurrency
Set-RepoVar "AUTO_SCORE_MIN_SCORE" $autoScoreMinScore
Set-RepoVar "AUTO_SCORE_RETRY_ATTEMPTS" $autoScoreRetryAttempts
Set-RepoVar "NOTEBOOK_APPROX_VIOLATION_PENALTY" $notebookApproxViolationPenalty
Set-RepoVar "NOTEBOOK_APPROX_MAX_VIOLATION_PENALTY" $notebookApproxMaxViolationPenalty
Set-RepoVar "NOTEBOOK_APPROX_SCORED_BONUS" $notebookApproxScoredBonus
Set-RepoVar "NOTEBOOK_EXPLORE_UNSCORED_BASE" $notebookExploreUnscoredBase
Set-RepoVar "NOTEBOOK_EXPLORE_RECENCY_WEIGHT" $notebookExploreRecencyWeight
Set-RepoVar "WORKER_CPU" $workerCpu
Set-RepoVar "WORKER_MEMORY" $workerMemory
Set-RepoVar "WORKER_MAX_INSTANCES" $workerMaxInstances
Set-RepoVar "WORKER_MIN_INSTANCES" $workerMinInstances
Set-RepoVar "WEB_QUERY_STALE_TIME_MS" $webQueryStaleTimeMs
Set-RepoVar "WEB_QUERY_REFETCH_ON_WINDOW_FOCUS" $webQueryRefetchOnWindowFocus
Set-RepoVar "WEB_QUERY_DIAGNOSTICS_REFETCH_MS" $webQueryDiagnosticsRefetchMs

if (-not [string]::IsNullOrWhiteSpace($allowedOrigins) -and $allowedOrigins -ne "*") {
  Set-RepoVar "ALLOWED_ORIGINS" $allowedOrigins
}
if (-not [string]::IsNullOrWhiteSpace($workerAllowedOrigins) -and $workerAllowedOrigins -ne "*") {
  Set-RepoVar "WORKER_ALLOWED_ORIGINS" $workerAllowedOrigins
}

Write-Host "Setting GitHub repository secrets..."
Set-RepoSecret "DATABASE_URL" $dbUrl
Set-RepoSecret "ACCESS_TOKEN_SECRET" $accessTokenSecret
Set-RepoSecret "REFRESH_TOKEN_SECRET" $refreshTokenSecret
Set-RepoSecret "MAIL_USERNAME" $mailUsername
Set-RepoSecret "MAIL_PASSWORD" $mailPassword
Set-RepoSecret "GOOGLE_OAUTH_CLIENT_SECRET" $googleOauthClientSecret
Set-RepoSecret "WORKER_SHARED_TOKEN" $workerSharedToken
Set-RepoSecret "WORKER_CALLBACK_TOKEN" $workerCallbackToken
Set-RepoSecret "GCP_WORKLOAD_IDENTITY_PROVIDER" $Provider
Set-RepoSecret "GCP_DEPLOYER_SERVICE_ACCOUNT" $DeployerServiceAccount

Write-Host "GitHub CI/CD variables and secrets are configured for $Repo."
