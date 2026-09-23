import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getAdminClient } from '@/lib/supabase/server';
import { getAdminContext } from '@/lib/admin';
import { retryPendingPayouts } from '@/lib/stripe/payout';
import { isDisputeSettled } from '@/lib/disputes';

/**
 * GET  /api/admin/disputes   — every report, newest first
 * POST /api/admin/disputes   — settle one
 *
 * The other half of the payout hold.
 *
 * lib/stripe/payout.ts refuses to transfer while a dispute on the booking is
 * unsettled, which is what the Marketplace Terms promise. On its own that is
 * only half a mechanism: nothing in the product could ever settle a dispute,
 * so the first person to report a problem would have frozen that booking's
 * money permanently and the traveller would simply never be paid. A hold with
 * no release is not a hold, it is a loss.
 *
 * So this route exists to end the argument. It writes the operator's decision
 * and then immediately retries the payout, rather than leaving the money to be
 * noticed by the hourly sweep — an operator who has just decided in the
 * traveller's favour should see that reflected, not be asked to trust a cron.
 *
 * Deliberately NOT a refund tool. Deciding for the sender means money going
 * back, and that already has a route with its own reversal logic
 * (/api/stripe/refund). Two tools that both move money in the same screen is
 * how one of them gets used by accident.
 */

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  const { isAdmin } = await getAdminContext();
  if (!isAdmin) {
    // Same shape as any unknown route, matching /api/admin/overview: an
    // operator console shouldn't confirm its own existence.
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const admin = getAdminClient();

  // select('*') rather than a column list: this table's schema lives outside
  // this repo (08_trust_and_safety.sql), so naming columns here is a guess
  // that fails the whole query if it is wrong.
  const { data: disputes, error } = await admin
    .from('disputes')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(100);

  if (error) {
    console.error('[admin/disputes] query failed:', error.message);
    return NextResponse.json({ error: 'Query failed' }, { status: 500 });
  }

  const rows = disputes ?? [];
  if (!rows.length) return NextResponse.json({ disputes: [] });

  // The booking is the context the decision actually turns on: was it
  // delivered, has the money moved, how much is being held.
  const bookingIds = [...new Set(rows.map((d: any) => d.booking_intent_id).filter(Boolean))];
  const { data: bookings } = bookingIds.length
    ? await admin
        .from('booking_intents')
        .select(
          'id, pickup_city, destination_city, item_title, payment_amount, payment_status, transfer_id, received_confirmed_at, auto_released_at, delivery_proof_url, traveler_user_id, sender_id'
        )
        .in('id', bookingIds)
    : { data: [] as any[] };
  const bookingById = new Map((bookings ?? []).map((b: any) => [b.id, b]));

  const personIds = [
    ...new Set(
      rows
        .flatMap((d: any) => [d.reporter_id, d.reported_user_id])
        .filter(Boolean)
    ),
  ];
  const { data: people } = personIds.length
    ? await admin.from('profiles').select('id, full_name').in('id', personIds)
    : { data: [] as any[] };
  const nameById = new Map((people ?? []).map((p: any) => [p.id, p.full_name]));

  return NextResponse.json({
    disputes: rows.map((d: any) => {
      const b = bookingById.get(d.booking_intent_id);
      return {
        id: d.id,
        bookingId: d.booking_intent_id,
        category: d.category,
        description: d.description,
        status: d.status,
        settled: isDisputeSettled(d.status),
        createdAt: d.created_at,
        adminNotes: d.admin_notes ?? null,
        photos: d.photos_urls ?? [],
        reporter: nameById.get(d.reporter_id) ?? null,
        reported: nameById.get(d.reported_user_id) ?? null,
        booking: b
          ? {
              route: `${b.pickup_city} → ${b.destination_city}`,
              itemLabel: b.item_title,
              euros: (b.payment_amount ?? 0) / 100,
              paymentStatus: b.payment_status,
              // What the operator needs at a glance: is this booking's money
              // still sitting here because of THIS dispute, or has it already
              // gone out?
              paidOut: !!b.transfer_id,
              delivered: !!(b.received_confirmed_at || b.auto_released_at),
              hasProof: !!b.delivery_proof_url,
            }
          : null,
      };
    }),
  });
}

const schema = z.object({
  disputeId: z.string().uuid(),
  // The statuses an operator can move a report to. 'open' is absent on
  // purpose: reopening is not a decision, and if it is ever needed it should
  // be its own deliberate action rather than a value in a dropdown.
  status: z.enum([
    'investigating',
    'resolved_for_reporter',
    'resolved_for_reported',
    'closed',
  ]),
  note: z.string().trim().max(2000).optional(),
});

export async function POST(req: NextRequest) {
  const { isAdmin, userId } = await getAdminContext();
  if (!isAdmin) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  let body: z.infer<typeof schema>;
  try {
    body = schema.parse(await req.json());
  } catch {
    return NextResponse.json({ error: 'bad_request' }, { status: 400 });
  }

  const admin = getAdminClient();

  const { data: dispute } = await admin
    .from('disputes')
    .select('*')
    .eq('id', body.disputeId)
    .maybeSingle();
  if (!dispute) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }

  // The status write is on its own, and it is the one that must succeed: it is
  // what the payout guard reads. Everything else about this decision is
  // commentary, and commentary must not be able to block the release of money.
  const { error: statusErr } = await admin
    .from('disputes')
    .update({ status: body.status })
    .eq('id', body.disputeId);

  if (statusErr) {
    console.error('[admin/disputes] status update failed:', statusErr.message);
    return NextResponse.json({ error: 'update_failed' }, { status: 500 });
  }

  const settled = isDisputeSettled(body.status);

  // Best-effort, like the notification writes elsewhere: these columns are in
  // the same out-of-repo schema, and a decision that was recorded but not
  // annotated is still a decision.
  try {
    const extra: Record<string, unknown> = {};
    if (body.note) extra.admin_notes = body.note;
    if (settled) extra.resolved_at = new Date().toISOString();
    if (Object.keys(extra).length) {
      const { error } = await admin.from('disputes').update(extra).eq('id', body.disputeId);
      if (error) {
        console.error('[admin/disputes] annotation failed (status is set):', error.message);
      }
    }
  } catch (e: any) {
    console.error('[admin/disputes] annotation threw (status is set):', e?.message);
  }

  // Settling lifts the payout hold. Nothing else has to happen for the money
  // to move — the hourly sweep would find it — but an operator should not have
  // to wait an hour to see the consequence of their own decision.
  let payout: Awaited<ReturnType<typeof retryPendingPayouts>> | null = null;
  if (settled) {
    try {
      const { data: booking } = await admin
        .from('booking_intents')
        .select('traveler_user_id')
        .eq('id', dispute.booking_intent_id)
        .maybeSingle();
      if (booking?.traveler_user_id) {
        payout = await retryPendingPayouts(booking.traveler_user_id);
      }
    } catch (e: any) {
      // The decision is recorded either way; the sweep will try again.
      console.error('[admin/disputes] settlement retry failed:', e?.message);
    }
  }

  // Tell both sides something happened. Best-effort: the notifications table is
  // managed outside this repo's migrations.
  if (settled) {
    try {
      const line =
        body.status === 'closed'
          ? 'Your report has been closed.'
          : 'A decision has been made on your report.';
      await admin.from('notifications').insert(
        [dispute.reporter_id, dispute.reported_user_id].filter(Boolean).map((id: string) => ({
          user_id: id,
          type: 'dispute_settled',
          title: 'Report reviewed',
          body: line,
          link: `/me?booking=${dispute.booking_intent_id}`,
          related_booking_id: dispute.booking_intent_id,
        }))
      );
    } catch (e: any) {
      console.error('[admin/disputes] notification failed:', e?.message);
    }
  }

  console.log(
    `[admin/disputes] ${body.disputeId} → ${body.status} by ${userId}${
      payout ? ` (payout: ${payout.sent} sent, ${payout.failed} failed)` : ''
    }`
  );

  return NextResponse.json({ ok: true, status: body.status, settled, payout });
}
