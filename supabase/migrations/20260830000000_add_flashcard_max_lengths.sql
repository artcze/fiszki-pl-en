alter table public.flashcards
  add constraint flashcards_polish_max_length check (char_length(polish) <= 255),
  add constraint flashcards_english_max_length check (char_length(english) <= 255);
