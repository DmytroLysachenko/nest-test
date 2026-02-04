# Career Search Assistant Monorepo



[![Status](https://img.shields.io/badge/status-active-success.svg)]()

[![License](https://img.shields.io/badge/license-MIT-blue.svg)](/LICENSE)



---



## Purpose



This repository is a full-stack monorepo for a career search assistant. The backend (NestJS) handles authentication, user intake, document uploads to Google Cloud Storage (GCS), PDF text extraction, AI profile generation (Gemini via Vertex AI), and job matching. The admin frontend is React 19 + Vite. Shared packages include Drizzle ORM schemas, UI components, and lint/TS configs.



This README is designed to be the primary source of context for both humans and LLMs. It describes the current workflow, data model, endpoints, and development setup.



## System Architecture (High Level)



Core services:

- API (NestJS): auth, profile inputs, documents, extraction, AI profile, matching

- Worker service (Node + Playwright + Cloud Tasks): background jobs and scraping/ingestion

- Frontend (planned): Next.js app for user workflows



Scraping note:

- Job scraping is a separate worker service in `apps/worker`.

- The worker ingests jobs, normalizes them, and stores them in the DB for matching.
- The worker caches previously scraped offers and can skip detail pages if data is fresh.
- The worker responds immediately to enqueue requests and processes scrapes asynchronously.
- The worker caches previously scraped offers and can skip detail pages if data is fresh.
- The worker responds immediately to enqueue requests and processes scrapes asynchronously.



## Service Communication and Data Flow



Architecture approach:

- **HTTP-driven for user actions** (Frontend ? API).

- **Job/worker-driven for background tasks** (Worker ? DB + storage).

- Use **Cloud Tasks** in production (no always-on Redis).

- In early stages, keep it **request/response** for simplicity.

- As scale grows, move to **event-driven** (queue + jobs) for extraction and AI.



Primary data flow:

1) Frontend ? API (profile input, upload URL, confirm, extract, generate, match).

2) API ? GCS (signed upload URL, confirm, download for extraction).

3) Worker ? External sources (job ingestion).

4) Worker ? DB (normalized jobs).

5) API ? DB (fetch jobs for matching and UI display).



Suggested integration pattern:

- Use a queue (Cloud Tasks / Pub/Sub) for:

  - PDF extraction

  - Gemini generation

  - Crawling and job normalization

- API enqueues jobs; worker processes and updates DB.



## Operational Workflow



User-facing flow:

1) Login/Register

2) Submit profile input

3) Upload PDF ? confirm

4) Extract text

5) Generate profile (markdown + JSON)

6) Score a job description or display matches



Background flow (worker):

1) Crawl job boards or ingest feeds

2) Normalize job records

3) Store in DB and mark ready for matching

4) Notify API via callback when runs complete



Failure handling guidelines:

- Endpoints should be idempotent where possible.

- Background tasks should retry with backoff.

- Errors should be stored and surfaced to the frontend.



Security hardening:

- Auth endpoints are rate limited (login/register/reset/code).

- CORS allows explicit origins from `ALLOWED_ORIGINS`; use comma-separated list in production.



## Data Ownership and Boundaries



API-owned tables (source of truth):

- `users`, `profiles`, `profile_inputs`, `documents`, `career_profiles`, `job_matches`

- These are created/updated by API endpoints only.



Worker-owned tables (planned):

- `jobs`, `job_sources`, `job_ingestion_runs`

- These are created/updated by the worker service and consumed by the API.



Cross-service interactions:

- API reads `jobs` to show results and enable matching.

- Worker never modifies user/auth tables.



## Production Readiness Checklist



Secrets and config:

- Store service account keys and DB creds in a secrets manager.

- Never commit real keys to git.

- Keep separate envs for dev/staging/prod.



Monitoring and observability:

- Enable structured logs and central logging.

- Track background job failures with alerts.

- Add request tracing IDs to API logs.



Database operations:

- Migrations applied in CI/CD before deploy.

- Backups enabled for managed DB.

- Clear rollback plan for failed migrations.



Security:

- JWT secrets rotated periodically.

- Rate limit auth endpoints.

- Restrict CORS to allowed domains in production.



Scalability:

- Move extraction and AI generation to async jobs.

- Use queue-based backpressure to avoid overload.



## Scraping/Job Ingestion Plan (Worker Service)



Purpose:

- Ingest job postings from external sources (e.g., pracuj.pl) into the DB.

- Normalize fields so matching is consistent across sources.



Implementation outline:

1) **Crawler/Fetcher**

   - Fetch listings via allowed methods (public API, RSS, or HTML if permitted).

   - Respect robots.txt and ToS; add rate limits and caching.

2) **Parser**

   - Extract structured fields: title, company, location, salary, tech stack, apply link.

   - Normalize data (e.g., currency, location, seniority).

3) **Storage**

   - Write to `jobs` table and track in `job_ingestion_runs`.

   - Use `job_sources` to store source metadata (base URL, crawl rules).

4) **Scheduler**

   - Run on schedule (Cloud Scheduler ? Pub/Sub ? Worker).

   - Persist run status and failures for monitoring.



Recommended data schema (worker-owned):

- `jobs`: id, source_id, title, company, location, salary, description, url, tags, created_at, updated_at

- `job_sources`: id, name, base_url, crawl_rules, enabled

- `job_ingestion_runs`: id, source_id, started_at, finished_at, status, error



Notes:

- Start with manual job URLs or a single source for MVP.

- Only expand crawling after legal/ToS validation.



## Scraper Worker Starter Template (Node + Playwright)



Why Playwright:

- Works with dynamic pages and modern JS-heavy sites.

- Can simulate real browser behavior with rate control.



Suggested stack:

- Node.js + Playwright

- Cheerio (optional) for HTML parsing

- Cloud Tasks / PubSub for scheduling and retries

- Zod for validation of extracted fields



Suggested folder layout:

Implemented in `apps/worker` with the same shape.



```

worker/

  src/

    sources/

      pracuj-pl/

        crawl.ts        # page navigation

        parse.ts        # extract fields

        normalize.ts    # normalize data

    jobs/

      run-source.ts     # orchestrate one source

    db/

      client.ts         # db connection

    index.ts

```



Per-source workflows:

- Yes, each source should have its own workflow to match its HTML structure.

- Keep a thin, consistent interface:

  - `crawl(): rawHtml[]`

  - `parse(rawHtml): JobRecord`

  - `normalize(job): NormalizedJob`

- This isolates breakage when a site changes its layout.

--- 



## High-Level Workflow



1) User authenticates (JWT)

2) User submits profile input (target roles + notes)

3) User uploads PDF documents (CV/LinkedIn) to GCS via signed URL

4) User confirms upload

5) User extracts PDF text into DB

6) User generates a career profile (markdown + JSON)

7) User scores a job description using the profile JSON



---



## Repository Structure



```

apps/

  admin/               # Frontend admin panel (React 19 + Vite)

  api/                 # NestJS backend service

  worker/              # Node.js worker (Playwright + Cloud Tasks)

packages/

  db/                  # Drizzle schemas, migrations, seed scripts

  ui/                  # Shared React UI library (shadcn/ui)

  lint-config/         # Shared ESLint configuration

  ts-config/           # Shared TypeScript configurations

```



---



## Domain Model (Current)



Minimal, LLM-first model:



- User: authenticated identity

- ProfileInput: user intent (target roles + notes)

- Document: uploaded PDF metadata stored in GCS + extracted text

- CareerProfile: AI-generated markdown + JSON

- JobMatch: stored scoring history for job descriptions
- UserJobOffer: user’s saved view of a scraped job (status, notes, tags, scores)
- UserJobOffer: user?s saved view of a scraped job (status, notes, tags, scores)



Tables (simplified):

- profile_inputs: user_id, target_roles, notes

- documents: user_id, type, storage_path, original_name, mime_type, size, uploaded_at, extracted_text, extracted_at

  - includes `extraction_status` and `extraction_error`

- career_profiles: user_id, profile_input_id, document_ids, status, content, content_json, model, error

  - includes `version` and `is_active` for profile history

- job_matches: user_id, career_profile_id, profile_version, job_description, score, is_match
- job_source_runs: source, listing_url, filters, status, counts
- job_offers: source, url, title, company, location, salary, description, requirements
- user_job_offers: user_id, career_profile_id, job_offer_id, status, notes, tags, match_score, match_meta
- job_source_runs: source, listing_url, filters, status, counts
- job_offers: source, url, title, company, location, salary, description, requirements
- user_job_offers: user_id, career_profile_id, job_offer_id, status, notes, tags, match_score, match_meta



## Database Schema (High-Level)



Current tables (API-owned):

- `users` ? `profiles` (1:1)

- `users` ? `profile_inputs` (1:many)

- `users` ? `documents` (1:many)

- `users` ? `career_profiles` (1:many)

- `users` ? `job_matches` (1:many)

- `profile_inputs` ? `career_profiles` (1:many)
- `users` ? `user_job_offers` (1:many)
- `career_profiles` ? `user_job_offers` (1:many)



Planned tables (worker-owned):

- `job_sources` (1:many) ? `jobs`

- `job_ingestion_runs` (1:many) ? `job_sources`

- `job_matches` ? `jobs` (future link for stored matches)



Ownership rules:

- The API owns user/profile data.

- The worker owns job ingestion data.

- Matching reads from both domains.



---



## API Overview



All API routes are prefixed by `/api` (see `API_PREFIX`). Examples are in `apps/api/api.http`.



Auth:

- POST `/auth/login`

- POST `/auth/register`

- POST `/auth/logout`

- POST `/auth/send-register-code`

- POST `/auth/send-reset-password-code`

- POST `/auth/change-password`

- POST `/auth/reset-password`



Profile input:

- POST `/profile-inputs`

- GET `/profile-inputs/latest`



Documents:

- POST `/documents/upload-url` (returns signed GCS URL + document record)

- PUT  `<signed upload url>` (upload PDF)

- POST `/documents/confirm` (verifies object exists in GCS)

- POST `/documents/extract` (download PDF, extract text into DB)

- POST `/documents/sync` (sync DB with actual GCS objects for user)

- GET `/documents/:id` (fetch a single document)

- PATCH `/documents/:id` (update metadata: type, originalName)

- DELETE `/documents/:id` (delete object in GCS and DB)

- GET `/documents` (optional `?type=CV|LINKEDIN|OTHER`)



Career profiles:

- POST `/career-profiles` (Gemini generation, stores markdown + JSON)

- GET `/career-profiles/latest`



Job matching:

- POST `/job-matching/score` (scores job description using profile JSON)

- GET `/job-matching` (list match history)

- GET `/job-matching/:id` (match details)



---



## Services and Modules



Backend modules (NestJS):

- AuthModule: login/register/reset flows

- ProfileInputsModule: stores target roles + notes

- DocumentsModule: GCS signed URLs, confirm, extract, sync, delete

- CareerProfilesModule: Gemini generation + storage

- JobMatchingModule: score job description + store history

- GeminiModule: Vertex AI Gemini client

- GcsModule: GCS client wrapper



DB access:

- Drizzle ORM via `packages/db` and `@repo/db`



---



## AI Integration (Vertex AI)



Gemini is accessed through Vertex AI using service account credentials (OAuth). API key auth is not used in this setup.



Required:

- `GCP_PROJECT_ID`

- `GCP_LOCATION` (e.g., `us-central1`)

- Service account credentials (see env below)



Model:

- `GEMINI_MODEL=gemini-1.5-flash` (default)



If you get a 404 model error, switch to a region where the model is available (use `us-central1` as a safe default).



---



## Environment Variables



### apps/api/.env

Required:

- `DATABASE_URL`

- `ACCESS_TOKEN_SECRET`

- `ACCESS_TOKEN_EXPIRATION`

- `REFRESH_TOKEN_SECRET`

- `REFRESH_TOKEN_EXPIRATION`

- `GCS_BUCKET`

- `GCP_PROJECT_ID`

- `GCP_LOCATION`



Optional (local service account direct values):

- `GCP_CLIENT_EMAIL`

- `GCP_PRIVATE_KEY`



Health:

- `DISK_HEALTH_THRESHOLD` (0-1)



Email:

- `MAIL_HOST`, `MAIL_PORT`, `MAIL_USERNAME`, `MAIL_PASSWORD`, `MAIL_SECURE`



Other:

- `HOST`, `PORT`, `NODE_ENV`, `ALLOWED_ORIGINS`, `API_PREFIX`



### packages/db/.env

- `DATABASE_URL`



### apps/worker/.env

Required:

- `WORKER_PORT`

- `QUEUE_PROVIDER` (local | cloud-tasks)



Cloud Tasks (required if QUEUE_PROVIDER=cloud-tasks):

- `TASKS_PROJECT_ID`

- `TASKS_LOCATION`

- `TASKS_QUEUE`

- `TASKS_URL`



Optional:

- `TASKS_AUTH_TOKEN` (recommended)

- `TASKS_SERVICE_ACCOUNT_EMAIL`

- `DATABASE_URL` (required once jobs are persisted)

- `WORKER_LOG_LEVEL`

- `PLAYWRIGHT_HEADLESS`

- `PRACUJ_LISTING_URL`

- `PRACUJ_LISTING_LIMIT`

- `WORKER_OUTPUT_DIR`

- `PRACUJ_LISTING_DELAY_MS`

- `PRACUJ_DETAIL_DELAY_MS`

- `PRACUJ_LISTING_ONLY`

- `PRACUJ_DETAIL_HOST`



---



## Local Development



### Install



```bash

git clone https://github.com/DmytroQasttor/Collarcity.git

cd Collarcity

pnpm install

```



### Configure .env



```bash

cp apps/api/.env.example apps/api/.env

cp apps/admin/.env.example apps/admin/.env

cp packages/db/.env.example packages/db/.env

cp apps/worker/.env.example apps/worker/.env

```



Set `DATABASE_URL`, `GCP_PROJECT_ID`, `GCP_LOCATION`, and `GCS_BUCKET`.



### Start database



```bash

docker compose -f docker/docker-compose.yml up -d

```



### Run migrations



```bash

pnpm --filter @repo/db generate

pnpm --filter @repo/db migrate

pnpm --filter @repo/db build

```



### Run backend only



```bash

pnpm --filter api start

```



### Run worker



Install Playwright browsers once:



```bash

pnpm --filter worker exec playwright install

```



Start the worker task server:



```bash

pnpm --filter worker dev

```



Health check:



```bash

curl http://localhost:4000/health

```



Enqueue a test task (local):



```bash

pnpm --filter worker enqueue

```



### Run full dev



```bash

pnpm start

```



---



## GCS Upload Flow (Details)



1) `POST /documents/upload-url`

2) Upload PDF to signed URL (PUT)

3) `POST /documents/confirm`

4) `POST /documents/extract`



Use `apps/api/api.http` for sample requests.



---



## Career Profile Generation (Details)



- The prompt asks for markdown plus a JSON block.

- The JSON is stored in `career_profiles.content_json`.

- Job matching uses this JSON for quick scoring.



JSON schema:

```

{

  "summary": string,

  "coreSkills": string[],

  "preferredRoles": string[],

  "strengths": string[],

  "gaps": string[],

  "topKeywords": string[]

}

```



Job matching notes:

- Uses weighted scoring (roles 40%, skills 40%, strengths 20% + keyword bonus).

- Optional `minScore` in request to filter matches.

- Every score request is stored in `job_matches` for history.



---



## Known Behaviors and Gotchas



- `GET /health` checks disk usage; set `DISK_HEALTH_THRESHOLD` if your drive is near full.

- `POST /documents/confirm` requires a valid UUID document ID.

- PDF extraction uses `pdf-parse`. Some minimal PDFs may fail; use real PDFs.

- Gemini requires Vertex AI credentials (service account) and correct region.



---



## Testing and Debugging



- API examples: `apps/api/api.http`

- Swagger (non-production): `/docs`

- Logs: `apps/api/logs/`



---



## Roadmap (Step-by-Step, Small Tasks)



Each task is scoped to ~300–500 LOC to keep changes focused.



### Phase 1 — Complete V1 Backend + DB



1) **Profile versioning (Done)**

   - Add `version` and `is_active` to `career_profiles`.

   - New profile increments version; previous active is set to false.

   - `GET /career-profiles/latest` returns active only.



2) **Profile JSON schema consistency (Done)**

   - Enforce JSON keys: `summary`, `coreSkills`, `preferredRoles`, `strengths`, `gaps`, `topKeywords`.

   - Validate shape and store parse errors in `career_profiles.error`.

   - Add `topKeywords` generation in prompt.



3) **Matching quality pass (Done)**

   - Weighted scoring (roles 40%, skills 40%, strengths 20%).

   - Add explanation field to response.

   - Optional `minScore` filter in request body.



4) **Job match history (Done)**

   - Store scoring results for every request.

   - Add `GET /job-matching` and `GET /job-matching/:id`.

   - Track profile version used for the score.



5) **Document metadata management (Done)**

   - Add `GET /documents/:id`.

   - Add `PATCH /documents/:id` to update `type` and `originalName`.

   - Keep file immutable; only metadata changes.



6) **Extraction status (Done)**

   - Add `extraction_status` enum (PENDING/READY/FAILED).

   - Store parser errors in `documents.extracted_text` or separate `extraction_error`.



7) **Error response consistency (Done)**

   - Map errors to `code + message`.

   - Ensure 400 for validation, 404 for missing records, 500 for internal.



8) **Swagger pass (Done)**

   - Add DTO decorators and endpoint docs for all routes.

   - Include request/response examples.



9) **Security hardening (Done)**

   - Ensure JWT guard on all private endpoints.

   - Rate limit auth endpoints.

   - Validate CORS origins.



10) **DB migration cleanup (Done)**

    - Normalize column naming if needed.

    - Verify migrations are linear and committed.



### Phase 2 — Frontend (Next.js)



11) **Choose a frontend boilerplate**

    - Find a ready-to-go Next.js boilerplate with TanStack Query.

    - Prefer Tailwind + shadcn/ui.

    - Align structure with monorepo.



12) **Remove current admin app**

    - Delete `apps/admin`.

    - Update `pnpm-workspace.yaml` and `turbo.json`.



13) **Add Next.js app**

    - Create `apps/web` from the chosen boilerplate.

    - Keep TanStack Query as the main client state layer.

    - Wire workspace builds in Turbo.



14) **Auth UI (minimal)**

    - Login/Register screens.

    - JWT storage and session handling.

    - Minimal error states.



15) **Profile input UI**

    - Form for target roles + notes.

    - Show latest input and history.



16) **Document upload UI**

    - Upload via signed URL.

    - Confirm + extract actions.

    - Show status and errors.



17) **Profile generation UI**

    - Trigger generation.

    - Show markdown and JSON (collapsed).



18) **Job matching UI**

    - Paste job description.

    - Show score + explanation.



### Phase 3 — CI/CD + GCP



19) **Dockerize API**

    - Dockerfile + .dockerignore for `apps/api`.

    - Cloud Run compatible build.



20) **Dockerize Next.js**

    - Dockerfile for `apps/web`.

    - Production build and runtime config.



21) **Artifact Registry**

    - Push images for API and Web.



22) **Cloud Run deploy**

    - Deploy API + Web.

    - Configure env vars and secrets.



23) **Managed DB**

    - Provision Cloud SQL Postgres.

    - Apply migrations in CI/CD.



24) **CI pipeline**

    - Lint + build + test.

    - Docker build/push.

    - Deploy on main branch.



25) **Monitoring**

    - Cloud Logging + basic alerts.

    - Health check endpoints wired to uptime checks.



### Phase 4 — Production Readiness



26) **Async jobs**

    - Move extraction + Gemini to queue (Cloud Tasks / PubSub).

    - Add job status endpoints.



27) **Profile history**

    - UI to view and switch active profile version.



28) **Job ingestion**

    - Start with pasted URLs and manual entries.

    - Evaluate crawling/legal approach later.



29) **User account management**

    - Account settings and deletion flow.



30) **Deployment hardening**

    - Secrets manager usage.

    - Rate limits and abuse protection.



---



## License



MIT License. See `LICENSE`.









