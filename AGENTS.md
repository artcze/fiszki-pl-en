# AGENTS.md

## Project purpose

This repository contains an MVP web application for Polish-speaking users who create Polish-to-English vocabulary flashcards. Product requirements are defined in `docs/prd.md`; implementation decisions and delivery stages are defined in `docs/technical-spec.md`.

## Stack

- Astro 6 SSR with React 19 islands and TypeScript
- Tailwind CSS 4
- Supabase PostgreSQL, Auth, and Row Level Security
- Cloudflare Workers via `@astrojs/cloudflare`
- npm and Node.js 22.14.0 (`.nvmrc`)

## Verification commands

Run the checks relevant to the change. Before handing off implementation work, run the complete sequence:

```bash
npm ci
npx astro sync
npm run lint
npm run build
```

Run the end-to-end suite once it is added. Do not claim a check passed unless it was executed successfully.

## Instructions for Codex

- Read `docs/prd.md`, `docs/technical-spec.md`, and the relevant existing code before implementation.
- Keep the MVP small and follow the documented scope. Do not build out-of-scope features or speculative infrastructure.
- Before multi-file or architectural changes, provide a short plan based on the inspected code.
- Prefer Astro components for static/server-rendered UI and React only for necessary client interaction.
- Keep translation-provider details behind `TranslationService`. Do not call LibreTranslate directly from client code.
- Validate all external input at server boundaries. Never trust a client-provided `user_id`; derive it from the authenticated session.
- Enforce flashcard ownership in both server logic and Supabase RLS policies.
- Keep secrets server-side, in ignored environment files or platform secret storage. Never commit credentials.
- Do not introduce dependencies without a clear, current requirement.
- Add or update tests for changed behavior. Include at least one end-to-end test for the main MVP flow.
- Do not suppress, skip, or conceal failing checks. Report failures and their cause.
- Preserve Astro 6. Four known npm audit findings require Astro 7; do not migrate to Astro 7 unless explicitly requested.
- Do not modify unrelated files or overwrite user changes. Do not commit unless explicitly requested.

