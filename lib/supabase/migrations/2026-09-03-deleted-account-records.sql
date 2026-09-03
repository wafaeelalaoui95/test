-- Keep a minimal record of who a deleted account belonged to.
--
-- WHY. Account deletion anonymises the profile, which is right: the row is
-- publicly readable and the person asked to disappear. But it also left Jibly
-- unable to identify someone who behaves badly and then deletes — and unable
-- to meet the AML retention duty that applies to a platform holding third
-- party funds.
--
-- The right to erasure is not absolute. GDPR Art. 17(3) keeps data that is
-- necessary for the establishment or defence of legal claims, and anti-money
-- laundering rules positively REQUIRE keeping KYC records, five years being
-- the usual period. This table is that record and nothing more: enough to
-- identify a person if a dispute or an authority requires it, and no more than
-- that.
--
-- THIS MUST BE IN THE PRIVACY POLICY before it holds anyone's data: what is
-- kept, why, for how long, and who can reach it.

create table if not exists public.deleted_account_records (
  user_id                  uuid primary key,
  -- Identity as it stood at deletion. The profile row keeps none of this.
  full_name                text,
  email                    text,
  phone                    text,
  -- The two pointers that make a person findable at Stripe, where the verified
  -- name, date of birth, address and document live under Stripe's own
  -- retention. Losing these was the real gap: the Connect account survived on
  -- profiles, but the Identity session id was being nulled.
  identity_verification_id text,
  stripe_account_id        text,
  deleted_at               timestamptz not null default now(),
  -- Not "keep forever". Five years from deletion is the usual AML period;
  -- after that this row has no lawful basis and should go.
  purge_after              timestamptz not null default (now() + interval '5 years')
);

-- No client may read this, ever. Not the person it describes, not another
-- user, not the anon key. Only the service role, which bypasses RLS, and so
-- only server code that already holds the service key.
alter table public.deleted_account_records enable row level security;

drop policy if exists deleted_account_records_no_access on public.deleted_account_records;
create policy deleted_account_records_no_access
  on public.deleted_account_records
  for all
  using (false)
  with check (false);

revoke all on public.deleted_account_records from anon, authenticated;

comment on table public.deleted_account_records is
  'Minimal identity record kept after account deletion, for legal claims and AML retention. Service-role only. Purge rows past purge_after.';

-- ---------------------------------------------------------------------------
-- Purging, when the period runs out
-- ---------------------------------------------------------------------------
-- Run periodically. There is no scheduler wired up, so this is a manual step
-- for now — put a reminder somewhere, because a retention period nobody
-- enforces is just a hoard.
--
--   delete from public.deleted_account_records where purge_after < now();

-- ---------------------------------------------------------------------------
-- Stop writing the deletion marker into the name
-- ---------------------------------------------------------------------------
-- deleted_at already says the account is gone. Putting 'Utilisateur supprimé'
-- in full_name as well was redundant, destroyed the value, and hardcoded
-- French into a bilingual product. The UI now derives the label from
-- deleted_at; the column goes back to null.
update public.profiles
set full_name = null
where deleted_at is not null
  and full_name in ('Utilisateur supprimé', 'Deleted user');

-- ---------------------------------------------------------------------------
-- Backfill from auth metadata, then clear it
-- ---------------------------------------------------------------------------
-- The old deletion scrambled auth.users.email but left the sign-up payload in
-- raw_user_meta_data, which still held the original address and full name. So
-- accounts deleted before this migration ARE recoverable — and, less happily,
-- were never really erased.
--
-- Recover what is there:

update public.deleted_account_records d
set full_name = coalesce(d.full_name, u.raw_user_meta_data->>'full_name'),
    email     = coalesce(d.email,     u.raw_user_meta_data->>'email')
from auth.users u
where u.id = d.user_id;

-- Then remove it from the place that has no purge date, so the governed row
-- above is the only copy left. New deletions do this in the route.

update auth.users
set raw_user_meta_data = raw_user_meta_data
      - 'full_name' - 'name' - 'email' - 'phone' - 'avatar_url' - 'picture'
where id in (select user_id from public.deleted_account_records);

-- Check: names and emails present here, and gone from auth.
select d.user_id, d.full_name, d.email, d.purge_after::date,
       u.raw_user_meta_data
from public.deleted_account_records d
join auth.users u on u.id = d.user_id;
