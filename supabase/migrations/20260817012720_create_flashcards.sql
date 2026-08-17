create table public.flashcards (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  polish text not null,
  english text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint flashcards_polish_not_blank check (polish ~ '[^[:space:]]'),
  constraint flashcards_english_not_blank check (english ~ '[^[:space:]]')
);

create index flashcards_user_id_created_at_idx
  on public.flashcards (user_id, created_at desc);

create function public.set_flashcards_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger set_flashcards_updated_at
before update on public.flashcards
for each row
execute function public.set_flashcards_updated_at();

alter table public.flashcards enable row level security;

revoke all on table public.flashcards from anon;
grant select, insert, update, delete on table public.flashcards to authenticated;

create policy "Authenticated users can select their own flashcards"
on public.flashcards
for select
to authenticated
using ((select auth.uid()) = user_id);

create policy "Authenticated users can insert their own flashcards"
on public.flashcards
for insert
to authenticated
with check ((select auth.uid()) = user_id);

create policy "Authenticated users can update their own flashcards"
on public.flashcards
for update
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create policy "Authenticated users can delete their own flashcards"
on public.flashcards
for delete
to authenticated
using ((select auth.uid()) = user_id);
