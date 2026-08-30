# Roadmapa MVP — Fiszki PL-EN

> Dokument porządkuje aktualny zakres MVP i pozostałe prace przed zgłoszeniem. Nie jest historycznym logiem implementacji i nie rekonstruuje artefaktów planistycznych, które wcześniej nie istniały.

## Podsumowanie wizji

Użytkownik ma szybko przejść od jednego polskiego słowa do prywatnej fiszki polski → angielski: zalogować się, pobrać ograniczoną liczbę propozycji, wybrać właściwe znaczenie, zapisać fiszkę i później nią zarządzać.

## Główny cel

**Zalogowany użytkownik może wpisać polskie słowo, otrzymać 1–3 unikalne propozycje tłumaczenia, wybrać jedną i zapisać ją jako własną fiszkę, której inny użytkownik nie może odczytać ani zmodyfikować.**

## Przegląd

| ID   | Identyfikator zmiany          | Rezultat                                                                   | Zależności       | Status       |
| ---- | ----------------------------- | -------------------------------------------------------------------------- | ---------------- | ------------ |
| F-01 | `auth-and-persistence`        | Sesja użytkownika i trwała tabela fiszek z RLS                             | —                | zrealizowane |
| S-01 | `translate-one-word`          | Użytkownik otrzymuje 1–3 znormalizowane propozycje tłumaczenia             | F-01             | zrealizowane |
| S-02 | `create-and-list-flashcards`  | Użytkownik zapisuje wybraną propozycję i widzi własne fiszki               | F-01, S-01       | zrealizowane |
| S-03 | `edit-and-delete-flashcards`  | Użytkownik może edytować i usuwać własne fiszki                            | S-02             | zrealizowane |
| S-04 | `ownership-risk-coverage`     | Dostęp między kontami jest blokowany i testowany na poziomie bazy oraz API | F-01, S-02       | zrealizowane |
| S-05 | `deterministic-main-flow-e2e` | Główny przepływ jest pokryty deterministycznym testem E2E                  | S-01, S-02, S-03 | zrealizowane |
| S-06 | `certification-hardening`     | Dokumentacja i dowody wykonania kontroli jakości są gotowe do zgłoszenia   | S-01…S-05        | zrealizowane |

## Punkt wyjścia

Aktualny projekt zawiera Astro SSR, React, Supabase Auth/PostgreSQL/RLS, LibreTranslate, Zod, Vitest, pgTAP/testy bazy Supabase, Playwright i GitHub Actions.

Głównym trwałym zasobem jest `public.flashcards`, powiązany z `auth.users` przez `user_id`.

## Fundamenty

### F-01: `auth-and-persistence`

- **Rezultat:** użytkownik ma sesję, a prywatne fiszki są trwale zapisywane i chronione przez RLS.
- **Odblokowuje:** S-01, S-02, S-03, S-04.
- **Dowody:** middleware Supabase, endpointy uwierzytelniania, migracja `flashcards`, polityki RLS.
- **Status:** zrealizowane.

## Przekroje funkcjonalne

### S-01: `translate-one-word`

- **Rezultat:** użytkownik może wysłać jedno polskie słowo i otrzymać 1–3 unikalne propozycje tłumaczenia po angielsku.
- **Odwołania do PRD:** §6.2, §7, §9.4–5.
- **Zależności:** F-01.
- **Ryzyko:** usługa tłumaczeniowa może zwrócić duplikaty, puste wartości, zbyt wiele wyników lub błąd.
- **Weryfikacja:** Vitest dla normalizacji i adaptera oraz testy API tłumaczeń.
- **Status:** zrealizowane.

### S-02: `create-and-list-flashcards`

- **Rezultat:** użytkownik może wybrać tłumaczenie, zapisać jedną własną fiszkę i wyświetlić własne zapisane fiszki.
- **Odwołania do PRD:** §6.3, §6.4, §7, §9.6–8.
- **Zależności:** F-01, S-01.
- **Ryzyko:** klient mógłby próbować ustalić `user_id` lub zapisać nieprawidłowe dane.
- **Weryfikacja:** testy API oraz ograniczenia i polityki RLS w bazie.
- **Status:** zrealizowane.

### S-03: `edit-and-delete-flashcards`

- **Rezultat:** użytkownik może edytować i jawnie usunąć własną zapisaną fiszkę.
- **Odwołania do PRD:** §6.4, §9.8.
- **Zależności:** S-02.
- **Ryzyko:** operacja mogłaby dotknąć rekordu należącego do innego użytkownika.
- **Weryfikacja:** filtrowanie po `id + user_id` w API, RLS i test E2E.
- **Status:** zrealizowane.

### S-04: `ownership-risk-coverage`

- **Rezultat:** użytkownik A nie może odczytać, utworzyć z fałszywym właścicielem, zmodyfikować, przenieść własności ani usunąć fiszki użytkownika B.
- **Odwołania do PRD:** §6.4, §7, §9.9.
- **Zależności:** F-01, S-02.
- **Ryzyko:** R-01 z `test-plan.md` — dostęp do danych innego użytkownika.
- **Weryfikacja:** `supabase/tests/database/flashcards_rls.test.sql` oraz testy API.
- **Status:** zrealizowane.

### S-05: `deterministic-main-flow-e2e`

- **Rezultat:** użytkownik może przejść główny przepływ w teście przeglądarkowym bez zależności od publicznie dostępnej usługi tłumaczeniowej.
- **Odwołania do PRD:** §9.11, §10.
- **Zależności:** S-01, S-02, S-03.
- **Weryfikacja:** `tests/e2e/main-flow.spec.ts` oraz lokalny serwer testowy LibreTranslate.
- **Status:** zrealizowane.

### S-06: `certification-hardening`

- **Rezultat:** osoba oceniająca może szybko odnaleźć wymagania produktu, decyzje techniczne, roadmapę, plan testów, dowody CRUD, logikę biznesową i test głównego przepływu użytkownika.
- **Zależności:** S-01…S-05.
- **Zadania:**
  - skonsolidować dokumentację w `context/foundation/`,
  - ujednolicić dokumentację przeznaczoną dla człowieka do języka polskiego,
  - poprawić stare odnośniki w README i instrukcjach agentów,
  - wykonać świeży, pełny zestaw kontroli jakości przed zgłoszeniem,
  - zachować zakres MVP bez dodawania funkcji niepotrzebnych do certyfikacji.
- **Weryfikacja:** ostatni zweryfikowany pełny dowód QA na 2026-08-30 obejmuje Astro check (49 plików, 0 błędów, 0 ostrzeżeń i 0 wskazówek), 102 zaliczone testy Vitest, 15 zaliczonych testów pgTAP / bazy Supabase, zaliczony test E2E oraz audyt zależności `npm ci` z wynikiem 0 podatności. GitHub Actions CI run #24 (`33282374294`) dla commita `4ff90c2` zakończył się sukcesem.
- **Status:** zrealizowane.

## Przekazanie backlogu

Prace implementacyjne i hardening wymagany przed zgłoszeniem zostały zakończone. Pozostaje przygotowanie Evidence Packu, ewentualnych zrzutów ekranu oraz weryfikacja wymagań formularza zgłoszeniowego.

Nie ma obecnie potrzeby dodawania nowej funkcjonalności produktu, aby spełnić minimalne wymagania techniczne 10xBuilder.

## Otwarte pytania roadmapy

- Czy formularz zgłoszeniowy będzie wymagał dodatkowego zrzutu ekranu konkretnego elementu mimo publicznego repozytorium?
- Czy wykonać dodatkową kontrolę wdrożenia? Nie jest ona wymagana do pięciopunktowego audytu technicznego, ale można ją potraktować jako osobną kontrolę gotowości do zgłoszenia.

## Odłożone

Poza zakresem MVP pozostają:

- system powtórek rozłożonych w czasie (spaced repetition),
- quizy,
- statystyki nauki,
- gamifikacja,
- audio i wymowa,
- przykładowe zdania,
- poziomy CEFR,
- import wielu elementów,
- import PDF/DOCX,
- współdzielenie fiszek,
- natywna aplikacja mobilna.

## Zrealizowane

Zrealizowano fundament uwierzytelniania i trwałości danych oraz przekroje funkcjonalne S-01–S-06. Kod zawiera pełny CRUD zasobu `flashcards`, logikę normalizacji tłumaczeń, kontrolę własności i RLS, test zmapowany na R-01 oraz deterministyczny test E2E głównego przepływu.
