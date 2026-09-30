-- Dummy moods to try out the calendar. Paste into Supabase -> SQL Editor -> Run.
-- Needs both of you to have joined (rows in public.profiles), and migrations 0002-0004 already run.
--
-- Fills the last 25 days for each of you, skipping a few days here and there.
-- Real entries are never touched (on conflict do nothing).
-- Every dummy row's words start with "[demo]", so you can remove them all:
--
--     delete from public.moods where note like '[demo]%';

with pats(i, f) as (values
  (0, '{"joy":45,"calm":20,"sadness":0,"anxiety":5,"frustration":0,"tenderness":30}'::jsonb),
  (1, '{"joy":10,"calm":15,"sadness":35,"anxiety":30,"frustration":5,"tenderness":5}'::jsonb),
  (2, '{"joy":5,"calm":60,"sadness":10,"anxiety":5,"frustration":0,"tenderness":20}'::jsonb),
  (3, '{"joy":20,"calm":5,"sadness":5,"anxiety":15,"frustration":40,"tenderness":15}'::jsonb),
  (4, '{"joy":30,"calm":10,"sadness":0,"anxiety":0,"frustration":0,"tenderness":60}'::jsonb),
  (5, '{"joy":15,"calm":25,"sadness":25,"anxiety":25,"frustration":5,"tenderness":5}'::jsonb),
  (6, '{"joy":55,"calm":25,"sadness":0,"anxiety":0,"frustration":5,"tenderness":15}'::jsonb),
  (7, '{"joy":0,"calm":10,"sadness":50,"anxiety":20,"frustration":10,"tenderness":10}'::jsonb)
),
days as (
  select g, ((now() at time zone 'utc')::date - g) as day from generate_series(0, 24) g
),
people as (
  select id, (role = 'her')::int as her from public.profiles
)
insert into public.moods (author_id, day, note, feelings)
select
  p.id,
  d.day,
  '[demo] a made-up day for testing the calendar.',
  (select f from pats where i = (d.g * 5 + p.her * 3) % 8)
from days d
cross join people p
where (d.g + p.her) % 6 <> 5   -- skip some days so the calendar has gaps
on conflict (day, author_id) do nothing;
