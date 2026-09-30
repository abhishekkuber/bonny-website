-- This or that: live updates, so the other person's pick shows up the moment they make it.
-- (Tables and the "you only see their vote after casting yours" rule are from 0001.
-- Realtime only delivers a vote to someone who is allowed to read it, so that rule holds.)

alter publication supabase_realtime add table public.prompts, public.prompt_votes;
