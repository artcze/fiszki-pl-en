begin;

create extension if not exists pgtap with schema extensions;

select plan(15);

insert into auth.users (
  id,
  email,
  encrypted_password,
  email_confirmed_at,
  raw_app_meta_data,
  raw_user_meta_data,
  aud,
  role
)
values
  (
    '11111111-1111-4111-8111-111111111111',
    'flashcards-owner-one@example.test',
    '',
    now(),
    '{}',
    '{}',
    'authenticated',
    'authenticated'
  ),
  (
    '22222222-2222-4222-8222-222222222222',
    'flashcards-owner-two@example.test',
    '',
    now(),
    '{}',
    '{}',
    'authenticated',
    'authenticated'
  );

insert into public.flashcards (id, user_id, polish, english)
values (
  '22222222-0000-4000-8000-000000000001',
  '22222222-2222-4222-8222-222222222222',
  'zamek',
  'castle'
);

set local role authenticated;
select set_config(
  'request.jwt.claims',
  '{"sub":"11111111-1111-4111-8111-111111111111","role":"authenticated"}',
  true
);

select lives_ok(
  $$
    insert into public.flashcards (id, user_id, polish, english, updated_at)
    values (
      '11111111-0000-4000-8000-000000000001',
      '11111111-1111-4111-8111-111111111111',
      'dom',
      'house',
      '2000-01-01 00:00:00+00'
    );
  $$,
  'an authenticated user can insert their own flashcard'
);

select results_eq(
  $$
    select id
    from public.flashcards
    where id = '11111111-0000-4000-8000-000000000001'
  $$,
  $$ values ('11111111-0000-4000-8000-000000000001'::uuid) $$,
  'an authenticated user can select their own flashcard'
);

select is_empty(
  $$
    select id
    from public.flashcards
    where id = '22222222-0000-4000-8000-000000000001'
  $$,
  'another user flashcard is hidden from select'
);

select throws_ok(
  $$
    insert into public.flashcards (user_id, polish, english)
    values ('22222222-2222-4222-8222-222222222222', 'kot', 'cat');
  $$,
  '42501',
  'new row violates row-level security policy for table "flashcards"',
  'an authenticated user cannot forge ownership on insert'
);

select results_eq(
  $$
    update public.flashcards
    set english = 'home'
    where id = '11111111-0000-4000-8000-000000000001'
    returning english
  $$,
  $$ values ('home'::text) $$,
  'an authenticated user can update their own flashcard'
);

select ok(
  (
    select updated_at > '2000-01-01 00:00:00+00'::timestamptz
    from public.flashcards
    where id = '11111111-0000-4000-8000-000000000001'
  ),
  'updated_at changes when a flashcard is updated'
);

select is_empty(
  $$
    update public.flashcards
    set english = 'lock'
    where id = '22222222-0000-4000-8000-000000000001'
    returning id
  $$,
  'an authenticated user cannot update another user flashcard'
);

select throws_ok(
  $$
    update public.flashcards
    set user_id = '22222222-2222-4222-8222-222222222222'
    where id = '11111111-0000-4000-8000-000000000001';
  $$,
  '42501',
  'new row violates row-level security policy for table "flashcards"',
  'an authenticated user cannot transfer flashcard ownership'
);

select is_empty(
  $$
    delete from public.flashcards
    where id = '22222222-0000-4000-8000-000000000001'
    returning id
  $$,
  'an authenticated user cannot delete another user flashcard'
);

select results_eq(
  $$
    delete from public.flashcards
    where id = '11111111-0000-4000-8000-000000000001'
    returning id
  $$,
  $$ values ('11111111-0000-4000-8000-000000000001'::uuid) $$,
  'an authenticated user can delete their own flashcard'
);

select throws_ok(
  $$
    insert into public.flashcards (user_id, polish, english)
    values ('11111111-1111-4111-8111-111111111111', '   ', 'word');
  $$,
  '23514',
  'new row for relation "flashcards" violates check constraint "flashcards_polish_not_blank"',
  'blank or whitespace-only Polish text is rejected'
);

select throws_ok(
  $$
    insert into public.flashcards (user_id, polish, english)
    values ('11111111-1111-4111-8111-111111111111', 'słowo', E' \t\n ');
  $$,
  '23514',
  'new row for relation "flashcards" violates check constraint "flashcards_english_not_blank"',
  'blank or whitespace-only English text is rejected'
);

select throws_ok(
  $$
    insert into public.flashcards (user_id, polish, english)
    values ('11111111-1111-4111-8111-111111111111', repeat('p', 256), 'word');
  $$,
  '23514',
  'new row for relation "flashcards" violates check constraint "flashcards_polish_max_length"',
  'Polish text longer than 255 characters is rejected'
);

select throws_ok(
  $$
    insert into public.flashcards (user_id, polish, english)
    values ('11111111-1111-4111-8111-111111111111', 'słowo', repeat('e', 256));
  $$,
  '23514',
  'new row for relation "flashcards" violates check constraint "flashcards_english_max_length"',
  'English text longer than 255 characters is rejected'
);

reset role;
set local role anon;

select throws_ok(
  $$ select * from public.flashcards $$,
  '42501',
  'permission denied for table flashcards',
  'anonymous users cannot access flashcards'
);

select * from finish();
rollback;
