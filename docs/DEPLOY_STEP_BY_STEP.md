# Deploy 3 Services To GCP From GitHub (Step By Step)

This is a beginner-friendly checklist for your repo `DmytroLysachenko/nest-test`.

Services:
- API: `job-seek-api`
- Worker: `job-seek-worker`
- Web: `job-seek-web`

Target:
- GCP project: `job-seeking-service`
- Region: `europe-west1`
- Artifact Registry repo: `nest-test`
- Bucket: `job-seeking-bucket`
- Branch for auto deploy: `master`

Cost mode (cheap):
- Cloud Run `min instances = 0` for all services
- cold starts allowed

## 1. Install and login tools (one time)

Install:
1. `gcloud` CLI
2. `gh` (GitHub CLI)

Login:

```powershell
gcloud auth login
gcloud auth application-default login
gcloud config set project job-seeking-service
gcloud config set run/region europe-west1

"C:\Program Files\GitHub CLI\gh.exe" auth login --hostname github.com --git-protocol https --web
```

## 2. Enable required GCP APIs (one time)

```powershell
gcloud services enable `
  run.googleapis.com `
  artifactregistry.googleapis.com `
  secretmanager.googleapis.com `
  cloudtasks.googleapis.com `
  iamcredentials.googleapis.com `
  cloudbuild.googleapis.com
```

## 3. Create base infra (one time)

Artifact Registry:

```powershell
gcloud artifacts repositories create nest-test `
  --repository-format=docker `
  --location=europe-west1 `
  --description="Docker images for nest-test"
```

Cloud Tasks queue:

```powershell
gcloud tasks queues create worker-scrape --location=europe-west1
```

Service accounts:

```powershell
gcloud iam service-accounts create api-runtime --display-name "api-runtime"
gcloud iam service-accounts create worker-runtime --display-name "worker-runtime"
gcloud iam service-accounts create web-runtime --display-name "web-runtime"
gcloud iam service-accounts create github-deployer --display-name "GitHub Actions Deployer"
```

## 4. Grant IAM roles (one time)

For GitHub deployer SA:

```powershell
gcloud projects add-iam-policy-binding job-seeking-service --member="serviceAccount:github-deployer@job-seeking-service.iam.gserviceaccount.com" --role="roles/run.admin"
gcloud projects add-iam-policy-binding job-seeking-service --member="serviceAccount:github-deployer@job-seeking-service.iam.gserviceaccount.com" --role="roles/artifactregistry.writer"
gcloud projects add-iam-policy-binding job-seeking-service --member="serviceAccount:github-deployer@job-seeking-service.iam.gserviceaccount.com" --role="roles/iam.serviceAccountUser"
gcloud projects add-iam-policy-binding job-seeking-service --member="serviceAccount:github-deployer@job-seeking-service.iam.gserviceaccount.com" --role="roles/secretmanager.admin"
gcloud projects add-iam-policy-binding job-seeking-service --member="serviceAccount:github-deployer@job-seeking-service.iam.gserviceaccount.com" --role="roles/cloudtasks.admin"
```

For runtime SAs:

```powershell
gcloud projects add-iam-policy-binding job-seeking-service --member="serviceAccount:api-runtime@job-seeking-service.iam.gserviceaccount.com" --role="roles/secretmanager.secretAccessor"
gcloud projects add-iam-policy-binding job-seeking-service --member="serviceAccount:api-runtime@job-seeking-service.iam.gserviceaccount.com" --role="roles/cloudtasks.enqueuer"
gcloud projects add-iam-policy-binding job-seeking-service --member="serviceAccount:api-runtime@job-seeking-service.iam.gserviceaccount.com" --role="roles/storage.objectAdmin"
gcloud projects add-iam-policy-binding job-seeking-service --member="serviceAccount:worker-runtime@job-seeking-service.iam.gserviceaccount.com" --role="roles/secretmanager.secretAccessor"
```

## 5. Configure GitHub OIDC (one time)

Create Workload Identity pool/provider:

```powershell
gcloud iam workload-identity-pools create github-pool --location=global --display-name="GitHub Actions Pool"

gcloud iam workload-identity-pools providers create-oidc github-provider `
  --location=global `
  --workload-identity-pool=github-pool `
  --display-name="GitHub OIDC Provider" `
  --issuer-uri="https://token.actions.githubusercontent.com" `
  --attribute-mapping="google.subject=assertion.sub,attribute.actor=assertion.actor,attribute.repository=assertion.repository,attribute.ref=assertion.ref" `
  --attribute-condition="assertion.repository=='DmytroLysachenko/nest-test'"
```

Allow GitHub repo to impersonate deployer SA:

```powershell
gcloud iam service-accounts add-iam-policy-binding github-deployer@job-seeking-service.iam.gserviceaccount.com `
  --role="roles/iam.workloadIdentityUser" `
  --member="principalSet://iam.googleapis.com/projects/842434374136/locations/global/workloadIdentityPools/github-pool/attribute.repository/DmytroLysachenko/nest-test"
```

Provider value for GitHub variable:

`projects/842434374136/locations/global/workloadIdentityPools/github-pool/providers/github-provider`

## 6. Set GitHub Actions variables/secrets (one time)

Path in GitHub UI:
- `Repo -> Settings -> Secrets and variables -> Actions`

Variables:
1. `GCP_PROJECT_ID=job-seeking-service`
2. `GCP_REGION=europe-west1`
3. `GAR_REPOSITORY=nest-test`
4. `GCP_API_SERVICE=job-seek-api`
5. `GCP_WORKER_SERVICE=job-seek-worker`
6. `GCP_WEB_SERVICE=job-seek-web`
7. `GCS_BUCKET=job-seeking-bucket`
8. `GCP_WORKLOAD_IDENTITY_PROVIDER=projects/842434374136/locations/global/workloadIdentityPools/github-pool/providers/github-provider`
9. `GCP_DEPLOYER_SERVICE_ACCOUNT=github-deployer@job-seeking-service.iam.gserviceaccount.com`

Secrets:
1. `DATABASE_URL` (Neon URL)
2. `ACCESS_TOKEN_SECRET`
3. `REFRESH_TOKEN_SECRET`
4. `MAIL_USERNAME`
5. `MAIL_PASSWORD`
6. `WORKER_SHARED_TOKEN`
7. `WORKER_CALLBACK_TOKEN`

Optional via CLI (reads local env files):

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\setup-github-cicd.ps1
```

## 7. Ensure workflows are in `master`

Required files:
1. `.github/workflows/ci-verify.yml`
2. `.github/workflows/deploy-prod-on-main.yml`
3. `scripts/deploy-cloud-run-prod.sh`

## 8. Deploy

From now on, deploy is automatic on every push to `master`:

```powershell
git add .
git commit -m "your message"
git push origin master
```

Then open GitHub Actions and wait for:
1. `CI Verify` = success
2. `Deploy Prod On Main` = success

## 9. Verify services are live

List services:

```powershell
gcloud run services list --region=europe-west1 --project=job-seeking-service
```

Get URLs:

```powershell
gcloud run services describe job-seek-api --region=europe-west1 --project=job-seeking-service --format="value(status.url)"
gcloud run services describe job-seek-worker --region=europe-west1 --project=job-seeking-service --format="value(status.url)"
gcloud run services describe job-seek-web --region=europe-west1 --project=job-seeking-service --format="value(status.url)"
```

Smoke health checks:
1. `API_URL/health` should return `200`
2. `WORKER_URL/health` should return `200`
3. `WEB_URL/health` should return `200`

## 10. Cheapest Cloud Run setup notes

Your deployment should keep:
1. `min instances = 0` (no idle containers billed)
2. small CPU/memory per service
3. capped max instances

This is the best low-cost starting point in `europe-west1` with cold starts enabled.

## 11. If deployment fails

Look at first failed step in GitHub Actions logs.

Common issues:
1. OIDC auth error: wrong provider string or missing `iam.workloadIdentityUser`
2. Permission denied: missing IAM role on `github-deployer`
3. Missing environment variable/secret in GitHub
4. Docker build error from changed code
