-- Mood flower: each day's writing is stitched into a flower.
-- `flower` holds one entry per sentence: [{ s, top, strength, scores, src }].
-- `note` (already there) holds the full text; longer limit for a proper journal entry.
-- Both of you can read each other's moods (existing policy), words included.

alter table public.moods
  add column if not exists flower jsonb not null default '[]';

alter table public.moods drop constraint if exists moods_note_check;
alter table public.moods add constraint moods_note_check check (char_length(note) <= 2000);
