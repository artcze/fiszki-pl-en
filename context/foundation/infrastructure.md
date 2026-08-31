# Infrastruktura — Fiszki PL-EN MVP

## 1. Status dokumentu

Ten dokument opisuje **aktualny kontrakt infrastrukturalny** projektu Fiszki PL-EN na potrzeby utrzymania MVP i certyfikacji 10xDevs 3.0. Został odtworzony na podstawie bieżącej konfiguracji repozytorium i nie udaje historycznego zapisu pierwotnej sesji planowania deploymentu.

Źródłami prawdy dla szczegółów implementacyjnych pozostają przede wszystkim `astro.config.mjs`, `wrangler.jsonc`, `.github/workflows/ci.yml`, `.env.example` oraz `context/foundation/tech-stack.md`.

## 2. Wybór i uzasadnienie

Warstwa aplikacyjna jest wdrażana jako **Cloudflare Worker**, natomiast trwałe dane i uwierzytelnianie zapewnia **Supabase**. Zewnętrzną usługą domenową jest **LibreTranslate**, używany wyłącznie po stronie serwera.

Cloudflare Workers pasuje do aplikacji Astro renderowanej po stronie serwera i pozwala używać oficjalnego adaptera `@astrojs/cloudflare`. Supabase pozostaje osobnym systemem odpowiedzialnym za PostgreSQL, Auth i Row Level Security, dzięki czemu aplikacja nie musi utrzymywać własnego serwera bazy ani systemu sesji.

## 3. Dopasowanie stacku

- Astro działa z `output: "server"`, więc aplikacja nie jest statycznym eksportem.
- Produkcyjny adapter to `@astrojs/cloudflare`.
- Punktem wejścia Workera jest `@astrojs/cloudflare/entrypoints/server`.
- Statyczne assety są publikowane z katalogu `./dist` przez binding `ASSETS`.
- Worker korzysta z flagi kompatybilności `nodejs_compat`.
- Konfiguracja Workera jest przechowywana w `wrangler.jsonc`.
- Dane trwałe nie są przechowywane w Cloudflare — znajdują się w PostgreSQL zarządzanym przez Supabase.
- Auth i izolacja danych są realizowane przez Supabase Auth oraz PostgreSQL Row Level Security.

## 4. CLI / API / operability

Projekt posiada lokalnie wersjonowane narzędzia potrzebne do obsługi infrastruktury:

- `wrangler` — rozwój i deployment Cloudflare Workers,
- `supabase` CLI — lokalny stack, migracje i testy bazy,
- GitHub Actions — automatyczne quality gates dla pushy i pull requestów do `main`.

`wrangler.jsonc` ma włączone `observability.enabled: true`, więc Worker jest przygotowany do używania obserwowalności Cloudflare. Repozytorium nie definiuje osobnego MCP dla infrastruktury i nie uzależnia procesu od MCP.

## 5. Podgląd wdrożenia

Aktualne repozytorium **nie definiuje automatycznego preview deploymentu per pull request**. Pull request do `main` uruchamia pełny pipeline CI, ale nie publikuje osobnej wersji aplikacji.

Cloudflare Workers obsługuje wersjonowane preview URL-e dla nowych wersji Workera, jednak ich automatyczne tworzenie i udostępnianie nie jest obecnie częścią workflow projektu. Dla MVP podstawową bramką przed publikacją pozostają lokalne testy oraz CI.

Jeżeli preview per PR stanie się potrzebne, powinno zostać wdrożone jako jawna zmiana infrastrukturalna, a nie jako ukryty efekt uboczny istniejącego CI.

## 6. Sekrety i konfiguracja środowiska

Aplikacja używa następujących zmiennych:

```text
SUPABASE_URL
SUPABASE_KEY
LIBRETRANSLATE_BASE_URL
LIBRETRANSLATE_API_KEY
```

W `astro.config.mjs` wszystkie cztery wartości są dostępne wyłącznie w kontekście serwerowym i oznaczone jako `secret`.

Zasady:

- lokalnie wartości znajdują się w ignorowanych przez Git plikach `.env` / `.dev.vars`,
- `.env.e2e` jest tworzony lokalnie lub w CI i również jest ignorowany przez Git,
- repozytorium przechowuje wyłącznie nazwy i przykładowy kontrakt w `.env.example`, nigdy prawdziwe sekrety,
- `SUPABASE_KEY` ma być kluczem publikowalnym/anonimowym odpowiednim dla aplikacji i nie może być kluczem `service_role`,
- produkcyjne wartości muszą być skonfigurowane poza repozytorium w środowisku wykonawczym Workera i u dostawców usług,
- rotacja sekretów oraz nadawanie dostępu do kont dostawców wymagają działania człowieka.

## 7. Deployment

Przed publikacją produkcyjną obowiązuje ta sama sekwencja jakości, która jest wykonywana w CI:

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

Po przejściu bramek jakości Worker może zostać wdrożony z konfiguracji `wrangler.jsonc` poleceniem:

```bash
npx wrangler deploy
```

Aktualny workflow GitHub Actions **nie wykonuje automatycznego deploymentu produkcyjnego**. Publikacja produkcyjna pozostaje osobną, świadomą operacją.

## 8. Rollback

Rollback kodu Workera jest operacją ręczną i nie jest wykonywany automatycznie przez GitHub Actions.

Podstawowa procedura:

1. Zidentyfikować ostatnią znaną dobrą wersję Workera.
2. W razie potrzeby sprawdzić listę ostatnich wersji/deploymentów w Cloudflare.
3. Cofnąć Worker poleceniem:

```bash
npx wrangler rollback
```

Polecenie bez identyfikatora cofa do wersji opublikowanej bezpośrednio przed aktualną. W przypadku potrzeby wskazania konkretnej wersji:

```bash
npx wrangler rollback <VERSION_ID> --message "Rollback to known-good version"
```

Rollback Workera **nie jest rollbackiem bazy danych ani konfiguracji zewnętrznych usług**. Zmiany schematu Supabase, danych, sekretów albo konfiguracji dostawców wymagają osobnej procedury i nie powinny być zakładane jako odwracalne przez `wrangler rollback`.

## 9. Uprawnienia i ownership

### Agent może wykonywać bez publikacji produkcyjnej

- czytać konfigurację infrastruktury,
- budować aplikację,
- uruchamiać lint, typecheck i testy,
- uruchamiać lokalny Supabase,
- wykonywać testy bazy na środowisku lokalnym,
- przygotować plan deploymentu lub rollbacku,
- analizować logi i wyniki CI.

### Człowiek zatwierdza lub wykonuje

- deployment na produkcję,
- rollback produkcji,
- konfigurację i rotację sekretów,
- zmiany w kontach Cloudflare, Supabase i dostawcy tłumaczeń,
- destrukcyjne operacje na produkcyjnej bazie danych,
- zmianę polityk dostępu i uprawnień do infrastruktury.

## 10. Ryzyka i ograniczenia

1. **Zależność od zewnętrznej usługi tłumaczeniowej.** Niedostępność lub opóźnienia LibreTranslate wpływają bezpośrednio na główny flow tworzenia fiszki.
2. **Granice runtime Cloudflare Workers.** Nowe biblioteki lub funkcje zależne od pełnego środowiska Node.js muszą być sprawdzane pod kątem zgodności z Workerd/`nodejs_compat`.
3. **Rozdzielenie aplikacji i bazy.** Rollback Workera nie cofa migracji ani danych Supabase, więc zmiany przekraczające oba systemy wymagają ostrożnego sekwencjonowania.
4. **Konfiguracja produkcyjna poza repo.** Błędna wartość sekretu lub URL-a może zepsuć produkcję mimo poprawnego CI.
5. **Brak preview deploymentu per PR.** CI wykrywa regresje, ale nie daje obecnie osobnego publicznego środowiska do ręcznego smoke testu każdej gałęzi.
6. **Rate limiting tłumaczeń.** Worker ma binding `TRANSLATION_RATE_LIMITER` z limitem 30 żądań na 60 sekund; zmiana oczekiwanego ruchu wymaga ponownej oceny tego limitu.
7. **Zależność od poprawności RLS.** Izolacja danych użytkowników opiera się również na politykach PostgreSQL, dlatego testy RLS są częścią obowiązkowych quality gates.

## 11. Decyzje techniczne

| Obszar | Decyzja dla MVP |
|---|---|
| Runtime aplikacji | Cloudflare Workers |
| Framework / rendering | Astro SSR |
| Adapter | `@astrojs/cloudflare` |
| Konfiguracja deploymentu | `wrangler.jsonc` |
| Worker name | `fiszki-pl-en` |
| Compatibility date | `2026-05-08` |
| Compatibility flags | `nodejs_compat` |
| Statyczne assety | binding `ASSETS`, katalog `./dist` |
| Observability | włączone w konfiguracji Workera |
| Rate limiter | `TRANSLATION_RATE_LIMITER`, 30 / 60 s |
| Dane i auth | Supabase PostgreSQL + Auth + RLS |
| Translation provider | LibreTranslate |
| CI | GitHub Actions |
| Automatyczny deploy z CI | nie |
| Preview per PR | nie skonfigurowano |
| Region Cloudflare / Supabase | brak jawnej decyzji w repo — nie inferować |
| Plan abonamentowy dostawców | brak jawnej decyzji w repo — nie inferować |

## 12. Sygnały do zmiany decyzji

Obecną architekturę należy ponownie ocenić, jeśli pojawi się co najmniej jeden z poniższych sygnałów:

- potrzebne będzie automatyczne środowisko preview lub staging dla każdego PR,
- aplikacja zacznie wymagać długotrwałych zadań w tle albo runtime'u niekompatybilnego z Cloudflare Workers,
- ruch lub koszty tłumaczeń wymuszą zmianę rate limitu albo dostawcy,
- wymagania bezpieczeństwa lub compliance wymuszą jawny wybór regionu i bardziej restrykcyjne zarządzanie sekretami,
- baza będzie wymagała osobnej strategii HA, backup/restore lub kontrolowanej migracji między regionami,
- ręczny deployment stanie się źródłem błędów i potrzebny będzie kontrolowany pipeline CD,
- obecna obserwowalność przestanie wystarczać do diagnozowania błędów produkcyjnych.

## 13. Referencje w repozytorium

- `context/foundation/tech-stack.md` — decyzje technologiczne i granice techniczne,
- `astro.config.mjs` — SSR, adapter Cloudflare i kontrakt zmiennych środowiskowych,
- `wrangler.jsonc` — konfiguracja Workera, assetów, rate limitu i observability,
- `.github/workflows/ci.yml` — aktualne quality gates,
- `.env.example` — kontrakt konfiguracji środowiska,
- `README.md` — lokalne uruchomienie, testy i model bezpieczeństwa.
