# Career Search Assistant Monorepo

[![Status](https://img.shields.io/badge/status-active-success.svg)]()
[![License](https://img.shields.io/badge/license-MIT-blue.svg)](/LICENSE)

---

## Purpose

This repository contains a full-stack monorepo for a career search assistant. The backend is a NestJS API that handles authentication, user intake, document uploads to Google Cloud Storage (GCS), and AI-based career profile generation using Google Gemini. The frontend (admin app) is a React 19 + Vite dashboard. The shared packages include Drizzle ORM schemas, UI components, and lint/TS configs.

If you only read this README, you should be able to understand:
- what the system does,
- how data flows end-to-end,
- how to run it locally,
- which environment variables matter,
- which API endpoints exist,
- and what the next steps are.

---

## High-Level Flow

1) User authenticates (JWT-based auth).
2) User submits profile input: target roles + optional notes.
3) User requests a signed GCS upload URL and uploads PDF documents (CV/LinkedIn).
4) User confirms the upload so the backend can mark the file as ready.
5) User triggers career profile generation using Gemini.
6) Backend stores the generated profile as markdown.

The AI output is used later for matching and job discovery.

---

## Repository Structure

```
apps/
  admin/               # Frontend admin panel (React 19 + Vite)
  api/                 # NestJS backend service
packages/
  db/                  # Drizzle schemas, migrations, seed scripts
  ui/                  # Shared React UI library (shadcn/ui)
  lint-config/         # Shared ESLint configuration
  ts-config/           # Shared TypeScript configurations
```

---

## Domain Model (Current)

Minimal, LLM-first data model:

- User: authenticated identity.
- ProfileInput: user intent (target roles + notes).
- Document: metadata for uploaded PDFs stored in GCS.
- CareerProfile: AI-generated markdown output tied to a profile input and documents.

Tables (simplified):
- profile_inputs: user_id, target_roles, notes
- documents: user_id, type, storage_path, original_name, mime_type, size, uploaded_at
- career_profiles: user_id, profile_input_id, document_ids, status, content, model, error

---

## API Overview

All API routes are prefixed by `/api` by default (see `API_PREFIX`).

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
- POST `/documents/confirm` (verifies file exists and marks uploaded)
- GET `/documents` (optional `?type=CV|LINKEDIN|OTHER`)

Career profile:
- POST `/career-profiles` (Gemini generation, stores markdown)
- GET `/career-profiles/latest`

Examples for all endpoints are in `apps/api/api.http`.

---

## Services and Modules

Backend (NestJS) modules:
- AuthModule: login/register/reset flows
- ProfileInputsModule: stores user target roles + notes
- DocumentsModule: creates GCS signed URLs and confirms uploads
- CareerProfilesModule: calls Gemini and stores generated markdown
- GeminiModule: wrapper around `@google/generative-ai`
- GcsModule: wrapper around `@google-cloud/storage`

DB access:
- Drizzle ORM via `packages/db` and `@repo/db` export

---

## Environment Variables

### apps/api/.env
Required:
- `DATABASE_URL`
- `ACCESS_TOKEN_SECRET`
- `ACCESS_TOKEN_EXPIRATION`
- `REFRESH_TOKEN_SECRET`
- `REFRESH_TOKEN_EXPIRATION`
- `GEMINI_API_KEY`
- `GCS_BUCKET`

Optional/Local dev:
- `GCP_PROJECT_ID`
- `GCP_CLIENT_EMAIL`
- `GCP_PRIVATE_KEY`

Email:
- `MAIL_HOST`, `MAIL_PORT`, `MAIL_USERNAME`, `MAIL_PASSWORD`, `MAIL_SECURE`

Other:
- `HOST`, `PORT`, `NODE_ENV`, `ALLOWED_ORIGINS`, `API_PREFIX`

### packages/db/.env
- `DATABASE_URL`

---

## Local Development

### Install

```bash
git clone https://github.com/DmytroLysachenko/nest-test.git
cd nest-test
pnpm install
```

### Configure .env

```bash
cp apps/api/.env.example apps/api/.env
cp apps/admin/.env.example apps/admin/.env
cp packages/db/.env.example packages/db/.env
```

Set `DATABASE_URL`, `GEMINI_API_KEY`, and `GCS_BUCKET`.

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

### Run API and Admin

```bash
pnpm start
```

---

## GCS Upload Flow (Details)

1) Client calls `POST /documents/upload-url` with file metadata.
2) Backend creates a document record and returns a signed URL.
3) Client uploads PDF directly to GCS using the signed URL.
4) Client calls `POST /documents/confirm` with `documentId`.
5) Backend verifies the object exists in GCS and sets `uploaded_at`.

---

## AI Generation Flow (Details)

1) Client calls `POST /career-profiles`.
2) Backend:
   - fetches latest profile input,
   - finds confirmed documents,
   - builds a prompt,
   - calls Gemini,
   - stores markdown in `career_profiles.content`.
3) Client fetches the latest result via `GET /career-profiles/latest`.

---

## Testing and Debugging

- API examples: `apps/api/api.http`
- Swagger is enabled in non-production: `/docs`
- Logs: `apps/api/logs/`

---

## Roadmap

Short-term:
- PDF text extraction (turn CV/LinkedIn PDF into prompt input)
- Async AI jobs (queue + retries)
- Career profile versioning

Mid-term:
- Job crawler + matching pipeline
- Job application notebook (tracking applied roles)

Long-term:
- Deploy on GCP (Cloud Run + GCS + managed DB)

---

## License

MIT License. See `LICENSE`.
