import { NextResponse } from 'next/server';
import { getAdminClient } from '@/lib/supabase/server';
import { getAdminContext } from '@/lib/admin';

/**
 * GET /api/admin/users — every account, with what it has done on Jibly.
 *
 * One row per profile, joined with the auth record (email, last sign-in) and
 * counts of trips, requests and bookings. For the operator's eyes only.
 *
 * Deliberately left out: handover codes, Stripe ids and bank fingerprints,
 * identity documents. Nothing an operator needs to recognise or help a user,
 * and every one of them is worth more to an attacker than to us if this
 * response ever leaks.
 */
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const PAID = new Set(['authorized', 'captured']);

export async function GET() {
  const { isAdmin } = await getAdminContext();
  if (!isAdmin) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const admin = getAdminClient();

  const [profilesRes, tripsRes, requestsRes, bookingsRes] = await Promise.all([
    admin.from('profiles').select('*').order('created_at', { ascending: false }).limit(2000),
    admin.from('traveler_trips').select('user_id, status'),
    admin.from('shipping_requests').select('user_id, status'),
    admin.from('booking_intents').select('sender_id, traveler_user_id, payment_status, payment_amount'),
  ]);
  if (profilesRes.error) {
    console.error('[admin/users] profiles query failed:', profilesRes.error.message);
    return NextResponse.json({ error: 'Query failed' }, { status: 500 });
  }

  // auth.users holds the email and sign-in times; profiles does not.
  const auth = new Map<string, any>();
  for (let page = 1; page <= 20; page++) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) {
      console.error('[admin/users] listUsers failed:', error.message);
      break;
    }
    for (const u of data.users) auth.set(u.id, u);
    if (data.users.length < 1000) break;
  }

  type Counts = {
    trips: number; tripsOpen: number;
    requests: number; requestsOpen: number;
    sentPaid: number; carriedPaid: number; spentCents: number;
  };
  const counts = new Map<string, Counts>();
  const c = (id: string | null) => {
    if (!id) return null;
    let row = counts.get(id);
    if (!row) {
      row = { trips: 0, tripsOpen: 0, requests: 0, requestsOpen: 0, sentPaid: 0, carriedPaid: 0, spentCents: 0 };
      counts.set(id, row);
    }
    return row;
  };
  for (const t of tripsRes.data ?? []) {
    const row = c(t.user_id); if (!row) continue;
    row.trips += 1;
    if (t.status === 'open') row.tripsOpen += 1;
  }
  for (const r of requestsRes.data ?? []) {
    const row = c(r.user_id); if (!row) continue;
    row.requests += 1;
    if (r.status === 'pending') row.requestsOpen += 1;
  }
  for (const b of bookingsRes.data ?? []) {
    if (!PAID.has(b.payment_status)) continue;
    const s = c(b.sender_id);
    if (s) { s.sentPaid += 1; s.spentCents += b.payment_amount ?? 0; }
    const tr = c(b.traveler_user_id);
    if (tr) tr.carriedPaid += 1;
  }

  const users = (profilesRes.data ?? []).map((p: any) => {
    const a = auth.get(p.id);
    const n = counts.get(p.id);
    return {
      id: p.id as string,
      name: p.full_name ?? null,
      email: a?.email ?? null,
      phone: p.phone ?? null,
      city: p.city ?? null,
      country: p.country ?? null,
      createdAt: p.created_at as string,
      lastSignInAt: a?.last_sign_in_at ?? null,
      emailConfirmed: !!a?.email_confirmed_at,
      verification: p.verification_level ?? null,
      identityStatus: p.identity_verification_status ?? null,
      payoutsEnabled: !!p.stripe_payouts_enabled,
      deleted: !!p.deleted_at,
      rating: Number(p.rating ?? 0),
      trips: n?.trips ?? 0,
      tripsOpen: n?.tripsOpen ?? 0,
      requests: n?.requests ?? 0,
      requestsOpen: n?.requestsOpen ?? 0,
      sentPaid: n?.sentPaid ?? 0,
      carriedPaid: n?.carriedPaid ?? 0,
      spentEur: Math.round((n?.spentCents ?? 0)) / 100,
      // The campaign link they signed up from (lib/utm.ts), if any.
      sourceCampaign: (a?.user_metadata?.signup_source?.campaign as string | undefined) ?? null,
      sourceName: (a?.user_metadata?.signup_source?.source as string | undefined) ?? null,
    };
  });

  return NextResponse.json({ users });
}
