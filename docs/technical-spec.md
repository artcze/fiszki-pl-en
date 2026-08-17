# Technical Specification: Polish-to-English Flashcards MVP

## 1. Scope and principles

This specification describes the smallest implementation that satisfies `docs/prd.md`. The application remains an Astro 6 server-rendered application deployed to Cloudflare. React islands are used only where client interaction materially benefits from them.

Implementation should reuse the existing authentication, middleware, layout, API-route, Supabase, and UI patterns. Avoid provider frameworks, repositories, event buses, queues, or generalized abstractions that are not required by the MVP.

## 2. System architecture

```text
Polish-speaking user
        |
        v
Astro pages + focused React islands
        |
        +--> Astro server endpoints
                 |
                 +--> Supabase SSR client --> Supabase Auth/PostgreSQL/RLS
                 |
                 +--> TranslationService --> LibreTranslate
        |
        v
Cloudflare Workers
```

Key boundaries:

- Browser code handles form interaction and presentation, never secrets or trusted ownership data.
- Astro endpoints validate requests, resolve the authenticated user, and coordinate application operations.
- `TranslationService` owns translation-provider interaction and result normalization.
- Supabase Auth establishes identity; PostgreSQL and RLS provide durable storage and ownership isolation.

## 3. Proposed application areas

- Public authentication pages: existing registration, sign-in, and email-confirmation routes.
- Protected flashcard area: list and creation interface, with edit and delete actions.
- Server endpoints: translation generation and authenticated flashcard CRUD.
- Server-side services/helpers: translation provider adapter, normalization, request validation, and shared error mapping where useful.

Exact file placement should follow existing repository conventions after inspecting the current code. Do not reorganize unrelated authentication code as part of the MVP.

## 4. API design

All JSON endpoints must return an appropriate HTTP status, a stable machine-readable error code, and a Polish user-facing message for expected failures. Do not expose provider responses, stack traces, database details, or secrets.

### 4.1 Generate translations

`POST /api/translations`

Authentication: required.

Request:

```json
{
  "word": "zamek"
}
```

Successful response (`200`):

```json
{
  "translations": ["castle", "lock"]
}
```

Rules:

- Trim input and reject an empty value.
- Accept one Polish lexical item, not bulk input.
- Call `TranslationService.translatePolishWord` on the server.
- Normalize whitespace, discard empty entries, remove duplicates, and cap results at three.
- Preserve a single result when only one sensible translation is available.
- Treat zero usable results as a translation failure rather than inventing a result.

Expected errors:

- `400 INVALID_WORD` for invalid input.
- `401 UNAUTHORIZED` when no authenticated user exists.
- `502 TRANSLATION_UNAVAILABLE` when the provider fails or returns no usable result.
- `500 INTERNAL_ERROR` for unexpected failures.

### 4.2 List flashcards

`GET /api/flashcards`

Authentication: required. Return only rows visible to the authenticated user through RLS, ordered deterministically, preferably newest first.

Successful response (`200`):

```json
{
  "flashcards": [
    {
      "id": "uuid",
      "polish": "zamek",
      "english": "castle",
      "created_at": "timestamp",
      "updated_at": "timestamp"
    }
  ]
}
```

`user_id` need not be returned to the browser unless a concrete UI requirement emerges.

### 4.3 Create a flashcard

`POST /api/flashcards`

Authentication: required.

Request:

```json
{
  "polish": "zamek",
  "english": "castle"
}
```

The endpoint validates both fields and inserts one row. It derives `user_id` exclusively from the authenticated session. Any `user_id` supplied by a client must be ignored or rejected.

Return `201` with the created flashcard. Expected errors are `400 INVALID_FLASHCARD`, `401 UNAUTHORIZED`, and a sanitized `500` persistence error.

### 4.4 Update a flashcard

`PATCH /api/flashcards/[id]`

Authentication: required. Accept validated `polish` and `english` values. Scope the operation to the authenticated user and rely on RLS as the final authorization boundary. Return `404` when no owned record is available; do not reveal whether another user owns the ID.

### 4.5 Delete a flashcard

`DELETE /api/flashcards/[id]`

Authentication: required. Scope deletion to the authenticated user and enforce it with RLS. Return `204` on success and `404` when no owned record is available.

## 5. Translation service

Use a provider-independent contract:

```ts
interface TranslationService {
  translatePolishWord(word: string): Promise<string[]>;
}
```

The initial implementation is a server-only LibreTranslate adapter.

Responsibilities:

- Send Polish (`pl`) as the source language and English (`en`) as the target language.
- Apply a request timeout suitable for an interactive flow.
- Map network, timeout, malformed-response, and provider errors to an internal typed error or stable failure result.
- Return normalized data rather than leaking the provider's response format.
- Produce one to three unique translations and never fabricate padding.

LibreTranslate base URL and API key, if required, must be server-only environment variables declared through Astro's environment schema. Tests should inject or substitute a deterministic fake `TranslationService`; end-to-end tests must not depend on the public provider's availability.

If LibreTranslate supplies only one translation per request, the adapter may return that one result. The MVP does not require generating synonyms through an LLM or secondary provider.

LibreTranslate supports requesting alternative translation candidates. These alternatives are machine-translation hypotheses and are not guaranteed to represent distinct dictionary meanings. The MVP accepts this limitation: it returns one candidate when only one usable candidate is available and does not invent synonyms or use a fallback provider.

## 6. Data model

Create a Supabase migration for a `flashcards` table:

| Column | Type | Constraints |
|---|---|---|
| `id` | `uuid` | Primary key; generated by the database |
| `user_id` | `uuid` | Not null; references `auth.users(id)` with an intentional delete policy |
| `polish` | `text` | Not null; non-empty after trimming |
| `english` | `text` | Not null; non-empty after trimming |
| `created_at` | `timestamptz` | Not null; database default `now()` |
| `updated_at` | `timestamptz` | Not null; database default `now()` and maintained on update |

Add an index supporting ownership-scoped listing, such as `(user_id, created_at desc)`. Do not add uniqueness across `polish` and `english`: separate flashcards for different meanings are valid, and duplicate policy is not an MVP requirement.

Shared application types should represent the persisted entity and request/response DTOs without exposing database-only fields unnecessarily.

## 7. Authentication and authorization

- Reuse the existing Supabase SSR client and cookie-based session handling.
- Reuse middleware protection for authenticated application pages.
- Every flashcard and translation endpoint independently verifies authentication; route-level redirects are not an API security boundary.
- Never accept ownership from request bodies, query parameters, or headers.
- Use the session user ID for inserts and ownership-scoped operations.
- Do not use a Supabase service-role key in ordinary application requests.

### 7.1 Row Level Security

Enable RLS on `flashcards` and create granular policies for authenticated users:

- `SELECT`: `auth.uid() = user_id`
- `INSERT`: `auth.uid() = user_id` via `WITH CHECK`
- `UPDATE`: `auth.uid() = user_id` via both `USING` and `WITH CHECK`
- `DELETE`: `auth.uid() = user_id`

Grant only the table operations needed by authenticated users. Test that one user cannot read or mutate another user's row, including attempts made without the UI.

## 8. Validation and normalization

- Validate JSON shape and types at every endpoint.
- Trim Polish and English values before persistence.
- Reject empty values and inputs that exceed documented, reasonable length limits.
- Keep capitalization unchanged unless a product rule explicitly requires normalization.
- Translation deduplication should compare normalized values consistently while returning clean display strings.
- Use Zod, already available transitively/directly as appropriate to current project conventions, rather than adding another validation library.

## 9. Error handling and observability

- Log unexpected server failures with enough context to diagnose the operation, but exclude credentials, cookies, provider keys, and unnecessary user data.
- Return Polish-facing messages for expected user-visible failures.
- Use stable error codes so UI behavior does not depend on message text.
- Distinguish invalid input (`400`), missing authentication (`401`), inaccessible records (`404`), provider failure (`502`), and unexpected server failure (`500`).
- Do not persist a flashcard as part of translation generation; this avoids partial records when provider or selection steps fail.
- Cloudflare observability is enabled, but the MVP does not require an additional monitoring vendor.

## 10. UI behavior

- Keep the primary creation flow on a protected page with a clear Polish label, loading state, validation state, and retryable error state.
- Disable confirmation until one translation is selected.
- Show only translations returned by the server.
- Refresh or update the list after successful create, edit, or delete operations without requiring speculative client state infrastructure.
- Require an explicit delete action and provide clear success/failure feedback.
- Maintain keyboard accessibility, visible focus, semantic labels, and existing component conventions.

## 11. Testing strategy

### 11.1 Unit tests

Add focused tests for logic with meaningful branches:

- Translation normalization, deduplication, empty-result handling, and the three-result cap.
- Provider error mapping.
- Input validation where it is not already covered through endpoint tests.

### 11.2 Integration tests

- Translation endpoint authentication, validation, normalized success response, and provider failure.
- Flashcard CRUD with an authenticated user.
- Ownership isolation for reads, updates, and deletes.
- Database RLS policies against two distinct test users.

### 11.3 End-to-end test

Add at least one deterministic browser test covering:

1. Sign in with a test account.
2. Enter a Polish word.
3. Receive controlled translation results.
4. Select one translation and create a flashcard.
5. See it in the list.
6. Edit it.
7. Delete it.
8. Confirm it is no longer listed.

Use a controlled provider response or test seam. Do not call a live public LibreTranslate service from CI. Select the smallest well-supported test tool that works with Astro and Cloudflare; adding it requires an explicit implementation need and normal dependency review.

## 12. CI/CD

The existing GitHub Actions workflow installs dependencies, runs Astro sync, lints, and builds for pushes and pull requests to `master`. Extend it when tests are introduced so the required sequence is conceptually:

```bash
npm ci
npx astro sync
npm run lint
npm run test
npm run test:e2e
npm run build
```

Exact test scripts should reflect the selected tools. CI must use isolated test credentials and secrets supplied through GitHub Actions, never committed files. A failing test, lint check, type/static check, migration check, or build must fail the job.

Production deployment remains on Cloudflare Workers. Configure Supabase and LibreTranslate secrets in Cloudflare secret storage. Deployment automation beyond the current build validation is not required for MVP unless separately requested.

## 13. Implementation stages

Each stage should begin by inspecting the affected code and presenting a short plan. Keep stages independently verifiable where practical.

1. **Database and security foundation**
   - Add the flashcards migration, indexes, timestamp handling, RLS policies, and ownership tests.
2. **Translation boundary**
   - Add environment definitions, `TranslationService`, LibreTranslate adapter, normalization, and focused tests.
3. **Translation endpoint**
   - Implement authenticated `POST /api/translations` with validation and stable error responses.
4. **Flashcard API**
   - Implement authenticated list, create, update, and delete endpoints with ownership derived from the session.
5. **Protected MVP interface**
   - Implement the Polish-language creation flow and flashcard management UI using existing design conventions.
6. **End-to-end coverage**
   - Add deterministic main-flow coverage plus direct ownership-isolation verification.
7. **CI completion and release verification**
   - Add test scripts to CI, run the full command set, review audit output, and verify the Cloudflare production build.

## 14. Baseline and constraints

The verified baseline before MVP feature implementation is:

- `npm ci` passes.
- `npx astro sync` passes.
- `npm run lint` passes.
- `npm run build` passes.
- Astro remains on v6.
- Four npm audit findings remain: two high, one moderate, and one low. npm's remediation requires Astro 7.

Do not migrate to Astro 7 or introduce other major-version upgrades unless explicitly requested. Do not weaken checks or add workarounds solely to hide the remaining audit report.
