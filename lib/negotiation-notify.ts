import { getAdminClient } from '@/lib/supabase/server';
import { getResend, FROM_EMAIL } from '@/lib/email/resend';
import { priceNegotiationEmail } from '@/lib/email/templates';
import { formatName, travelerNetFromTotal } from '@/lib/utils';
import { canSenderCounter, canTravelerCounter } from '@/lib/negotiation';

/**
 * Email the party who now has to answer a price (or hear that it was refused).
 * Server-only, called by the routes that change a price, AFTER the change is
 * written — so the email describes the row as it now is.
 *
 * Never throws: a lost email must not undo a price that was agreed or a hold
 * that was released. Failures are logged.
 */
export async function notifyNegotiation(
  bookingId: string,
  kind: 'offer_to_traveler' | 'counter_to_sender' | 'refused_to_sender'
): Promise<void> {
  try {
    const admin = getAdminClient();
    const { data: b } = await admin
      .from('booking_intents')
      .select(
        'id, sender_id, traveler_user_id, status, initiated_by, proposed_price, original_price, price_pending_by, sender_countered, traveler_countered, payment_status, pickup_city, destination_city, item_title'
      )
      .eq('id', bookingId)
      .maybeSingle();
    if (!b || !b.traveler_user_id) return;

    const toTraveler = kind === 'offer_to_traveler';
    const recipientId = toTraveler ? b.traveler_user_id : b.sender_id;
    const otherId = toTraveler ? b.sender_id : b.traveler_user_id;

    const { data: people } = await admin
      .from('profiles')
      .select('id, full_name, identity_verified_at')
      .in('id', [recipientId, otherId]);
    const recipientVerified = !!(people ?? []).find((p: any) => p.id === recipientId)
      ?.identity_verified_at;
    const first = (id: string) => {
      const full = (people ?? []).find((p: any) => p.id === id)?.full_name;
      return full ? formatName(full).split(' ')[0] : null;
    };
    const { data: userRes } = await admin.auth.admin.getUserById(recipientId);
    const to = userRes?.user?.email;
    if (!to) return;

    const total = Number(b.proposed_price);
    const template = priceNegotiationEmail({
      kind,
      recipientFirstName: first(recipientId),
      otherFirstName: first(otherId),
      pickupCity: b.pickup_city,
      destinationCity: b.destination_city,
      itemLabel: b.item_title?.trim() || null,
      amount: toTraveler ? travelerNetFromTotal(total) : total,
      senderTotal: toTraveler ? total : undefined,
      canCounter:
        kind === 'offer_to_traveler'
          ? canTravelerCounter(b as any)
          : kind === 'counter_to_sender'
            ? canSenderCounter(b as any)
            : false,
      path: toTraveler ? `/me?booking=${b.id}` : '/me?tab=sends',
      // Trips can be published before the identity check; accepting can't.
      identityRequired: toTraveler && !recipientVerified,
    });

    await getResend().emails.send({
      from: FROM_EMAIL,
      to,
      subject: template.subject,
      html: template.html,
      text: template.text,
    });
  } catch (e: any) {
    console.error('[negotiation] email %s for %s failed: %s', kind, bookingId, e?.message);
  }
}
