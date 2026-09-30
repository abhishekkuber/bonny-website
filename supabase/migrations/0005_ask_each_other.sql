-- Daily question, take two: you write a question for each other, the other answers.
--
--   asks     one question per person per (UTC) day: "what's your favourite ...?"
--   replies  the other person's answer; exactly one per question
--
-- Replaces the random-question tables from 0001 (daily_questions, answers,
-- ensure_daily_question, has_answered). question_bank stays: it is now the pool
-- for the "need an idea?" button.

drop function if exists public.ensure_daily_question();
drop table if exists public.answers;
drop function if exists public.has_answered(date);
drop table if exists public.daily_questions;

-- ------------------------------------------------------------------- asks ---

create table public.asks (
  id         uuid primary key default gen_random_uuid(),
  day        date not null default (now() at time zone 'utc')::date,
  author_id  uuid not null default auth.uid() references public.profiles(id),
  text       text not null check (char_length(text) between 1 and 300),
  created_at timestamptz not null default now(),
  unique (day, author_id)
);

-- ---------------------------------------------------------------- replies ---

create table public.replies (
  id         uuid primary key default gen_random_uuid(),
  ask_id     uuid not null unique references public.asks(id) on delete cascade,
  author_id  uuid not null default auth.uid() references public.profiles(id),
  body       text not null check (char_length(body) between 1 and 2000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger replies_updated before update on public.replies
  for each row execute function public.set_updated_at();

-- security definer helpers, so policies can look at the other table without
-- tripping over its RLS
create or replace function public.has_reply(p_ask uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.replies where ask_id = p_ask);
$$;

create or replace function public.ask_author(p_ask uuid) returns uuid
language sql stable security definer set search_path = public as $$
  select author_id from public.asks where id = p_ask;
$$;

-- ------------------------------------------------------------------- RLS ---

alter table public.asks enable row level security;
create policy "members read asks" on public.asks for select using (public.is_member());
create policy "members ask" on public.asks
  for insert with check (public.is_member() and author_id = auth.uid());
-- you can reword or take back your question, until it has been answered
create policy "edit own unanswered ask" on public.asks
  for update using (author_id = auth.uid() and not public.has_reply(id))
  with check (author_id = auth.uid());
create policy "delete own unanswered ask" on public.asks
  for delete using (author_id = auth.uid() and not public.has_reply(id));

alter table public.replies enable row level security;
create policy "members read replies" on public.replies for select using (public.is_member());
-- only the other person answers, never the one who asked
create policy "answer the other's question" on public.replies
  for insert with check (
    public.is_member() and author_id = auth.uid() and public.ask_author(ask_id) <> auth.uid()
  );
create policy "edit own reply" on public.replies
  for update using (author_id = auth.uid()) with check (author_id = auth.uid());

alter publication supabase_realtime add table public.asks, public.replies;
