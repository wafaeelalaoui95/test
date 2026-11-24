import type Stripe from 'stripe';
import type { SupabaseClient } from '@supabase/supabase-js';
import { getStripe } from '@/lib/stripe/server';
import { getResend, FROM_EMAIL } from '@/lib/email/resend';
import { unfinishedPaymentEmail } from '@/lib/email/templates';
import { formatName } from '@/lib/utils';

// =============================================================================
// Unfinished payments — « Votre réservation n'a pas été finalisée »
// =============================================================================
// People who opened the card form to book (Stripe has the PaymentIntent) and
// never got through: the intent is still waiting for a card, a confirmation or
// a 3-D Secure step. Stripe is the source of truth — no booking row exists
// for an instant booking until the card is authorised.
//
// Listed in /admin, one line per person, each with the exact email. Sent by
// hand only, once per person: the send is stamped on the person's abandoned
// PaymentIntents (metadata.followupSentAt) BEFORE the email goes, so a double
// click cannot send it twice. No migration needed.
//
// A person drops off the list once they paid for something after the attempt
// (an intent authorised, captured or cancelled after authorisation).

const LOOKBACK_DAYS = 30;
const MAX_INTENTS = 500;
const ABANDONED: Stripe.PaymentIntent.Status[] = ['requires_payment_method', 'requires_confirmation', 'requires_action'];

export type UnfinishedPayment = {
  userId: string;
  name: string | null;
  email: string | null;
  verified: boolean;
  optedOut: boolean;
  attempts: number;
  lastAttemptAt: string;
  amountCents: number;
  /** Stripe's reason the card failed, if it did. Admin eyes only. */
  lastError: string | null;
  route: string | null;
  travelerName: string | null;
  tripStillOpen: boolean;
  followupSentAt: string | null;
  template: { subject: string; html: string; text: string };
};

const firstName = (full: string | null | undefined) => formatName(full ?? '').split(' ')[0] || null;

export async function findUnfinishedPayments(admin: SupabaseClient, onlyUserId?: string): Promise<UnfinishedPayment[]> {
  const stripe = getStripe();
  const since = Math.floor(Date.now() / 1000) - LOOKBACK_DAYS * 86400;

  const intents: Stripe.PaymentIntent[] = [];
  for await (const pi of stripe.paymentIntents.list({ created: { gte: since }, limit: 100 })) {
    intents.push(pi);
    if (intents.length >= MAX_INTENTS) break;
  }

  // Group by the Jibly user who started each payment.
  const byUser = new Map<string, Stripe.PaymentIntent[]>();
  for (const pi of intents) {
    const uid = pi.metadata?.userId;
    if (!uid || (onlyUserId && uid !== onlyUserId)) continue;
    if (!byUser.has(uid)) byUser.set(uid, []);
    byUser.get(uid)!.push(pi);
  }

  type Pick = { userId: string; abandoned: Stripe.PaymentIntent[]; latest: Stripe.PaymentIntent };
  const picks: Pick[] = [];
  for (const [userId, list] of byUser) {
    const abandoned = list.filter((pi) => ABANDONED.includes(pi.status));
    if (!abandoned.length) continue;
    const latest = abandoned.reduce((a, b) => (b.created > a.created ? b : a));
    // Paid (or authorised) something since: they got through, nothing to ask.
    const paidSince = list.some((pi) => !ABANDONED.includes(pi.status) && pi.created >= latest.created);
    if (paidSince) continue;
    picks.push({ userId, abandoned, latest });
  }
  if (!picks.length) return [];

  const userIds = picks.map((p) => p.userId);
  const tripIds = Array.from(new Set(picks.map((p) => p.latest.metadata?.tripId).filter(Boolean))) as string[];
  const bookingIds = Array.from(new Set(picks.map((p) => p.latest.metadata?.bookingIntentId).filter(Boolean))) as string[];

  const [profilesRes, tripsRes, bookingsRes] = await Promise.all([
    admin.from('profiles').select('*').in('id', userIds),
    tripIds.length
      ? admin.from('traveler_trips').select('id, user_id, departure_city, arrival_city, departure_date, status').in('id', tripIds)
      : Promise.resolve({ data: [] as any[] }),
    bookingIds.length
      ? admin.from('booking_intents').select('id, traveler_user_id, pickup_city, destination_city, status').in('id', bookingIds)
      : Promise.resolve({ data: [] as any[] }),
  ]);
  const profiles = new Map((profilesRes.data ?? []).map((p: any) => [p.id, p]));
  const trips = new Map(((tripsRes as any).data ?? []).map((t: any) => [t.id, t]));
  const bookings = new Map(((bookingsRes as any).data ?? []).map((b: any) => [b.id, b]));

  const travelerIds = new Set<string>();
  for (const t of trips.values()) travelerIds.add((t as any).user_id);
  for (const b of bookings.values()) if ((b as any).traveler_user_id) travelerIds.add((b as any).traveler_user_id);
  const { data: travelers } = travelerIds.size
    ? await admin.from('profiles').select('id, full_name').in('id', Array.from(travelerIds))
    : { data: [] as any[] };
  const travelerName = new Map((travelers ?? []).map((t: any) => [t.id, firstName(t.full_name)]));

  const today = new Date().toISOString().slice(0, 10);
  const out: UnfinishedPayment[] = [];
  for (const { userId, abandoned, latest } of picks) {
    const profile: any = profiles.get(userId);
    if (!profile || profile.deleted_at) continue;

    const { data: authData } = await admin.auth.admin.getUserById(userId);
    const email = authData?.user?.email ?? null;

    const trip: any = latest.metadata?.tripId ? trips.get(latest.metadata.tripId) : null;
    const booking: any = latest.metadata?.bookingIntentId ? bookings.get(latest.metadata.bookingIntentId) : null;
    const pickupCity = trip?.departure_city ?? booking?.pickup_city ?? null;
    const destinationCity = trip?.arrival_city ?? booking?.destination_city ?? null;
    const travelerId = trip?.user_id ?? booking?.traveler_user_id ?? null;
    const traveler = travelerId ? travelerName.get(travelerId) ?? null : null;

    let resumePath: string | null = null;
    let tripStillOpen = false;
    if (trip && trip.status === 'open' && trip.departure_date >= today) {
      resumePath = `/u/${trip.user_id}?book=${trip.id}`;
      tripStillOpen = true;
    } else if (booking && booking.status === 'pending') {
      resumePath = '/me?tab=sends';
      tripStillOpen = true;
    }

    const sentStamp = abandoned.map((pi) => pi.metadata?.followupSentAt).find(Boolean) ?? null;
    const attemptedAt = new Date(latest.created * 1000).toISOString();

    out.push({
      userId,
      name: formatName(profile.full_name ?? '') || null,
      email,
      verified: profile.verification_level === 'id_verified' || profile.verification_level === 'trusted',
      optedOut: !!profile.marketing_opt_out_at,
      attempts: abandoned.length,
      lastAttemptAt: attemptedAt,
      amountCents: latest.amount,
      lastError: latest.last_payment_error?.message ?? null,
      route: pickupCity && destinationCity ? `${pickupCity} → ${destinationCity}` : null,
      travelerName: traveler,
      tripStillOpen,
      followupSentAt: sentStamp,
      template: unfinishedPaymentEmail({
        firstName: firstName(profile.full_name),
        pickupCity,
        destinationCity,
        travelerFirstName: traveler,
        attemptedAt,
        resumePath,
      }),
    });
  }
  return out.sort((a, b) => b.lastAttemptAt.localeCompare(a.lastAttemptAt));
}

/**
 * Send one person their email. Stamps their abandoned PaymentIntents first so
 * it can never go twice; if the stamp fails, nothing is sent.
 */
export async function sendUnfinishedPaymentEmail(item: UnfinishedPayment): Promise<{ ok: boolean; reason?: string }> {
  if (item.followupSentAt) return { ok: false, reason: 'Déjà envoyé' };
  if (!item.email) return { ok: false, reason: 'Pas d’e-mail' };

  const stripe = getStripe();
  const since = Math.floor(Date.now() / 1000) - LOOKBACK_DAYS * 86400;
  const now = new Date().toISOString();
  try {
    for await (const pi of stripe.paymentIntents.list({ created: { gte: since }, limit: 100 })) {
      if (pi.metadata?.userId === item.userId && ABANDONED.includes(pi.status)) {
        await stripe.paymentIntents.update(pi.id, { metadata: { followupSentAt: now } });
      }
    }
  } catch (e: any) {
    console.error('[unfinished-payments] could not stamp', item.userId, e?.message);
    return { ok: false, reason: 'Impossible de marquer l’envoi' };
  }

  const { error } = await getResend().emails.send({
    from: FROM_EMAIL,
    to: item.email,
    subject: item.template.subject,
    html: item.template.html,
    text: item.template.text,
  });
  if (error) {
    console.error('[unfinished-payments] send failed', item.userId, error.message);
    return { ok: false, reason: 'Envoi échoué' };
  }
  return { ok: true };
}
