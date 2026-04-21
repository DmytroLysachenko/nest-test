# Pracuj Fixture Policy

These fixtures are stable examples used by worker parser and crawl tests. They should not depend on live Pracuj offers staying available.

Rules:

1. Keep raw examples small and focused on source structure that the parser depends on.
2. Prefer anonymized or synthetic company names and long-lived synthetic IDs.
3. Preserve representative Pracuj labels, `data-test` attributes, heading structure, and JSON-LD shape when those details matter to parser behavior.
4. Add a fixture-backed test whenever parser behavior changes.
5. Do not make tests fetch live Pracuj pages. Use the local fixture server in `crawl.fetch-e2e.test.ts` for scrape-path coverage.

Current important examples:

1. `detail-rendered-rich.html`
   - rendered detail page with salary, contract types, work schedule, position level, work mode, technologies, project/about sections, responsibilities, requirements, offer benefits, apply link, company profile link, and JSON-LD.
2. `detail-drifted-sections.html`
   - detail page with heading drift for parser fallback coverage.
3. `listing-primary-and-recommended.html`
   - listing page that verifies primary results are preferred and recommended links are ignored.
4. `listing-recommended-only.html`
   - listing page that verifies recommended-only pages do not become primary scrape targets.
