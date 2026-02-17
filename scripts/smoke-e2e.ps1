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

try {
Write-Host '== E2E Smoke =='

Write-Host '1) Seeding minimal fixture data...'
$stage = 'seed-fixtures'
pnpm --filter @repo/db seed:e2e | Out-Host

Write-Host '2) Checking service health endpoints...'
$stage = 'health-checks'
$apiHealth = Invoke-WebRequest -Uri 'http://localhost:3000/health' -UseBasicParsing -TimeoutSec 15
Assert-StatusCode -Actual $apiHealth.StatusCode -Allowed @(200) -Context 'API health'

$workerHealth = Invoke-WebRequest -Uri 'http://localhost:4001/health' -UseBasicParsing -TimeoutSec 15
Assert-StatusCode -Actual $workerHealth.StatusCode -Allowed @(200) -Context 'Worker health'

$webHome = Invoke-WebRequest -Uri 'http://localhost:3002/health' -UseBasicParsing -TimeoutSec 15
Assert-StatusCode -Actual $webHome.StatusCode -Allowed @(200) -Context 'Web health'

Write-Host '3) Authenticating fixture user...'
$stage = 'auth-login'
$loginBody = @{
  email    = 'admin@example.com'
  password = 'admin123'
} | ConvertTo-Json

$login = Invoke-WebRequest -Uri 'http://localhost:3000/api/auth/login' -Method Post -ContentType 'application/json' -Body $loginBody -UseBasicParsing -TimeoutSec 20
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

$refresh = Invoke-WebRequest -Uri 'http://localhost:3000/api/auth/refresh' -Method Post -ContentType 'application/json' -Body $refreshBody -UseBasicParsing -TimeoutSec 20
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

$me = Invoke-WebRequest -Uri 'http://localhost:3000/api/user' -Headers $authHeaders -UseBasicParsing -TimeoutSec 20
Assert-StatusCode -Actual $me.StatusCode -Allowed @(200) -Context 'Current user with refreshed access token'

$invalidRefreshFailed = $false
try {
  Invoke-WebRequest -Uri 'http://localhost:3000/api/auth/refresh' -Method Post -ContentType 'application/json' -Body (@{ refreshToken = 'invalid-token' } | ConvertTo-Json) -UseBasicParsing -TimeoutSec 20 | Out-Null
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

$profileCreate = Invoke-WebRequest -Uri 'http://localhost:3000/api/profile-inputs' -Method Post -Headers $authHeaders -ContentType 'application/json' -Body $profileInputBody -UseBasicParsing -TimeoutSec 20
Assert-StatusCode -Actual $profileCreate.StatusCode -Allowed @(200, 201) -Context 'Create profile input'

$profileLatest = Invoke-WebRequest -Uri 'http://localhost:3000/api/profile-inputs/latest' -Headers $authHeaders -UseBasicParsing -TimeoutSec 20
Assert-StatusCode -Actual $profileLatest.StatusCode -Allowed @(200) -Context 'Get latest profile input'
$profileLatestPayload = $profileLatest.Content | ConvertFrom-Json
if (-not $profileLatestPayload.data) {
  throw 'Latest profile input returned no data.'
}

Write-Host '6) Reading job source runs...'
$stage = 'job-source-runs'
$runs = Invoke-WebRequest -Uri 'http://localhost:3000/api/job-sources/runs' -Headers $authHeaders -UseBasicParsing -TimeoutSec 20
Assert-StatusCode -Actual $runs.StatusCode -Allowed @(200) -Context 'List job source runs'

Write-Host '7) Enqueueing scrape task through API...'
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

$scrape = Invoke-WebRequest -Uri 'http://localhost:3000/api/job-sources/scrape' -Method Post -Headers $scrapeHeaders -ContentType 'application/json' -Body $scrapeBody -UseBasicParsing -TimeoutSec 30
Assert-StatusCode -Actual $scrape.StatusCode -Allowed @(200, 201, 202) -Context 'Enqueue scrape'

$scrapePayload = $scrape.Content | ConvertFrom-Json
$sourceRunId = $scrapePayload.data.sourceRunId
if ([string]::IsNullOrWhiteSpace($sourceRunId)) {
  throw 'Scrape enqueue did not return sourceRunId.'
}

Write-Host '8) Waiting for scrape run completion callback...'
$stage = 'wait-completion'
$deadline = (Get-Date).AddMinutes(3)
$finalStatus = $null
$finalFailureType = $null
while ((Get-Date) -lt $deadline) {
  Start-Sleep -Seconds 5
  try {
    $run = Invoke-WebRequest -Uri "http://localhost:3000/api/job-sources/runs/$sourceRunId" -Headers $authHeaders -UseBasicParsing -TimeoutSec 20
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

Write-Host '9) Verifying persisted user job offers for this run...'
$stage = 'verify-persisted-offers'
$offers = Invoke-WebRequest -Uri 'http://localhost:3000/api/job-offers?limit=100' -Headers $authHeaders -UseBasicParsing -TimeoutSec 20
Assert-StatusCode -Actual $offers.StatusCode -Allowed @(200) -Context 'List job offers'
$offersPayload = $offers.Content | ConvertFrom-Json
$matched = @($offersPayload.data.items | Where-Object { $_.sourceRunId -eq $sourceRunId })
if ($matched.Count -lt 1) {
  throw "No persisted user job offers found for sourceRunId=$sourceRunId"
}

Write-Host '10) Verifying notebook offer actions (status/meta/history/score)...'
$stage = 'notebook-actions'
$offer = $matched[0]
$offerId = $offer.id
if ([string]::IsNullOrWhiteSpace($offerId)) {
  throw "Missing user job offer id for sourceRunId=$sourceRunId"
}

$statusUpdate = Invoke-WebRequest -Uri "http://localhost:3000/api/job-offers/$offerId/status" -Method Patch -Headers $authHeaders -ContentType 'application/json' -Body (@{ status = 'SAVED' } | ConvertTo-Json) -UseBasicParsing -TimeoutSec 20
Assert-StatusCode -Actual $statusUpdate.StatusCode -Allowed @(200) -Context 'Update job offer status'

$metaUpdate = Invoke-WebRequest -Uri "http://localhost:3000/api/job-offers/$offerId/meta" -Method Patch -Headers $authHeaders -ContentType 'application/json' -Body (@{ notes = 'smoke-note'; tags = @('smoke','backend') } | ConvertTo-Json) -UseBasicParsing -TimeoutSec 20
Assert-StatusCode -Actual $metaUpdate.StatusCode -Allowed @(200) -Context 'Update job offer meta'

$history = Invoke-WebRequest -Uri "http://localhost:3000/api/job-offers/$offerId/history" -Headers $authHeaders -UseBasicParsing -TimeoutSec 20
Assert-StatusCode -Actual $history.StatusCode -Allowed @(200) -Context 'Get job offer history'
$historyPayload = $history.Content | ConvertFrom-Json
if (-not $historyPayload.data.statusHistory) {
  throw 'Status history payload missing'
}

$score = Invoke-WebRequest -Uri "http://localhost:3000/api/job-offers/$offerId/score" -Method Post -Headers $authHeaders -ContentType 'application/json' -Body (@{ minScore = 0 } | ConvertTo-Json) -UseBasicParsing -TimeoutSec 45
Assert-StatusCode -Actual $score.StatusCode -Allowed @(200, 201) -Context 'Score job offer'
$scorePayload = $score.Content | ConvertFrom-Json
if ($null -eq $scorePayload.data.score) {
  throw 'Job offer score response missing score field'
}

Write-Host "Smoke test passed. sourceRunId=$sourceRunId offers=$($matched.Count)"
} catch {
  Write-Host "Smoke test failed at stage: $stage" -ForegroundColor Red
  throw
}
