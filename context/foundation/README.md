# Dokumentacja bazowa projektu

Ten katalog jest kanonicznym źródłem dokumentacji projektu **Fiszki PL-EN** na potrzeby rozwoju MVP i certyfikacji 10xDevs 3.0.

## Kolejność czytania

1. [`shape-notes.md`](shape-notes.md) — rekonstrukcja potwierdzonych decyzji shapingowych; nie jest historyczną transkrypcją `/10x-shape`.
2. [`prd.md`](prd.md) — problem, użytkownik, zakres MVP, wymagania i reguły biznesowe.
3. [`tech-stack.md`](tech-stack.md) — wybrany stack i granice techniczne.
4. [`infrastructure.md`](infrastructure.md) — aktualny kontrakt infrastrukturalny, deployment, sekrety, rollback i granice automatyzacji.
5. [`technical-spec.md`](technical-spec.md) — szczegółowy kontrakt implementacyjny aktualnego MVP.
6. [`roadmap.md`](roadmap.md) — zrealizowane przekroje funkcjonalne oraz pozostałe prace przed zgłoszeniem.
7. [`test-plan.md`](test-plan.md) — mapa ryzyk, kontrole jakości i powiązanie ryzyko → test.
8. [`lessons.md`](lessons.md) — append-only rejestr powtarzalnych reguł wynikających z rzeczywistych doświadczeń projektu.

## Zasada źródła prawdy

Dokumenty w `context/foundation/` są aktualnym źródłem prawdy. Pliki w `docs/` pozostają wyłącznie jako przekierowania kompatybilności dla wcześniejszych odnośników.

`shape-notes.md` i początkowe wpisy w `lessons.md` zostały dodane retrospektywnie na podstawie potwierdzonych decyzji i historii repozytorium. Nie należy interpretować ich jako dowodu na wykonanie historycznej sesji lub review, których artefakty nie zostały zachowane.

## Polityka językowa

- dokumentacja produktowa, certyfikacyjna i przeznaczona dla człowieka: **język polski**,
- identyfikatory w kodzie, nazwy endpointów, funkcji, typów i komunikaty techniczne: zgodnie z kodem, zwykle **język angielski**,
- `AGENTS.md` i `CLAUDE.md`: mogą pozostać po angielsku jako instrukcje operacyjne dla agentów, ale muszą wskazywać aktualne dokumenty z `context/foundation/`.

## Lessons learned

`lessons.md` jest rejestrem append-only. Nowe lekcje należy dopisywać na końcu w formacie: **Context / Problem / Rule / Applies to**. Nie należy przepisywać wcześniejszych wpisów tylko po to, aby uporządkować historię.

## Zakres certyfikacyjny

Dla 10xBuilder projekt powinien w czytelny sposób pokazywać:

- kontrolę dostępu i przypisanie zasobów do użytkownika,
- pełny CRUD dla głównego zasobu,
- logikę biznesową wykraczającą poza CRUD,
- dokumentację kontekstową,
- co najmniej jeden test adresujący zdefiniowane ryzyko oraz test głównego przepływu użytkownika.

Aktualny kod i testy realizują te elementy dla zasobu `flashcards`.
