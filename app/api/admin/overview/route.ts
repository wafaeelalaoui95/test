import { NextResponse } from 'next/server';
import { getAdminClient } from '@/lib/supabase/server';
import { getAdminContext } from '@/lib/admin';
import { travelerNetFromTotal } from '@/lib/utils';
import { STALE_HOLD_DAYS } from '@/lib/constants';
import { DISPUTE_SETTLED_FILTER } from '@/lib/disputes';

/**
 * GET /api/admin/overview
 *
 * The two things an operator cannot see anywhere else.
 *
 * OWED: money captured from senders that has not reached its traveler. It sits
 * on the Jibly Stripe balance, and it is not Jibly's. Two shapes:
 *   - held: the parcel isn't delivered yet, so nothing should have moved
 *   - stuck: delivered, but no transfer went out — almost always a traveler
 *     who never finished payout setup (transferToTraveler skips with
 *     'not_onboarded' and waits for the account.updated webhook to retry)
 * The second is the one worth watching: it grows silently and each row is a
 * person waiting for money.
 *
 * REVIEWS: every review, newest first. Written by users about each other, so
 * for moderation there has to be somewhere to read them.
 */
export async function GET() {
  const { isAdmin } = await getAdminContext();
  if (!isAdmin) {
    // Same shape as any unknown route: an operator console shouldn't confirm
    // its own existence to someone who isn't one.
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const admin = getAdminClient();

  const [{ data: bookings }, { data: reviews }] = await Promise.all([
    admin
      .from('booking_intents')
      .select(
        'id, sender_id, traveler_user_id, proposed_price, payment_amount, payment_status, status, received_confirmed_at, cancelled_at, transfer_id, created_at, pickup_city, destination_city'
      )
      .eq('payment_status', 'captured')
      .is('transfer_id', null),
    admin
      .from('reviews')
      .select('id, booking_intent_id, reviewer_id, reviewed_user_id, rating, comment, created_at')
      .order('created_at', { ascending: false })
      .limit(100),
  ]);

  const rows = bookings ?? [];

  // Money that has been sitting here too long, whatever the reason.
  //
  // The buckets below answer "why is this held"; this one answers "how long",
  // which nothing asked before. Every path that holds money is individually
  // reasonable and indefinite: a traveller who never finishes payout setup, a
  // parcel nobody confirmed and nobody proved, and a dispute no operator has
  // settled. None of them complains, so the first warning would otherwise come
  // from Stripe or from the person who was never paid.
  const staleBefore = new Date(
    Date.now() - STALE_HOLD_DAYS * 24 * 60 * 60 * 1000
  ).toISOString();
  const aging = rows.filter(
    (b: any) => b.created_at < staleBefore && b.status !== 'cancelled'
  );

  // Which of them are held by an unsettled dispute, so the list can say why
  // rather than leaving an operator to guess at a row that looks normal.
  const { data: disputed } = aging.length
    ? await admin
        .from('disputes')
        .select('booking_intent_id')
        .in('booking_intent_id', aging.map((b: any) => b.id))
        .not('status', 'in', DISPUTE_SETTLED_FILTER)
    : { data: [] as any[] };
  const disputedIds = new Set((disputed ?? []).map((d: any) => d.booking_intent_id));

  const delivered = rows.filter((b: any) => b.received_confirmed_at);
  // Cancelled and still holding the sender's money: /api/trip/cancel refunds
  // before it cancels, so this is the refund that did not go through. Split
  // out rather than left in "held", where it would read as a parcel still
  // making its way — the opposite of what it is. Owed to the SENDER, not the
  // traveller, so it is counted at face value and not net of the fee.
  const owedBack = rows.filter(
    (b: any) => !b.received_confirmed_at && b.status === 'cancelled'
  );
  const inTransit = rows.filter(
    (b: any) => !b.received_confirmed_at && b.status !== 'cancelled'
  );

  const sum = (list: any[]) =>
    list.reduce(
      (s, b) => s + travelerNetFromTotal((b.payment_amount ?? 0) / 100),
      0
    );

  // Names for the review list. Fetched separately rather than joined: reviews
  // reference profiles twice and PostgREST needs disambiguation for that.
  const ids = [
    ...new Set(
      [
        ...(reviews ?? []).flatMap((r: any) => [r.reviewer_id, r.reviewed_user_id]),
        ...delivered.map((b: any) => b.traveler_user_id),
        ...owedBack.map((b: any) => b.sender_id),
        ...aging.flatMap((b: any) => [b.traveler_user_id, b.sender_id]),
      ].filter(Boolean)
    ),
  ];
  const { data: people } = ids.length
    ? await admin.from('profiles').select('id, full_name').in('id', ids)
    : { data: [] as any[] };
  const nameById = new Map((people ?? []).map((p: any) => [p.id, p.full_name]));

  return NextResponse.json({
    owed: {
      stuckEuros: sum(delivered),
      stuckCount: delivered.length,
      heldEuros: sum(inTransit),
      heldCount: inTransit.length,
      // The full amount the sender paid — a refund owed is owed whole, not
      // minus the commission on a service nobody performed.
      refundOwedEuros: owedBack.reduce(
        (s: number, b: any) => s + (b.payment_amount ?? 0) / 100,
        0
      ),
      refundOwedCount: owedBack.length,
      refundOwed: owedBack.map((b: any) => ({
        id: b.id,
        route: `${b.pickup_city} → ${b.destination_city}`,
        euros: (b.payment_amount ?? 0) / 100,
        senderName: nameById.get(b.sender_id) ?? null,
        cancelledAt: b.cancelled_at,
      })),
      staleDays: STALE_HOLD_DAYS,
      staleCount: aging.length,
      // At face value: what is actually sitting on the balance, not the
      // traveller's share of it. This number answers "how much of other
      // people's money have we been holding for two months".
      staleEuros: aging.reduce((s: number, b: any) => s + (b.payment_amount ?? 0) / 100, 0),
      stale: aging.map((b: any) => ({
        id: b.id,
        route: `${b.pickup_city} → ${b.destination_city}`,
        euros: (b.payment_amount ?? 0) / 100,
        days: Math.floor(
          (Date.now() - new Date(b.created_at).getTime()) / (24 * 60 * 60 * 1000)
        ),
        travelerName: nameById.get(b.traveler_user_id) ?? null,
        senderName: nameById.get(b.sender_id) ?? null,
        // Why it is still here, in the order that decides what to do about it.
        reason: disputedIds.has(b.id)
          ? 'dispute'
          : b.received_confirmed_at
          ? 'payout_setup'
          : 'undelivered',
      })),
      stuck: delivered.map((b: any) => ({
        id: b.id,
        route: `${b.pickup_city} → ${b.destination_city}`,
        euros: travelerNetFromTotal((b.payment_amount ?? 0) / 100),
        travelerName: nameById.get(b.traveler_user_id) ?? null,
        deliveredAt: b.received_confirmed_at,
      })),
    },
    reviews: (reviews ?? []).map((r: any) => ({
      id: r.id,
      rating: r.rating,
      comment: r.comment,
      createdAt: r.created_at,
      reviewer: nameById.get(r.reviewer_id) ?? null,
      reviewed: nameById.get(r.reviewed_user_id) ?? null,
    })),
  });
}
