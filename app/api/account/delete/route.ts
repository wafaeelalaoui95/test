import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getServerClient } from '@/lib/supabase/server';

/**
 * POST /api/account/delete
 *
 * Anonymises (soft-deletes) the current user's account:
 *   1. Refuses if the user has an active obligation (a trip or shipping
 *      request that is `matched` or `in_transit`) — we don't strand a
 *      counterparty or an in-escrow payment.
 *   2. Cancels the user's still-open listings so they leave search results,
 *      while keeping closed-match history and received reviews intact.
 *   3. Wipes PII from the profile row and stamps `deleted_at`. The row stays
 *      so reviews *about* this user survive (a scammer can't erase their bad
 *      reputation by deleting their account).
 *   4. Frees the e-mail and blocks login by scrambling the auth.users e-mail
 *      to a reserved `.invalid` address and banning the user. We deliberately
 *      do NOT delete the auth.users row — that would cascade-delete the
 *      profile (profiles.id references auth.users on delete cascade) and undo
 *      step 3. After this, signing up again with the original e-mail creates a
 *      brand-new account (new id, fresh profile via the on_auth_user_created
 *      trigger); the old anonymised profile remains as a tombstone.
 *
 * Requires SUPABASE_SERVICE_ROLE_KEY (server-only) for the auth admin call.
 */

export const runtime = 'nodejs';

function getAdminSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    throw new Error(
      `Missing env vars: NEXT_PUBLIC_SUPABASE_URL=${!!url}, SUPABASE_SERVICE_ROLE_KEY=${!!serviceKey}`
    );
  }
  return createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export async function POST() {
  const supabase = getServerClient();

  const {
    data: { user },
    error: userErr,
  } = await supabase.auth.getUser();
  if (userErr || !user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  let admin: ReturnType<typeof getAdminSupabase>;
  try {
    admin = getAdminSupabase();
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Server misconfiguration' },
      { status: 500 }
    );
  }

  // 1. Block deletion while an obligation is in flight. A `matched`/`in_transit`
  //    trip or request implies an accepted match and (likely) a Stripe escrow
  //    hold — the user must complete or cancel it before leaving.
  const ACTIVE = ['matched', 'in_transit'];

  const [activeTrips, activeRequests] = await Promise.all([
    admin
      .from('traveler_trips')
      .select('id')
      .eq('user_id', user.id)
      .in('status', ACTIVE)
      .limit(1),
    admin
      .from('shipping_requests')
      .select('id')
      .eq('user_id', user.id)
      .in('status', ACTIVE)
      .limit(1),
  ]);

  if (activeTrips.error || activeRequests.error) {
    return NextResponse.json(
      { error: activeTrips.error?.message || activeRequests.error?.message },
      { status: 500 }
    );
  }

  if (
    (activeTrips.data?.length ?? 0) > 0 ||
    (activeRequests.data?.length ?? 0) > 0
  ) {
    return NextResponse.json(
      {
        error: 'active_obligation',
        message:
          'Vous avez un envoi ou un trajet en cours. Terminez-le ou annulez-le avant de supprimer votre compte.',
      },
      { status: 409 }
    );
  }

  // 2. Cancel still-open listings so they disappear from search (RLS only
  //    surfaces open/pending/matched/... rows). Closed/completed rows are left
  //    untouched so match history stays consistent.
  await Promise.all([
    admin
      .from('traveler_trips')
      .update({ status: 'cancelled' })
      .eq('user_id', user.id)
      .in('status', ['draft', 'open']),
    admin
      .from('shipping_requests')
      .update({ status: 'cancelled' })
      .eq('user_id', user.id)
      .in('status', ['draft', 'pending']),
  ]);

  // 3. Keep the minimal identity record BEFORE anonymising, or it is gone.
  //
  //    The right to erasure has limits: GDPR Art. 17(3) preserves what is
  //    needed to establish or defend legal claims, and AML rules require KYC
  //    retention outright for a platform that holds third-party funds. Without
  //    this, someone could behave badly, delete, and become unidentifiable —
  //    while Jibly still owed an authority an answer about them.
  //
  //    Service-role only, RLS denies everyone, five-year purge date on the row.
  //    See 2026-09-03-deleted-account-records.sql.
  const { data: current } = await admin
    .from('profiles')
    .select('full_name, phone, identity_verification_id, stripe_account_id')
    .eq('id', user.id)
    .maybeSingle();

  const { error: recordErr } = await admin
    .from('deleted_account_records')
    .upsert({
      user_id: user.id,
      full_name: current?.full_name ?? null,
      email: user.email ?? null,
      phone: current?.phone ?? null,
      identity_verification_id: current?.identity_verification_id ?? null,
      stripe_account_id: current?.stripe_account_id ?? null,
      deleted_at: new Date().toISOString(),
    });

  if (recordErr) {
    // Refuse rather than proceed. Anonymising without keeping the record is
    // the one outcome that cannot be undone, and it is the outcome that leaves
    // Jibly unable to answer for this person later.
    console.error('[account/delete] retention record failed:', recordErr);
    return NextResponse.json(
      { error: 'retention_record_failed' },
      { status: 500 }
    );
  }

  // 4. Anonymise the profile row (keep it — received reviews reference it).
  //    full_name goes to NULL, not to "Utilisateur supprimé": deleted_at
  //    already carries that meaning, and writing the label into the data made
  //    it redundant, destructive and French-only. The UI derives it now.
  const { error: profErr } = await admin
    .from('profiles')
    .update({
      full_name: null,
      avatar_url: null,
      phone: null,
      city: null,
      country: null,
      identity_verification_id: null,
      identity_verification_status: null,
      identity_verified_at: null,
      deleted_at: new Date().toISOString(),
    })
    .eq('id', user.id);

  if (profErr) {
    return NextResponse.json({ error: profErr.message }, { status: 500 });
  }

  // 5. Free the e-mail + block login. Scramble to a reserved .invalid address
  //    (RFC 6761 — guaranteed never to resolve / collide) and ban the user.
  const { error: authErr } = await admin.auth.admin.updateUserById(user.id, {
    email: `deleted+${user.id}@account-deleted.invalid`,
    ban_duration: '876000h', // ~100 years
    // Clearing the metadata matters as much as scrambling the address.
    // Supabase MERGES this object, and the sign-up payload sitting in it kept
    // the original e-mail and full name — so deletion was scrambling one copy
    // of the address while leaving another beside it, in a place no retention
    // policy covers and no purge date reaches. Null removes a key.
    //
    // After this, the only surviving copy is the row in
    // deleted_account_records, which is service-role only and expires.
    user_metadata: {
      deleted: true,
      full_name: null,
      name: null,
      email: null,
      phone: null,
      avatar_url: null,
      picture: null,
    },
  });

  if (authErr) {
    // Profile is already anonymised; surface the auth failure so it can be
    // retried/repaired rather than silently leaving a re-loginnable account.
    return NextResponse.json(
      { error: `Profile anonymised but auth update failed: ${authErr.message}` },
      { status: 500 }
    );
  }

  // 6. Clear the session cookies.
  await supabase.auth.signOut();

  return NextResponse.json({ ok: true });
}
