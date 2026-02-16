# Story Points

This file tracks milestones for the career search assistant build.

## Milestone 1: Core Intake + AI (Done)
- Auth and user management
- Profile inputs (target roles + notes)
- Document uploads via GCS (signed URL + confirm)
- Career profile generation (Gemini)

## Milestone 2: Extraction + Matching (Done)
- PDF text extraction pipeline
- Structured profile refinement
- Deterministic job matching and history
- LLM scoring for notebook job offers

## Milestone 3: BE + Worker Hardening (Done)
- API build/type stabilization
- OTP validation/type correctness (`EMAIL_REGISTER` vs `PASSWORD_RESET`)
- Scrape run lifecycle reliability (`PENDING -> RUNNING -> COMPLETED/FAILED`)
- Run observability endpoints (`/job-sources/runs`, `/job-sources/runs/:id`)
- Idempotent scrape completion callback handling
- Hot-path DB indexes for run/job-offer queries

## Milestone 4: Frontend Workflow Completion (Current)
- Replace current admin flow with Next.js user app
- Wire auth/profile/document/matching workflows
- Add notebook UX for status, notes, tags, and score explanations

Current status:
- `apps/web` scaffolded with Next.js and strict feature-sliced folders
- Core flows implemented for auth/profile input/documents/career profiles/job matching
- Shared shadcn-style UI primitives integrated via `@repo/ui`
- Worker integration panel added for enqueue/runs lifecycle testing in web app
- `apps/web` is the single frontend app

## Milestone 5: Robust Job Assistant Service (Next 5 Steps)
1. Unified end-to-end journey UX
- Build one guided flow in `apps/web` from onboarding through notebook actions, with run and profile states visible in context.
2. Background execution resilience
- Add retry/backoff controls and dead-letter replay UX so failed scrape/profile operations are recoverable without manual DB work.
3. Matching explainability and trust
- Standardize score explanation payloads (deterministic + LLM) and expose audit metadata in notebook/history.
4. Production operations and SLOs
- Define API/worker service-level objectives, add alerting thresholds, and capture run-level failure taxonomy dashboards.
5. Deployment and tenant safety
- Harden release flow (migrations, rollback checks, smoke tests) and add guardrails for per-user isolation in notebook and runs.

## Milestone 6: Automation + Cloud Readiness (Planned)
- Scheduled crawlers and source expansion
- Async extraction/profile generation jobs
- CI/CD deployment hardening and monitoring
