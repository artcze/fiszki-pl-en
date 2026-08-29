# Test Plan — Fiszki PL-EN MVP

## 1. Cel

Plan testów koncentruje się na ryzykach, których wystąpienie mogłoby naruszyć podstawową wartość lub bezpieczeństwo MVP.

Najważniejsze obszary to:

- izolacja danych użytkowników,
- poprawność logiki tłumaczeń,
- poprawność CRUD fiszek,
- odporność API na nieprawidłowe dane i błędy usług zewnętrznych.

Testy są dobierane na podstawie ryzyka, a nie wyłącznie struktury kodu.

## 2. Skala ryzyka

### Wpływ

- Wysoki — naruszenie bezpieczeństwa lub podstawowej funkcji produktu.
- Średni — główny flow działa niepoprawnie, ale nie prowadzi do naruszenia danych.
- Niski — ograniczony wpływ na użytkownika.

### Prawdopodobieństwo

- Wysoki — błąd może łatwo wystąpić w normalnym użyciu.
- Średni — wymaga określonej sytuacji lub kombinacji warunków.
- Niski — sytuacja rzadka lub wymagająca nietypowego działania.

## 3. Mapa ryzyk

| ID | Ryzyko | Wpływ | Prawdopodobieństwo | Priorytet |
| --- | --- | --- | --- | --- |
| R-01 | Zalogowany użytkownik może uzyskać dostęp do fiszki należącej do innego użytkownika | Wysoki | Średnie | Krytyczny |
| R-02 | Usługa tłumaczeń zwraca duplikaty, puste wartości lub więcej niż trzy wyniki | Średni | Średnie | Wysoki |
| R-03 | Nieprawidłowe dane wejściowe prowadzą do zapisania błędnej lub niekompletnej fiszki | Średni | Średnie | Wysoki |
| R-04 | Awaria lub błędna odpowiedź LibreTranslate powoduje niekontrolowany błąd aplikacji | Średni | Średnie | Wysoki |

## 4. R-01 — naruszenie izolacji danych użytkowników

### Ryzyko

Każda fiszka należy do jednego użytkownika.

Błąd w endpointach API albo politykach Row Level Security mógłby umożliwić użytkownikowi:

- odczyt cudzej fiszki,
- aktualizację cudzej fiszki,
- usunięcie cudzej fiszki,
- utworzenie rekordu z podszyciem się pod innego właściciela,
- zmianę właściciela istniejącej fiszki.

Jest to najważniejsze ryzyko bezpieczeństwa MVP.

### Mechanizmy kontroli

Warstwa API:

- użytkownik jest pobierany z uwierzytelnionej sesji,
- operacje są filtrowane po `user_id`,
- klient nie może podać własnego `user_id`.

Warstwa bazy danych:

- tabela `flashcards` ma włączone Row Level Security,
- polityki SELECT, INSERT, UPDATE i DELETE używają `auth.uid() = user_id`.

### Testy adresujące ryzyko

Główny test:

`supabase/tests/database/flashcards_rls.test.sql`

Test wykorzystuje dwóch różnych użytkowników i sprawdza między innymi, że:

- użytkownik widzi własną fiszkę,
- cudza fiszka jest niewidoczna,
- użytkownik nie może utworzyć fiszki należącej do innego użytkownika,
- użytkownik nie może aktualizować cudzej fiszki,
- użytkownik nie może zmienić właściciela własnej fiszki,
- użytkownik nie może usunąć cudzej fiszki,
- użytkownik anonimowy nie ma dostępu do tabeli.

Dodatkowa warstwa testów:

`tests/api/flashcards.test.ts`

Sprawdza między innymi:

- odrzucenie niezalogowanych żądań,
- pobieranie fiszek z filtrem `user_id`,
- tworzenie fiszki z własnością wyprowadzoną z sesji,
- aktualizację z filtrem `id + user_id`,
- usunięcie z filtrem `id + user_id`.

### Kryterium zaliczenia ryzyka

R-01 uznajemy za pokryte, gdy:

1. testy RLS dla dwóch użytkowników przechodzą,
2. testy API potwierdzają własność wyprowadzaną z sesji,
3. żadna operacja CRUD nie przyjmuje `user_id` od klienta.

## 5. R-02 — błędna normalizacja tłumaczeń

### Ryzyko

Usługa tłumaczeniowa może zwrócić:

- puste wartości,
- powtarzające się tłumaczenia,
- różnice wyłącznie w wielkości liter lub Unicode,
- więcej niż trzy propozycje.

Mogłoby to prowadzić do nieczytelnego lub niespójnego głównego flow.

### Testy adresujące ryzyko

`tests/lib/translations.test.ts`

Testy sprawdzają:

- normalizację whitespace,
- odrzucanie pustych wartości,
- Unicode normalization,
- deduplikację case-insensitive,
- limit trzech wyników,
- brak sztucznego uzupełniania wyników.

## 6. R-03 — zapis nieprawidłowej fiszki

### Ryzyko

Klient może wysłać:

- brakujące pola,
- błędne typy,
- puste wartości,
- wartości zawierające wyłącznie białe znaki,
- dodatkowe pole `user_id`,
- niepoprawny JSON.

### Testy adresujące ryzyko

`tests/api/flashcards.test.ts`

oraz:

`supabase/tests/database/flashcards_rls.test.sql`

Walidacja występuje zarówno na poziomie API, jak i constraintów PostgreSQL.

## 7. R-04 — awaria usługi tłumaczeniowej

### Ryzyko

LibreTranslate może:

- zwrócić błąd HTTP,
- przekroczyć limit czasu,
- zwrócić niepoprawny JSON,
- zwrócić niepoprawny format odpowiedzi,
- zwrócić brak użytecznych tłumaczeń.

### Testy adresujące ryzyko

- `tests/lib/libretranslate.test.ts`
- `tests/api/translations.test.ts`

Oczekiwanym zachowaniem jest kontrolowany błąd aplikacji bez utworzenia częściowego rekordu fiszki.

## 8. Kontrole jakości

Przed uznaniem zmiany za gotową należy wykonać pełną sekwencję kontroli jakości zgodną z CI:

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

Testy bazy danych i E2E wymagają dostępnej lokalnej instancji Supabase; E2E korzysta również ze środowiska testowego przygotowywanego przez workflow CI.

## 9. Powiązanie ryzyko → test

| Ryzyko | Test |
| --- | --- |
| R-01 Dostęp do danych innego użytkownika | `supabase/tests/database/flashcards_rls.test.sql` |
| R-01 Ominięcie kontroli własności w API | `tests/api/flashcards.test.ts` |
| R-02 Nieprawidłowa normalizacja tłumaczeń | `tests/lib/translations.test.ts` |
| R-03 Zapis nieprawidłowej fiszki | `tests/api/flashcards.test.ts`, `supabase/tests/database/flashcards_rls.test.sql` |
| R-04 Awaria usługi tłumaczeniowej | `tests/lib/libretranslate.test.ts`, `tests/api/translations.test.ts` |

## 10. Ryzyko wybrane jako wymaganie MVP / 10xBuilder

Ryzykiem bezpośrednio używanym do spełnienia wymagania testowego MVP jest:

**R-01 — możliwość uzyskania przez użytkownika dostępu do fiszek należących do innego użytkownika.**

Ryzyko jest bezpośrednio adresowane przez:

**`supabase/tests/database/flashcards_rls.test.sql`**

Test wykonuje rzeczywiste operacje na bazie danych z dwoma użytkownikami i weryfikuje działanie polityk Row Level Security niezależnie od warstwy UI.
