-- Record what happens after the money leaves Jibly.
--
-- The app tracked transfers — Jibly balance to the traveler's Stripe balance —
-- and stopped there. The leg that actually matters to the traveler, Stripe
-- balance to their bank, was invisible: nothing said whether it arrived, when,
-- or whether it bounced. "Has this traveler been paid?" could only be answered
-- by opening the Stripe dashboard, or by asking them.
--
-- The expensive case is payout.failed — a mistyped IBAN, a closed account. It
-- costs nothing to detect and, undetected, is discovered when the traveler
-- writes to ask where their money is.

create table if not exists public.traveler_payouts (
  -- Stripe's payout id (po_…). Primary key so a replayed webhook updates the
  -- row rather than inserting a second one.
  id                text primary key,
  stripe_account_id text not null,
  -- Nullable and `set null`: a payout that outlives its profile is still a
  -- record of money that moved, and losing the row would be worse than losing
  -- the link.
  user_id           uuid references public.profiles(id) on delete set null,
  amount_cents      integer not null,
  currency          text not null default 'eur',
  -- paid | failed | canceled | in_transit
  status            text not null,
  -- When Stripe expects it to land, or when it did.
  arrival_date      timestamptz,
  failure_code      text,
  failure_message   text,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create index if not exists traveler_payouts_user_idx
  on public.traveler_payouts (user_id, created_at desc);

-- Written by the Connect webhook, read from the admin view. No client role has
-- any business here: it names amounts and bank failures for other people.
alter table public.traveler_payouts enable row level security;
revoke all on public.traveler_payouts from anon, authenticated;

-- Check: empty until the first payout settles.
select count(*) as payouts_recorded from public.traveler_payouts;
