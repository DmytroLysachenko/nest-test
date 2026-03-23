# 12-Month Delivery Plan

Last updated: 2026-03-11

## Purpose

Translate the current roadmap into a one-year product and platform plan that stays grounded in the repo's actual maturity: workflow completion first, then notebook throughput, then durable async, then multi-source and support depth.

## Strategic Intent

The long-term goal is not to become a scraped listing mirror. The goal is to become a better job-search operating system:

- aggregate opportunities across selected sources
- rank and filter them better than native job boards
- help users decide what to do next
- help users manage follow-up and application progress

This means the yearly plan should prefer workflow differentiation over aggressive source expansion.

## Q2 2026: Workflow Completion and Triage Speed

- Finish server-driven blocker handling across dashboard, notebook, profile, and scrape workflows.
- Complete document recovery UX so retry outcomes and diagnostics are understandable to normal users.
- Productize scrape preflight and schedule context so manual runs and automation feel predictable.
- Deepen notebook quick actions, follow-up metadata, and action-oriented offer details.
- Improve hidden/degraded-result messaging so users can distinguish "nothing found" from "results exist but are constrained or partially sourced".
- Exit criteria:
  - no important route ends in a generic dead-end state
  - notebook quick actions are server-driven and smoke-covered
  - document and scrape recovery paths stay inside the main workflow

## Q3 2026: Durable Background Work and Reliability

- Move document extraction and career-profile generation onto durable async execution.
- Reduce reliance on in-memory lifecycle assumptions for user-visible background work.
- Add clearer async state visibility in product and ops surfaces.
- Expand scrape/source reliability classification with better degraded/blocked/partial detection.
- Add source-health gating and circuit-breaking so unstable adapters stop burning worker time automatically.
- Exit criteria:
  - restart-safe execution for the most important background workflows
  - retry and failure states are explicit in product and support read models
  - worker/API contracts stay deterministic and test-covered

## Q4 2026: Observability, Release Safety, and Support Tooling

- Strengthen startup orchestration and make smoke more self-contained.
- Add long-horizon source health, alerting-friendly metrics, and rollback-oriented release metadata.
- Improve support workflows so callback/parser/request-event issues can be triaged without direct DB access.
- Tighten production promotion, post-deploy verification, and rollback documentation/automation.
- Exit criteria:
  - smoke failures primarily represent product regressions, not startup timing
  - support can diagnose the common scrape/document issues from product-facing tools
  - release promotion and rollback are repeatable and documented

## Q1 2027: Product Depth and Selective Multi-Source Readiness

- Prepare source adapter boundaries for ingestion beyond Pracuj.
- Improve assistant quality with stronger follow-up guidance, prep prioritization, and explanation quality.
- Extend notebook toward a lightweight application CRM without duplicating business logic in web.
- Revisit scoring/ranking calibration based on real workflow usage.
- Add a second source only if its acquisition path looks maintainable and the notebook already demonstrates value beyond native boards.
- Exit criteria:
  - second-source rollout is an incremental adapter addition, not a rewrite
  - assistant surfaces improve actionability, not noise
  - supportability remains strong as ingestion breadth expands

## Cross-Cutting Rules

- API owns workflow logic and recovery decisions.
- Web consumes explicit read models and should not recreate business heuristics.
- Every contract change updates tests and the canonical docs set.
- Reliability work is treated as product work, not deferred cleanup.
- Source expansion is gated by maintainability and user-value criteria, not by popularity alone.
