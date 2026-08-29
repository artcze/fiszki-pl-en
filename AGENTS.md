# AGENTS.md

## Project purpose

This repository contains an MVP web application for Polish-speaking users who create Polish-to-English vocabulary flashcards.

Canonical project context lives in `context/foundation/`:

- `context/foundation/prd.md` — product scope and business rules
- `context/foundation/tech-stack.md` — stack and technical boundaries
- `context/foundation/technical-spec.md` — implementation contract
- `context/foundation/roadmap.md` — delivery state and current backlog
- `context/foundation/test-plan.md` — risks, quality gates, and risk-to-test traceability

Human-facing certification documentation is maintained in Polish. Code identifiers and agent instructions may remain in English.

## Stack

- Astro 6 SSR with React 19 islands and TypeScript
- Tailwind CSS 4
- Supabase PostgreSQL, Auth, and Row Level Security
- LibreTranslate behind `TranslationService`
- Vitest, pgTAP / Supabase database tests, Playwright
- Cloudflare Workers via `@astrojs/cloudflare`
- npm and Node.js 22.14.0 (`.nvmrc`)

## Verification commands

Run checks relevant to the change. For certification/readiness work, use the complete CI-equivalent sequence when local infrastructure is available:

```bash
npm ci
npx astro sync
npm run lint
npm test
npm run build
npx supabase test db
npm run test:e2e
```

Database and E2E tests require local Supabase. Do not claim a check passed unless it was executed successfully.

## Instructions for Codex

- Read the relevant files in `context/foundation/` and inspect the current code before implementation.
- Keep the MVP small and follow the documented scope. Do not build parked/out-of-scope features unless explicitly requested.
- Before multi-file or architectural changes, provide a short plan based on inspected code.
- Prefer Astro components for static/server-rendered UI and React only for necessary client interaction.
- Keep translation-provider details behind `TranslationService`. Do not call LibreTranslate directly from client code.
- Validate external input at server boundaries.
- Never trust a client-provided `user_id`; derive ownership from the authenticated session.
- Enforce flashcard ownership in both server logic and Supabase RLS policies.
- Keep secrets server-side, in ignored environment files or platform secret storage.
- Do not introduce dependencies without a clear current requirement.
- Add or update tests for changed behavior and preserve the deterministic main-flow E2E test.
- Do not suppress, skip, or conceal failing checks. Report failures and their cause.
- Preserve Astro 6 unless a separate migration is explicitly requested.
- Do not modify unrelated files or overwrite user changes.
- Do not commit unless explicitly requested.
