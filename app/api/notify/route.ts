// app/api/notify/route.ts 
//
// Server-only endpoint for transactional emails. Resend can't be called
// directly from browser code (the API key would leak), so the client
// fetches this route which holds the key safely in environment vars.
//
// Two event types are supported via the `event` field:
//   - 'sender-got-proposal' : sent to the sender when a traveler proposes
//   - 'traveler-got-booking': sent to the traveler when a sender books
//
// Failures are intentionally NON-FATAL: the response is always 200 with
// `{ok: false, reason}` on failure. The booking shouldn't be rolled back
// just because an email failed to send — the in-app notification still
// works and the user will see it when they next open the app.

import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getServerClient } from '@/lib/supabase/server';
import { getResend, FROM_EMAIL } from '@/lib/email/resend';
import { travelerNetFromTotal, formatName } from '@/lib/utils';
import {
  senderGotProposalEmail,
  travelerGotBookingEmail,
  bookingConfirmedSenderEmail,
  bookingConfirmedTravelerEmail,
  proposalDeclinedTravelerEmail,
} from '@/lib/email/templates';
export const dynamic = 'force-dynamic';

type NotifyPayload = {
  event:
    | 'sender-got-proposal'
    | 'traveler-got-booking'
    | 'booking-confirmed-sender'
    | 'booking-confirmed-traveler'
    | 'proposal-declined';
  bookingId: string;
};

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as NotifyPayload;
    if (!body?.event || !body?.bookingId) {
      return NextResponse.json({ ok: false, reason: 'missing_fields' });
    }

    // The caller must be authenticated. This endpoint reads private emails
    // and (for confirmation events) embeds pickup/delivery codes, so it must
    // never be triggerable by an anonymous request guessing a bookingId.
    const authClient = getServerClient();
    const { data: { user } } = await authClient.auth.getUser();
    if (!user) {
      return NextResponse.json({ ok: false, reason: 'unauthorized' }, { status: 401 });
    }

    // Use the service-role key for this internal call. The API key is
    // never exposed to the browser — only the Vercel serverless runtime
    // ever sees it. RLS is bypassed so we can read both parties' emails.
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false } }
    );

    // Fetch the booking to figure out who to email
   const { data: booking, error: bookingErr } = await supabase
      .from('booking_intents')
      .select(
        'id, sender_id, traveler_user_id, traveler_trip_id, pickup_city, destination_city, proposed_price, item_title, item_category, item_description, shipping_request_id, initiated_by, pickup_code, delivery_code'
      )
      .eq('id', body.bookingId)
      .maybeSingle();
    if (bookingErr || !booking) {
      return NextResponse.json({ ok: false, reason: 'booking_not_found' });
    }

    // If traveler_user_id isn't set directly, look it up via the trip
    let travelerId = booking.traveler_user_id;
    if (!travelerId && booking.traveler_trip_id) {
      const { data: trip } = await supabase
        .from('traveler_trips')
        .select('user_id')
        .eq('id', booking.traveler_trip_id)
        .maybeSingle();
      travelerId = trip?.user_id ?? null;
    }

    if (!travelerId) {
      return NextResponse.json({ ok: false, reason: 'no_traveler' });
    }

    // Authorisation: the caller must be a party (sender or traveler) of this
    // booking. Prevents enumerating bookingIds to spam emails or leak codes.
    if (user.id !== booking.sender_id && user.id !== travelerId) {
      return NextResponse.json({ ok: false, reason: 'forbidden' }, { status: 403 });
    }

    // Fetch both profiles + auth.users emails in one go
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, full_name')
      .in('id', [booking.sender_id, travelerId]);

    const senderProfile = profiles?.find((p) => p.id === booking.sender_id);
    const travelerProfile = profiles?.find((p) => p.id === travelerId);

    // First name, title-cased. Splitting alone printed exactly what was typed,
    // so someone who signed up as "yassine" was greeted as "yassine" in every
    // email Jibly ever sent them — while seeing "Yassine" on their own profile.
    const firstName = (full?: string | null) =>
      full ? formatName(full).split(' ')[0] : null;

    // Look up the recipient's auth email (only the service role can read
    // auth.users; that's why we use the service-role client above).
    // Decide who receives this email based on the event
    const recipientId =
      body.event === 'sender-got-proposal' || body.event === 'booking-confirmed-sender'
        ? booking.sender_id
        : travelerId;

    const { data: userRes, error: userErr } =
      await supabase.auth.admin.getUserById(recipientId);

    if (userErr || !userRes?.user?.email) {
      return NextResponse.json({ ok: false, reason: 'no_email' });
    }
    const toEmail = userRes.user.email;

    // Build the template based on the event
    // Build the template based on the event
    let template: { subject: string; html: string; text: string };
    if (body.event === 'sender-got-proposal') {
      template = senderGotProposalEmail({
        senderFirstName: firstName(senderProfile?.full_name),
        travelerFirstName: firstName(travelerProfile?.full_name),
        pickupCity: booking.pickup_city,
        destinationCity: booking.destination_city,
        proposedPrice: booking.proposed_price,
        bookingId: booking.id,
      });
    } else if (body.event === 'traveler-got-booking') {
      template = travelerGotBookingEmail({
        travelerFirstName: firstName(travelerProfile?.full_name),
        senderFirstName: firstName(senderProfile?.full_name),
        pickupCity: booking.pickup_city,
        destinationCity: booking.destination_city,
        travelerReceives: travelerNetFromTotal(booking.proposed_price),
        itemDescription: booking.item_description,
        bookingId: booking.id,
      });
    } else if (body.event === 'booking-confirmed-sender') {
      // No code goes out here any more. The sender's DELIVERY code is held
      // back until the parcel is actually collected and sent by
      // /api/booking/confirm-pickup, so the two parties never juggle two
      // codes at once. The sender must in any case NEVER receive the pickup
      // code: that one is the traveler's, and if both parties hold it the
      // sender can confirm a handover that never happened.
      template = bookingConfirmedSenderEmail({
        senderFirstName: firstName(senderProfile?.full_name),
        travelerFirstName: firstName(travelerProfile?.full_name),
        pickupCity: booking.pickup_city,
        destinationCity: booking.destination_city,
        proposedPrice: booking.proposed_price,
        bookingId: booking.id,
      });
    } else if (body.event === 'booking-confirmed-traveler') {
      // The TRAVELER holds the PICKUP code and reads it to the sender when
      // they collect the parcel. Mirror image of the sender above.
      if (!booking.pickup_code) {
        return NextResponse.json({ ok: false, reason: 'no_pickup_code' });
      }
      template = bookingConfirmedTravelerEmail({
        travelerFirstName: firstName(travelerProfile?.full_name),
        senderFirstName: firstName(senderProfile?.full_name),
        pickupCity: booking.pickup_city,
        destinationCity: booking.destination_city,
        travelerReceives: travelerNetFromTotal(booking.proposed_price),
        code: booking.pickup_code,
        bookingId: booking.id,
      });
    } else if (body.event === 'proposal-declined') {
      // Until now this said nothing. A traveller offered to carry a parcel,
      // the sender said no, and the traveller found out — if ever — by noticing
      // the offer had gone grey in a list they had no reason to reopen.
      //
      // It also makes a rule honest elsewhere: a sender can no longer withdraw
      // a parcel while an offer is live, they have to decline it first. That
      // only protects the traveller if declining actually reaches them.
      const itemLabel =
        booking.item_title?.trim() || booking.item_description?.trim() || 'a parcel';

      // What else is worth their trip. Same corridor, still open, still in
      // date — and never the one just declined.
      const today = new Date().toISOString().slice(0, 10);
      let altQuery = supabase
        .from('shipping_requests')
        .select('id, item_title, item_category, pickup_city, destination_city, budget, desired_delivery_date')
        .eq('pickup_city', booking.pickup_city)
        .eq('destination_city', booking.destination_city)
        .eq('status', 'pending')
        .gte('desired_delivery_date', today)
        .order('desired_delivery_date', { ascending: true })
        .limit(3);
      if (booking.shipping_request_id) {
        altQuery = altQuery.neq('id', booking.shipping_request_id);
      }
      const { data: alts } = await altQuery;

      template = proposalDeclinedTravelerEmail({
        travelerFirstName: firstName(travelerProfile?.full_name),
        senderFirstName: firstName(senderProfile?.full_name),
        itemLabel,
        pickupCity: booking.pickup_city,
        destinationCity: booking.destination_city,
        alternatives: (alts ?? []).map((a: any) => ({
          itemLabel: a.item_title?.trim() || 'A parcel',
          pickupCity: a.pickup_city,
          destinationCity: a.destination_city,
          budget: a.budget,
          byDate: new Intl.DateTimeFormat('en-GB', {
            day: 'numeric',
            month: 'short',
          }).format(new Date(a.desired_delivery_date)),
        })),
      });

      // In-app too. 'proposal_declined' is a type the notifications dropdown
      // already knows how to draw — it simply had nothing producing it.
      // Best-effort: the notifications table is managed outside this repo's
      // migrations, so it must not be able to take the email down with it.
      try {
        await supabase.from('notifications').insert({
          user_id: recipientId,
          type: 'proposal_declined',
          title: `Your offer on ${booking.pickup_city} → ${booking.destination_city} was declined`,
          body: `${firstName(senderProfile?.full_name) ?? 'The sender'} will not be sending ${itemLabel} with you. Nothing was charged.`,
          link: '/voyager',
          related_booking_id: booking.id,
        });
      } catch (e: any) {
        console.error('[notify] proposal_declined notification failed:', e?.message);
      }
    } else {
      return NextResponse.json({ ok: false, reason: 'unknown_event' });
    }

    // Fire the email. Resend errors are non-fatal — log them and return ok.
    try {
      const resend = getResend();
      await resend.emails.send({
        from: FROM_EMAIL,
        to: toEmail,
        subject: template.subject,
        html: template.html,
        text: template.text,
      });
    } catch (e) {
      console.error('[notify] resend send failed:', e);
      return NextResponse.json({ ok: false, reason: 'resend_failed' });
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error('[notify] handler error:', e);
    return NextResponse.json({ ok: false, reason: 'handler_error' });
  }
}
