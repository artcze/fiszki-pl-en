# Shape Notes — Fiszki PL-EN MVP

> **Status i pochodzenie:** ten dokument jest rekonstrukcją aktualnych decyzji produktowych na podstawie potwierdzonego stanu projektu (`prd.md`, `roadmap.md`, `technical-spec.md`, testy i działający kod). Nie jest transkrypcją ani próbą odtworzenia historycznej sesji `/10x-shape`, która nie została zachowana.

## 1. Vision & problem

Fiszki PL-EN mają skrócić drogę od napotkanego polskiego słowa do zapisanej, prywatnej fiszki polski → angielski.

Problem polega na tym, że osoba ucząca się języka chce szybko zapisać znaczenie pasujące do kontekstu, ale ręczne wpisywanie obu stron fiszki zwiększa tarcie, a ogólne słowniki potrafią zwracać zbyt dużo informacji.

Pierwsza wartość produktu pojawia się wtedy, gdy użytkownik wpisuje jedno polskie słowo, otrzymuje ograniczoną liczbę użytecznych tłumaczeń, wybiera właściwe znaczenie i zapisuje je jako własną fiszkę.

## 2. Persona & access control

Głównym użytkownikiem jest polskojęzyczna osoba ucząca się języka angielskiego, która chce budować prywatną listę prostych fiszek.

Decyzje dotyczące dostępu:

- użytkownik może się zarejestrować, zalogować i wylogować,
- obszar aplikacji z fiszkami wymaga zalogowania,
- każda fiszka należy do dokładnie jednego użytkownika,
- użytkownik widzi i modyfikuje wyłącznie własne fiszki,
- właściciel fiszki jest wyprowadzany z uwierzytelnionej sesji, a nie z danych przesłanych przez klienta.

## 3. MVP discipline

Zakres MVP obejmuje:

- uwierzytelnianie użytkownika,
- tłumaczenie jednego polskiego słowa na angielski,
- zwrócenie od 1 do 3 unikalnych, niepustych propozycji,
- wybór jednej propozycji przez użytkownika,
- utworzenie jednej prywatnej fiszki,
- listowanie własnych fiszek,
- edycję własnej fiszki,
- usunięcie własnej fiszki,
- kontrolę własności danych,
- kontrolowaną obsługę błędów usługi tłumaczeniowej.

Poza zakresem MVP pozostają:

- spaced repetition,
- quizy,
- statystyki nauki,
- gamifikacja,
- audio i wymowa,
- przykładowe zdania,
- poziomy CEFR,
- import zbiorczy,
- współdzielenie fiszek,
- natywna aplikacja mobilna.

## 4. Functional Requirements

### FR-001 — Uwierzytelnianie i chroniony obszar

System umożliwia rejestrację, logowanie i wylogowanie. Niezalogowany użytkownik nie może korzystać z chronionego obszaru zarządzania fiszkami.

### FR-002 — Jedno polskie słowo jako wejście tłumaczenia

Użytkownik przekazuje dokładnie jedno niepuste polskie słowo. Wejście do tłumaczenia ma maksymalnie 100 znaków i nie może zawierać białych znaków rozdzielających kilka tokenów.

### FR-003 — Ograniczone propozycje tłumaczenia

System zwraca od jednej do trzech unikalnych, niepustych propozycji tłumaczenia na język angielski. Wyniki są normalizowane i deduplikowane. System nie wymyśla dodatkowych propozycji tylko po to, aby osiągnąć liczbę trzech.

### FR-004 — Jawny wybór przed zapisem

Przed utworzeniem fiszki użytkownik wybiera dokładnie jedną z otrzymanych propozycji. Potwierdzenie tworzy dokładnie jedną fiszkę.

### FR-005 — CRUD własnych fiszek

Zalogowany użytkownik może wyświetlać, tworzyć, edytować i usuwać wyłącznie własne fiszki. Polska strona zapisanej fiszki zawiera dokładnie jedno niepuste słowo; angielska strona zawiera niepuste tłumaczenie i może składać się z kilku słów.

### FR-006 — Własność danych

Klient nie ustala `user_id`. System przypisuje właściciela na podstawie aktualnej sesji i nie pozwala użytkownikowi odczytać, zmodyfikować ani usunąć fiszki należącej do innego użytkownika.

### FR-007 — Kontrolowana awaria tłumaczenia

Błąd usługi tłumaczeniowej nie tworzy fiszki. Użytkownik otrzymuje kontrolowany komunikat błędu bez ujawniania sekretów ani szczegółów infrastruktury.

## 5. User stories

### US-001 — Od słowa do fiszki

**Given** użytkownik jest zalogowany  
**When** wpisuje jedno poprawne polskie słowo, otrzymuje propozycje, wybiera jedną i potwierdza zapis  
**Then** system zapisuje dokładnie jedną prywatną fiszkę polski → angielski przypisaną do tego użytkownika.

### US-002 — Zarządzanie własnymi fiszkami

**Given** użytkownik ma zapisane własne fiszki  
**When** otwiera ich listę, edytuje wybraną fiszkę albo jawnie ją usuwa  
**Then** operacja dotyczy wyłącznie fiszki należącej do aktualnego użytkownika.

### US-003 — Izolacja użytkowników

**Given** istnieją co najmniej dwa różne konta użytkowników  
**When** jeden użytkownik próbuje uzyskać dostęp do fiszki drugiego użytkownika  
**Then** system nie ujawnia ani nie modyfikuje cudzych danych.

### US-004 — Błąd dostawcy tłumaczeń

**Given** użytkownik wysyła poprawne słowo do tłumaczenia  
**When** zewnętrzna usługa tłumaczeniowa zwraca błąd lub brak użytecznego wyniku  
**Then** system kończy operację kontrolowanym błędem i nie tworzy fiszki.

## 6. Business logic

Jedno polskie słowo jest przekazywane do usługi tłumaczeniowej, wyniki są normalizowane, oczyszczane z pustych wartości, deduplikowane i ograniczane do maksymalnie trzech, a dopiero jawny wybór użytkownika może zostać zapisany jako jedna prywatna fiszka.

To jest logika domenowa wykraczająca poza sam CRUD.

## 7. Data

Minimalny model domenowy:

### User

Uwierzytelniony użytkownik systemu. Jego tożsamość określa właściciela fiszek.

### Flashcard

- identyfikator,
- właściciel (`user_id`),
- jedno polskie słowo,
- jedno wybrane angielskie tłumaczenie,
- czas utworzenia,
- czas ostatniej aktualizacji.

Relacja: jeden użytkownik może mieć wiele fiszek; każda fiszka ma jednego właściciela.

## 8. Kryteria zakończenia MVP

MVP jest kompletne, gdy:

- użytkownik może przejść główny flow od logowania do zapisanej fiszki,
- działa pełny CRUD własnych fiszek,
- wynik tłumaczenia jest normalizowany, deduplikowany i ograniczony do maksymalnie trzech propozycji,
- własność fiszek jest egzekwowana i testowana,
- awaria tłumaczenia kończy się kontrolowanym błędem,
- główny przepływ użytkownika ma automatyczny test E2E.

## 9. Checkpoint

- **Access control:** określony — zasoby są prywatne i przypisane do zalogowanego użytkownika.
- **Data model:** określony — głównym zasobem jest prywatna fiszka polski → angielski.
- **Business logic:** określona — normalizacja, deduplikacja i ograniczanie propozycji przed jawnym wyborem i zapisem.
- **Project artifacts:** kanoniczna dokumentacja znajduje się w `context/foundation/`.
- **MVP discipline:** zakres ogranicza się do pierwszego kompletnego przepływu oraz CRUD fiszek.
- **Non-goals:** jawnie zapisane i pozostają poza MVP.

## 10. Open Questions

W aktualnym kanonicznym PRD nie ma nierozstrzygniętego pytania produktowego, które blokowałoby zakres MVP. Pytania dotyczące samego procesu zgłoszenia certyfikacyjnego nie są decyzjami produktowymi i pozostają poza tym dokumentem.
