$ErrorActionPreference = 'Stop'
$stage = 'bootstrap'

function Assert-StatusCode {
  param(
    [Parameter(Mandatory = $true)][int]$Actual,
    [Parameter(Mandatory = $true)][int[]]$Allowed,
    [Parameter(Mandatory = $true)][string]$Context
  )

  if ($Allowed -notcontains $Actual) {
    throw "$Context failed. Expected one of [$($Allowed -join ', ')], got $Actual"
  }
}

function Require-Value {
  param(
    [Parameter(Mandatory = $true)]$Value,
    [Parameter(Mandatory = $true)][string]$Message
  )

  if ($null -eq $Value -or ([string]::IsNullOrWhiteSpace([string]$Value) -and $Value -is [string])) {
    throw $Message
  }
}

function Get-EnvOrDefault {
  param(
    [Parameter(Mandatory = $true)][string]$Name,
    [Parameter(Mandatory = $false)][AllowEmptyString()][string]$Default = ''
  )

  $value = [Environment]::GetEnvironmentVariable($Name)
  if ([string]::IsNullOrWhiteSpace($value)) {
    return $Default
  }
  return $value
}

function Invoke-WithRetry {
  param(
    [Parameter(Mandatory = $true)][scriptblock]$Action,
    [Parameter(Mandatory = $true)][string]$Context,
    [int]$Attempts = 3,
    [int]$DelaySeconds = 3
  )

  for ($attempt = 1; $attempt -le $Attempts; $attempt++) {
    try {
      return & $Action
    } catch {
      if ($attempt -ge $Attempts) {
        throw
      }

      Write-Host "$Context failed on attempt $attempt/$Attempts. Retrying in $DelaySeconds seconds..."
      Start-Sleep -Seconds $DelaySeconds
    }
  }
}

function Get-RetryDelaySeconds {
  param(
    [Parameter(Mandatory = $false)]$Response,
    [int]$DefaultSeconds = 65
  )

  if ($null -eq $Response) {
    return $DefaultSeconds
  }

  try {
    $retryAfter = $Response.Headers['Retry-After']
    if ($retryAfter -is [System.Array]) {
      $retryAfter = $retryAfter[0]
    }
    if (-not [string]::IsNullOrWhiteSpace([string]$retryAfter)) {
      $parsedSeconds = 0
      if ([int]::TryParse([string]$retryAfter, [ref]$parsedSeconds) -and $parsedSeconds -gt 0) {
        return $parsedSeconds
      }
    }
  } catch {
  }

  return $DefaultSeconds
}

function Invoke-WebRequestWithRateLimitRetry {
  param(
    [Parameter(Mandatory = $true)][scriptblock]$Action,
    [Parameter(Mandatory = $true)][string]$Context,
    [int]$Attempts = 3,
    [int]$DefaultDelaySeconds = 65
  )

  for ($attempt = 1; $attempt -le $Attempts; $attempt++) {
    try {
      return & $Action
    } catch {
      $response = $_.Exception.Response
      $statusCode = $null
      if ($response) {
        try {
          $statusCode = [int]$response.StatusCode
        } catch {
          $statusCode = $null
        }
      }

      if ($statusCode -ne 429 -or $attempt -ge $Attempts) {
        throw
      }

      $delaySeconds = Get-RetryDelaySeconds -Response $response -DefaultSeconds $DefaultDelaySeconds
      Write-Host "$Context was rate limited on attempt $attempt/$Attempts. Retrying in $delaySeconds seconds..."
      Start-Sleep -Seconds $delaySeconds
    }
  }
}

function Wait-ForHealthyEndpoint {
  param(
    [Parameter(Mandatory = $true)][string]$Uri,
    [Parameter(Mandatory = $true)][string]$Context,
    [int]$TimeoutSeconds = 90
  )

  $deadline = (Get-Date).AddSeconds($TimeoutSeconds)
  while ((Get-Date) -lt $deadline) {
    try {
      $response = Invoke-WebRequest -Uri $Uri -UseBasicParsing -TimeoutSec 15
      Assert-StatusCode -Actual $response.StatusCode -Allowed @(200) -Context $Context
      return $response
    } catch {
      Start-Sleep -Seconds 3
    }
  }

  throw "$Context did not become healthy within $TimeoutSeconds seconds. uri=$Uri"
}

function Test-HealthyEndpoint {
  param(
    [Parameter(Mandatory = $true)][string]$Uri
  )

  try {
    $response = Invoke-WebRequest -Uri $Uri -UseBasicParsing -TimeoutSec 10
    return [int]$response.StatusCode -eq 200
  } catch {
    return $false
  }
}

function Get-UriPort {
  param(
    [Parameter(Mandatory = $true)][string]$Uri
  )

  $parsed = [System.Uri]$Uri
  return $parsed.Port
}

function Test-PortListening {
  param(
    [Parameter(Mandatory = $true)][int]$Port
  )

  try {
    return $null -ne (Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction Stop | Select-Object -First 1)
  } catch {
    return $false
  }
}

function Start-ManagedService {
  param(
    [Parameter(Mandatory = $true)][string]$Name,
    [Parameter(Mandatory = $true)][string]$Command,
    [Parameter(Mandatory = $true)][string]$WorkingDirectory,
    [Parameter(Mandatory = $true)][string]$LogDirectory
  )

  if (-not (Test-Path $LogDirectory)) {
    New-Item -ItemType Directory -Path $LogDirectory -Force | Out-Null
  }

  $logPath = Join-Path $LogDirectory "$Name.log"
  if (Test-Path $logPath) {
    Remove-Item $logPath -Force
  }

  $shellPath = (Get-Process -Id $PID).Path
  $escapedLogPath = $logPath.Replace("'", "''")
  $wrappedCommand = "& { $Command } *>> '$escapedLogPath'"

  $process = Start-Process `
    -FilePath $shellPath `
    -ArgumentList @('-NoProfile', '-Command', $wrappedCommand) `
    -WorkingDirectory $WorkingDirectory `
    -PassThru

  return @{
    Name = $Name
    LogPath = $logPath
    Process = $process
  }
}

function Build-BaseUrl {
  param(
    [Parameter(Mandatory = $true)][string]$Name,
    [Parameter(Mandatory = $true)][int]$Port
  )

  if ($Name -eq 'api' -or $Name -eq 'worker') {
    return "http://localhost:$Port"
  }

  return "http://localhost:$Port"
}

function Stop-RepoServiceProcesses {
  param(
    [Parameter(Mandatory = $true)][string]$Name,
    [Parameter(Mandatory = $true)][string]$RepoRoot
  )

  $patterns = switch ($Name) {
    'api' { @('--filter api', 'apps\api', '@nestjs\cli') }
    'worker' { @('--filter worker', 'apps\worker', 'tsx watch src/index.ts') }
    'web' { @('--filter web', 'apps\web', 'next\dist\bin\next') }
    default { @() }
  }

  $processes = Get-CimInstance Win32_Process | Where-Object {
    $commandLine = $_.CommandLine
    if ([string]::IsNullOrWhiteSpace($commandLine)) {
      return $false
    }
    if ($commandLine -notlike "*$RepoRoot*") {
      return $false
    }
    foreach ($pattern in $patterns) {
      if ($commandLine -like "*$pattern*") {
        return $true
      }
    }
    return $false
  }

  foreach ($process in $processes) {
    try {
      Stop-Process -Id $process.ProcessId -Force -ErrorAction Stop
      Write-Host "Stopped stale repo-owned $Name process pid=$($process.ProcessId)."
    } catch {
      Write-Warning "Failed to stop stale repo-owned $Name process pid=$($process.ProcessId): $($_.Exception.Message)"
    }
  }
}

function Stop-ManagedServices {
  param(
    [Parameter(Mandatory = $true)][System.Collections.IEnumerable]$Services
  )

  foreach ($service in $Services) {
    if ($null -eq $service.Process) {
      continue
    }

    try {
      if (-not $service.Process.HasExited) {
        Stop-Process -Id $service.Process.Id -Force -ErrorAction Stop
      }
    } catch {
      Write-Warning "Failed to stop managed service '$($service.Name)': $($_.Exception.Message)"
    }
  }
}

function Show-ManagedServiceLogs {
  param(
    [Parameter(Mandatory = $true)][System.Collections.IEnumerable]$Services
  )

  foreach ($service in $Services) {
    if (-not (Test-Path $service.LogPath)) {
      continue
    }

    Write-Host "---- $($service.Name) log tail ----"
    Get-Content $service.LogPath -Tail 80
  }
}

function Ensure-LocalSmokeServices {
  param(
    [Parameter(Mandatory = $true)][string]$ApiBaseUrl,
    [Parameter(Mandatory = $true)][string]$WorkerBaseUrl,
    [Parameter(Mandatory = $true)][string]$WebBaseUrl,
    [Parameter(Mandatory = $true)][string]$RepoRoot
  )

  $managed = @()
  $logDirectory = Join-Path $RepoRoot '.tmp-test-logs\smoke-managed'
  $resolvedApiBaseUrl = $ApiBaseUrl
  $resolvedWorkerBaseUrl = $WorkerBaseUrl
  $resolvedWebBaseUrl = $WebBaseUrl

  $serviceDefinitions = @(
    @{
      Name = 'api'
      BaseUrl = $ApiBaseUrl
      HealthPath = '/health'
      FallbackPort = 3100
      CommandTemplate = {
        param([int]$Port)
        "`$env:HOST='0.0.0.0'; `$env:PORT='$Port'; `$env:WORKER_TASK_URL='http://localhost:4101/tasks'; `$env:WORKER_CALLBACK_URL='http://localhost:$Port/api/job-sources/complete'; pnpm --filter api dev"
      }
    },
    @{
      Name = 'worker'
      BaseUrl = $WorkerBaseUrl
      HealthPath = '/health'
      FallbackPort = 4101
      CommandTemplate = { param([int]$Port) "`$env:PORT='$Port'; `$env:WORKER_PORT='$Port'; pnpm --filter worker dev" }
    },
    @{
      Name = 'web'
      BaseUrl = $WebBaseUrl
      HealthPath = '/health'
      FallbackPort = 3102
      CommandTemplate = { param([int]$Port) "pnpm --filter web exec next dev --port $Port --hostname localhost" }
    }
  )

  foreach ($definition in $serviceDefinitions) {
    $fallbackPort = $definition.FallbackPort
    $targetBaseUrl = Build-BaseUrl -Name $definition.Name -Port $fallbackPort
    $targetHealthUri = "$($targetBaseUrl.TrimEnd('/'))$($definition.HealthPath)"
    Stop-RepoServiceProcesses -Name $definition.Name -RepoRoot $RepoRoot
    Start-Sleep -Seconds 2
    if (Test-HealthyEndpoint -Uri $targetHealthUri) {
      Write-Host "Reusing dedicated smoke $($definition.Name) service at $targetBaseUrl."
    } elseif (Test-PortListening -Port $fallbackPort) {
      throw "Dedicated smoke port $fallbackPort for $($definition.Name) is occupied by another unhealthy service."
    } else {
      Write-Host "Starting local $($definition.Name) smoke service on dedicated port $fallbackPort."
      $managed += Start-ManagedService `
        -Name $definition.Name `
        -Command (& $definition.CommandTemplate $fallbackPort) `
        -WorkingDirectory $RepoRoot `
        -LogDirectory $logDirectory
    }

    if ($definition.Name -eq 'api') {
      $resolvedApiBaseUrl = $targetBaseUrl
    } elseif ($definition.Name -eq 'worker') {
      $resolvedWorkerBaseUrl = $targetBaseUrl
    } else {
      $resolvedWebBaseUrl = $targetBaseUrl
    }
  }

  return @{
    Managed = $managed
    ApiBaseUrl = $resolvedApiBaseUrl
    WorkerBaseUrl = $resolvedWorkerBaseUrl
    WebBaseUrl = $resolvedWebBaseUrl
  }
}

try {
Write-Host '== E2E Smoke =='

$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path

$apiBaseUrl = (Get-EnvOrDefault -Name 'API_BASE_URL' -Default 'http://localhost:3000').TrimEnd('/')
$workerBaseUrl = (Get-EnvOrDefault -Name 'WORKER_BASE_URL' -Default 'http://localhost:4001').TrimEnd('/')
$webBaseUrl = (Get-EnvOrDefault -Name 'WEB_BASE_URL' -Default 'http://localhost:3002').TrimEnd('/')
$smokeEmail = Get-EnvOrDefault -Name 'SMOKE_EMAIL' -Default 'admin@example.com'
$smokePassword = Get-EnvOrDefault -Name 'SMOKE_PASSWORD' -Default 'admin123'
$skipSeedRaw = Get-EnvOrDefault -Name 'SMOKE_SKIP_SEED' -Default ''
$skipSeed = @('1', 'true', 'yes') -contains $skipSeedRaw.ToLower()
$forceCallbackRaw = Get-EnvOrDefault -Name 'SMOKE_FORCE_CALLBACK' -Default ''
$forceCallback = @('1', 'true', 'yes') -contains $forceCallbackRaw.ToLower()
$autoStartRaw = Get-EnvOrDefault -Name 'SMOKE_AUTOSTART' -Default 'true'
$autoStart = @('1', 'true', 'yes') -contains $autoStartRaw.ToLower()
$workerCallbackToken = Get-EnvOrDefault -Name 'WORKER_CALLBACK_TOKEN' -Default ''
$managedServices = @()

if (-not $skipSeed) {
  Write-Host '1) Seeding minimal fixture data...'
  $stage = 'seed-fixtures'
  Invoke-WithRetry -Context 'Fixture seed' -Attempts 3 -DelaySeconds 4 -Action {
    pnpm --filter @repo/db seed:e2e | Out-Host
  }
} else {
  Write-Host '1) Skipping fixture seeding (SMOKE_SKIP_SEED=true)...'
}

if (
  $autoStart -and
  $apiBaseUrl -eq 'http://localhost:3000' -and
  $workerBaseUrl -eq 'http://localhost:4001' -and
  $webBaseUrl -eq 'http://localhost:3002'
) {
  Write-Host '1.5) Ensuring local smoke services are running...'
  $stage = 'autostart-services'
  $autostartResult = Ensure-LocalSmokeServices `
    -ApiBaseUrl $apiBaseUrl `
    -WorkerBaseUrl $workerBaseUrl `
    -WebBaseUrl $webBaseUrl `
    -RepoRoot $repoRoot
  $managedServices = $autostartResult.Managed
  $apiBaseUrl = $autostartResult.ApiBaseUrl
  $workerBaseUrl = $autostartResult.WorkerBaseUrl
  $webBaseUrl = $autostartResult.WebBaseUrl
}

Write-Host '2) Checking service health endpoints...'
$stage = 'health-checks'
$apiHealth = Wait-ForHealthyEndpoint -Uri "$apiBaseUrl/health" -Context 'API health'
$workerHealth = Wait-ForHealthyEndpoint -Uri "$workerBaseUrl/health" -Context 'Worker health'
$webHome = Wait-ForHealthyEndpoint -Uri "$webBaseUrl/health" -Context 'Web health'

Write-Host '3) Authenticating fixture user...'
$stage = 'auth-login'
$loginBody = @{
  email    = $smokeEmail
  password = $smokePassword
} | ConvertTo-Json

$login = Invoke-WebRequest -Uri "$apiBaseUrl/api/auth/login" -Method Post -ContentType 'application/json' -Body $loginBody -UseBasicParsing -TimeoutSec 20
Assert-StatusCode -Actual $login.StatusCode -Allowed @(200, 201) -Context 'Auth login'

$loginPayload = $login.Content | ConvertFrom-Json
$token = $loginPayload.data.accessToken
$refreshToken = $loginPayload.data.refreshToken
if ([string]::IsNullOrWhiteSpace($token)) {
  throw 'Auth login did not return accessToken.'
}
if ([string]::IsNullOrWhiteSpace($refreshToken)) {
  throw 'Auth login did not return refreshToken.'
}

$authHeaders = @{
  Authorization = "Bearer $token"
}

Write-Host '4) Verifying auth refresh flow...'
$stage = 'auth-refresh'
$refreshBody = @{
  refreshToken = $refreshToken
} | ConvertTo-Json

$refresh = Invoke-WebRequest -Uri "$apiBaseUrl/api/auth/refresh" -Method Post -ContentType 'application/json' -Body $refreshBody -UseBasicParsing -TimeoutSec 20
Assert-StatusCode -Actual $refresh.StatusCode -Allowed @(200, 201) -Context 'Auth refresh'
$refreshPayload = $refresh.Content | ConvertFrom-Json
$token = $refreshPayload.data.accessToken
$refreshToken = $refreshPayload.data.refreshToken
if ([string]::IsNullOrWhiteSpace($token) -or [string]::IsNullOrWhiteSpace($refreshToken)) {
  throw 'Auth refresh did not return rotated tokens.'
}

$authHeaders = @{
  Authorization = "Bearer $token"
}

$me = Invoke-WebRequest -Uri "$apiBaseUrl/api/user" -Headers $authHeaders -UseBasicParsing -TimeoutSec 20
Assert-StatusCode -Actual $me.StatusCode -Allowed @(200) -Context 'Current user with refreshed access token'

$invalidRefreshFailed = $false
try {
  Invoke-WebRequest -Uri "$apiBaseUrl/api/auth/refresh" -Method Post -ContentType 'application/json' -Body (@{ refreshToken = 'invalid-token' } | ConvertTo-Json) -UseBasicParsing -TimeoutSec 20 | Out-Null
} catch {
  if ($_.Exception.Response -and [int]$_.Exception.Response.StatusCode -in @(401, 400)) {
    $invalidRefreshFailed = $true
  } else {
    throw
  }
}
if (-not $invalidRefreshFailed) {
  throw 'Invalid refresh token should be rejected.'
}

Write-Host '5) Verifying profile-input endpoints...'
$stage = 'profile-inputs'
$profileInputBody = @{
  targetRoles = 'Backend Developer, TypeScript Engineer'
  notes       = 'Smoke test profile input'
} | ConvertTo-Json

$profileCreate = Invoke-WebRequest -Uri "$apiBaseUrl/api/profile-inputs" -Method Post -Headers $authHeaders -ContentType 'application/json' -Body $profileInputBody -UseBasicParsing -TimeoutSec 20
Assert-StatusCode -Actual $profileCreate.StatusCode -Allowed @(200, 201) -Context 'Create profile input'

$profileLatest = Invoke-WebRequest -Uri "$apiBaseUrl/api/profile-inputs/latest" -Headers $authHeaders -UseBasicParsing -TimeoutSec 20
Assert-StatusCode -Actual $profileLatest.StatusCode -Allowed @(200) -Context 'Get latest profile input'
$profileLatestPayload = $profileLatest.Content | ConvertFrom-Json
if (-not $profileLatestPayload.data) {
  throw 'Latest profile input returned no data.'
}

Write-Host '5.05) Verifying onboarding draft CRUD endpoints...'
$stage = 'onboarding-draft'
$draftPut = Invoke-WebRequest -Uri "$apiBaseUrl/api/onboarding/draft" -Method Put -Headers $authHeaders -ContentType 'application/json' -Body (@{
  payload = @{
    desiredPositions = @('Backend Developer')
    coreSkills = @('Node.js', 'TypeScript', 'PostgreSQL')
  }
} | ConvertTo-Json -Depth 6) -UseBasicParsing -TimeoutSec 20
Assert-StatusCode -Actual $draftPut.StatusCode -Allowed @(200, 201) -Context 'Upsert onboarding draft'
$draftGet = Invoke-WebRequest -Uri "$apiBaseUrl/api/onboarding/draft" -Headers $authHeaders -UseBasicParsing -TimeoutSec 20
Assert-StatusCode -Actual $draftGet.StatusCode -Allowed @(200) -Context 'Get onboarding draft'
$draftPayload = $draftGet.Content | ConvertFrom-Json
if (-not $draftPayload.data.payload) {
  throw 'Onboarding draft payload missing.'
}
$draftDelete = Invoke-WebRequest -Uri "$apiBaseUrl/api/onboarding/draft" -Method Delete -Headers $authHeaders -UseBasicParsing -TimeoutSec 20
Assert-StatusCode -Actual $draftDelete.StatusCode -Allowed @(200) -Context 'Delete onboarding draft'

Write-Host '5.1) Verifying document upload-health endpoint...'
$stage = 'documents-upload-health'
$uploadHealth = Invoke-WebRequest -Uri "$apiBaseUrl/api/documents/upload-health" -Headers $authHeaders -UseBasicParsing -TimeoutSec 20
Assert-StatusCode -Actual $uploadHealth.StatusCode -Allowed @(200) -Context 'Documents upload-health'
$uploadHealthPayload = $uploadHealth.Content | ConvertFrom-Json
if ($null -eq $uploadHealthPayload.data.ok) {
  throw 'Documents upload-health payload missing ok flag.'
}

Write-Host '5.2) Verifying document diagnostics summary endpoint...'
$stage = 'documents-diagnostics-summary'
$documentDiagnosticsSummary = Invoke-WebRequest -Uri "$apiBaseUrl/api/documents/diagnostics/summary?windowHours=168" -Headers $authHeaders -UseBasicParsing -TimeoutSec 20
Assert-StatusCode -Actual $documentDiagnosticsSummary.StatusCode -Allowed @(200) -Context 'Documents diagnostics summary'
$documentDiagnosticsSummaryPayload = $documentDiagnosticsSummary.Content | ConvertFrom-Json
if ($null -eq $documentDiagnosticsSummaryPayload.data.stages.EXTRACTION.successRate) {
  throw 'Documents diagnostics summary missing stages.EXTRACTION.successRate.'
}

Write-Host '6) Verifying career-profile endpoints (latest/list/get/restore/documents)...'
$stage = 'career-profiles'
$careerLatest = Invoke-WebRequest -Uri "$apiBaseUrl/api/career-profiles/latest" -Headers $authHeaders -UseBasicParsing -TimeoutSec 20
Assert-StatusCode -Actual $careerLatest.StatusCode -Allowed @(200) -Context 'Get latest career profile'
$careerLatestPayload = $careerLatest.Content | ConvertFrom-Json
$careerLatestData = $careerLatestPayload.data
Require-Value -Value $careerLatestData.id -Message 'Latest career profile is missing id.'
if ($careerLatestData.status -ne 'READY') {
  throw "Latest career profile should be READY. got=$($careerLatestData.status)"
}
if ($careerLatestData.contentJson.schemaVersion -ne '1.0.0') {
  throw "Latest career profile schemaVersion should be 1.0.0. got=$($careerLatestData.contentJson.schemaVersion)"
}

Write-Host '6.1) Verifying workspace summary endpoint...'
$stage = 'workspace-summary'
$workspaceSummary = Invoke-WebRequest -Uri "$apiBaseUrl/api/workspace/summary" -Headers $authHeaders -UseBasicParsing -TimeoutSec 20
Assert-StatusCode -Actual $workspaceSummary.StatusCode -Allowed @(200) -Context 'Get workspace summary'
$workspaceSummaryPayload = $workspaceSummary.Content | ConvertFrom-Json
if ($null -eq $workspaceSummaryPayload.data.workflow.needsOnboarding) {
  throw 'Workspace summary missing workflow.needsOnboarding.'
}
if (-not $workspaceSummaryPayload.data.readinessBreakdown) {
  throw 'Workspace summary missing readinessBreakdown.'
}
if ($null -eq $workspaceSummaryPayload.data.blockerDetails) {
  throw 'Workspace summary missing blockerDetails.'
}
if (-not $workspaceSummaryPayload.data.recommendedSequence) {
  throw 'Workspace summary missing recommendedSequence.'
}

Write-Host '6.15) Verifying document retry recovery endpoint...'
$stage = 'documents-retry-failed'
$retryFailedDocs = Invoke-WebRequest -Uri "$apiBaseUrl/api/documents/retry-failed" -Method Post -Headers $authHeaders -UseBasicParsing -TimeoutSec 20
Assert-StatusCode -Actual $retryFailedDocs.StatusCode -Allowed @(200, 201) -Context 'Retry failed document extractions'
$retryFailedDocsPayload = $retryFailedDocs.Content | ConvertFrom-Json
if ($null -eq $retryFailedDocsPayload.data.totalFailed) {
  throw 'Retry failed documents payload missing totalFailed.'
}

Write-Host '6.2) Verifying ops metrics endpoint...'
$stage = 'ops-metrics'
$opsMetrics = Invoke-WebRequest -Uri "$apiBaseUrl/api/ops/metrics" -Headers $authHeaders -UseBasicParsing -TimeoutSec 20
Assert-StatusCode -Actual $opsMetrics.StatusCode -Allowed @(200) -Context 'Get ops metrics'
$opsMetricsPayload = $opsMetrics.Content | ConvertFrom-Json
if ($null -eq $opsMetricsPayload.data.queue.activeRuns) {
  throw 'Ops metrics missing queue.activeRuns.'
}
if ($null -eq $opsMetricsPayload.data.queue.runningWithoutHeartbeat) {
  throw 'Ops metrics missing queue.runningWithoutHeartbeat.'
}
if ($null -eq $opsMetricsPayload.data.callback.totalEvents) {
  throw 'Ops metrics missing callback.totalEvents.'
}

$careerList = Invoke-WebRequest -Uri "$apiBaseUrl/api/career-profiles?limit=10" -Headers $authHeaders -UseBasicParsing -TimeoutSec 20
Assert-StatusCode -Actual $careerList.StatusCode -Allowed @(200) -Context 'List career profile versions'
$careerListPayload = $careerList.Content | ConvertFrom-Json
if (-not $careerListPayload.data.items) {
  throw 'Career profile list returned no items array.'
}
$activeCareerProfile = @($careerListPayload.data.items | Where-Object { $_.isActive -eq $true } | Select-Object -First 1)
if (-not $activeCareerProfile) {
  throw 'No active career profile found in list response.'
}
$careerProfileId = $activeCareerProfile.id
Require-Value -Value $careerProfileId -Message 'Active career profile id is missing.'

$careerById = Invoke-WebRequest -Uri "$apiBaseUrl/api/career-profiles/$careerProfileId" -Headers $authHeaders -UseBasicParsing -TimeoutSec 20
Assert-StatusCode -Actual $careerById.StatusCode -Allowed @(200) -Context 'Get career profile by id'
$careerByIdPayload = $careerById.Content | ConvertFrom-Json
if ($careerByIdPayload.data.id -ne $careerProfileId) {
  throw "Career profile by id mismatch. expected=$careerProfileId got=$($careerByIdPayload.data.id)"
}

$careerDocs = Invoke-WebRequest -Uri "$apiBaseUrl/api/career-profiles/$careerProfileId/documents" -Headers $authHeaders -UseBasicParsing -TimeoutSec 20
Assert-StatusCode -Actual $careerDocs.StatusCode -Allowed @(200) -Context 'Get career profile documents'
$careerDocsPayload = $careerDocs.Content | ConvertFrom-Json
if ($null -eq $careerDocsPayload.data) {
  throw 'Career profile documents response missing data.'
}
$documentIdForDiagnostics = @($careerDocsPayload.data | Select-Object -First 1).id
if ($documentIdForDiagnostics) {
  $documentEvents = Invoke-WebRequest -Uri "$apiBaseUrl/api/documents/$documentIdForDiagnostics/events" -Headers $authHeaders -UseBasicParsing -TimeoutSec 20
  Assert-StatusCode -Actual $documentEvents.StatusCode -Allowed @(200) -Context 'Document diagnostics timeline'
}

$restore = Invoke-WebRequest -Uri "$apiBaseUrl/api/career-profiles/$careerProfileId/restore" -Method Post -Headers $authHeaders -UseBasicParsing -TimeoutSec 20
Assert-StatusCode -Actual $restore.StatusCode -Allowed @(200, 201) -Context 'Restore career profile version'
$restorePayload = $restore.Content | ConvertFrom-Json
if ($restorePayload.data.id -ne $careerProfileId -or $restorePayload.data.isActive -ne $true) {
  throw 'Career profile restore did not keep selected profile active.'
}

Write-Host '7) Verifying denormalized career-profile search-view endpoint...'
$stage = 'career-profiles-search-view'
$searchView = Invoke-WebRequest -Uri "$apiBaseUrl/api/career-profiles/search-view?status=READY&isActive=true&keyword=react&technology=typescript&seniority=mid&limit=10" -Headers $authHeaders -UseBasicParsing -TimeoutSec 20
Assert-StatusCode -Actual $searchView.StatusCode -Allowed @(200) -Context 'List career profile search view'
$searchViewPayload = $searchView.Content | ConvertFrom-Json
if (-not $searchViewPayload.data.items -or $searchViewPayload.data.items.Count -lt 1) {
  throw 'Career profile search-view returned no items.'
}
$searchItem = $searchViewPayload.data.items[0]
if ($searchItem.primarySeniority -ne 'mid') {
  throw "Career profile search-view seniority mismatch. expected=mid got=$($searchItem.primarySeniority)"
}
if (-not ($searchItem.searchableKeywords -contains 'react')) {
  throw 'Career profile search-view missing searchable keyword react.'
}
if (-not ($searchItem.searchableTechnologies -contains 'typescript')) {
  throw 'Career profile search-view missing searchable technology typescript.'
}

Write-Host '8) Verifying deterministic job-matching endpoints...'
$stage = 'job-matching'
$jobMatchingBody = @{
  jobDescription = 'Senior Frontend Engineer. Remote, B2B. React and TypeScript required.'
  minScore = 0
} | ConvertTo-Json

$jobMatch = Invoke-WebRequest -Uri "$apiBaseUrl/api/job-matching/score" -Method Post -Headers $authHeaders -ContentType 'application/json' -Body $jobMatchingBody -UseBasicParsing -TimeoutSec 30
Assert-StatusCode -Actual $jobMatch.StatusCode -Allowed @(200, 201) -Context 'Score job description'
$jobMatchPayload = $jobMatch.Content | ConvertFrom-Json
Require-Value -Value $jobMatchPayload.data.matchId -Message 'Job match score response missing matchId.'
if ($null -eq $jobMatchPayload.data.score.score) {
  throw 'Job match score response missing nested score value.'
}
if ($jobMatchPayload.data.profileSchemaVersionUsed -ne '1.0.0') {
  throw "Job match should use profile schema 1.0.0. got=$($jobMatchPayload.data.profileSchemaVersionUsed)"
}
if ($null -eq $jobMatchPayload.data.breakdown -or $null -eq $jobMatchPayload.data.hardConstraintViolations) {
  throw 'Job match response missing breakdown or hardConstraintViolations.'
}

$matchId = $jobMatchPayload.data.matchId
$jobMatches = Invoke-WebRequest -Uri "$apiBaseUrl/api/job-matching?limit=10" -Headers $authHeaders -UseBasicParsing -TimeoutSec 20
Assert-StatusCode -Actual $jobMatches.StatusCode -Allowed @(200) -Context 'List job matches'
$jobMatchesPayload = $jobMatches.Content | ConvertFrom-Json
$createdMatch = @($jobMatchesPayload.data.items | Where-Object { $_.id -eq $matchId } | Select-Object -First 1)
if (-not $createdMatch) {
  throw "Scored job match id=$matchId not found in job-matching list."
}

$jobMatchById = Invoke-WebRequest -Uri "$apiBaseUrl/api/job-matching/$matchId" -Headers $authHeaders -UseBasicParsing -TimeoutSec 20
Assert-StatusCode -Actual $jobMatchById.StatusCode -Allowed @(200) -Context 'Get job match by id'
$jobMatchByIdPayload = $jobMatchById.Content | ConvertFrom-Json
if ($jobMatchByIdPayload.data.id -ne $matchId) {
  throw "Job match by id mismatch. expected=$matchId got=$($jobMatchByIdPayload.data.id)"
}

Write-Host '8.1) Verifying job-matching audit endpoints...'
$stage = 'job-matching-audit'
$jobMatchAudit = Invoke-WebRequest -Uri "$apiBaseUrl/api/job-matching/audit?limit=10" -Headers $authHeaders -UseBasicParsing -TimeoutSec 20
Assert-StatusCode -Actual $jobMatchAudit.StatusCode -Allowed @(200) -Context 'List job match audit'
$jobMatchAuditPayload = $jobMatchAudit.Content | ConvertFrom-Json
$auditItem = @($jobMatchAuditPayload.data.items | Where-Object { $_.id -eq $matchId } | Select-Object -First 1)
if (-not $auditItem) {
  throw "Scored job match id=$matchId not found in job-matching audit list."
}
if ($null -eq $auditItem.matchMeta) {
  throw 'Job match audit item missing matchMeta.'
}

$jobMatchAuditCsv = Invoke-WebRequest -Uri "$apiBaseUrl/api/job-matching/audit/export.csv?limit=10" -Headers $authHeaders -UseBasicParsing -TimeoutSec 20
Assert-StatusCode -Actual $jobMatchAuditCsv.StatusCode -Allowed @(200) -Context 'Export job match audit csv'
if ($jobMatchAuditCsv.Content -notmatch 'id,careerProfileId,profileVersion,score') {
  throw 'Job match audit CSV header missing expected columns.'
}

Write-Host '9) Reading job source runs...'
$stage = 'job-source-runs'
$runs = Invoke-WebRequest -Uri "$apiBaseUrl/api/job-sources/runs" -Headers $authHeaders -UseBasicParsing -TimeoutSec 20
Assert-StatusCode -Actual $runs.StatusCode -Allowed @(200) -Context 'List job source runs'

Write-Host '9.1) Verifying scrape schedule and preflight endpoints...'
$stage = 'schedule-preflight'
$schedule = Invoke-WebRequest -Uri "$apiBaseUrl/api/job-sources/schedule" -Headers $authHeaders -UseBasicParsing -TimeoutSec 20
Assert-StatusCode -Actual $schedule.StatusCode -Allowed @(200) -Context 'Get scrape schedule'
$schedulePayload = $schedule.Content | ConvertFrom-Json
if ($null -eq $schedulePayload.data.enabled) {
  throw 'Scrape schedule missing enabled flag.'
}

$scheduleUpdateBody = @{
  enabled  = $true
  cron     = '0 9 * * *'
  timezone = 'Europe/Warsaw'
  source   = 'pracuj-pl-it'
  limit    = 5
} | ConvertTo-Json

$scheduleUpdate = Invoke-WebRequest -Uri "$apiBaseUrl/api/job-sources/schedule" -Method Put -Headers $authHeaders -ContentType 'application/json' -Body $scheduleUpdateBody -UseBasicParsing -TimeoutSec 20
Assert-StatusCode -Actual $scheduleUpdate.StatusCode -Allowed @(200, 201) -Context 'Update scrape schedule'
$scheduleUpdatePayload = $scheduleUpdate.Content | ConvertFrom-Json
if ($scheduleUpdatePayload.data.enabled -ne $true) {
  throw 'Updated scrape schedule should be enabled.'
}

$preflight = Invoke-WebRequest -Uri "$apiBaseUrl/api/job-sources/preflight?limit=5" -Headers $authHeaders -UseBasicParsing -TimeoutSec 20
Assert-StatusCode -Actual $preflight.StatusCode -Allowed @(200) -Context 'Get scrape preflight'
$preflightPayload = $preflight.Content | ConvertFrom-Json
if ($null -eq $preflightPayload.data.ready -or $null -eq $preflightPayload.data.blockers) {
  throw 'Scrape preflight payload missing ready or blockers.'
}

Write-Host '10) Enqueueing scrape task through API...'
$stage = 'enqueue-scrape'
$scrapeBody = @{
  source     = 'pracuj-pl'
  listingUrl = 'https://it.pracuj.pl/praca?wm=home-office&its=frontend'
  limit      = 1
} | ConvertTo-Json

$scrapeHeaders = @{
  Authorization = "Bearer $token"
  'x-request-id' = "smoke-$([Guid]::NewGuid().ToString())"
}

$scrape = Invoke-WebRequestWithRateLimitRetry -Context 'Enqueue scrape' -Attempts 2 -DefaultDelaySeconds 65 -Action {
  Invoke-WebRequest -Uri "$apiBaseUrl/api/job-sources/scrape" -Method Post -Headers $scrapeHeaders -ContentType 'application/json' -Body $scrapeBody -UseBasicParsing -TimeoutSec 45
}
Assert-StatusCode -Actual $scrape.StatusCode -Allowed @(200, 201, 202) -Context 'Enqueue scrape'

$scrapePayload = $scrape.Content | ConvertFrom-Json
$sourceRunId = $scrapePayload.data.sourceRunId
if ([string]::IsNullOrWhiteSpace($sourceRunId)) {
  throw 'Scrape enqueue did not return sourceRunId.'
}

if ($forceCallback) {
  Write-Host '10.5) Forcing deterministic worker completion callback...'
  $stage = 'force-worker-callback'
  if ([string]::IsNullOrWhiteSpace($workerCallbackToken)) {
    throw 'SMOKE_FORCE_CALLBACK=true requires WORKER_CALLBACK_TOKEN to be set.'
  }

  $callbackHeaders = @{
    Authorization = "Bearer $workerCallbackToken"
    'x-request-id' = "smoke-callback-$([Guid]::NewGuid().ToString())"
  }

  $callbackBody = @{
    source = 'pracuj-pl'
    sourceRunId = $sourceRunId
    runId = "smoke-run-$([Guid]::NewGuid().ToString())"
    eventId = "smoke-event-$([Guid]::NewGuid().ToString())"
    attemptNo = 1
    status = 'COMPLETED'
    scrapedCount = 1
    totalFound = 1
    listingUrl = 'https://it.pracuj.pl/praca?wm=home-office&its=frontend'
    jobs = @(
      @{
        source = 'pracuj-pl'
        sourceId = "smoke-source-$([Guid]::NewGuid().ToString())"
        url = "https://example.com/smoke-job/$sourceRunId"
        title = 'Smoke Frontend Engineer'
        description = 'Synthetic smoke callback payload to stabilize CI.'
        company = 'Smoke Inc'
        location = 'Remote'
        employmentType = 'B2B'
        requirements = @('TypeScript', 'React')
        tags = @('smoke', 'synthetic')
      }
    )
  } | ConvertTo-Json -Depth 8

  $callbackResponse = Invoke-WebRequest -Uri "$apiBaseUrl/api/job-sources/complete" -Method Post -Headers $callbackHeaders -ContentType 'application/json' -Body $callbackBody -UseBasicParsing -TimeoutSec 20
  Assert-StatusCode -Actual $callbackResponse.StatusCode -Allowed @(200, 201) -Context 'Force scrape completion callback'
}

Write-Host '11) Waiting for scrape run completion callback...'
$stage = 'wait-completion'
$deadline = (Get-Date).AddMinutes(3)
$finalStatus = $null
$finalFailureType = $null
while ((Get-Date) -lt $deadline) {
  Start-Sleep -Seconds 5
  try {
    $run = Invoke-WebRequest -Uri "$apiBaseUrl/api/job-sources/runs/$sourceRunId" -Headers $authHeaders -UseBasicParsing -TimeoutSec 20
  } catch {
    if ($_.Exception.Response -and [int]$_.Exception.Response.StatusCode -eq 429) {
      Write-Host 'Rate limited while polling run status, retrying...'
      continue
    }
    throw
  }
  Assert-StatusCode -Actual $run.StatusCode -Allowed @(200) -Context 'Get scrape run'
  $runPayload = $run.Content | ConvertFrom-Json
  $finalStatus = $runPayload.data.status
  $finalFailureType = $runPayload.data.failureType
  if ($finalStatus -eq 'COMPLETED' -or $finalStatus -eq 'FAILED') {
    break
  }
}

if ($finalStatus -ne 'COMPLETED') {
  throw "Scrape run did not complete successfully. status=$finalStatus failureType=$finalFailureType sourceRunId=$sourceRunId"
}

Write-Host '12) Verifying persisted user job offers for this run...'
$stage = 'verify-persisted-offers'
$offers = Invoke-WebRequest -Uri "$apiBaseUrl/api/job-offers?mode=strict&limit=100" -Headers $authHeaders -UseBasicParsing -TimeoutSec 20
Assert-StatusCode -Actual $offers.StatusCode -Allowed @(200) -Context 'List job offers'
$offersPayload = $offers.Content | ConvertFrom-Json
$offersMode = $offersPayload.data.mode
if ($offersMode -ne 'strict') {
  throw "Expected strict ranking mode in response. got=$offersMode"
}

$offersApprox = Invoke-WebRequest -Uri "$apiBaseUrl/api/job-offers?mode=approx&limit=100" -Headers $authHeaders -UseBasicParsing -TimeoutSec 20
Assert-StatusCode -Actual $offersApprox.StatusCode -Allowed @(200) -Context 'List job offers (approx mode)'
$offersApproxPayload = $offersApprox.Content | ConvertFrom-Json
if ($offersApproxPayload.data.mode -ne 'approx') {
  throw "Expected approx ranking mode in response. got=$($offersApproxPayload.data.mode)"
}
$matched = @($offersApproxPayload.data.items | Where-Object { $_.sourceRunId -eq $sourceRunId })
if ($matched.Count -lt 1) {
  throw "No persisted user job offers found for sourceRunId=$sourceRunId"
}

Write-Host '12.05) Verifying notebook summary endpoint...'
$stage = 'notebook-summary'
$notebookSummary = Invoke-WebRequest -Uri "$apiBaseUrl/api/job-offers/summary" -Headers $authHeaders -UseBasicParsing -TimeoutSec 20
Assert-StatusCode -Actual $notebookSummary.StatusCode -Allowed @(200) -Context 'Get notebook summary'
$notebookSummaryPayload = $notebookSummary.Content | ConvertFrom-Json
if ($null -eq $notebookSummaryPayload.data.unscored -or $null -eq $notebookSummaryPayload.data.buckets) {
  throw 'Notebook summary payload missing unscored or buckets.'
}
if ($null -eq $notebookSummaryPayload.data.quickActions -or $notebookSummaryPayload.data.quickActions.Count -lt 3) {
  throw 'Notebook summary payload missing expected quickActions.'
}

Write-Host '12.06) Verifying notebook focus endpoint...'
$stage = 'notebook-focus'
$notebookFocus = Invoke-WebRequest -Uri "$apiBaseUrl/api/job-offers/focus" -Headers $authHeaders -UseBasicParsing -TimeoutSec 20
Assert-StatusCode -Actual $notebookFocus.StatusCode -Allowed @(200) -Context 'Get notebook focus queues'
$notebookFocusPayload = $notebookFocus.Content | ConvertFrom-Json
if ($null -eq $notebookFocusPayload.data.groups -or $notebookFocusPayload.data.groups.Count -lt 3) {
  throw 'Notebook focus payload missing expected groups.'
}

Write-Host '12.1) Verifying scrape diagnostics endpoint...'
$stage = 'verify-scrape-diagnostics'
$diagnostics = Invoke-WebRequest -Uri "$apiBaseUrl/api/job-sources/runs/$sourceRunId/diagnostics" -Headers $authHeaders -UseBasicParsing -TimeoutSec 20
Assert-StatusCode -Actual $diagnostics.StatusCode -Allowed @(200) -Context 'Get scrape run diagnostics'
$diagnosticsPayload = $diagnostics.Content | ConvertFrom-Json
if ($diagnosticsPayload.data.runId -ne $sourceRunId) {
  throw "Diagnostics run id mismatch. expected=$sourceRunId got=$($diagnosticsPayload.data.runId)"
}
if ($null -eq $diagnosticsPayload.data.diagnostics.stats.jobLinksDiscovered) {
  throw 'Scrape diagnostics missing stats.jobLinksDiscovered.'
}
if ($null -eq $diagnosticsPayload.data.finalizedAt -and $null -eq $diagnosticsPayload.data.heartbeatAt) {
  throw 'Scrape diagnostics missing both finalizedAt and heartbeatAt.'
}

Write-Host '12.2) Verifying scrape diagnostics summary endpoint...'
$stage = 'verify-scrape-diagnostics-summary'
$diagnosticsSummary = Invoke-WebRequest -Uri "$apiBaseUrl/api/job-sources/runs/diagnostics/summary?windowHours=168&includeTimeline=true&bucket=day" -Headers $authHeaders -UseBasicParsing -TimeoutSec 20
Assert-StatusCode -Actual $diagnosticsSummary.StatusCode -Allowed @(200) -Context 'Get scrape diagnostics summary'
$diagnosticsSummaryPayload = $diagnosticsSummary.Content | ConvertFrom-Json
if ($null -eq $diagnosticsSummaryPayload.data.status.total) {
  throw 'Scrape diagnostics summary missing status.total.'
}
if ($null -eq $diagnosticsSummaryPayload.data.performance.successRate) {
  throw 'Scrape diagnostics summary missing performance.successRate.'
}
if ($null -eq $diagnosticsSummaryPayload.data.timeline) {
  throw 'Scrape diagnostics summary missing timeline.'
}
if ($null -eq $diagnosticsSummaryPayload.data.lifecycle.retriedRuns) {
  throw 'Scrape diagnostics summary missing lifecycle.retriedRuns.'
}

Write-Host '12.3) Verifying retry endpoint guard on completed run...'
$stage = 'verify-scrape-retry-guard'
$retryRejected = $false
try {
  Invoke-WebRequest -Uri "$apiBaseUrl/api/job-sources/runs/$sourceRunId/retry" -Method Post -Headers $authHeaders -UseBasicParsing -TimeoutSec 20 | Out-Null
} catch {
  if ($_.Exception.Response -and [int]$_.Exception.Response.StatusCode -in @(400, 409)) {
    $retryRejected = $true
  } else {
    throw
  }
}
if (-not $retryRejected) {
  throw 'Retry endpoint should reject retry for completed run.'
}

Write-Host '13) Verifying notebook offer actions (status/meta/history/score)...'
$stage = 'notebook-actions'
$offer = $matched[0]
$offerId = $offer.id
if ([string]::IsNullOrWhiteSpace($offerId)) {
  throw "Missing user job offer id for sourceRunId=$sourceRunId"
}

$statusUpdate = Invoke-WebRequest -Uri "$apiBaseUrl/api/job-offers/$offerId/status" -Method Patch -Headers $authHeaders -ContentType 'application/json' -Body (@{ status = 'SAVED' } | ConvertTo-Json) -UseBasicParsing -TimeoutSec 20
Assert-StatusCode -Actual $statusUpdate.StatusCode -Allowed @(200) -Context 'Update job offer status'

$metaUpdate = Invoke-WebRequest -Uri "$apiBaseUrl/api/job-offers/$offerId/meta" -Method Patch -Headers $authHeaders -ContentType 'application/json' -Body (@{ notes = 'smoke-note'; tags = @('smoke','backend') } | ConvertTo-Json) -UseBasicParsing -TimeoutSec 20
Assert-StatusCode -Actual $metaUpdate.StatusCode -Allowed @(200) -Context 'Update job offer meta'

$bulkFollowUp = Invoke-WebRequest -Uri "$apiBaseUrl/api/job-offers/pipeline/bulk-follow-up" -Method Post -Headers $authHeaders -ContentType 'application/json' -Body (@{
  ids = @($offerId)
  followUpAt = (Get-Date).AddDays(2).ToString('o')
  nextStep = 'Send recruiter follow-up'
  note = 'Mention updated portfolio'
} | ConvertTo-Json) -UseBasicParsing -TimeoutSec 20
Assert-StatusCode -Actual $bulkFollowUp.StatusCode -Allowed @(200, 201) -Context 'Bulk update job offer follow-up'
$bulkFollowUpPayload = $bulkFollowUp.Content | ConvertFrom-Json
if ($bulkFollowUpPayload.data.updated -lt 1) {
  throw 'Bulk follow-up update did not update any offers.'
}

$history = Invoke-WebRequest -Uri "$apiBaseUrl/api/job-offers/$offerId/history" -Headers $authHeaders -UseBasicParsing -TimeoutSec 20
Assert-StatusCode -Actual $history.StatusCode -Allowed @(200) -Context 'Get job offer history'
$historyPayload = $history.Content | ConvertFrom-Json
if (-not $historyPayload.data.statusHistory) {
  throw 'Status history payload missing'
}

$score = Invoke-WebRequestWithRateLimitRetry -Context 'Score user job offer' -Attempts 2 -DefaultDelaySeconds 65 -Action {
  Invoke-WebRequest -Uri "$apiBaseUrl/api/job-offers/$offerId/score" -Method Post -Headers $authHeaders -ContentType 'application/json' -Body (@{ minScore = 0 } | ConvertTo-Json) -UseBasicParsing -TimeoutSec 45
}
Assert-StatusCode -Actual $score.StatusCode -Allowed @(200, 201) -Context 'Score job offer'
$scorePayload = $score.Content | ConvertFrom-Json
if ($null -eq $scorePayload.data.score) {
  throw 'Job offer score response missing score field'
}
if ($scorePayload.data.matchMeta.profileSchemaVersion -ne '1.0.0') {
  throw "Job offer score should include canonical profileSchemaVersion=1.0.0. got=$($scorePayload.data.matchMeta.profileSchemaVersion)"
}
if ($null -eq $scorePayload.data.matchMeta.breakdown -or $null -eq $scorePayload.data.matchMeta.hardConstraintViolations) {
  throw 'Job offer score matchMeta missing breakdown or hardConstraintViolations.'
}

Write-Host '13.1) Verifying schedule trigger-now path...'
$stage = 'schedule-trigger-now'
$scheduledTrigger = Invoke-WithRetry -Context 'Trigger scrape schedule now' -Attempts 2 -DelaySeconds 2 -Action {
  Invoke-WebRequest -Uri "$apiBaseUrl/api/job-sources/schedule/trigger-now" -Method Post -Headers $authHeaders -UseBasicParsing -TimeoutSec 20
}
Assert-StatusCode -Actual $scheduledTrigger.StatusCode -Allowed @(200, 201, 202) -Context 'Trigger scrape schedule now'
$scheduledTriggerPayload = $scheduledTrigger.Content | ConvertFrom-Json
if ([string]::IsNullOrWhiteSpace($scheduledTriggerPayload.data.sourceRunId)) {
  throw 'Trigger-now response missing sourceRunId.'
}

Write-Host "Smoke test passed. sourceRunId=$sourceRunId offers=$($matched.Count) matchId=$matchId"
} catch {
  if ($managedServices.Count -gt 0) {
    Show-ManagedServiceLogs -Services $managedServices
  }
  Write-Host "Smoke test failed at stage: $stage" -ForegroundColor Red
  throw
} finally {
  if ($managedServices.Count -gt 0) {
    Stop-ManagedServices -Services $managedServices
  }
}



