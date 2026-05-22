import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { getStripe } from '@/lib/stripe/server';
import { createClient } from '@supabase/supabase-js';

/**
 * POST /api/identity/webhook
 *
 * Receives Stripe Identity verification events and updates the user's
 * profile in Supabase.
 *
 * We deliberately do NOT touch the existing `verification_level` column
 * here — it has its own check constraint and meaning ('email', 'id_verified',
 * etc.), and we don't want to entangle two different concepts. Instead,
 * the UI checks `identity_verified_at IS NOT NULL` to show the verified
 * state. If you later want to also bump verification_level, do it via a
 * trigger in Postgres so the logic is in one place.
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

export async function POST(req: NextRequest) {
  console.log('[identity/webhook] === START ===');

  const sig = req.headers.get('stripe-signature');
  if (!sig) {
    return NextResponse.json({ error: 'No signature' }, { status: 400 });
  }

  const secret = process.env.STRIPE_IDENTITY_WEBHOOK_SECRET;
  if (!secret) {
    console.error('[identity/webhook] STRIPE_IDENTITY_WEBHOOK_SECRET missing');
    return NextResponse.json({ error: 'Server misconfigured' }, { status: 500 });
  }

  const rawBody = await req.text();

  let event: Stripe.Event;
  try {
    const stripe = getStripe();
    event = stripe.webhooks.constructEvent(rawBody, sig, secret);
    console.log('[identity/webhook] event:', event.type, event.id);
  } catch (e: any) {
    console.error('[identity/webhook] signature verification FAILED:', e?.message);
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  if (!event.type.startsWith('identity.verification_session.')) {
    return NextResponse.json({ received: true, skipped: true });
  }

  const session = event.data.object as Stripe.Identity.VerificationSession;
  const userId = session.metadata?.user_id;
  console.log('[identity/webhook] session.status:', session.status, 'userId:', userId);

  if (!userId) {
    return NextResponse.json({ received: true, mapped: false });
  }

  let supabase;
  try {
    supabase = getAdminSupabase();
  } catch (e: any) {
    console.error('[identity/webhook] supabase init failed:', e?.message);
    return NextResponse.json({ error: 'Server misconfigured' }, { status: 500 });
  }

  // Build the update. We ONLY touch the identity_* columns we added in
  // 07_identity_verification.sql. verification_level stays untouched —
  // it has its own check constraint and shouldn't be repurposed here.
  const updates: Record<string, any> = {
    identity_verification_id: session.id,
    identity_verification_status: session.status,
  };

  if (session.status === 'verified') {
    updates.identity_verified_at = new Date().toISOString();
  }

  console.log('[identity/webhook] updating user', userId, 'with', updates);

  const { error, data } = await supabase
    .from('profiles')
    .update(updates)
    .eq('id', userId)
    .select('id, identity_verified_at, identity_verification_status')
    .maybeSingle();

  if (error) {
    console.error('[identity/webhook] DB update failed:', error);
    return NextResponse.json({ error: 'DB update failed', detail: error.message, code: error.code }, { status: 500 });
  }

  console.log('[identity/webhook] DB updated OK:', data);
  return NextResponse.json({ received: true, userId, status: session.status });
}
