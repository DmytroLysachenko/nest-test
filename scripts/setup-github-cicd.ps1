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
  param([string]$FilePath, [string]$Key)

  if (-not (Test-Path $FilePath)) {
    return $null
  }

  $line = Get-Content $FilePath | Where-Object { $_ -match "^\s*$Key=" } | Select-Object -First 1
  if (-not $line) {
    return $null
  }

  $raw = $line.Split("=", 2)[1]
  $clean = ($raw -replace "\s+#.*$", "").Trim()
  return $clean
}

function Ensure-NonEmpty {
  param([string]$Name, [string]$Value)
  if ([string]::IsNullOrWhiteSpace($Value)) {
    throw "Missing required value: $Name"
  }
}

function Set-RepoVar {
  param([string]$Name, [string]$Value)
  & $gh variable set $Name --repo $Repo --body $Value
}

function Set-RepoSecret {
  param([string]$Name, [string]$Value)
  $Value | & $gh secret set $Name --repo $Repo --body -
}

$dbUrl = Get-EnvValue "apps/api/.env" "DATABASE_URL"
$accessTokenSecret = Get-EnvValue "apps/api/.env" "ACCESS_TOKEN_SECRET"
$refreshTokenSecret = Get-EnvValue "apps/api/.env" "REFRESH_TOKEN_SECRET"
$mailUsername = Get-EnvValue "apps/api/.env" "MAIL_USERNAME"
$mailPassword = Get-EnvValue "apps/api/.env" "MAIL_PASSWORD"
$mailHost = Get-EnvValue "apps/api/.env" "MAIL_HOST"
$mailPort = Get-EnvValue "apps/api/.env" "MAIL_PORT"
$mailSecure = Get-EnvValue "apps/api/.env" "MAIL_SECURE"
$accessExp = Get-EnvValue "apps/api/.env" "ACCESS_TOKEN_EXPIRATION"
$refreshExp = Get-EnvValue "apps/api/.env" "REFRESH_TOKEN_EXPIRATION"
$allowedOrigins = Get-EnvValue "apps/api/.env" "ALLOWED_ORIGINS"

$workerSharedToken = Get-EnvValue "apps/worker/.env" "TASKS_AUTH_TOKEN"
$workerCallbackToken = Get-EnvValue "apps/api/.env" "WORKER_CALLBACK_TOKEN"

if ([string]::IsNullOrWhiteSpace($workerCallbackToken)) {
  $workerCallbackToken = Get-EnvValue "apps/worker/.env" "WORKER_CALLBACK_TOKEN"
}

Ensure-NonEmpty "DATABASE_URL" $dbUrl
Ensure-NonEmpty "ACCESS_TOKEN_SECRET" $accessTokenSecret
Ensure-NonEmpty "REFRESH_TOKEN_SECRET" $refreshTokenSecret
Ensure-NonEmpty "MAIL_USERNAME" $mailUsername
Ensure-NonEmpty "MAIL_PASSWORD" $mailPassword
Ensure-NonEmpty "WORKER_SHARED_TOKEN (TASKS_AUTH_TOKEN in apps/worker/.env)" $workerSharedToken
Ensure-NonEmpty "WORKER_CALLBACK_TOKEN (WORKER_CALLBACK_TOKEN in apps/api/.env or apps/worker/.env)" $workerCallbackToken

if ([string]::IsNullOrWhiteSpace($mailHost)) { $mailHost = "smtp.sendgrid.net" }
if ([string]::IsNullOrWhiteSpace($mailPort)) { $mailPort = "587" }
if ([string]::IsNullOrWhiteSpace($mailSecure)) { $mailSecure = "false" }
if ([string]::IsNullOrWhiteSpace($accessExp)) { $accessExp = "15m" }
if ([string]::IsNullOrWhiteSpace($refreshExp)) { $refreshExp = "30d" }

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
if (-not [string]::IsNullOrWhiteSpace($allowedOrigins) -and $allowedOrigins -ne "*") {
  Set-RepoVar "ALLOWED_ORIGINS" $allowedOrigins
}

Write-Host "Setting GitHub repository secrets..."
Set-RepoSecret "DATABASE_URL" $dbUrl
Set-RepoSecret "ACCESS_TOKEN_SECRET" $accessTokenSecret
Set-RepoSecret "REFRESH_TOKEN_SECRET" $refreshTokenSecret
Set-RepoSecret "MAIL_USERNAME" $mailUsername
Set-RepoSecret "MAIL_PASSWORD" $mailPassword
Set-RepoSecret "WORKER_SHARED_TOKEN" $workerSharedToken
Set-RepoSecret "WORKER_CALLBACK_TOKEN" $workerCallbackToken
Set-RepoSecret "GCP_WORKLOAD_IDENTITY_PROVIDER" $Provider
Set-RepoSecret "GCP_DEPLOYER_SERVICE_ACCOUNT" $DeployerServiceAccount

Write-Host "GitHub CI/CD variables and secrets are configured for $Repo."
