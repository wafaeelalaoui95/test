-- A declared value of 0 € is allowed.
--
-- Documents, letters and paperwork have no market value, and the sender was
-- stuck: the form demanded a value and refused 0. The value stays required
-- (null is still accepted only for rows that predate the field), but 0 now
-- counts as an answer. The €500 cap is unchanged.

alter table public.shipping_requests
  drop constraint if exists shipping_requests_declared_value_check;
alter table public.shipping_requests
  add constraint shipping_requests_declared_value_check
  check (declared_value_eur is null or (declared_value_eur >= 0 and declared_value_eur <= 500));

alter table public.booking_intents
  drop constraint if exists booking_intents_declared_value_check;
alter table public.booking_intents
  add constraint booking_intents_declared_value_check
  check (declared_value_eur is null or (declared_value_eur >= 0 and declared_value_eur <= 500));
