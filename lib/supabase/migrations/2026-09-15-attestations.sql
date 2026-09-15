-- What each party declared about a parcel, and when, and against which rules.
--
-- The question this table exists to answer is not a product question. It is:
-- "what did Jibly do to stop its platform being used to move illegal goods?",
-- asked by customs or by the police, possibly years after the trip, about a
-- booking nobody remembers.
--
-- A boolean on booking_intents cannot answer it. `user_certified_at` already
-- existed and recorded only that a box had been ticked — not what the box
-- said, not which prohibited-items list was in force, not what the parcel was
-- described as at that moment. Descriptions get edited. Policies get
-- rewritten. Translations get improved. Every one of those silently rewrites
-- the past unless the attestation carries its own copy of it.
--
-- So each row is self-contained: the sentence as rendered on the day, the
-- language it was read in, the policy version and digest, and a snapshot of
-- the parcel as it was then described. Reading one row tells you the whole
-- story without joining to anything that may since have changed.

create table if not exists public.booking_attestations (
  id                    uuid primary key default uuid_generate_v4(),

  -- What it is about. Kept even if the booking is later deleted: the evidence
  -- outliving the transaction is the entire point, so this is deliberately NOT
  -- a cascading foreign key.
  booking_intent_id     uuid not null,

  -- Who declared it. `on delete set null` rather than cascade for the same
  -- reason — a person closing their account must not erase a customs record,
  -- and account deletion already scrubs the profile itself.
  user_id               uuid references public.profiles(id) on delete set null,
  role                  text not null check (role in ('sender', 'traveler')),
  kind                  text not null check (kind in ('sender_certification', 'traveler_inspection')),

  -- THE DECLARATION, verbatim, as displayed. Not a key into a translations
  -- file: product copy is reworded for tone and shortened to fit a card, which
  -- is fine for a button and fatal for a sentence somebody is held to.
  statement_text        text not null check (length(statement_text) between 10 and 2000),
  statement_locale      text not null check (statement_locale in ('fr', 'en')),

  -- Which rules were in force. The digest is a checksum over the prohibited
  -- lists so that editing them without bumping the version becomes visible
  -- rather than silent — see lib/attestations.ts.
  policy_version        text not null,
  policy_digest         text not null,

  -- The parcel AS DESCRIBED AT THIS MOMENT. Snapshotted, not joined: the whole
  -- value of "accurately described" is that we can show what the description
  -- actually said when it was sworn to.
  item_category         text,
  item_title            text,
  item_description      text,
  item_photo_url        text,

  -- Where it came from. Weak on its own, corroborating together — this is the
  -- ordinary evidence trail of an electronic signature. PRIVACY: both are
  -- personal data under GDPR and belong in the privacy policy's retention
  -- section before this ships to real users.
  ip                    inet,
  user_agent            text,

  -- Server clock, never the browser's. A timestamp a client can choose is not
  -- a timestamp.
  created_at            timestamptz not null default now()
);

-- One attestation of each kind per booking. Makes the write idempotent — a
-- double-tap or a retried request cannot manufacture a second declaration —
-- and makes "has the traveller inspected this?" a single lookup.
create unique index if not exists booking_attestations_unique_kind_idx
  on public.booking_attestations (booking_intent_id, kind);

create index if not exists booking_attestations_user_idx
  on public.booking_attestations (user_id, created_at desc);

-- ---------------------------------------------------------------------------
-- Insert-only, server-written, readable by the two parties
-- ---------------------------------------------------------------------------
-- Evidence a user can write is not evidence. Every row is created by
-- /api/attestation with the service-role key, which stamps the time, resolves
-- the statement text itself and snapshots the parcel — none of it is taken
-- from the request body.
--
-- Reading is allowed to whoever declared it, so a person can see what they
-- signed. Nobody gets UPDATE or DELETE, including the parties.

alter table public.booking_attestations enable row level security;
revoke all on public.booking_attestations from anon, authenticated;
grant select on public.booking_attestations to authenticated;

drop policy if exists "attestations_select_own" on public.booking_attestations;
create policy "attestations_select_own" on public.booking_attestations
  for select using (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- Check 1: the evidence file for one booking. This is the query to run when
-- somebody asks. Replace the id.
-- ---------------------------------------------------------------------------
-- select
--   a.kind, a.role, a.created_at, a.statement_locale, a.statement_text,
--   a.policy_version, a.policy_digest,
--   a.item_category, a.item_title, a.item_description, a.item_photo_url,
--   a.ip, a.user_agent,
--   p.full_name
-- from public.booking_attestations a
-- left join public.profiles p on p.id = a.user_id
-- where a.booking_intent_id = '00000000-0000-0000-0000-000000000000'
-- order by a.created_at;

-- ---------------------------------------------------------------------------
-- Check 2: coverage. Any parcel that has actually been handed over without
-- both declarations on file is a hole in the story, and should be empty.
-- ---------------------------------------------------------------------------
select
  b.id                                      as booking,
  b.pickup_confirmed_at,
  b.item_title,
  exists (
    select 1 from public.booking_attestations a
    where a.booking_intent_id = b.id and a.kind = 'sender_certification'
  )                                         as sender_certified,
  exists (
    select 1 from public.booking_attestations a
    where a.booking_intent_id = b.id and a.kind = 'traveler_inspection'
  )                                         as traveler_inspected
from public.booking_intents b
where b.pickup_confirmed_at is not null
  and (
    not exists (
      select 1 from public.booking_attestations a
      where a.booking_intent_id = b.id and a.kind = 'sender_certification'
    )
    or not exists (
      select 1 from public.booking_attestations a
      where a.booking_intent_id = b.id and a.kind = 'traveler_inspection'
    )
  )
order by b.pickup_confirmed_at desc;

-- ---------------------------------------------------------------------------
-- Check 3: policy versions seen so far. More than one is normal over time;
-- two digests against the SAME version means the lists were edited without
-- bumping it, and that needs fixing.
-- ---------------------------------------------------------------------------
select policy_version, policy_digest, count(*) as attestations, min(created_at) as first_seen
from public.booking_attestations
group by policy_version, policy_digest
order by first_seen;
