-- Make the "verified" badge mean something.
--
-- Twelve places in the app decide whether to show a verification badge by
-- reading profiles.verification_level. NOTHING writes that column. The identity
-- webhook says so in its own comments: it sets identity_verified_at and
-- deliberately leaves verification_level alone, "to be done via a separate,
-- explicit migration" — which was never written.
--
-- So the badge came from whatever was seeded, and revoking a fake
-- identity_verified_at changed nothing on screen. Worse than the invented star
-- ratings: a rating is an opinion, a verification badge is a factual claim,
-- shown at the moment someone decides whether to hand a stranger their parcel.
--
-- Derived from identity_verified_at, which is the one value that is real and
-- webhook-maintained. Every read site becomes correct without touching the UI.
--
-- 'email' and 'trusted' are left out on purpose. Every account has a confirmed
-- e-mail (Supabase requires it at signup), so 'email' distinguishes nobody. And
-- nothing has ever defined what earns 'trusted' — when it does, promote people
-- here deliberately rather than letting a seed value speak for them.

create or replace function public.refresh_verification_level()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  new.verification_level :=
    case when new.identity_verified_at is not null then 'id_verified'
         else 'none'
    end;
  return new;
end;
$$;

drop trigger if exists profiles_derive_verification_level on public.profiles;
create trigger profiles_derive_verification_level
before insert or update of identity_verified_at, verification_level
on public.profiles
for each row execute function public.refresh_verification_level();

-- ---------------------------------------------------------------------------
-- Revoke the identity verifications that never happened
-- ---------------------------------------------------------------------------
-- Checked against the live Stripe Identity sessions on 2026-09-03: exactly one
-- account has a genuinely verified session. Everything else carrying the stamp
-- got it some other way — seed data, or a code path that predates the webhook.
--
-- An explicit list rather than a rule inferred from the columns: the columns
-- are the thing that is wrong, so they cannot be the test. Stripe is the
-- source of truth here, and this is what Stripe says.
--
-- ADD TO THIS LIST rather than rerunning blind if you ever repeat the exercise.

update public.profiles
set identity_verified_at = null,
    identity_verification_status = null
where deleted_at is null
  and identity_verified_at is not null
  and id not in ('9f466b65-e169-43b5-950c-56dbabd74f73');

-- Recompute the level for every row, including the ones just revoked. The
-- trigger fires on update, so touching the column is enough.
update public.profiles set verification_level = verification_level;

-- Check: badge and identity must now agree on every line.
select verification_level,
       count(*) as profils,
       count(*) filter (where identity_verified_at is not null) as reellement_verifies
from public.profiles
where deleted_at is null
group by verification_level;
-- Expect: id_verified rows all have a date, none rows have none.
