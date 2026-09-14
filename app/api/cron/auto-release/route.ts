import { NextRequest, NextResponse } from 'next/server';
import { getAdminClient } from '@/lib/supabase/server';
import { getResend, FROM_EMAIL } from '@/lib/email/resend';
import { deliveryAutoClosedEmail } from '@/lib/email/templates';
import { AUTO_RELEASE_DAYS } from '@/lib/constants';
import { formatName } from '@/lib/utils';

/**
 * GET /api/cron/auto-release
 *
 * Close a proved delivery that nobody confirmed and nobody contested.
 *
 * A traveller is paid when the recipient reads out the delivery code, and only
 * then — settle-payouts requires received_confirmed_at. That is the right rule
 * when the sender is present and answering. It is a trap when they are not:
 * the parcel arrived, the traveller flew, and a sender on holiday, or who lost
 * the code, or who simply worked out that not confirming costs them nothing,
 * left the money captured forever with nothing in the system that would ever
 * move it. Until today the product actively told them so, in an email that
 * explained the code was what released the traveller's payment.
 *
 * So a delivery that has been PROVED runs on a clock. Three conditions, all
 * necessary:
 *
 *   - the traveller uploaded proof, and it is AUTO_RELEASE_DAYS old. The clock
 *     starts at the proof, not the flight: the person being paid has to have
 *     shown something first.
 *   - the sender never confirmed. If they did, the normal path already paid.
 *   - nobody has an open dispute on it. Any status other than resolved or
 *     dismissed blocks — including one this code has never heard of, because
 *     the safe default for an unknown dispute state is "do not pay out".
 *
 * This route does not move money. It sets auto_released_at, and settle-payouts
 * — which runs hourly — sees it on its next pass. Keeping the two apart means
 * a Stripe outage delays the payout without losing the decision, and the
 * decision is the part that has to be recorded.
 */

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Bounded so a backlog cannot become a thousand-email run.
const MAX_PER_RUN = 200;

function emailDate(iso: string): string {
  return new Intl.DateTimeFormat('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(new Date(iso));
}

export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET?.trim();
  const auth = req.headers.get('authorization')?.trim();
  if (!secret || auth !== `Bearer ${secret}`) {
    console.error(
      '[cron/auto-release] rejected — CRON_SECRET %s, Authorization header %s',
      secret ? 'set' : 'MISSING in this environment',
      auth ? 'present but does not match' : 'absent'
    );
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const admin = getAdminClient();

  const cutoff = new Date(
    Date.now() - AUTO_RELEASE_DAYS * 24 * 60 * 60 * 1000
  ).toISOString();

  const { data: candidates, error } = await admin
    .from('booking_intents')
    .select(
      'id, sender_id, traveler_user_id, item_title, item_category, pickup_city, destination_city, payment_amount, delivery_proof_uploaded_at'
    )
    .eq('payment_status', 'captured')
    .eq('status', 'confirmed')
    .is('transfer_id', null)
    .is('received_confirmed_at', null)
    .is('auto_released_at', null)
    .is('archived_at', null)
    .not('delivery_proof_uploaded_at', 'is', null)
    .lte('delivery_proof_uploaded_at', cutoff)
    .limit(MAX_PER_RUN);

  if (error) {
    console.error('[cron/auto-release] query failed:', error.message);
    return NextResponse.json({ error: 'Query failed' }, { status: 500 });
  }
  if (!candidates?.length) {
    return NextResponse.json({ candidates: 0, released: 0 });
  }

  // Anything a human is still arguing about stays put. Expressed as "not
  // settled" rather than "is open" on purpose — a dispute state added later
  // should block a payout by default, not slip through because this list was
  // never updated.
  const { data: disputed } = await admin
    .from('disputes')
    .select('booking_intent_id')
    .in('booking_intent_id', candidates.map((b) => b.id))
    .not('status', 'in', '("resolved","dismissed")');

  const blocked = new Set((disputed ?? []).map((d: any) => d.booking_intent_id));
  const targets = candidates.filter((b) => !blocked.has(b.id));

  let released = 0;
  let emailed = 0;

  for (const booking of targets) {
    // Mark first, then tell them. The reverse order can email a sender that
    // their delivery closed and then fail to close it, which is the one
    // inconsistency here that would look like we had taken the money twice.
    //
    // The re-checked nulls make this safe to run concurrently with a sender
    // confirming by hand: whoever gets there first wins, and the loser writes
    // nothing rather than double-releasing.
    const { data: updated, error: updErr } = await admin
      .from('booking_intents')
      .update({ auto_released_at: new Date().toISOString() })
      .eq('id', booking.id)
      .is('auto_released_at', null)
      .is('received_confirmed_at', null)
      .select('id');

    if (updErr) {
      console.error('[cron/auto-release] update failed:', booking.id, updErr.message);
      continue;
    }
    // Somebody confirmed between the query and here. Their confirmation is the
    // better record — leave it alone and say nothing.
    if (!updated?.length) continue;
    released++;

    try {
      const { data: userData } = await admin.auth.admin.getUserById(booking.sender_id);
      const email = userData?.user?.email;
      if (!email) {
        console.warn('[cron/auto-release] no email for sender', booking.sender_id);
        continue;
      }

      const [senderProfile, travelerProfile] = await Promise.all([
        admin.from('profiles').select('full_name').eq('id', booking.sender_id).maybeSingle(),
        booking.traveler_user_id
          ? admin
              .from('profiles')
              .select('full_name')
              .eq('id', booking.traveler_user_id)
              .maybeSingle()
          : Promise.resolve({ data: null }),
      ]);

      const template = deliveryAutoClosedEmail({
        senderFirstName: firstName(senderProfile.data?.full_name),
        travelerFirstName: firstName((travelerProfile as any).data?.full_name),
        itemLabel: booking.item_title?.trim() || 'Your parcel',
        pickupCity: booking.pickup_city,
        destinationCity: booking.destination_city,
        days: AUTO_RELEASE_DAYS,
        bookingId: booking.id,
      });

      const { error: sendErr } = await getResend().emails.send({
        from: FROM_EMAIL,
        to: email,
        subject: template.subject,
        html: template.html,
        text: template.text,
      });
      if (sendErr) console.error('[cron/auto-release] resend error:', sendErr);
      else emailed++;
    } catch (e: any) {
      console.error('[cron/auto-release] notify failed for', booking.id, e?.message);
    }

    // Best-effort, like everywhere else that writes here: the notifications
    // table is managed outside this repo's migrations.
    try {
      await admin.from('notifications').insert({
        user_id: booking.sender_id,
        type: 'delivery_auto_closed',
        title: `${booking.item_title?.trim() || 'Your parcel'} is marked delivered`,
        body: `Nobody reported a problem within ${AUTO_RELEASE_DAYS} days, so the delivery closed on its own.`,
        link: `/me?booking=${booking.id}`,
        related_booking_id: booking.id,
      });
    } catch (e: any) {
      console.error('[cron/auto-release] notification failed:', e?.message);
    }
  }

  console.log(
    `[cron/auto-release] ${candidates.length} due, ${blocked.size} disputed, ${released} released`
  );

  return NextResponse.json({
    candidates: candidates.length,
    heldByDispute: blocked.size,
    released,
    emailed,
    // Nothing has moved yet — settle-payouts does that on its next hourly run.
    oldestProof: targets.length
      ? emailDate(targets[0].delivery_proof_uploaded_at as string)
      : null,
  });
}

function firstName(full: string | null | undefined): string | null {
  return full ? formatName(full).split(' ')[0] : null;
}
