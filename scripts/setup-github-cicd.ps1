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

$workerAllowedOrigins = Get-EnvValue $workerProdFiles "WORKER_ALLOWED_ORIGINS"
$workerSharedToken = Get-EnvValue $workerProdFiles "TASKS_AUTH_TOKEN"
$workerCallbackToken = Get-EnvValue @($apiProdFiles + $workerProdFiles) "WORKER_CALLBACK_TOKEN"

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
