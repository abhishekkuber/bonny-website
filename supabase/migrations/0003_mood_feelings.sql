-- The mood flower is now a pie chart of one set of percentages per day.
-- moods still has exactly one row per (day, author): saving again overwrites it.
--
-- feelings: {"joy":32,"calm":20,"sadness":10,"anxiety":18,"frustration":5,"tenderness":15}
--           whole numbers adding up to 100. NULL = nothing was read by Jev that day.
-- Month history redraws every flower from these numbers, so nothing else is stored.
--
-- The per-sentence `flower` column from 0002 is superseded, so it is dropped.

alter table public.moods
  add column if not exists feelings jsonb check (feelings is null or jsonb_typeof(feelings) = 'object');

alter table public.moods drop column if exists flower;
