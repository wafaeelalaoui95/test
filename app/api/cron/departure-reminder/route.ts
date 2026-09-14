import { NextRequest, NextResponse } from 'next/server';
import { getAdminClient } from '@/lib/supabase/server';
import { getResend, FROM_EMAIL } from '@/lib/email/resend';
import { tripDepartureReminderEmail } from '@/lib/email/templates';
import { formatName } from '@/lib/utils';

/**
 * GET /api/cron/departure-reminder
 *
 * Remind a traveller, the evening before, what they have agreed to carry.
 *
 * The sender already gets an eve-of-departure reminder (/api/cron/code-reminder)
 * about passing the delivery code on. The traveller got nothing. They accepted
 * a parcel days or weeks earlier, in an email read once, and the next event in
 * the story is somebody standing at a meeting point with a bag.
 *
 * A forgotten parcel is not a small miss. The sender's money is already
 * captured by then, the flight goes without the parcel, and the first person to
 * discover it is the recipient who is handed nothing.
 *
 * ONE EMAIL PER TRIP, not per parcel. A traveller carrying three things needs
 * one list, and three separate mails about the same flight is how a reminder
 * becomes something you archive without reading.
 *
 * Sent once per trip, ever. departure_reminder_sent_at is stamped whether or
 * not the email goes out — same reasoning as the other two sweeps: a nightly
 * repeat teaches people to filter us, and losing one reminder to a transient
 * Resend error is much cheaper than that.
 */
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Bounded so one bad day cannot turn into a thousand-email run.
const MAX_PER_RUN = 100;

// Same list as the other server-side senders: ITEM_CATEGORIES holds
// translation KEYS, and a cron has no locale to resolve them with.
const CATEGORY_LABEL: Record<string, string> = {
  documents: 'Documents',
  cles: 'Keys',
  vetements: 'Clothes',
  electronique: 'Electronics',
  petits_objets: 'A parcel',
  otc: 'Medicine',
};

export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET?.trim();
  const auth = req.headers.get('authorization')?.trim();
  if (!secret || auth !== `Bearer ${secret}`) {
    console.error(
      '[cron/departure-reminder] rejected — CRON_SECRET %s, Authorization header %s',
      secret ? 'set' : 'MISSING in this environment',
      auth ? 'present but does not match' : 'absent'
    );
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const admin = getAdminClient();

  // Tomorrow, in UTC, to match how departure_date is stored (a plain date).
  const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

  const { data: trips, error: tripErr } = await admin
    .from('traveler_trips')
    .select(
      'id, user_id, departure_city, arrival_city, departure_date, flight_number'
    )
    .eq('departure_date', tomorrow)
    .neq('status', 'cancelled')
    .is('departure_reminder_sent_at', null)
    .limit(MAX_PER_RUN);

  if (tripErr) {
    console.error('[cron/departure-reminder] trip query failed:', tripErr.message);
    return NextResponse.json({ error: 'Query failed' }, { status: 500 });
  }
  if (!trips?.length) {
    return NextResponse.json({ trips: 0, sent: 0 });
  }

  // What each trip is actually carrying. Confirmed and not yet collected —
  // a parcel already in the traveller's hands needs no reminder, and an
  // unconfirmed request is not theirs to carry.
  const { data: parcels } = await admin
    .from('booking_intents')
    .select(
      'id, traveler_trip_id, sender_id, item_title, item_category, pickup_city, pickup_code'
    )
    .in('traveler_trip_id', trips.map((t) => t.id))
    .eq('status', 'confirmed')
    .is('pickup_confirmed_at', null);

  const byTrip = new Map<string, any[]>();
  for (const p of parcels ?? []) {
    const list = byTrip.get(p.traveler_trip_id) ?? [];
    list.push(p);
    byTrip.set(p.traveler_trip_id, list);
  }

  // Names for every sender named in the email. One query rather than one per
  // parcel.
  const senderIds = Array.from(new Set((parcels ?? []).map((p: any) => p.sender_id)));
  const { data: senderProfiles } = senderIds.length
    ? await admin.from('profiles').select('id, full_name').in('id', senderIds)
    : { data: [] as any[] };
  const senderName = new Map((senderProfiles ?? []).map((p: any) => [p.id, p.full_name]));

  const resend = getResend();
  let sent = 0;
  let failed = 0;
  let empty = 0;

  for (const trip of trips) {
    const carried = byTrip.get(trip.id) ?? [];
    // Nothing to carry. Not stamped either: if a sender books this trip later
    // today, tomorrow's run should still be able to tell the traveller.
    if (!carried.length) {
      empty++;
      continue;
    }

    // Mark first. A duplicate send is the worse failure — the traveller who
    // gets this every night stops reading anything we send.
    const { error: markErr } = await admin
      .from('traveler_trips')
      .update({ departure_reminder_sent_at: new Date().toISOString() })
      .eq('id', trip.id)
      .is('departure_reminder_sent_at', null);
    if (markErr) {
      console.error('[cron/departure-reminder] could not mark', trip.id, markErr.message);
      continue;
    }

    try {
      const { data: userData } = await admin.auth.admin.getUserById(trip.user_id);
      const email = userData?.user?.email;
      if (!email) {
        console.warn('[cron/departure-reminder] no email for traveller', trip.user_id);
        continue;
      }

      const { data: profile } = await admin
        .from('profiles')
        .select('full_name')
        .eq('id', trip.user_id)
        .maybeSingle();

      const template = tripDepartureReminderEmail({
        travelerFirstName: profile?.full_name
          ? formatName(profile.full_name).split(' ')[0]
          : null,
        departureCity: trip.departure_city,
        arrivalCity: trip.arrival_city,
        departureDate: new Intl.DateTimeFormat('en-GB', {
          day: 'numeric',
          month: 'short',
        }).format(new Date(trip.departure_date)),
        flightNumber: trip.flight_number,
        parcels: carried.map((p: any) => ({
          itemLabel:
            p.item_title?.trim() || CATEGORY_LABEL[p.item_category] || 'A parcel',
          senderName: senderName.get(p.sender_id)
            ? formatName(senderName.get(p.sender_id) as string).split(' ')[0]
            : null,
          pickupCity: p.pickup_city,
          pickupCode: p.pickup_code,
        })),
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
        console.error('[cron/departure-reminder] resend error:', sendErr);
      } else {
        sent++;
      }
    } catch (e: any) {
      failed++;
      console.error('[cron/departure-reminder] failed for', trip.id, e?.message);
    }
  }

  console.log(
    `[cron/departure-reminder] ${trips.length} leaving tomorrow, ${empty} carrying nothing, ${sent} emailed`
  );

  return NextResponse.json({
    trips: trips.length,
    carryingNothing: empty,
    sent,
    failed,
  });
}
