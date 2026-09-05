import { NextRequest, NextResponse } from 'next/server';
import { getAdminClient } from '@/lib/supabase/server';
import { getResend, FROM_EMAIL } from '@/lib/email/resend';
import { requestDateReachedEmail } from '@/lib/email/templates';
import { formatName } from '@/lib/utils';

/**
 * GET /api/cron/stale-requests
 *
 * Ask a sender whether they still need a parcel carried, on the day their
 * chosen date arrives with no traveller.
 *
 * listOpenRequests only shows requests whose desired_delivery_date is still
 * ahead, so the day after it passes the request stops being shown — silently.
 * The sender is told nothing and goes on believing they are on the market,
 * which is the worst version of this: not a rejection, just silence.
 *
 * Sent once per request, ever. date_reminder_sent_at is stamped whether or not
 * the email went out, because a sender who gets the same question every
 * morning learns to filter us, and losing one reminder to a transient Resend
 * error is much cheaper than that.
 */
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Bounded so one bad day cannot turn into a thousand-email run.
const MAX_PER_RUN = 100;

// ITEM_CATEGORIES carries translation KEYS, and a cron has no locale context to
// resolve them with — `cat.value` is the slug ('cles'), which would put
// "Still need cles carried?" in someone's inbox. Emails are English-only, so
// the English words live here.
const CATEGORY_LABEL: Record<string, string> = {
  documents: 'your documents',
  cles: 'your keys',
  vetements: 'your clothes',
  electronique: 'your electronics',
  petits_objets: 'your parcel',
  otc: 'your medicine',
};

export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET?.trim();
  const auth = req.headers.get('authorization')?.trim();
  if (!secret || auth !== `Bearer ${secret}`) {
    console.error(
      '[cron/stale-requests] rejected — CRON_SECRET %s, Authorization header %s',
      secret ? 'set' : 'MISSING in this environment',
      auth ? 'present but does not match' : 'absent'
    );
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const admin = getAdminClient();
  const today = new Date().toISOString().slice(0, 10);

  const { data: stale, error } = await admin
    .from('shipping_requests')
    .select(
      'id, user_id, item_title, item_category, pickup_city, destination_city, desired_delivery_date, budget'
    )
    .eq('status', 'pending')
    .is('date_reminder_sent_at', null)
    .lte('desired_delivery_date', today)
    .limit(MAX_PER_RUN);

  if (error) {
    console.error('[cron/stale-requests] query failed:', error.message);
    return NextResponse.json({ error: 'Query failed' }, { status: 500 });
  }
  if (!stale?.length) {
    return NextResponse.json({ candidates: 0, sent: 0 });
  }

  // Drop any that a traveller has in fact taken on. status stays 'pending' on a
  // request whose booking is still awaiting acceptance, so the status alone
  // would email someone whose parcel is halfway to being carried.
  const { data: booked } = await admin
    .from('booking_intents')
    .select('shipping_request_id')
    .in('shipping_request_id', stale.map((r) => r.id))
    .neq('status', 'cancelled');

  const taken = new Set((booked ?? []).map((b) => b.shipping_request_id));
  const targets = stale.filter((r) => !taken.has(r.id));

  const resend = getResend();
  let sent = 0;
  let failed = 0;

  for (const request of targets) {
    // Mark first. A duplicate send is a worse failure than a missed one: the
    // sender who gets this every morning stops reading anything we send.
    const { error: markErr } = await admin
      .from('shipping_requests')
      .update({ date_reminder_sent_at: new Date().toISOString() })
      .eq('id', request.id)
      .is('date_reminder_sent_at', null);
    if (markErr) {
      console.error('[cron/stale-requests] could not mark', request.id, markErr.message);
      continue;
    }

    try {
      const { data: userData } = await admin.auth.admin.getUserById(request.user_id);
      const email = userData?.user?.email;
      if (!email) {
        console.warn('[cron/stale-requests] no email for', request.user_id);
        continue;
      }

      const { data: profile } = await admin
        .from('profiles')
        .select('full_name')
        .eq('id', request.user_id)
        .maybeSingle();

      const template = requestDateReachedEmail({
        senderFirstName: profile?.full_name
          ? formatName(profile.full_name).split(' ')[0]
          : null,
        // The sender's own words when they gave any, so the subject line names
        // the thing they remember rather than a category.
        itemLabel:
          request.item_title?.trim() ||
          CATEGORY_LABEL[request.item_category] ||
          'your parcel',
        pickupCity: request.pickup_city,
        destinationCity: request.destination_city,
        budget: request.budget,
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
        console.error('[cron/stale-requests] resend error:', sendErr);
      } else {
        sent++;
      }
    } catch (e: any) {
      failed++;
      console.error('[cron/stale-requests] failed for', request.id, e?.message);
    }
  }

  console.log(
    `[cron/stale-requests] ${stale.length} past date, ${targets.length} unmatched, ${sent} emailed`
  );

  return NextResponse.json({
    candidates: stale.length,
    // Past their date but already taken on by a traveller — no email owed.
    alreadyTaken: stale.length - targets.length,
    sent,
    failed,
  });
}
