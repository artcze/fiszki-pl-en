# Lessons Learned

> Rejestr powtarzalnych reguł projektu. Pierwsze wpisy zostały utworzone retrospektywnie wyłącznie na podstawie potwierdzonych zmian w historii repozytorium. Nie rekonstruują nieistniejących rozmów ani review. Kolejne lekcje należy **dopisywać na końcu** bez porządkowania lub przepisywania wcześniejszych wpisów.

## Wymuszaj trwałe reguły domenowe na każdej granicy zapisu

- **Context**: Tworzenie i edycja fiszek oraz trwałe ograniczenia modelu `flashcards`.
- **Problem**: Reguła „polska strona fiszki zawiera dokładnie jedno słowo” wymagała późniejszego dopięcia jednocześnie w `POST`, `PATCH`, walidacji współdzielonej, testach API i constraintach PostgreSQL (`a8ae592`). Samo ograniczenie wejścia w głównym flow nie chroniło całego zasobu.
- **Rule**: Jeżeli reguła jest niezmiennikiem trwałego zasobu, egzekwuj ją we wspólnej walidacji serwerowej oraz — gdy to możliwe — w bazie danych. Dodawaj regresyjne testy dla wszystkich operacji zapisu, nie tylko dla pierwszego miejsca, w którym użytkownik wprowadza dane.
- **Applies to**: plan, implement, impl-review

## Waliduj dane uwierzytelniania na granicy serwera

- **Context**: Endpointy rejestracji i logowania oraz formularze uwierzytelniania.
- **Problem**: Jawna walidacja danych logowania musiała zostać dodana po stronie serwera (`760a9bb`), a późniejsze utwardzanie rejestracji rozszerzyło kontrakt hasła i potwierdzenia. Walidacja interfejsu nie jest granicą zaufania.
- **Rule**: Każde dane uwierzytelniania waliduj po stronie serwera przed wywołaniem dostawcy auth. Klient może poprawiać UX, ale nie może być jedynym miejscem egzekwowania wymagań bezpieczeństwa.
- **Applies to**: plan, implement, impl-review

## Kotwicz dowody QA w konkretnym stanie repozytorium

- **Context**: Roadmapa, Evidence Pack i dokumentacja certyfikacyjna zawierająca liczby testów, identyfikatory CI lub wynik pełnego QA.
- **Problem**: Wraz z kolejnymi poprawkami zmieniały się liczby testów i właściwy run CI, przez co dowody w dokumentacji były kilkukrotnie odświeżane (`acf7aec`, `764d534`, `99d08f2`, `1d63046`).
- **Rule**: Gdy dokumentujesz wynik QA, przypisz go do konkretnej daty i/lub commita oraz runu CI. Nie przedstawiaj zmiennych liczników jako ponadczasowej właściwości projektu; po zmianie kodu odśwież tylko miejsca, które faktycznie przechowują aktualny dowód.
- **Applies to**: plan, impl-review, all

## Utrzymuj jeden język dla treści skierowanej do użytkownika

- **Context**: Interfejs użytkownika oraz dokumentacja produktowa i certyfikacyjna.
- **Problem**: Lokalizacja wymagała kilku oddzielnych poprawek — m.in. flow auth, placeholderów e-mail i nagłówków dokumentacji (`0faa9bd`, `c8a4d46`, `860b87a`), co ujawniło ryzyko mieszania języków w różnych warstwach.
- **Rule**: Treści widoczne dla użytkownika oraz dokumentacja przeznaczona dla człowieka mają być po polsku. Identyfikatory kodu, nazwy API i techniczne symbole mogą pozostać po angielsku zgodnie z kodem.
- **Applies to**: plan, implement, impl-review

## Nie używaj uprzywilejowanego klucza Supabase w zwykłych żądaniach aplikacji

- **Context**: Konfiguracja Supabase, sekrety środowiskowe i ścieżki obsługujące zwykłe żądania użytkownika.
- **Problem**: Wymagania dla `SUPABASE_KEY` musiały zostać doprecyzowane w `.env.example` i `README.md` (`95e7d6e`), ponieważ klucz `service_role` omija RLS i byłby niezgodny z modelem bezpieczeństwa aplikacji.
- **Rule**: Do zwykłych żądań aplikacji używaj niskouprawnionego klucza publikowalnego/`anon` i egzekwuj własność przez sesję oraz RLS. Klucza `service_role` nie umieszczaj w normalnej ścieżce requestów użytkownika.
- **Applies to**: plan, implement, impl-review
