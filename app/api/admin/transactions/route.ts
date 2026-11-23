import { NextRequest, NextResponse } from 'next/server';
import { getAdminClient } from '@/lib/supabase/server';
import { getAdminContext } from '@/lib/admin';
import { DISPUTE_SETTLED_FILTER, isDisputeSettled } from '@/lib/disputes';

/**
 * GET /api/admin/transactions            → every booking, newest first, with a status
 * GET /api/admin/transactions?id=<uuid>  → one booking with everything attached to it
 *
 * The operator asked to see EVERYTHING people typed into a transaction, the
 * photos and where it stands. So the detail deliberately reads `select('*')`
 * from every table the booking touches rather than a column list: a column
 * added next month shows up here without anyone remembering to add it. The
 * client labels the columns it knows and prints the others under their raw
 * name, which is ugly but never silently missing.
 *
 * Photos live in private buckets. Every stored-object URL found anywhere in the
 * detail is swapped for a one-hour signed URL, so a photo column nobody listed
 * still renders.
 */

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const SIGN_TTL = 60 * 60;

/** One human status for a booking, in the order that decides what is true. */
function statusOf(b: any, openDispute: boolean): { code: string; label: string } {
  const refunded = (b.refunded_amount ?? 0) > 0;
  if (b.status === 'cancelled') {
    if (refunded) return { code: 'cancelled_refunded', label: 'Annulée · remboursée' };
    if (b.payment_status === 'captured') return { code: 'cancelled_owed', label: 'Annulée · à rembourser' };
    return { code: 'cancelled', label: 'Annulée' };
  }
  if (b.payment_status === 'failed') return { code: 'failed', label: 'Paiement échoué' };
  if (openDispute) return { code: 'dispute', label: 'Litige ouvert' };
  if (refunded) return { code: 'refunded_partial', label: 'Remboursée en partie' };
  if (b.transfer_id) return { code: 'paid_out', label: 'Terminée · voyageur payé' };
  if (b.received_confirmed_at || b.auto_released_at)
    return { code: 'delivered', label: 'Livrée · virement en attente' };
  if (b.delivery_proof_uploaded_at) return { code: 'proof', label: 'Preuve envoyée · code non saisi' };
  if (b.pickup_confirmed_at) return { code: 'in_transit', label: 'En transit' };
  if (b.status === 'confirmed') return { code: 'confirmed', label: 'Acceptée · en attente de remise' };
  if (b.payment_status === 'authorized') return { code: 'awaiting_traveler', label: 'En attente du voyageur' };
  if (b.initiated_by === 'traveler') return { code: 'awaiting_sender', label: 'Proposition · en attente de paiement' };
  return { code: 'pending', label: 'En attente' };
}

/** bucket + path from a stored Supabase object URL, or null. */
function parseStoredUrl(url: string): { bucket: string; path: string } | null {
  const m = url.match(/\/storage\/v1\/object\/(?:public|sign)\/([^/?#]+)\/([^?#]+)/);
  if (!m) return null;
  let path: string;
  try {
    path = decodeURIComponent(m[2]);
  } catch {
    return null;
  }
  if (!path || path.includes('..') || path.startsWith('/')) return null;
  return { bucket: m[1], path };
}

/** Collect every storage URL in a value, recursively. */
function collectUrls(v: any, out: Set<string>) {
  if (typeof v === 'string') {
    if (v.includes('/storage/v1/object/')) out.add(v);
  } else if (Array.isArray(v)) {
    v.forEach((x) => collectUrls(x, out));
  } else if (v && typeof v === 'object') {
    Object.values(v).forEach((x) => collectUrls(x, out));
  }
}

async function names(admin: any, ids: string[]) {
  if (!ids.length) return new Map<string, string | null>();
  const { data } = await admin.from('profiles').select('id, full_name').in('id', ids);
  return new Map<string, string | null>((data ?? []).map((p: any) => [p.id, p.full_name]));
}

/** select('*') where a related table may not exist on every deployment. */
async function rowsFor(admin: any, table: string, column: string, value: string, order = 'created_at') {
  const { data, error } = await admin.from(table).select('*').eq(column, value).order(order, { ascending: true });
  if (error) {
    console.warn(`[admin/transactions] ${table}: ${error.message}`);
    return [];
  }
  return data ?? [];
}

export async function GET(req: NextRequest) {
  const { isAdmin, userId } = await getAdminContext();
  if (!isAdmin) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const admin = getAdminClient();
  const id = req.nextUrl.searchParams.get('id');

  // ---------------------------------------------------------------- list
  if (!id) {
    const { data: bookings, error } = await admin
      .from('booking_intents')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(500);
    if (error) {
      console.error('[admin/transactions] list failed:', error.message);
      return NextResponse.json({ error: 'Query failed' }, { status: 500 });
    }
    const rows = bookings ?? [];
    const ids = rows.map((b: any) => b.id);
    const { data: open } = ids.length
      ? await admin
          .from('disputes')
          .select('booking_intent_id')
          .in('booking_intent_id', ids)
          .not('status', 'in', DISPUTE_SETTLED_FILTER)
      : { data: [] as any[] };
    const disputed = new Set((open ?? []).map((d: any) => d.booking_intent_id));
    const nameById = await names(admin, [
      ...new Set(rows.flatMap((b: any) => [b.sender_id, b.traveler_user_id]).filter(Boolean)),
    ] as string[]);

    return NextResponse.json({
      transactions: rows.map((b: any) => ({
        id: b.id,
        createdAt: b.created_at,
        route: `${b.pickup_city ?? '?'} → ${b.destination_city ?? '?'}`,
        item: b.item_title || b.item_category,
        euros: b.payment_amount != null ? b.payment_amount / 100 : b.proposed_price ?? null,
        paid: b.payment_amount != null,
        senderName: nameById.get(b.sender_id) ?? null,
        travelerName: nameById.get(b.traveler_user_id) ?? null,
        hasPhoto: !!b.photo_url || !!b.delivery_proof_url,
        status: statusOf(b, disputed.has(b.id)),
      })),
    });
  }

  // -------------------------------------------------------------- detail
  if (!UUID.test(id)) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const { data: booking } = await admin.from('booking_intents').select('*').eq('id', id).maybeSingle();
  if (!booking) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const one = async (table: string, rowId: string | null) => {
    if (!rowId) return null;
    const { data } = await admin.from(table).select('*').eq('id', rowId).maybeSingle();
    return data ?? null;
  };

  const [trip, request, sender, traveler, attestations, disputes, reviews, offers, conversations] =
    await Promise.all([
      one('traveler_trips', booking.traveler_trip_id),
      one('shipping_requests', booking.shipping_request_id),
      one('profiles', booking.sender_id),
      one('profiles', booking.traveler_user_id),
      rowsFor(admin, 'booking_attestations', 'booking_intent_id', id),
      rowsFor(admin, 'disputes', 'booking_intent_id', id),
      rowsFor(admin, 'reviews', 'booking_intent_id', id),
      rowsFor(admin, 'price_offers', 'booking_intent_id', id),
      rowsFor(admin, 'conversations', 'booking_intent_id', id),
    ]);

  // Emails live on auth.users, not on profiles.
  const emailOf = async (uid: string | null) => {
    if (!uid) return null;
    const { data } = await admin.auth.admin.getUserById(uid);
    return data?.user?.email ?? null;
  };
  const [senderEmail, travelerEmail] = await Promise.all([
    emailOf(booking.sender_id),
    emailOf(booking.traveler_user_id),
  ]);

  const convIds = conversations.map((c: any) => c.id);
  const { data: messages } = convIds.length
    ? await admin
        .from('messages')
        .select('*')
        .in('conversation_id', convIds)
        .order('created_at', { ascending: true })
        .limit(1000)
    : { data: [] as any[] };
  if (convIds.length) console.log(`[admin/transactions] booking ${id} chat read by ${userId}`);

  const openDispute = disputes.some((d: any) => !isDisputeSettled(d.status));

  const detail = {
    booking,
    status: statusOf(booking, openDispute),
    sender: sender ? { ...sender, email: senderEmail } : null,
    traveler: traveler ? { ...traveler, email: travelerEmail } : null,
    trip,
    request,
    attestations,
    disputes,
    reviews,
    offers,
    messages: messages ?? [],
  };

  // Sign every stored photo found anywhere above.
  const urls = new Set<string>();
  collectUrls(detail, urls);
  const signed: Record<string, string> = {};
  await Promise.all(
    [...urls].map(async (u) => {
      const p = parseStoredUrl(u);
      if (!p) return;
      const { data } = await admin.storage.from(p.bucket).createSignedUrl(p.path, SIGN_TTL);
      if (data?.signedUrl) signed[u] = data.signedUrl;
    })
  );

  return NextResponse.json({ ...detail, signed });
}
