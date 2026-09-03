-- Title-case every stored name, and keep it that way.
--
-- The app formats names when it displays them, but not everywhere: the email
-- helpers just split on a space, so someone who signed up as "yassine" read
-- "Yassine" on their own profile and "yassine" in every email Jibly sent
-- about them. The code side is fixed; this fixes the values already in the
-- table, and stops the next one arriving lowercase.
--
-- initcap() matches formatName() closely enough for names: it uppercases the
-- first letter of each word and lowercases the rest, so both "yassine" and
-- "YASSINE" become "Yassine". Where they differ is particles — formatName()
-- keeps "El" capitalised, initcap() does too. Hyphens are word boundaries in
-- initcap, so "marie-claire" becomes "Marie-Claire".

update public.profiles
set full_name = initcap(full_name)
where full_name is not null
  and full_name <> initcap(full_name);

-- Keep it true. The profile form and the signup page both normalise now, but
-- a name can also arrive from an OAuth provider, a dashboard edit, or a script
-- — none of which pass through that code.
create or replace function public.normalise_full_name()
returns trigger
language plpgsql
as $$
begin
  if new.full_name is not null then
    new.full_name := initcap(new.full_name);
  end if;
  return new;
end;
$$;

drop trigger if exists profiles_normalise_full_name on public.profiles;
create trigger profiles_normalise_full_name
before insert or update of full_name on public.profiles
for each row execute function public.normalise_full_name();

-- Check: nothing should come back.
select id, full_name
from public.profiles
where full_name is not null and full_name <> initcap(full_name);
