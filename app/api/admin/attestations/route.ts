import { NextRequest, NextResponse } from 'next/server';
import { getAdminClient } from '@/lib/supabase/server';
import { getAdminContext } from '@/lib/admin';

/**
 * GET /api/admin/attestations?bookingId=<uuid>
 *
 * The evidence file for one parcel, in one request.
 *
 * This is what gets handed over when someone official asks what Jibly did to
 * stop its platform being used to move illegal goods. Everything needed to
 * answer that is here and nothing has to be reconstructed by joining tables by
 * hand at the wrong moment: who declared what, in which language, word for
 * word, against which version of the prohibited-items policy, with the parcel
 * as it was described at that moment — plus the handover timestamps that say
 * the declarations were made around a real event rather than back-filled.
 *
 * Operator-only, and it answers 404 rather than 403 to anyone else: an
 * evidence endpoint should not confirm its own existence to a stranger.
 *
 * Read-only by construction. Attestations have no UPDATE or DELETE policy at
 * all (see 2026-09-15-attestations.sql) — not for users, and not here.
 */
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const { isAdmin } = await getAdminContext();
  if (!isAdmin) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const bookingId = req.nextUrl.searchParams.get('bookingId')?.trim();
  if (!bookingId) {
    return NextResponse.json({ error: 'bookingId required' }, { status: 400 });
  }

  const admin = getAdminClient();

  const { data: booking } = await admin
    .from('booking_intents')
    .select(
      'id, sender_id, traveler_user_id, item_category, item_title, item_description, photo_url, ' +
        'pickup_city, destination_city, created_at, user_certified_at, ' +
        'pickup_confirmed_at, pickup_confirmed_by, received_confirmed_at, ' +
        'delivery_proof_url, delivery_proof_uploaded_at, delivery_proof_receiver_name, status'
    )
    .eq('id', bookingId)
    .maybeSingle();

  if (!booking) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const { data: attestations } = await admin
    .from('booking_attestations')
    .select('*')
    .eq('booking_intent_id', bookingId)
    .order('created_at', { ascending: true });

  // Names and emails of both parties. An attestation that cannot be tied to an
  // identifiable person proves very little.
  const partyIds = [booking.sender_id, booking.traveler_user_id].filter(Boolean) as string[];
  const { data: profiles } = partyIds.length
    ? await admin.from('profiles').select('id, full_name, phone, verification_level').in('id', partyIds)
    : { data: [] as any[] };

  const emails = new Map<string, string | null>();
  for (const id of partyIds) {
    const { data } = await admin.auth.admin.getUserById(id);
    emails.set(id, data?.user?.email ?? null);
  }

  const party = (id: string | null) => {
    if (!id) return null;
    const p = (profiles ?? []).find((x: any) => x.id === id);
    return {
      userId: id,
      fullName: p?.full_name ?? null,
      phone: p?.phone ?? null,
      verificationLevel: p?.verification_level ?? null,
      email: emails.get(id) ?? null,
    };
  };

  const kinds = new Set((attestations ?? []).map((a: any) => a.kind));

  return NextResponse.json({
    generatedAt: new Date().toISOString(),
    booking: {
      id: booking.id,
      status: booking.status,
      route: `${booking.pickup_city} → ${booking.destination_city}`,
      createdAt: booking.created_at,
      // The parcel as it stands TODAY. Each attestation carries its own copy
      // of how it was described at the time; showing both side by side is what
      // reveals a description edited after the fact.
      currentDescription: {
        category: booking.item_category,
        title: booking.item_title,
        description: booking.item_description,
        photoUrl: booking.photo_url,
      },
      handover: {
        senderTickedBoxAt: booking.user_certified_at,
        pickupConfirmedAt: booking.pickup_confirmed_at,
        pickupConfirmedBy: booking.pickup_confirmed_by,
        receivedConfirmedAt: booking.received_confirmed_at,
        deliveryProofUrl: booking.delivery_proof_url,
        deliveryProofUploadedAt: booking.delivery_proof_uploaded_at,
        deliveryProofReceiverName: booking.delivery_proof_receiver_name,
      },
    },
    parties: {
      sender: party(booking.sender_id),
      traveler: party(booking.traveler_user_id),
    },
    attestations: attestations ?? [],
    // Stated plainly so nobody has to infer it from an empty array. A parcel
    // that moved without both is a gap, and the reader should be told rather
    // than left to notice.
    complete: {
      senderCertification: kinds.has('sender_certification'),
      travelerInspection: kinds.has('traveler_inspection'),
      handedOver: !!booking.pickup_confirmed_at,
    },
  });
}
