# PRD — Fiszki PL-EN MVP

## 1. Podsumowanie produktu

Fiszki PL-EN to aplikacja webowa dla polskojęzycznych osób uczących się języka angielskiego. Pomaga zalogowanemu użytkownikowi przetłumaczyć jedno polskie słowo, wybrać właściwe znaczenie po angielsku i zapisać tę parę jako prywatną fiszkę.

Każda fiszka zawiera dokładnie jedno polskie słowo oraz jedno wybrane angielskie tłumaczenie. Jeżeli jedno polskie słowo ma kilka znaczeń, użytkownik może utworzyć osobną fiszkę dla każdego z nich.

## 2. Problem użytkownika

Osoby uczące się języka często napotykają polskie słowo i chcą szybko zapisać angielskie znaczenie pasujące do kontekstu. Ogólne słowniki potrafią zwracać zbyt dużo informacji, a ręczne wpisywanie obu stron fiszki zwiększa tarcie.

MVP ma skrócić drogę od polskiego słowa do zapisanej, prywatnej pary słowo–tłumaczenie, bez udawania, że każde słowo musi mieć kilka użytecznych odpowiedników.

## 3. Użytkownik docelowy

Głównym użytkownikiem jest polskojęzyczna osoba ucząca się języka angielskiego, która chce budować i utrzymywać prywatną listę prostych fiszek polski → angielski.

Interfejs i komunikaty użytkowe są po polsku. Dane słownikowe składają się z polskiego słowa źródłowego i angielskiego tłumaczenia.

## 4. Cele MVP

- umożliwić rejestrację, logowanie i wylogowanie,
- ograniczyć dostęp do obszaru aplikacji do zalogowanych użytkowników,
- wygenerować sensowne angielskie tłumaczenia dla jednego polskiego słowa,
- pozwolić użytkownikowi wybrać i potwierdzić dokładnie jedno tłumaczenie,
- zapisać i zarządzać prywatnymi fiszkami użytkownika,
- wymuszać przypisanie fiszek do właściciela tak, aby użytkownicy nie mieli dostępu do cudzych fiszek,
- zapewnić automatyczne kontrole jakości i test głównego przepływu użytkownika.

## 5. Główny przepływ użytkownika

1. Użytkownik rejestruje się lub loguje.
2. Otwiera chroniony obszar aplikacji.
3. Wpisuje jedno polskie słowo.
4. System pobiera propozycje tłumaczeń.
5. System zwraca od jednej do trzech unikalnych, niepustych propozycji po angielsku.
6. Użytkownik wybiera jedną propozycję.
7. Potwierdza utworzenie fiszki.
8. Aplikacja zapisuje jedną fiszkę przypisaną do aktualnie zalogowanego użytkownika.
9. Fiszka pojawia się na liście użytkownika.
10. Użytkownik może ją później edytować lub usunąć.

## 6. Wymagania funkcjonalne

### 6.1 Uwierzytelnianie

- Odwiedzający może zarejestrować konto przy użyciu obsługiwanych danych logowania Supabase Auth.
- Zarejestrowany użytkownik może się zalogować i wylogować.
- Chronione ścieżki aplikacji przekierowują niezalogowanego użytkownika do logowania.
- Oczekiwane błędy uwierzytelniania są obsługiwane bez ujawniania sekretów ani szczegółów infrastruktury.

### 6.2 Generowanie tłumaczeń

- Użytkownik wysyła dokładnie jedno niepuste polskie słowo.
- Językiem źródłowym jest polski (`pl`), a docelowym angielski (`en`).
- Wynik zawiera od jednej do trzech unikalnych, niepustych propozycji tłumaczenia.
- Jeśli istnieje tylko jedna użyteczna propozycja, system zwraca jedną.
- System nie wymyśla dodatkowych wyników tylko po to, aby osiągnąć liczbę trzech.
- Powtórzone lub równoważne po normalizacji wyniki są usuwane.
- Błąd usługi tłumaczeniowej nie tworzy fiszki i kończy się kontrolowanym komunikatem błędu.

### 6.3 Tworzenie fiszki

- Przed potwierdzeniem użytkownik musi wybrać jedną z otrzymanych propozycji.
- Potwierdzenie tworzy dokładnie jedną fiszkę zawierającą polskie słowo i wybrane tłumaczenie.
- Serwer przypisuje `user_id` na podstawie uwierzytelnionej sesji; klient nie wybiera właściciela rekordu.
- Zapis kilku znaczeń wymaga kilku osobnych operacji utworzenia fiszki.

### 6.4 Zarządzanie fiszkami

- Użytkownik może wyświetlić wyłącznie swoje fiszki.
- Użytkownik może zmienić polskie słowo i angielskie tłumaczenie swojej fiszki.
- Użytkownik może usunąć własną fiszkę po jawnej akcji.
- Użytkownik nie może odczytać, zmodyfikować ani usunąć fiszki należącej do innego użytkownika.
- Puste polskie lub angielskie wartości nie mogą zostać zapisane.

## 7. Reguły biznesowe

- Jedna fiszka reprezentuje jedną parę znaczeniową polski → angielski.
- Trzy propozycje tłumaczenia to maksymalny limit, a nie docelowa liczba wyników.
- Propozycje tłumaczeń są tymczasowe do momentu wyboru i potwierdzenia przez użytkownika.
- Samo wygenerowanie tłumaczeń nigdy nie zapisuje fiszki.
- Fiszki są prywatne i zawsze należą do uwierzytelnionego użytkownika.
- Własność fiszki jest egzekwowana również w bazie danych przez Row Level Security, a nie wyłącznie przez filtrowanie w UI lub API.

## 8. Poza zakresem MVP

- wymowa audio,
- transkrypcja fonetyczna,
- przykładowe zdania,
- poziomy CEFR,
- spaced repetition,
- quizy,
- statystyki nauki,
- gamifikacja i serie aktywności,
- import wielu słów naraz,
- import PDF lub innych dokumentów,
- natywne aplikacje mobilne,
- współdzielenie fiszek pomiędzy użytkownikami.

## 9. Kryteria akceptacji

MVP jest kompletne, gdy wszystkie poniższe warunki są spełnione:

1. Nowy użytkownik może się zarejestrować i uzyskać dostęp do chronionego obszaru aplikacji.
2. Istniejący użytkownik może się zalogować i wylogować.
3. Niezalogowany użytkownik nie może użyć chronionej funkcjonalności fiszek.
4. Wysłanie jednego poprawnego polskiego słowa daje od jednej do trzech unikalnych propozycji po angielsku.
5. Jeśli usługa tłumaczeniowa zwróci tylko jedną użyteczną propozycję, aplikacja pozostawia wynik jednoelementowy.
6. Użytkownik może wybrać jedno tłumaczenie i zapisać dokładnie jedną fiszkę.
7. Zapisany rekord zawiera polskie słowo, angielskie tłumaczenie i identyfikator aktualnego użytkownika.
8. Użytkownik może listować, edytować i usuwać własne fiszki.
9. RLS blokuje odczyt i zapis danych innych użytkowników również przy próbie ominięcia UI.
10. Nieprawidłowe wejście i błędy usługi tłumaczeniowej kończą się kontrolowanym błędem bez częściowego zapisu fiszki.
11. Automatyczny test end-to-end pokrywa logowanie, wybór tłumaczenia, utworzenie fiszki, listę, edycję i usunięcie z kontrolowaną odpowiedzią usługi tłumaczeniowej.
12. CI instaluje zależności, generuje typy Astro, uruchamia kontrole jakości, testy i build produkcyjny.

## 10. Kryteria sukcesu pierwszej wersji

- Główny przepływ działa bez ręcznej ingerencji w bazę danych.
- Nie jest znany defekt umożliwiający dostęp do fiszek innego użytkownika.
- Test end-to-end głównego przepływu przechodzi stabilnie w kontrolowanym środowisku.
- Lint, testy i build produkcyjny są częścią CI.
- Żadna funkcja spoza zakresu MVP nie jest potrzebna do podstawowego użycia aplikacji.
