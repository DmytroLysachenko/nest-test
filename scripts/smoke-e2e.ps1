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

Write-Host '5.05) Verifying onboarding draft CRUD endpoints...'
$stage = 'onboarding-draft'
$draftPut = Invoke-WebRequest -Uri 'http://localhost:3000/api/onboarding/draft' -Method Put -Headers $authHeaders -ContentType 'application/json' -Body (@{
  payload = @{
    desiredPositions = @('Backend Developer')
    coreSkills = @('Node.js', 'TypeScript', 'PostgreSQL')
  }
} | ConvertTo-Json -Depth 6) -UseBasicParsing -TimeoutSec 20
Assert-StatusCode -Actual $draftPut.StatusCode -Allowed @(200, 201) -Context 'Upsert onboarding draft'
$draftGet = Invoke-WebRequest -Uri 'http://localhost:3000/api/onboarding/draft' -Headers $authHeaders -UseBasicParsing -TimeoutSec 20
Assert-StatusCode -Actual $draftGet.StatusCode -Allowed @(200) -Context 'Get onboarding draft'
$draftPayload = $draftGet.Content | ConvertFrom-Json
if (-not $draftPayload.data.payload) {
  throw 'Onboarding draft payload missing.'
}
$draftDelete = Invoke-WebRequest -Uri 'http://localhost:3000/api/onboarding/draft' -Method Delete -Headers $authHeaders -UseBasicParsing -TimeoutSec 20
Assert-StatusCode -Actual $draftDelete.StatusCode -Allowed @(200) -Context 'Delete onboarding draft'

Write-Host '5.1) Verifying document upload-health endpoint...'
$stage = 'documents-upload-health'
$uploadHealth = Invoke-WebRequest -Uri 'http://localhost:3000/api/documents/upload-health' -Headers $authHeaders -UseBasicParsing -TimeoutSec 20
Assert-StatusCode -Actual $uploadHealth.StatusCode -Allowed @(200) -Context 'Documents upload-health'
$uploadHealthPayload = $uploadHealth.Content | ConvertFrom-Json
if ($null -eq $uploadHealthPayload.data.ok) {
  throw 'Documents upload-health payload missing ok flag.'
}

Write-Host '6) Verifying career-profile endpoints (latest/list/get/restore/documents)...'
$stage = 'career-profiles'
$careerLatest = Invoke-WebRequest -Uri 'http://localhost:3000/api/career-profiles/latest' -Headers $authHeaders -UseBasicParsing -TimeoutSec 20
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
$workspaceSummary = Invoke-WebRequest -Uri 'http://localhost:3000/api/workspace/summary' -Headers $authHeaders -UseBasicParsing -TimeoutSec 20
Assert-StatusCode -Actual $workspaceSummary.StatusCode -Allowed @(200) -Context 'Get workspace summary'
$workspaceSummaryPayload = $workspaceSummary.Content | ConvertFrom-Json
if ($null -eq $workspaceSummaryPayload.data.workflow.needsOnboarding) {
  throw 'Workspace summary missing workflow.needsOnboarding.'
}

Write-Host '6.2) Verifying ops metrics endpoint...'
$stage = 'ops-metrics'
$opsMetrics = Invoke-WebRequest -Uri 'http://localhost:3000/api/ops/metrics' -Headers $authHeaders -UseBasicParsing -TimeoutSec 20
Assert-StatusCode -Actual $opsMetrics.StatusCode -Allowed @(200) -Context 'Get ops metrics'
$opsMetricsPayload = $opsMetrics.Content | ConvertFrom-Json
if ($null -eq $opsMetricsPayload.data.queue.activeRuns) {
  throw 'Ops metrics missing queue.activeRuns.'
}

$careerList = Invoke-WebRequest -Uri 'http://localhost:3000/api/career-profiles?limit=10' -Headers $authHeaders -UseBasicParsing -TimeoutSec 20
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

$careerById = Invoke-WebRequest -Uri "http://localhost:3000/api/career-profiles/$careerProfileId" -Headers $authHeaders -UseBasicParsing -TimeoutSec 20
Assert-StatusCode -Actual $careerById.StatusCode -Allowed @(200) -Context 'Get career profile by id'
$careerByIdPayload = $careerById.Content | ConvertFrom-Json
if ($careerByIdPayload.data.id -ne $careerProfileId) {
  throw "Career profile by id mismatch. expected=$careerProfileId got=$($careerByIdPayload.data.id)"
}

$careerDocs = Invoke-WebRequest -Uri "http://localhost:3000/api/career-profiles/$careerProfileId/documents" -Headers $authHeaders -UseBasicParsing -TimeoutSec 20
Assert-StatusCode -Actual $careerDocs.StatusCode -Allowed @(200) -Context 'Get career profile documents'
$careerDocsPayload = $careerDocs.Content | ConvertFrom-Json
if ($null -eq $careerDocsPayload.data) {
  throw 'Career profile documents response missing data.'
}
$documentIdForDiagnostics = @($careerDocsPayload.data | Select-Object -First 1).id
if ($documentIdForDiagnostics) {
  $documentEvents = Invoke-WebRequest -Uri "http://localhost:3000/api/documents/$documentIdForDiagnostics/events" -Headers $authHeaders -UseBasicParsing -TimeoutSec 20
  Assert-StatusCode -Actual $documentEvents.StatusCode -Allowed @(200) -Context 'Document diagnostics timeline'
}

$restore = Invoke-WebRequest -Uri "http://localhost:3000/api/career-profiles/$careerProfileId/restore" -Method Post -Headers $authHeaders -UseBasicParsing -TimeoutSec 20
Assert-StatusCode -Actual $restore.StatusCode -Allowed @(200, 201) -Context 'Restore career profile version'
$restorePayload = $restore.Content | ConvertFrom-Json
if ($restorePayload.data.id -ne $careerProfileId -or $restorePayload.data.isActive -ne $true) {
  throw 'Career profile restore did not keep selected profile active.'
}

Write-Host '7) Verifying denormalized career-profile search-view endpoint...'
$stage = 'career-profiles-search-view'
$searchView = Invoke-WebRequest -Uri 'http://localhost:3000/api/career-profiles/search-view?status=READY&isActive=true&keyword=react&technology=typescript&seniority=mid&limit=10' -Headers $authHeaders -UseBasicParsing -TimeoutSec 20
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

$jobMatch = Invoke-WebRequest -Uri 'http://localhost:3000/api/job-matching/score' -Method Post -Headers $authHeaders -ContentType 'application/json' -Body $jobMatchingBody -UseBasicParsing -TimeoutSec 30
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
$jobMatches = Invoke-WebRequest -Uri 'http://localhost:3000/api/job-matching?limit=10' -Headers $authHeaders -UseBasicParsing -TimeoutSec 20
Assert-StatusCode -Actual $jobMatches.StatusCode -Allowed @(200) -Context 'List job matches'
$jobMatchesPayload = $jobMatches.Content | ConvertFrom-Json
$createdMatch = @($jobMatchesPayload.data.items | Where-Object { $_.id -eq $matchId } | Select-Object -First 1)
if (-not $createdMatch) {
  throw "Scored job match id=$matchId not found in job-matching list."
}

$jobMatchById = Invoke-WebRequest -Uri "http://localhost:3000/api/job-matching/$matchId" -Headers $authHeaders -UseBasicParsing -TimeoutSec 20
Assert-StatusCode -Actual $jobMatchById.StatusCode -Allowed @(200) -Context 'Get job match by id'
$jobMatchByIdPayload = $jobMatchById.Content | ConvertFrom-Json
if ($jobMatchByIdPayload.data.id -ne $matchId) {
  throw "Job match by id mismatch. expected=$matchId got=$($jobMatchByIdPayload.data.id)"
}

Write-Host '8.1) Verifying job-matching audit endpoints...'
$stage = 'job-matching-audit'
$jobMatchAudit = Invoke-WebRequest -Uri 'http://localhost:3000/api/job-matching/audit?limit=10' -Headers $authHeaders -UseBasicParsing -TimeoutSec 20
Assert-StatusCode -Actual $jobMatchAudit.StatusCode -Allowed @(200) -Context 'List job match audit'
$jobMatchAuditPayload = $jobMatchAudit.Content | ConvertFrom-Json
$auditItem = @($jobMatchAuditPayload.data.items | Where-Object { $_.id -eq $matchId } | Select-Object -First 1)
if (-not $auditItem) {
  throw "Scored job match id=$matchId not found in job-matching audit list."
}
if ($null -eq $auditItem.matchMeta) {
  throw 'Job match audit item missing matchMeta.'
}

$jobMatchAuditCsv = Invoke-WebRequest -Uri 'http://localhost:3000/api/job-matching/audit/export.csv?limit=10' -Headers $authHeaders -UseBasicParsing -TimeoutSec 20
Assert-StatusCode -Actual $jobMatchAuditCsv.StatusCode -Allowed @(200) -Context 'Export job match audit csv'
if ($jobMatchAuditCsv.Content -notmatch 'id,careerProfileId,profileVersion,score') {
  throw 'Job match audit CSV header missing expected columns.'
}

Write-Host '9) Reading job source runs...'
$stage = 'job-source-runs'
$runs = Invoke-WebRequest -Uri 'http://localhost:3000/api/job-sources/runs' -Headers $authHeaders -UseBasicParsing -TimeoutSec 20
Assert-StatusCode -Actual $runs.StatusCode -Allowed @(200) -Context 'List job source runs'

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

$scrape = Invoke-WebRequest -Uri 'http://localhost:3000/api/job-sources/scrape' -Method Post -Headers $scrapeHeaders -ContentType 'application/json' -Body $scrapeBody -UseBasicParsing -TimeoutSec 45
Assert-StatusCode -Actual $scrape.StatusCode -Allowed @(200, 201, 202) -Context 'Enqueue scrape'

$scrapePayload = $scrape.Content | ConvertFrom-Json
$sourceRunId = $scrapePayload.data.sourceRunId
if ([string]::IsNullOrWhiteSpace($sourceRunId)) {
  throw 'Scrape enqueue did not return sourceRunId.'
}

Write-Host '11) Waiting for scrape run completion callback...'
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

Write-Host '12) Verifying persisted user job offers for this run...'
$stage = 'verify-persisted-offers'
$offers = Invoke-WebRequest -Uri 'http://localhost:3000/api/job-offers?mode=strict&limit=100' -Headers $authHeaders -UseBasicParsing -TimeoutSec 20
Assert-StatusCode -Actual $offers.StatusCode -Allowed @(200) -Context 'List job offers'
$offersPayload = $offers.Content | ConvertFrom-Json
$offersMode = $offersPayload.data.mode
if ($offersMode -ne 'strict') {
  throw "Expected strict ranking mode in response. got=$offersMode"
}

$offersApprox = Invoke-WebRequest -Uri 'http://localhost:3000/api/job-offers?mode=approx&limit=100' -Headers $authHeaders -UseBasicParsing -TimeoutSec 20
Assert-StatusCode -Actual $offersApprox.StatusCode -Allowed @(200) -Context 'List job offers (approx mode)'
$offersApproxPayload = $offersApprox.Content | ConvertFrom-Json
if ($offersApproxPayload.data.mode -ne 'approx') {
  throw "Expected approx ranking mode in response. got=$($offersApproxPayload.data.mode)"
}
$matched = @($offersApproxPayload.data.items | Where-Object { $_.sourceRunId -eq $sourceRunId })
if ($matched.Count -lt 1) {
  throw "No persisted user job offers found for sourceRunId=$sourceRunId"
}

Write-Host '12.1) Verifying scrape diagnostics endpoint...'
$stage = 'verify-scrape-diagnostics'
$diagnostics = Invoke-WebRequest -Uri "http://localhost:3000/api/job-sources/runs/$sourceRunId/diagnostics" -Headers $authHeaders -UseBasicParsing -TimeoutSec 20
Assert-StatusCode -Actual $diagnostics.StatusCode -Allowed @(200) -Context 'Get scrape run diagnostics'
$diagnosticsPayload = $diagnostics.Content | ConvertFrom-Json
if ($diagnosticsPayload.data.runId -ne $sourceRunId) {
  throw "Diagnostics run id mismatch. expected=$sourceRunId got=$($diagnosticsPayload.data.runId)"
}
if ($null -eq $diagnosticsPayload.data.diagnostics.stats.jobLinksDiscovered) {
  throw 'Scrape diagnostics missing stats.jobLinksDiscovered.'
}

Write-Host '12.2) Verifying scrape diagnostics summary endpoint...'
$stage = 'verify-scrape-diagnostics-summary'
$diagnosticsSummary = Invoke-WebRequest -Uri 'http://localhost:3000/api/job-sources/runs/diagnostics/summary?windowHours=168' -Headers $authHeaders -UseBasicParsing -TimeoutSec 20
Assert-StatusCode -Actual $diagnosticsSummary.StatusCode -Allowed @(200) -Context 'Get scrape diagnostics summary'
$diagnosticsSummaryPayload = $diagnosticsSummary.Content | ConvertFrom-Json
if ($null -eq $diagnosticsSummaryPayload.data.status.total) {
  throw 'Scrape diagnostics summary missing status.total.'
}
if ($null -eq $diagnosticsSummaryPayload.data.performance.successRate) {
  throw 'Scrape diagnostics summary missing performance.successRate.'
}

Write-Host '13) Verifying notebook offer actions (status/meta/history/score)...'
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
if ($scorePayload.data.matchMeta.profileSchemaVersion -ne '1.0.0') {
  throw "Job offer score should include canonical profileSchemaVersion=1.0.0. got=$($scorePayload.data.matchMeta.profileSchemaVersion)"
}
if ($null -eq $scorePayload.data.matchMeta.breakdown -or $null -eq $scorePayload.data.matchMeta.hardConstraintViolations) {
  throw 'Job offer score matchMeta missing breakdown or hardConstraintViolations.'
}

Write-Host "Smoke test passed. sourceRunId=$sourceRunId offers=$($matched.Count) matchId=$matchId"
} catch {
  Write-Host "Smoke test failed at stage: $stage" -ForegroundColor Red
  throw
}
