# Fiszki PL-EN

MVP aplikacji webowej dla polskojęzycznych osób uczących się języka angielskiego.

Aplikacja pozwala zalogowanemu użytkownikowi wpisać jedno polskie słowo, pobrać propozycje angielskich tłumaczeń, wybrać właściwe znaczenie i zapisać je jako prywatną fiszkę. Użytkownik może następnie przeglądać, edytować i usuwać swoje fiszki.

## Główne funkcje

- rejestracja, logowanie i wylogowanie użytkownika,
- chroniony obszar aplikacji dla zalogowanych użytkowników,
- tłumaczenie pojedynczego polskiego słowa na język angielski,
- od 1 do 3 unikalnych propozycji tłumaczenia,
- zapis wybranego tłumaczenia jako fiszki,
- pełny CRUD fiszek:
  - Create — utworzenie fiszki,
  - Read — lista własnych fiszek,
  - Update — edycja własnej fiszki,
  - Delete — usunięcie własnej fiszki,
- przypisanie każdej fiszki do zalogowanego użytkownika,
- izolacja danych użytkowników przy użyciu Supabase Row Level Security,
- walidacja danych wejściowych i obsługa błędów usługi tłumaczeniowej.

## Główny przepływ użytkownika

1. Użytkownik rejestruje się lub loguje.
2. Otwiera chroniony dashboard.
3. Wpisuje jedno polskie słowo.
4. Aplikacja pobiera angielskie propozycje z usługi tłumaczeniowej.
5. Wyniki są normalizowane, deduplikowane i ograniczane do maksymalnie trzech.
6. Użytkownik wybiera jedno tłumaczenie.
7. Potwierdza utworzenie fiszki.
8. Fiszka zostaje zapisana w bazie i przypisana do aktualnego użytkownika.
9. Użytkownik może ją później edytować lub usunąć.

## Stack technologiczny

- Astro 7
- React 19
- TypeScript 5
- Supabase
  - Authentication
  - PostgreSQL
  - Row Level Security
- LibreTranslate
- Zod
- Vitest
- pgTAP / Supabase database tests
- Playwright
- GitHub Actions
- Cloudflare Workers

## Wymagania lokalne

- Node.js 22.14.0 — zgodnie z `.nvmrc`
- npm
- Docker — wymagany do lokalnego Supabase
- Supabase CLI dostępne przez zależność projektu

## Instalacja

```bash
git clone https://github.com/artcze/fiszki-pl-en.git
cd fiszki-pl-en
npm ci
```

Utwórz lokalne pliki środowiskowe:

```bash
cp .env.example .env
cp .env.example .dev.vars
```

Projekt używa następujących zmiennych:

```text
SUPABASE_URL=
SUPABASE_KEY=
LIBRETRANSLATE_BASE_URL=
LIBRETRANSLATE_API_KEY=
```

`SUPABASE_KEY` musi zawierać klucz publikowalny Supabase (preferowany) albo starszy klucz `anon`, który jest jego niskouprawnionym odpowiednikiem. Nigdy nie umieszczaj w tej zmiennej klucza tajnego Supabase ani starszego klucza `service_role`. Klucze tajne i `service_role` są uprzywilejowane, omijają Row Level Security i nie są potrzebne do zwykłych żądań aplikacji.

## Lokalny Supabase

Uruchom lokalny stack:

```bash
npx supabase start
```

W razie potrzeby odtwórz bazę wraz z migracjami:

```bash
npx supabase db reset
```

Migracje znajdują się w `supabase/migrations/`.

Tabela `public.flashcards` przechowuje fiszki użytkowników. Dostęp do rekordów jest ograniczony przez polityki Row Level Security wykorzystujące `auth.uid()`.

## Uruchomienie aplikacji

```bash
npm run dev
```

## Testy

### Testy TypeScript / Vitest

```bash
npm test
```

Obejmują między innymi:

- API fiszek,
- autoryzację operacji CRUD,
- walidację danych,
- API tłumaczeń,
- normalizację i deduplikację tłumaczeń,
- obsługę błędów LibreTranslate,
- klienta API fiszek.

### Testy bezpieczeństwa bazy danych

Po uruchomieniu lokalnego Supabase:

```bash
npx supabase test db
```

Test `supabase/tests/database/flashcards_rls.test.sql` weryfikuje między innymi, że użytkownik nie może odczytać, zmodyfikować ani usunąć fiszki należącej do innego użytkownika.

### Test głównego przepływu E2E

```bash
npm run test:e2e
```

`tests/e2e/main-flow.spec.ts` przechodzi przez rejestrację/logowanie, tłumaczenie, utworzenie, listowanie, edycję i usunięcie fiszki z kontrolowanym lokalnym serwerem testowym LibreTranslate.

## Kontrole jakości

Pełna sekwencja zbliżona do CI:

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

GitHub Actions wykonuje kontrole jakości dla pushy i pull requestów skierowanych do gałęzi `main`.

## Dokumentacja projektu

Kanoniczne dokumenty znajdują się w `context/foundation/`:

- [Indeks dokumentacji](context/foundation/README.md)
- [Shape notes](context/foundation/shape-notes.md)
- [PRD](context/foundation/prd.md)
- [Tech Stack](context/foundation/tech-stack.md)
- [Infrastruktura](context/foundation/infrastructure.md)
- [Specyfikacja techniczna](context/foundation/technical-spec.md)
- [Roadmapa](context/foundation/roadmap.md)
- [Plan testów](context/foundation/test-plan.md)
- [Lessons learned](context/foundation/lessons.md)

`shape-notes.md` i początkowe wpisy `lessons.md` są retrospektywnymi, jawnie oznaczonymi rekonstrukcjami opartymi na potwierdzonych decyzjach i historii repozytorium; nie udają nieistniejących historycznych sesji agentowych.

Pliki w `docs/` pozostają tylko jako zgodne wstecz odnośniki do kanonicznej dokumentacji.

## Model bezpieczeństwa

Identyfikator właściciela fiszki nie jest przyjmowany od klienta.

Serwer pobiera aktualnego użytkownika z sesji Supabase i wykorzystuje jego `user.id` podczas operacji na fiszkach.

Dodatkową granicę bezpieczeństwa stanowią polityki PostgreSQL Row Level Security dla operacji:

- SELECT,
- INSERT,
- UPDATE,
- DELETE.

Dzięki temu izolacja danych nie zależy wyłącznie od warstwy UI lub endpointów API.

## Zakres MVP

MVP koncentruje się na tworzeniu i zarządzaniu prostymi fiszkami polski → angielski.

Poza zakresem MVP pozostają między innymi:

- spaced repetition,
- quizy,
- statystyki nauki,
- gamifikacja,
- audio i wymowa,
- przykładowe zdania,
- import zbiorczy,
- współdzielenie fiszek pomiędzy użytkownikami.

Szczegółowy zakres i kryteria produktu znajdują się w [`context/foundation/prd.md`](context/foundation/prd.md).
