-- Account recovery: a fresh invite code can take over a role that already exists.
--
-- Why: a browser session belongs to one site address and one browser. Moving from
-- localhost to the live site, clearing browser data, or getting a new phone makes you
-- a new anonymous session, and the old rule ("a role can only be claimed once") locked
-- you out of your own data.
--
-- Now redeem_invite() moves the existing profile, with everything it owns (notes,
-- moods, answers, votes, scores, games), to the new session. The only way in is still
-- a single-use code that you mint yourself in the SQL editor:
--
--     select public.create_invite('her');

-- 1. Foreign keys that point at profiles(id) must follow the id when it changes.
do $$
declare r record;
begin
  for r in
    select conrelid::regclass as tbl, conname, pg_get_constraintdef(oid) as def
    from pg_constraint
    where contype = 'f' and confrelid = 'public.profiles'::regclass
  loop
    if r.def !~* 'on update' then
      execute format('alter table %s drop constraint %I', r.tbl, r.conname);
      execute format('alter table %s add constraint %I %s on update cascade', r.tbl, r.conname, r.def);
    end if;
  end loop;
end $$;

-- 2. redeem_invite: same as before, plus "role already taken" moves the profile.
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

  -- this role belongs to an older session: hand it (and all its data) to this one
  update public.profiles set id = v_uid where role = v_role;

  if not found then
    insert into public.profiles (id, role, nickname)
    values (v_uid, v_role, case v_role when 'me' then 'kubie' else 'bonny' end);
  end if;

  return v_role;
end $$;
