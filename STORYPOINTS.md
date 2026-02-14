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

## Milestone 3: BE + Worker Hardening (Current)
- API build/type stabilization
- OTP validation/type correctness (`EMAIL_REGISTER` vs `PASSWORD_RESET`)
- Scrape run lifecycle reliability (`PENDING -> RUNNING -> COMPLETED/FAILED`)
- Run observability endpoints (`/job-sources/runs`, `/job-sources/runs/:id`)
- Idempotent scrape completion callback handling
- Hot-path DB indexes for run/job-offer queries

## Milestone 4: Frontend Migration (Next)
- Replace current admin flow with Next.js user app
- Wire auth/profile/document/matching workflows
- Add notebook UX for status, notes, tags, and score explanations

Current status:
- `apps/web` scaffolded with Next.js and strict feature-sliced folders
- Core flows implemented for auth/profile input/documents/career profiles/job matching
- Shared shadcn-style UI primitives integrated via `@repo/ui`
- Worker integration panel added for enqueue/runs lifecycle testing in web app
- `apps/admin` remains in place for temporary dual-run validation

## Milestone 5: Automation + Cloud Readiness (Planned)
- Scheduled crawlers and source expansion
- Async extraction/profile generation jobs
- CI/CD deployment hardening and monitoring
