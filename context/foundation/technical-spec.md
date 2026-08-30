# Specyfikacja techniczna — Fiszki PL-EN MVP

## 1. Zakres i zasady

Dokument opisuje aktualny kontrakt implementacyjny MVP zdefiniowanego w [`prd.md`](prd.md). Aplikacja jest serwerowo renderowanym projektem Astro 7, z wyspami React używanymi tylko do interakcji wymagających stanu klienta.

Priorytetem jest mały, czytelny przepływ end-to-end. Nie wprowadzamy dodatkowych warstw architektonicznych, jeśli nie rozwiązują konkretnego problemu MVP.

## 2. Architektura systemu

```text
Użytkownik
   |
   v
Strony Astro + wyspy React
   |
   +--> Endpointy API Astro
           |
           +--> Klient Supabase SSR --> Supabase Auth / PostgreSQL / RLS
           |
           +--> TranslationService --> LibreTranslate
   |
   v
Środowisko Cloudflare Workers
```

Granice odpowiedzialności:

- kod przeglądarki odpowiada za formularze i prezentację, ale nie za zaufane dane o własności ani sekrety,
- endpointy Astro walidują żądania, rozwiązują aktualnego użytkownika i koordynują operacje aplikacji,
- `TranslationService` oddziela aplikację od szczegółów usługi tłumaczeniowej,
- Supabase Auth ustala tożsamość, a PostgreSQL + RLS zapewniają trwałość i izolację danych.

## 3. Obszary aplikacji

- publiczne strony uwierzytelniania: rejestracja, logowanie i potwierdzenie adresu e-mail,
- chroniony panel: tłumaczenie słowa, tworzenie i zarządzanie fiszkami,
- endpointy serwerowe: tłumaczenia oraz pełny CRUD fiszek,
- funkcje pomocnicze po stronie serwera: klient Supabase, walidacja, normalizacja tłumaczeń, adapter LibreTranslate i mapowanie błędów.

## 4. API

### 4.1 `POST /api/translations`

Wymaga uwierzytelnienia.

Przykładowe żądanie:

```json
{ "word": "zamek" }
```

Przykładowa odpowiedź `200`:

```json
{ "translations": ["castle", "lock"] }
```

Zasady:

- wejście ma maksymalnie 100 znaków i zawiera dokładnie jedno niepuste słowo bez białych znaków rozdzielających kilka tokenów,
- język źródłowy to `pl`, a docelowy `en`,
- odpowiedź usługi tłumaczeniowej jest normalizowana,
- puste wartości i duplikaty są usuwane,
- wynik ma maksymalnie trzy elementy,
- zero użytecznych wyników jest traktowane jako błąd tłumaczenia,
- natywny limiter Cloudflare dopuszcza dla uwierzytelnionego użytkownika 30 żądań tłumaczenia na 60 sekund, używając aktualnego `user.id` jako klucza,
- przekroczenie limitu zwraca HTTP `429` z kodem aplikacyjnym `RATE_LIMITED`,
- endpoint nie zapisuje fiszki.

Oczekiwane klasy odpowiedzi błędów obejmują `400`, `401`, `429`, `502` i `500` z kontrolowanymi kodami aplikacyjnymi.

### 4.2 `GET /api/flashcards`

Wymaga uwierzytelnienia. Pobiera wyłącznie rekordy z `user_id` równym identyfikatorowi aktualnego użytkownika i zwraca je w deterministycznej kolejności.

### 4.3 `POST /api/flashcards`

Wymaga uwierzytelnienia. Waliduje `polish` i `english`, a następnie zapisuje dokładnie jedną fiszkę. `user_id` pochodzi wyłącznie z sesji.

### 4.4 `PATCH /api/flashcards/[id]`

Wymaga uwierzytelnienia. Aktualizuje tylko rekord spełniający jednocześnie warunki `id = <id>` oraz `user_id = currentUser.id`. Brak dostępnego rekordu zwraca `404` bez ujawniania, czy wskazane ID należy do innego użytkownika.

### 4.5 `DELETE /api/flashcards/[id]`

Wymaga uwierzytelnienia. Usuwa wyłącznie rekord należący do aktualnego użytkownika. Sukces zwraca `204`, a brak dostępnego rekordu `404`.

## 5. Serwis tłumaczeń

Granica usługi tłumaczeniowej jest opisana przez kontrakt:

```ts
interface TranslationService {
  translatePolishWord(word: string): Promise<string[]>;
}
```

Implementacją MVP jest `LibreTranslateService` uruchamiany po stronie serwera.

`normalizeTranslations()`:

- akceptuje tylko wartości tekstowe,
- normalizuje Unicode przez `NFKC`,
- usuwa nadmiarowe białe znaki,
- odrzuca puste wyniki,
- usuwa duplikaty bez rozróżniania wielkości liter,
- kończy zbieranie po trzech unikalnych tłumaczeniach.

Błędy sieci, przekroczenia limitu czasu, nieprawidłowej odpowiedzi lub błędu usługi tłumaczeniowej są mapowane na kontrolowany błąd aplikacji.

## 6. Model danych

Tabela `public.flashcards` zawiera:

| Kolumna      | Typ           | Znaczenie                                               |
| ------------ | ------------- | ------------------------------------------------------- |
| `id`         | `uuid`        | klucz główny generowany przez bazę                      |
| `user_id`    | `uuid`        | właściciel; FK do `auth.users(id)`                      |
| `polish`     | `text`        | niepuste polskie słowo, maksymalnie 255 znaków          |
| `english`    | `text`        | niepuste angielskie tłumaczenie, maksymalnie 255 znaków |
| `created_at` | `timestamptz` | czas utworzenia                                         |
| `updated_at` | `timestamptz` | czas ostatniej aktualizacji                             |

Baza ma:

- ograniczenia CHECK blokujące wartości puste lub zawierające wyłącznie białe znaki oraz wartości dłuższe niż 255 znaków dla `polish` i `english`,
- indeks `(user_id, created_at desc)`,
- wyzwalacz aktualizujący `updated_at`,
- Row Level Security.

## 7. Uwierzytelnianie i autoryzacja

- rejestracja wymaga hasła o długości co najmniej 8 znaków oraz zgodnego potwierdzenia hasła,
- `confirmPassword` jest walidowane po stronie serwera i musi być zgodne z `password`,
- do `Supabase signUp` przekazywane są wyłącznie `email` i `password`; `confirmPassword` nie jest przekazywane dostawcy,
- oczekiwane błędy uwierzytelniania i dostawcy są zwracane jako oczyszczone komunikaty przeznaczone dla użytkownika,
- sesja jest obsługiwana przez Klient Supabase SSR i cookies,
- middleware odczytuje aktualnego użytkownika i zapisuje go w `context.locals.user`,
- `/dashboard` wymaga zalogowania,
- każdy endpoint danych niezależnie sprawdza `context.locals.user`,
- klient nie może ustalać `user_id`,
- operacje na fiszkach są filtrowane po aktualnym użytkowniku.

### 7.1 Row Level Security

Dla roli `authenticated` istnieją polityki:

- `SELECT`: `auth.uid() = user_id`,
- `INSERT`: `WITH CHECK auth.uid() = user_id`,
- `UPDATE`: `USING` i `WITH CHECK auth.uid() = user_id`,
- `DELETE`: `auth.uid() = user_id`.

Rola `anon` nie ma dostępu do tabeli `flashcards`.

## 8. Walidacja

- ścisła walidacja JSON, typów i dozwolonych pól pozostaje na granicy każdego endpointu,
- słowo przekazywane do tłumaczenia ma maksymalnie 100 znaków i musi być dokładnie jednym niepustym słowem,
- fiszki wymagają niepustych `polish` i `english`, maksymalnie po 255 znaków na każdą stronę,
- trwałe ograniczenia CHECK w PostgreSQL odpowiadają regułom niepustych wartości i limitom 255 znaków dla obu stron fiszki,
- identyfikator fiszki jest walidowany przed zapytaniem do bazy,
- baza stanowi drugą linię ochrony dla trwałych danych.

## 9. Obsługa błędów

- błędy oczekiwane mają stabilne kody aplikacyjne i komunikaty użytkowe,
- nie zwracamy śladu stosu, odpowiedzi usługi tłumaczeniowej, sekretów ani detali bazy,
- rozróżniamy nieprawidłowe wejście, brak uwierzytelnienia, brak dostępnego rekordu, błąd usługi tłumaczeniowej i nieoczekiwany błąd serwera,
- generowanie tłumaczeń nie wykonuje częściowego zapisu fiszki.

## 10. Zachowanie interfejsu

Główny chroniony panel umożliwia:

1. wpisanie polskiego słowa,
2. pobranie propozycji tłumaczeń,
3. wybór jednej propozycji,
4. zapis fiszki,
5. wyświetlenie zapisanej fiszki,
6. edycję,
7. potwierdzone usunięcie.

Komunikaty użytkowe są po polsku.

## 11. Strategia testów

### 11.1 Vitest

Testy obejmują logikę normalizacji, adapter usługi tłumaczeniowej oraz endpointy tłumaczeń i fiszek.

### 11.2 Testy bazy

`supabase/tests/database/flashcards_rls.test.sql` używa dwóch użytkowników i sprawdza własność dla operacji `SELECT`, `INSERT`, `UPDATE` i `DELETE`, próbę zmiany właściciela, ograniczenia bazy oraz brak dostępu anonimowego.

### 11.3 E2E

`tests/e2e/main-flow.spec.ts` realizuje przepływ:

```text
signup -> sign out -> sign in -> dashboard -> translate -> create -> list -> edit -> delete
```

Usługa tłumaczeniowa jest zastępowana przez kontrolowany lokalny serwer testowy, więc E2E nie zależy od publicznej instancji LibreTranslate.

## 12. CI

`.github/workflows/ci.yml` uruchamia dla operacji push i pull requestów do `main`.

Główna sekwencja kontroli jakości wykonywana w CI:

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

Workflow dodatkowo wykonuje checkout repozytorium, konfigurację Node.js, instalację Playwright Chromium, uruchomienie lokalnego Supabase oraz przygotowanie środowiska E2E.

Nie należy uznawać samej obecności workflow za dowód udanego wykonania; przed zgłoszeniem certyfikacyjnym warto mieć świeże, udane wykonanie na aktualnym `main`.

## 13. Stan realizacji

Aktualne MVP zawiera:

- uwierzytelnianie,
- chroniony panel,
- integrację LibreTranslate,
- normalizację i deduplikację tłumaczeń,
- pełny CRUD fiszek,
- własność fiszek w API,
- RLS w PostgreSQL,
- testy Vitest,
- testy RLS w pgTAP,
- test E2E głównego przepływu,
- proces CI.

Pozostałe prace przed zgłoszeniem dotyczą głównie utrzymania aktualnej dokumentacji i zebrania czytelnych dowodów wykonania kontroli jakości, a nie rozbudowy funkcjonalnej MVP.

## 14. Ograniczenia

- Astro pozostaje na głównej wersji 7.
- Rozbudowa o spaced repetition, quizy, statystyki, import dokumentów i inne funkcje z sekcji „Poza zakresem MVP” nie jest częścią MVP.
- Nie dodajemy dodatkowych abstrakcji ani zależności bez konkretnego wymagania.
