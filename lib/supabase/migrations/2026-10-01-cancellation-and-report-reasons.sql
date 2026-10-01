-- Let a sender say why they pulled out, and let either side report what the
-- Cancellation & Refund Policy actually turns on.
--
-- Two reason vocabularies, one migration, because asking for two trips to the
-- SQL editor is how the second one never gets run.
--
-- A. A sender could not cancel a confirmed booking at all. The policy devotes a
--    section to it (§3: sender cancellation, no-show or failure to proceed),
--    and the product's answer was an email to support.
-- B. The report categories are about a parcel that arrived wrong. The policy is
--    about journeys that never happened: no-shows, refusals at handover, travel
--    disruption. None of those could be chosen, so the structured record the
--    policy assumes does not exist for the cases it was written for.

-- ---------------------------------------------------------------------------
-- A. Why a sender ended a booking
-- ---------------------------------------------------------------------------
-- 'sender_withdrew' already existed as a catch-all. It survives — old rows use
-- it — but it says only that the sender stopped, which is the one thing already
-- obvious from who cancelled. The codes below are the part worth counting: they
-- are the difference between a marketplace losing parcels to travellers who go
-- quiet and one losing them to senders who found another way.

alter table public.booking_intents
  drop constraint if exists booking_intents_cancellation_reason_check;

alter table public.booking_intents
  add constraint booking_intents_cancellation_reason_check
  check (
    cancellation_reason is null
    or cancellation_reason in (
      -- the traveller's trip stopped (unchanged)
      'flight_cancelled', 'plans_changed', 'no_space', 'safety_concern', 'other',
      -- not a trip cancellation (unchanged)
      'traveler_declined', 'sender_withdrew',
      -- the sender ends a confirmed booking
      'no_longer_needed',        -- does not need it carried after all
      'sent_another_way',        -- has sent it by some other means
      'cannot_make_handover',    -- cannot be there to hand it over
      'traveller_unresponsive',  -- the traveller stopped answering
      'handover_not_agreed'      -- never managed to agree a time or place
    )
  );

-- ---------------------------------------------------------------------------
-- B. What a report can be about
-- ---------------------------------------------------------------------------
-- disputes.category is defined in 08_trust_and_safety.sql, which is not in this
-- repo, so this does not assume which shape it has. If it is an enum the values
-- are appended; if it is a check constraint the constraint is rewritten with the
-- existing five plus the new ones. Either way, running it twice is harmless.
--
-- The five existing values are taken from the `Dispute` type in
-- lib/supabase/queries.ts: not_delivered, damaged, wrong_item, late_delivery,
-- other. If the table turns out to allow others, add them to the list below
-- BEFORE running this, or the rewrite will narrow what is permitted.

do $$
declare
  enum_type text;
  has_check boolean;
begin
  select t.typname
    into enum_type
  from pg_attribute a
  join pg_class     c on c.oid = a.attrelid
  join pg_namespace n on n.oid = c.relnamespace
  join pg_type      t on t.oid = a.atttypid
  where n.nspname = 'public'
    and c.relname  = 'disputes'
    and a.attname  = 'category'
    and t.typtype  = 'e';

  if enum_type is not null then
    execute format('alter type public.%I add value if not exists %L', enum_type, 'no_show');
    execute format('alter type public.%I add value if not exists %L', enum_type, 'refused_at_handover');
    execute format('alter type public.%I add value if not exists %L', enum_type, 'travel_disruption');
    raise notice 'disputes.category is enum %, three values appended', enum_type;
    return;
  end if;

  select exists (
    select 1
    from pg_constraint
    where conrelid = 'public.disputes'::regclass
      and contype  = 'c'
      and pg_get_constraintdef(oid) ilike '%category%'
  ) into has_check;

  if has_check then
    execute 'alter table public.disputes drop constraint if exists disputes_category_check';
    execute $c$
      alter table public.disputes
        add constraint disputes_category_check
        check (category in (
          'not_delivered', 'damaged', 'wrong_item', 'late_delivery', 'other',
          'no_show', 'refused_at_handover', 'travel_disruption'
        ))
    $c$;
    raise notice 'disputes.category check constraint rewritten';
  else
    raise notice 'disputes.category is plain text — nothing to widen';
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- Check: what the column will now accept
-- ---------------------------------------------------------------------------
select pg_get_constraintdef(oid) as booking_cancellation_reasons
from pg_constraint
where conname = 'booking_intents_cancellation_reason_check';

-- And what a report may now be about, whichever shape the column has:
select
  t.typname                                   as category_type,
  coalesce(
    (select string_agg(e.enumlabel, ', ' order by e.enumsortorder)
     from pg_enum e where e.enumtypid = t.oid),
    (select pg_get_constraintdef(ct.oid)
     from pg_constraint ct
     where ct.conrelid = c.oid
       and ct.contype = 'c'
       and pg_get_constraintdef(ct.oid) ilike '%category%'
     limit 1),
    'plain text — unconstrained'
  )                                           as allowed
from pg_attribute a
join pg_class     c on c.oid = a.attrelid
join pg_namespace n on n.oid = c.relnamespace
join pg_type      t on t.oid = a.atttypid
where n.nspname = 'public'
  and c.relname = 'disputes'
  and a.attname = 'category';
