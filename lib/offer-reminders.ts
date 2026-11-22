import type { SupabaseClient } from '@supabase/supabase-js';
import { getResend, FROM_EMAIL } from '@/lib/email/resend';
import { offerWaitingReminderEmail } from '@/lib/email/templates';
import { formatName } from '@/lib/utils';

// =============================================================================
// Offer reminders — "a traveller is waiting for your answer"
// =============================================================================
// On the day of the sender's date, a sender who still has an unanswered offer
// from a traveller gets one email (French only) telling them so.
//
// The deadline-day email (/api/cron/stale-requests) skips every request with a
// booking on it, offers included, because "nobody has taken your parcel" would
// be false. So a sender sitting on an offer heard nothing, the date passed,
// and the traveller who offered never got an answer.
//
// Two ways out, same checks, same email:
//   - /api/cron/offer-reminders sends at 12:00 Paris time, automatically;
//   - /admin lists today's candidates so the operator can send one by hand.
//
// Once per request, ever, sharing the deadline email's stamp
// (date_reminder_sent_at): a sender gets ONE email about their date, whichever
// of the two it is. Stamped before sending — a duplicate is worse than a miss.

const MAX_PER_RUN = 100;

/** Today's date (YYYY-MM-DD) and the hour, in Paris. */
export function parisClock() {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Europe/Paris',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      hourCycle: 'h23',
    })
      .formatToParts(new Date())
      .map((p) => [p.type, p.value])
  );
  return { today: `${parts.year}-${parts.month}-${parts.day}`, hour: Number(parts.hour) };
}

export type OfferReminder = {
  requestId: string;
  senderId: string;
  toEmail: string | null;
  route: string;
  requestDate: string;
  offerCount: number;
  template: { subject: string; html: string; text: string };
};

/**
 * Requests whose date is today (Paris), not yet reminded, with at least one
 * unanswered traveller offer and nothing else under way. Each comes with the
 * exact email that would go out.
 */
export async function findOfferReminders(admin: SupabaseClient, requestId?: string): Promise<OfferReminder[]> {
  const { today } = parisClock();
  let q = admin
    .from('shipping_requests')
    .select('id, user_id, item_title, pickup_city, destination_city, desired_delivery_date')
    .eq('status', 'pending')
    .is('date_reminder_sent_at', null)
    .eq('desired_delivery_date', today)
    .limit(MAX_PER_RUN);
  if (requestId) q = q.eq('id', requestId);
  const { data: requests, error } = await q;
  if (error) {
    console.error('[offer-reminders] query failed:', error.message);
    return [];
  }
  if (!requests?.length) return [];

  const { data: intents } = await admin
    .from('booking_intents')
    .select('shipping_request_id, status, initiated_by, traveler_user_id, created_at')
    .in('shipping_request_id', requests.map((r) => r.id))
    .neq('status', 'cancelled');

  const out: OfferReminder[] = [];
  for (const request of requests) {
    const mine = (intents ?? []).filter((i) => i.shipping_request_id === request.id);
    const offers = mine.filter((i) => i.initiated_by === 'traveler' && i.status === 'pending');
    // Only an unanswered offer, and nothing already under way on this parcel.
    if (!offers.length || offers.length !== mine.length) continue;

    const latest = [...offers].sort((a, b) => (a.created_at < b.created_at ? 1 : -1))[0];
    const { data: people } = await admin
      .from('profiles')
      .select('id, full_name')
      .in('id', [request.user_id, latest.traveler_user_id].filter(Boolean));
    const first = (id: string | null) => {
      const full = (people ?? []).find((p: any) => p.id === id)?.full_name;
      return full ? formatName(full).split(' ')[0] : null;
    };
    const { data: userData } = await admin.auth.admin.getUserById(request.user_id);

    out.push({
      requestId: request.id,
      senderId: request.user_id,
      toEmail: userData?.user?.email ?? null,
      route: `${request.pickup_city} → ${request.destination_city}`,
      requestDate: request.desired_delivery_date,
      offerCount: offers.length,
      template: offerWaitingReminderEmail({
        senderFirstName: first(request.user_id),
        travelerFirstName: offers.length === 1 ? first(latest.traveler_user_id) : null,
        offerCount: offers.length,
        itemLabel: request.item_title?.trim() || null,
        pickupCity: request.pickup_city,
        destinationCity: request.destination_city,
        requestDate: request.desired_delivery_date,
        isToday: true,
      }),
    });
  }
  return out;
}

/** Claim the request's stamp, then send. False if already sent or it failed. */
export async function sendOfferReminder(admin: SupabaseClient, r: OfferReminder): Promise<boolean> {
  if (!r.toEmail) return false;
  const { data: claimed } = await admin
    .from('shipping_requests')
    .update({ date_reminder_sent_at: new Date().toISOString() })
    .eq('id', r.requestId)
    .is('date_reminder_sent_at', null)
    .select('id');
  if (!claimed?.length) return false;
  try {
    await getResend().emails.send({
      from: FROM_EMAIL,
      to: r.toEmail,
      subject: r.template.subject,
      html: r.template.html,
      text: r.template.text,
    });
    return true;
  } catch (e: any) {
    console.error('[offer-reminders] send failed for', r.requestId, e?.message);
    // Give it back, so the operator can retry from /admin.
    await admin.from('shipping_requests').update({ date_reminder_sent_at: null }).eq('id', r.requestId);
    return false;
  }
}
