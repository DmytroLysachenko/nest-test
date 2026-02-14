# Web App (`apps/web`)

Next.js app for user-facing flows:
- auth (login/register)
- profile inputs
- document upload/confirm/extract
- career profile generation
- job matching score/history

## Run

1. Create env:
```bash
cp apps/web/.env.example apps/web/.env
```

2. Start:
```bash
pnpm --filter web dev
```

App runs on `http://localhost:3002`.

## Architecture

Strict feature-sliced layout:
- `src/app`: routing + composition only
- `src/features/*`: feature modules
- `src/shared/*`: shared API client, UI primitives, config, and types

UI layer:
- Shared UI is based on shadcn-style components from `@repo/ui`.
- Prefer importing `@repo/ui/components/*` instead of creating per-app duplicates.

## Tests

Unit:
```bash
pnpm --filter web test
```

E2E:
```bash
pnpm --filter web test:e2e
```
