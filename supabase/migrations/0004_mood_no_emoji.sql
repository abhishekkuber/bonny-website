-- The emoji picker is gone: the flower is the mood. Keep the column (old rows may
-- have a value) but stop requiring one, so new saves can leave it empty.

alter table public.moods alter column mood drop not null;
