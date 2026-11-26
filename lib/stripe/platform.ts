import { getAdminClient } from '@/lib/supabase/server';
import { asPlatform, uaeEnabled, type StripePlatform } from './server';

/**
 * Which Stripe platform a person or a booking belongs to. See the note at the
 * top of lib/stripe/server.ts for why there are two.
 */

/** The platform a payout country lives on. Only the UAE is not 'gb'. */
export function platformForCountry(country: string | null | undefined): StripePlatform {
  return country?.trim().toUpperCase() === 'AE' ? 'ae' : 'gb';
}

/**
 * Where a traveller is (or would be) paid. No Connect account yet → 'gb', the
 * default every booking took before the UAE existed.
 */
export async function travelerPlatform(userId: string | null | undefined): Promise<StripePlatform> {
  if (!userId) return 'gb';
  const { data } = await getAdminClient()
    .from('profiles')
    .select('stripe_platform')
    .eq('id', userId)
    .maybeSingle();
  return asPlatform(data?.stripe_platform);
}

/** The traveller of a booking: traveler_user_id, or the trip's owner. */
export async function bookingTravelerId(b: {
  traveler_user_id?: string | null;
  traveler_trip_id?: string | null;
}): Promise<string | null> {
  if (b.traveler_user_id) return b.traveler_user_id;
  if (!b.traveler_trip_id) return null;
  const { data } = await getAdminClient()
    .from('traveler_trips')
    .select('user_id')
    .eq('id', b.traveler_trip_id)
    .maybeSingle();
  return data?.user_id ?? null;
}

/**
 * Remember which platform a PaymentIntent was made on. The booking it ends up
 * on takes this platform (trigger in 2026-11-26b-stripe-platform-guards.sql,
 * and the routes that attach payments), so it can never point somewhere that
 * has never heard of its PaymentIntent — even if the traveller changes
 * platform while the sender is still typing their card number.
 */
export async function recordPaymentIntentPlatform(
  paymentIntentId: string,
  platform: StripePlatform,
  travelerUserId: string | null
): Promise<boolean> {
  const { error } = await getAdminClient()
    .from('payment_intent_platforms')
    .upsert({ payment_intent_id: paymentIntentId, platform, traveler_user_id: travelerUserId });
  if (error) {
    console.error('[platform] could not record %s on %s: %s', paymentIntentId, platform, error.message);
    return false;
  }
  return true;
}

/** Where a PaymentIntent was made, or null if we never recorded it. */
export async function paymentIntentPlatform(
  paymentIntentId: string
): Promise<StripePlatform | null> {
  const { data } = await getAdminClient()
    .from('payment_intent_platforms')
    .select('platform')
    .eq('payment_intent_id', paymentIntentId)
    .maybeSingle();
  return data?.platform ? asPlatform(data.platform) : null;
}

/**
 * May this traveller move to `to`? Not while money for them is still sitting
 * on the other platform: an authorised or captured booking that has not been
 * transferred can only ever be paid out from where it was charged, so moving
 * their account would strand it.
 *
 * Also refuses the UAE outright while it is switched off.
 */
export async function platformChangeBlocked(
  userId: string,
  to: StripePlatform
): Promise<'uae_disabled' | 'money_on_other_platform' | null> {
  if (to === 'ae' && !uaeEnabled()) return 'uae_disabled';
  const admin = getAdminClient();
  const { data: trips } = await admin.from('traveler_trips').select('id').eq('user_id', userId);
  const tripIds = (trips ?? []).map((t: any) => t.id);
  const owner = tripIds.length
    ? `traveler_user_id.eq.${userId},traveler_trip_id.in.(${tripIds.join(',')})`
    : `traveler_user_id.eq.${userId}`;
  const { data, error } = await admin
    .from('booking_intents')
    .select('id')
    .or(owner)
    .neq('stripe_platform', to)
    .in('payment_status', ['authorized', 'captured'])
    .is('transfer_id', null)
    .is('archived_at', null)
    .limit(1);
  if (error) {
    // Unreadable is not permission: stranding money is the expensive mistake.
    console.error('[platform] change check failed for %s: %s', userId, error.message);
    return 'money_on_other_platform';
  }
  if (data?.length) return 'money_on_other_platform';

  // A sender may be mid-payment for them right now, on the current platform,
  // with no booking row yet. Give that an hour to land before moving.
  const since = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const { data: recent, error: recentErr } = await admin
    .from('payment_intent_platforms')
    .select('payment_intent_id')
    .eq('traveler_user_id', userId)
    .neq('platform', to)
    .gte('created_at', since)
    .limit(1);
  if (recentErr) {
    console.error('[platform] recent-payment check failed for %s: %s', userId, recentErr.message);
    return 'money_on_other_platform';
  }
  return recent?.length ? 'money_on_other_platform' : null;
}
