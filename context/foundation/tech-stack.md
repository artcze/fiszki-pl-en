# Stos technologiczny — Fiszki PL-EN MVP

## 1. Kształt aplikacji

Projekt jest aplikacją webową SSR. Warstwa serwerowa i routing są realizowane przez Astro, interaktywne fragmenty interfejsu przez React, a trwałe dane i uwierzytelnianie przez Supabase.

## 2. Stos technologiczny

| Obszar | Technologia | Rola w MVP |
|---|---|---|
| Framework aplikacji | Astro 7 | SSR, routing, strony i endpointy API |
| Interaktywność | React 19 | Interaktywne komponenty wymagające stanu po stronie klienta |
| Język | TypeScript 5 | Typowanie kodu aplikacji i testów |
| Baza danych | PostgreSQL w Supabase | Trwałe przechowywanie fiszek |
| Uwierzytelnianie | Supabase Auth | Rejestracja, logowanie, sesja użytkownika |
| Autoryzacja danych | Supabase Row Level Security | Izolacja fiszek pomiędzy użytkownikami |
| Integracja tłumaczeń | LibreTranslate | Tłumaczenie polski → angielski |
| Walidacja | Zod | Walidacja danych wejściowych endpointów |
| Testy aplikacji | Vitest | Testy logiki i endpointów |
| Testy bazy | pgTAP / testy bazy Supabase | Weryfikacja RLS i constraintów |
| Testy E2E | Playwright | Główny przepływ użytkownika w przeglądarce |
| CI | GitHub Actions | Typecheck, lint, testy, build, testy bazy i E2E |
| Środowisko uruchomieniowe | Cloudflare Workers | Środowisko uruchomieniowe aplikacji Astro SSR |

## 3. Kluczowe decyzje

### Astro SSR + wyspy React

Aplikacja pozostaje serwerowo renderowana. React jest używany tylko tam, gdzie potrzebna jest interakcja po stronie klienta. Nie ma potrzeby wprowadzania osobnej aplikacji SPA ani dodatkowej warstwy backendowej.

### Supabase jako uwierzytelnianie i trwałość danych

Supabase dostarcza jednocześnie sesję użytkownika, PostgreSQL oraz RLS. Własność fiszki jest egzekwowana na dwóch poziomach:

1. endpoint API wyprowadza `user_id` z sesji i filtruje operacje po użytkowniku,
2. PostgreSQL RLS ponownie wymusza `auth.uid() = user_id`.

### LibreTranslate za granicą serwerową

Dostęp do usługi tłumaczeniowej jest zamknięty za kontraktem `TranslationService`. Kod przeglądarki nie komunikuje się bezpośrednio z LibreTranslate i nie otrzymuje sekretów tej usługi.

### Walidacja na granicy systemu

Dane wejściowe są walidowane na endpointach przez Zod. Baza dodatkowo chroni trwałe dane ograniczeniami bazy dla niepustych wartości.

## 4. Zmienne środowiskowe

Projekt używa:

```text
SUPABASE_URL
SUPABASE_KEY
LIBRETRANSLATE_BASE_URL
LIBRETRANSLATE_API_KEY
```

Sekrety nie powinny trafiać do repozytorium ani kodu wysyłanego do klienta.

## 5. Model bezpieczeństwa

- identyfikator właściciela nie jest przyjmowany od klienta,
- sesja Supabase określa aktualnego użytkownika,
- API ogranicza operacje do `user.id`,
- RLS chroni `SELECT`, `INSERT`, `UPDATE` i `DELETE`,
- konto anonimowe nie ma dostępu do tabeli `flashcards`,
- zwykłe żądania aplikacji nie wymagają klucza roli serwisowej (`service_role`).

## 6. Kontrole jakości

Główna sekwencja kontroli jakości:

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

Testy DB i E2E wymagają lokalnego Supabase; E2E korzysta z kontrolowanego lokalnego serwera testowego LibreTranslate.

## 7. Świadomie niewprowadzane elementy

W MVP nie są potrzebne:

- osobna warstwa repozytoriów lub usług dla prostego CRUD tylko dla samej abstrakcji,
- magistrala zdarzeń, kolejki lub zadania w tle,
- własny algorytm spaced repetition,
- dodatkowa usługa tłumaczeniowa lub LLM jako rozwiązanie zapasowe,
- osobny system uprawnień poza Supabase Auth + RLS,
- rozbudowana platforma obserwowalności.

## 8. Ograniczenia wersji

Projekt pozostaje na głównej wersji Astro 7. Migracja do kolejnej głównej wersji nie jest częścią zakresu MVP ani porządkowania dokumentacji certyfikacyjnej.
