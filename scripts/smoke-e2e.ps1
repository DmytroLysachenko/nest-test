$ErrorActionPreference = 'Stop'

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

Write-Host '== E2E Smoke =='

Write-Host '1) Seeding minimal fixture data...'
pnpm --filter @repo/db seed:e2e | Out-Host

Write-Host '2) Checking service health endpoints...'
$apiHealth = Invoke-WebRequest -Uri 'http://localhost:3000/health' -UseBasicParsing -TimeoutSec 15
Assert-StatusCode -Actual $apiHealth.StatusCode -Allowed @(200) -Context 'API health'

$workerHealth = Invoke-WebRequest -Uri 'http://localhost:4001/health' -UseBasicParsing -TimeoutSec 15
Assert-StatusCode -Actual $workerHealth.StatusCode -Allowed @(200) -Context 'Worker health'

$webHome = Invoke-WebRequest -Uri 'http://localhost:3002' -UseBasicParsing -TimeoutSec 15
Assert-StatusCode -Actual $webHome.StatusCode -Allowed @(200) -Context 'Web health'

Write-Host '3) Authenticating fixture user...'
$loginBody = @{
  email    = 'admin@example.com'
  password = 'admin123'
} | ConvertTo-Json

$login = Invoke-WebRequest -Uri 'http://localhost:3000/api/auth/login' -Method Post -ContentType 'application/json' -Body $loginBody -UseBasicParsing -TimeoutSec 20
Assert-StatusCode -Actual $login.StatusCode -Allowed @(200, 201) -Context 'Auth login'

$loginPayload = $login.Content | ConvertFrom-Json
$token = $loginPayload.data.accessToken
if ([string]::IsNullOrWhiteSpace($token)) {
  throw 'Auth login did not return accessToken.'
}

$authHeaders = @{
  Authorization = "Bearer $token"
}

Write-Host '4) Reading job source runs...'
$runs = Invoke-WebRequest -Uri 'http://localhost:3000/api/job-sources/runs' -Headers $authHeaders -UseBasicParsing -TimeoutSec 20
Assert-StatusCode -Actual $runs.StatusCode -Allowed @(200) -Context 'List job source runs'

Write-Host '5) Enqueueing scrape task through API...'
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

Write-Host '6) Waiting for scrape run completion callback...'
$deadline = (Get-Date).AddMinutes(3)
$finalStatus = $null
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
  if ($finalStatus -eq 'COMPLETED' -or $finalStatus -eq 'FAILED') {
    break
  }
}

if ($finalStatus -ne 'COMPLETED') {
  throw "Scrape run did not complete successfully. status=$finalStatus sourceRunId=$sourceRunId"
}

Write-Host '7) Verifying persisted user job offers for this run...'
$offers = Invoke-WebRequest -Uri 'http://localhost:3000/api/job-offers?limit=100' -Headers $authHeaders -UseBasicParsing -TimeoutSec 20
Assert-StatusCode -Actual $offers.StatusCode -Allowed @(200) -Context 'List job offers'
$offersPayload = $offers.Content | ConvertFrom-Json
$matched = @($offersPayload.data.items | Where-Object { $_.sourceRunId -eq $sourceRunId })
if ($matched.Count -lt 1) {
  throw "No persisted user job offers found for sourceRunId=$sourceRunId"
}

Write-Host "Smoke test passed. sourceRunId=$sourceRunId offers=$($matched.Count)"
