import { NextRequest, NextResponse } from 'next/server';
import { getAdminClient } from '@/lib/supabase/server';
import { getResend, FROM_EMAIL } from '@/lib/email/resend';
import { codeHandoverReminderEmail } from '@/lib/email/templates';
import { formatName } from '@/lib/utils';

/**
 * GET /api/cron/code-reminder
 *
 * Remind a sender, the evening before the trip, to make sure the delivery code
 * has reached whoever is actually collecting the parcel.
 *
 * The code is sent once, at booking, and that email is read days earlier. When
 * a friend or a relative is collecting at the other end, they need the code and
 * have no way to obtain it themselves — so the failure only surfaces with the
 * traveller and the recipient standing together, parcel in hand, unable to
 * close the delivery. This is the one moment where a reminder still buys an
 * evening to send a message.
 *
 * Sent once per booking, ever. code_reminder_sent_at is stamped whether or not
 * the email goes out, for the same reason as the stale-request sweep: a sender
 * who gets the same message every night learns to filter us, and losing one
 * reminder to a transient Resend error is much cheaper than that.
 */
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Bounded so one bad day cannot turn into a thousand-email run.
const MAX_PER_RUN = 100;

export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET?.trim();
  const auth = req.headers.get('authorization')?.trim();
  if (!secret || auth !== `Bearer ${secret}`) {
    console.error(
      '[cron/code-reminder] rejected — CRON_SECRET %s, Authorization header %s',
      secret ? 'set' : 'MISSING in this environment',
      auth ? 'present but does not match' : 'absent'
    );
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const admin = getAdminClient();

  // Tomorrow, in UTC, to match how departure_date is stored (a plain date).
  const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 10);

  // Two queries rather than one joined select. The join would read better, but
  // this sweep is the kind of thing that must not break quietly when a
  // relationship is renamed — and at this size the second round trip costs
  // nothing.
  const { data: trips, error: tripErr } = await admin
    .from('traveler_trips')
    .select('id, departure_date, user_id')
    .eq('departure_date', tomorrow)
    .limit(MAX_PER_RUN);

  if (tripErr) {
    console.error('[cron/code-reminder] trip query failed:', tripErr.message);
    return NextResponse.json({ error: 'Query failed' }, { status: 500 });
  }
  if (!trips?.length) {
    return NextResponse.json({ candidates: 0, sent: 0 });
  }

  const { data: bookings, error: bookErr } = await admin
    .from('booking_intents')
    .select(
      'id, sender_id, traveler_user_id, traveler_trip_id, pickup_city, destination_city, delivery_code'
    )
    .eq('status', 'confirmed')
    // Already handed over: the sender is past the moment this warns about.
    .is('pickup_confirmed_at', null)
    .is('code_reminder_sent_at', null)
    .not('delivery_code', 'is', null)
    .in(
      'traveler_trip_id',
      trips.map((t) => t.id)
    )
    .limit(MAX_PER_RUN);

  if (bookErr) {
    console.error('[cron/code-reminder] booking query failed:', bookErr.message);
    return NextResponse.json({ error: 'Query failed' }, { status: 500 });
  }
  if (!bookings?.length) {
    return NextResponse.json({ candidates: 0, sent: 0 });
  }

  const byTrip = new Map(trips.map((t) => [t.id, t]));
  const resend = getResend();
  let sent = 0;
  let failed = 0;

  for (const booking of bookings) {
    // Mark first. A duplicate is a worse failure than a miss: the sender who
    // gets this every night stops reading anything we send.
    const { error: markErr } = await admin
      .from('booking_intents')
      .update({ code_reminder_sent_at: new Date().toISOString() })
      .eq('id', booking.id)
      .is('code_reminder_sent_at', null);
    if (markErr) {
      console.error('[cron/code-reminder] could not mark', booking.id, markErr.message);
      continue;
    }

    try {
      const { data: userData } = await admin.auth.admin.getUserById(booking.sender_id);
      const email = userData?.user?.email;
      if (!email) {
        console.warn('[cron/code-reminder] no email for sender', booking.sender_id);
        continue;
      }

      const ids = [booking.sender_id, booking.traveler_user_id].filter(
        (v): v is string => !!v
      );
      const { data: profiles } = await admin
        .from('profiles')
        .select('id, full_name')
        .in('id', ids);

      const firstName = (id: string | null) => {
        if (!id) return null;
        const name = profiles?.find((p) => p.id === id)?.full_name;
        return name ? formatName(name).split(' ')[0] : null;
      };

      const template = codeHandoverReminderEmail({
        senderFirstName: firstName(booking.sender_id),
        travelerFirstName: firstName(booking.traveler_user_id),
        pickupCity: booking.pickup_city,
        destinationCity: booking.destination_city,
        departureDate: byTrip.get(booking.traveler_trip_id!)?.departure_date ?? tomorrow,
        code: booking.delivery_code!,
      });

      const { error: sendErr } = await resend.emails.send({
        from: FROM_EMAIL,
        to: email,
        subject: template.subject,
        html: template.html,
        text: template.text,
      });
      if (sendErr) {
        failed++;
        console.error('[cron/code-reminder] send failed for', booking.id, sendErr);
      } else {
        sent++;
      }
    } catch (e: any) {
      failed++;
      console.error('[cron/code-reminder] unexpected failure for', booking.id, e?.message);
    }
  }

  return NextResponse.json({ candidates: bookings.length, sent, failed });
}
