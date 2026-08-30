alter table public.flashcards
  add constraint flashcards_polish_single_word
  check (btrim(polish) !~ '[[:space:]]');
