# Dokumentacja bazowa projektu

Ten katalog jest kanonicznym źródłem dokumentacji projektu **Fiszki PL-EN** na potrzeby rozwoju MVP i certyfikacji 10xDevs 3.0.

## Kolejność czytania

1. [`prd.md`](prd.md) — problem, użytkownik, zakres MVP, wymagania i reguły biznesowe.
2. [`tech-stack.md`](tech-stack.md) — wybrany stack, granice techniczne i decyzje infrastrukturalne.
3. [`technical-spec.md`](technical-spec.md) — szczegółowy kontrakt implementacyjny aktualnego MVP.
4. [`roadmap.md`](roadmap.md) — zrealizowane przekroje funkcjonalne oraz pozostałe prace przed zgłoszeniem.
5. [`test-plan.md`](test-plan.md) — mapa ryzyk, kontrole jakości i powiązanie ryzyko → test.

## Zasada źródła prawdy

Dokumenty w `context/foundation/` są aktualnym źródłem prawdy. Pliki w `docs/` pozostają wyłącznie jako przekierowania kompatybilności dla wcześniejszych odnośników.

## Polityka językowa

- dokumentacja produktowa, certyfikacyjna i przeznaczona dla człowieka: **język polski**,
- identyfikatory w kodzie, nazwy endpointów, funkcji, typów i komunikaty techniczne: zgodnie z kodem, zwykle **język angielski**,
- `AGENTS.md` i `CLAUDE.md`: mogą pozostać po angielsku jako instrukcje operacyjne dla agentów, ale muszą wskazywać aktualne dokumenty z `context/foundation/`.

## Zakres certyfikacyjny

Dla 10xBuilder projekt powinien w czytelny sposób pokazywać:

- kontrolę dostępu i przypisanie zasobów do użytkownika,
- pełny CRUD dla głównego zasobu,
- logikę biznesową wykraczającą poza CRUD,
- dokumentację kontekstową,
- co najmniej jeden test adresujący zdefiniowane ryzyko oraz test głównego przepływu użytkownika.

Aktualny kod i testy realizują te elementy dla zasobu `flashcards`.
