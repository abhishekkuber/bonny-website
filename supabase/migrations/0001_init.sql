-- bonny: initial schema.
-- Paste into Supabase Dashboard -> SQL Editor -> Run. Safe to read top to bottom.
--
-- Model: exactly two people (rows in `profiles`). Everyone signs in anonymously,
-- then proves who they are once by redeeming a single-use invite code.
-- RLS: a session can touch data only if its user id is in `profiles`.
--
-- Adding a feature later = a new migration file (0002_*.sql) that copies the
-- "standard table" pattern used below. Never edit this file after running it.

-- ---------------------------------------------------------------- helpers ---

create or replace function public.set_updated_at() returns trigger
language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

-- ---------------------------------------------------------------- profiles ---

create table public.profiles (
  id         uuid primary key references auth.users(id) on delete cascade,
  role       text not null unique check (role in ('me', 'her')),
  nickname   text not null,
  city       text,
  timezone   text,
  created_at timestamptz not null default now()
);

-- True when the current session belongs to one of the two of you.
-- security definer so policies can call it without recursing into profiles' own RLS.
create or replace function public.is_member() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles where id = auth.uid());
$$;

alter table public.profiles enable row level security;
create policy "members read profiles" on public.profiles
  for select using (public.is_member());
create policy "update own profile" on public.profiles
  for update using (id = auth.uid()) with check (id = auth.uid());
-- no insert/delete policy: rows are created only by redeem_invite().

-- ----------------------------------------------------------------- invites ---

create table public.invites (
  code       text primary key,
  role       text not null check (role in ('me', 'her')),
  claimed_by uuid references auth.users(id),
  claimed_at timestamptz,
  created_at timestamptz not null default now()
);
alter table public.invites enable row level security;
-- no policies at all: the API can never read or write invites directly.

-- Run from the SQL editor to mint a code:  select public.create_invite('her');
create or replace function public.create_invite(p_role text) returns text
language plpgsql security definer set search_path = public as $$
declare v_code text := replace(gen_random_uuid()::text, '-', '');
begin
  insert into public.invites (code, role) values (v_code, p_role);
  return v_code;
end $$;
revoke all on function public.create_invite(text) from public, anon, authenticated;

-- Called by the browser after anonymous sign-in. Returns the claimed role.
create or replace function public.redeem_invite(p_code text) returns text
language plpgsql security definer set search_path = public as $$
declare
  v_uid  uuid := auth.uid();
  v_role text;
begin
  if v_uid is null then
    raise exception 'not signed in';
  end if;

  -- already one of us: nothing to do
  select role into v_role from public.profiles where id = v_uid;
  if found then
    return v_role;
  end if;

  update public.invites
     set claimed_by = v_uid, claimed_at = now()
   where code = p_code and claimed_by is null
  returning role into v_role;

  if v_role is null then
    raise exception 'invalid or already used invite';
  end if;

  insert into public.profiles (id, role, nickname)
  values (v_uid, v_role, case v_role when 'me' then 'kubie' else 'bonny' end);

  return v_role;
end $$;
revoke all on function public.redeem_invite(text) from public, anon;
grant execute on function public.redeem_invite(text) to authenticated;

-- ---------------------------------------------------------- post-it wall ---
-- Standard table pattern: author_id defaults to the caller, so the client
-- never sends it; anyone in the couple can read; only the author can delete.

create table public.notes (
  id         uuid primary key default gen_random_uuid(),
  author_id  uuid not null default auth.uid() references public.profiles(id),
  body       text not null check (char_length(body) between 1 and 500),
  color      text not null default 'yellow',
  x          real not null default 0,
  y          real not null default 0,
  rotation   real not null default 0,
  pinned     boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger notes_updated before update on public.notes
  for each row execute function public.set_updated_at();

alter table public.notes enable row level security;
create policy "members read notes"   on public.notes for select using (public.is_member());
create policy "members add notes"    on public.notes for insert with check (public.is_member() and author_id = auth.uid());
create policy "members move notes"   on public.notes for update using (public.is_member()) with check (public.is_member());
create policy "author deletes notes" on public.notes for delete using (author_id = auth.uid());

-- ---------------------------------------------------------- daily question ---

create table public.question_bank (
  id         uuid primary key default gen_random_uuid(),
  text       text not null unique,
  category   text,
  active     boolean not null default true,
  author_id  uuid references public.profiles(id) default auth.uid(),
  created_at timestamptz not null default now()
);
alter table public.question_bank enable row level security;
create policy "members read questions" on public.question_bank for select using (public.is_member());
create policy "members add questions"  on public.question_bank for insert with check (public.is_member());

create table public.daily_questions (
  day         date primary key,
  question_id uuid not null references public.question_bank(id)
);
alter table public.daily_questions enable row level security;
create policy "members read daily" on public.daily_questions for select using (public.is_member());
-- writes go through ensure_daily_question() only.

-- Picks today's question (UTC day) once, race-free, preferring unused ones.
create or replace function public.ensure_daily_question() returns public.daily_questions
language plpgsql security definer set search_path = public as $$
declare
  v_day date := (now() at time zone 'utc')::date;
  v_row public.daily_questions;
begin
  if not public.is_member() then
    raise exception 'not allowed';
  end if;

  select * into v_row from public.daily_questions where day = v_day;
  if found then return v_row; end if;

  insert into public.daily_questions (day, question_id)
  select v_day, q.id
    from public.question_bank q
   where q.active
   order by exists (select 1 from public.daily_questions d where d.question_id = q.id), random()
   limit 1
  on conflict (day) do nothing;

  select * into v_row from public.daily_questions where day = v_day;
  return v_row;
end $$;
revoke all on function public.ensure_daily_question() from public, anon;
grant execute on function public.ensure_daily_question() to authenticated;

create table public.answers (
  id         uuid primary key default gen_random_uuid(),
  day        date not null references public.daily_questions(day),
  author_id  uuid not null default auth.uid() references public.profiles(id),
  body       text not null check (char_length(body) between 1 and 2000),
  created_at timestamptz not null default now(),
  unique (day, author_id)
);

-- Reveal rule: you see her answer only once you've posted your own for that day.
-- (function, not an inline subquery, to avoid "infinite recursion in policy")
create or replace function public.has_answered(p_day date) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.answers where day = p_day and author_id = auth.uid());
$$;

alter table public.answers enable row level security;
create policy "read own, or both once you answered" on public.answers
  for select using (public.is_member() and (author_id = auth.uid() or public.has_answered(day)));
create policy "members answer once" on public.answers
  for insert with check (public.is_member() and author_id = auth.uid());
create policy "edit own answer" on public.answers
  for update using (author_id = auth.uid()) with check (author_id = auth.uid());

-- ------------------------------------------------------------ this or that ---

create table public.prompts (
  id         uuid primary key default gen_random_uuid(),
  option_a   text not null,
  option_b   text not null,
  category   text,
  author_id  uuid references public.profiles(id) default auth.uid(),
  created_at timestamptz not null default now(),
  unique (option_a, option_b)
);
alter table public.prompts enable row level security;
create policy "members read prompts" on public.prompts for select using (public.is_member());
create policy "members add prompts"  on public.prompts for insert with check (public.is_member());

create table public.prompt_votes (
  prompt_id  uuid not null references public.prompts(id) on delete cascade,
  author_id  uuid not null default auth.uid() references public.profiles(id),
  choice     text not null check (choice in ('a', 'b')),
  created_at timestamptz not null default now(),
  primary key (prompt_id, author_id)
);

create or replace function public.has_voted(p_prompt uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.prompt_votes where prompt_id = p_prompt and author_id = auth.uid());
$$;

alter table public.prompt_votes enable row level security;
create policy "read own, or both once you voted" on public.prompt_votes
  for select using (public.is_member() and (author_id = auth.uid() or public.has_voted(prompt_id)));
create policy "members vote" on public.prompt_votes
  for insert with check (public.is_member() and author_id = auth.uid());
create policy "change own vote" on public.prompt_votes
  for update using (author_id = auth.uid()) with check (author_id = auth.uid());

-- ------------------------------------------------------------------- moods ---

create table public.moods (
  id         uuid primary key default gen_random_uuid(),
  author_id  uuid not null default auth.uid() references public.profiles(id),
  day        date not null default (now() at time zone 'utc')::date,
  mood       text not null check (char_length(mood) between 1 and 40),
  note       text check (char_length(note) <= 500),
  created_at timestamptz not null default now(),
  unique (day, author_id)
);
alter table public.moods enable row level security;
create policy "members read moods" on public.moods for select using (public.is_member());
create policy "members log mood"   on public.moods for insert with check (public.is_member() and author_id = auth.uid());
create policy "edit own mood"      on public.moods for update using (author_id = auth.uid()) with check (author_id = auth.uid());
create policy "delete own mood"    on public.moods for delete using (author_id = auth.uid());

-- ------------------------------------------------- games (generic, reusable) ---
-- `matches`: any turn-based game. `state` is whatever that game needs (board,
-- hands, drawing strokes...), so new games need no schema change.

create table public.matches (
  id         uuid primary key default gen_random_uuid(),
  game       text not null,
  state      jsonb not null default '{}',
  turn_id    uuid references public.profiles(id),
  status     text not null default 'active' check (status in ('active', 'won', 'draw', 'abandoned')),
  winner_id  uuid references public.profiles(id),
  created_by uuid not null default auth.uid() references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index matches_game_status on public.matches (game, status);
create trigger matches_updated before update on public.matches
  for each row execute function public.set_updated_at();

alter table public.matches enable row level security;
create policy "members read matches"   on public.matches for select using (public.is_member());
create policy "members start matches"  on public.matches for insert with check (public.is_member() and created_by = auth.uid());
create policy "members play matches"   on public.matches for update using (public.is_member()) with check (public.is_member());
create policy "creator deletes match"  on public.matches for delete using (created_by = auth.uid());

-- `scores`: for real-time games (kiss catcher etc.): high-score rivalry.
create table public.scores (
  id         uuid primary key default gen_random_uuid(),
  game       text not null,
  author_id  uuid not null default auth.uid() references public.profiles(id),
  score      integer not null,
  meta       jsonb not null default '{}',
  created_at timestamptz not null default now()
);
create index scores_game_score on public.scores (game, score desc);
alter table public.scores enable row level security;
create policy "members read scores" on public.scores for select using (public.is_member());
create policy "members add scores"  on public.scores for insert with check (public.is_member() and author_id = auth.uid());

-- ---------------------------------------------------------------------- kv ---
-- Small shared settings: 'next_visit' -> {"date":"2026-12-20"}, etc.

create table public.kv (
  key        text primary key,
  value      jsonb not null,
  updated_by uuid references public.profiles(id) default auth.uid(),
  updated_at timestamptz not null default now()
);
create trigger kv_updated before update on public.kv
  for each row execute function public.set_updated_at();
alter table public.kv enable row level security;
create policy "members read kv"   on public.kv for select using (public.is_member());
create policy "members write kv"  on public.kv for insert with check (public.is_member());
create policy "members update kv" on public.kv for update using (public.is_member()) with check (public.is_member());
create policy "members delete kv" on public.kv for delete using (public.is_member());

-- ----------------------------------------------------------------- storage ---
-- Private bucket for photos (photo games, memories). Files are read via signed URLs.

insert into storage.buckets (id, name, public)
values ('photos', 'photos', false)
on conflict (id) do nothing;

create policy "members read photos" on storage.objects
  for select using (bucket_id = 'photos' and public.is_member());
create policy "members upload photos" on storage.objects
  for insert with check (bucket_id = 'photos' and public.is_member());
create policy "members delete photos" on storage.objects
  for delete using (bucket_id = 'photos' and public.is_member());

-- ---------------------------------------------------------------- realtime ---
alter publication supabase_realtime add table public.notes, public.matches, public.moods, public.answers;
