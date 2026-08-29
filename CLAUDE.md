# Rules for AI

This file provides operational guidance to an AI agent working with code in this repository.

## Reference

Canonical project context lives in `context/foundation/`:

- `prd.md` — product requirements and business rules
- `tech-stack.md` — stack and technical boundaries
- `technical-spec.md` — implementation contract
- `roadmap.md` — current delivery state
- `test-plan.md` — risks and quality gates

Human-facing project/certification documentation is maintained in Polish. This agent instruction file remains in English for concise tooling guidance.

## Commands

- `npm run dev` — start dev server
- `npm run build` — production build (SSR via `@astrojs/cloudflare`)
- `npm run preview` — preview production build
- `npm run check` — Astro/TypeScript type check
- `npm run lint` — ESLint
- `npm run lint:fix` — auto-fix lint issues
- `npm run format` — Prettier
- `npm test` — Vitest unit/API tests
- `npm run test:e2e` — Playwright main-flow E2E
- `npx supabase test db` — pgTAP / Supabase database tests

Pre-commit hooks use husky + lint-staged.

## Architecture

**Astro 7 SSR app** with React 19 islands, Tailwind 4, Supabase Auth/PostgreSQL/RLS, and LibreTranslate behind a server-side `TranslationService` boundary. Cloudflare Workers is the configured runtime target.

### Rendering mode

Full server-side rendering (`output: "server"` in `astro.config.mjs`). Astro pages are server-rendered by default; React is used for focused interactive islands.

### Auth flow

- `src/lib/supabase.ts` — Supabase SSR client with cookie-based sessions.
- `src/middleware.ts` — resolves current user and protects `/dashboard`.
- API auth endpoints: `src/pages/api/auth/{signin,signup,signout}.ts`.
- Auth pages: `src/pages/auth/{signin,signup,confirm-email}.astro`.
- Protected product page: `src/pages/dashboard.astro`.

### Flashcard ownership

- `POST /api/flashcards` derives `user_id` from `context.locals.user`.
- Read/update/delete operations are scoped to the authenticated user.
- Supabase RLS is the database-level authorization boundary for SELECT/INSERT/UPDATE/DELETE.
- Client-provided ownership must never be trusted.

### Translation flow

- `src/pages/api/translations.ts` is authenticated.
- Provider access stays server-side.
- `src/lib/translations.ts` validates input and normalizes/deduplicates output.
- `src/lib/libretranslate.ts` implements provider interaction.

### Key conventions

- Path alias: `@/*` maps to `./src/*`.
- Astro components for static/server-rendered UI; React only where interactivity is needed.
- API boundaries validate input with Zod.
- Supabase migrations live in `supabase/migrations/`.
- New persisted user resources require granular RLS policies.
- Services/helpers live in `src/lib/`.
- Do not expose secrets or service-role credentials to client code.

## CI

GitHub Actions workflow `.github/workflows/ci.yml` runs on pushes and pull requests targeting `main`.

Core CI-equivalent verification sequence:

```bash
npm ci
npx astro sync
npm run check
npm run lint
npm test
npm run build
npx supabase test db
npm run test:e2e
```

The workflow additionally installs Playwright Chromium, starts local Supabase, and prepares the E2E environment before the database and E2E stages.

Do not infer that CI is green merely from workflow configuration; verify the latest run when release/certification readiness depends on it.
