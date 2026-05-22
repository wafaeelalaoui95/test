import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { getStripe } from '@/lib/stripe/server';
import { createClient } from '@supabase/supabase-js';

/**
 * POST /api/identity/webhook
 *
 * Listens for Stripe Identity verification events and mirrors the outcome
 * into our `profiles` table. We use the SUPABASE SERVICE ROLE key here
 * because webhooks aren't authenticated as a user — they come from Stripe.
 *
 * Events we care about (configure these in your Stripe Dashboard webhook):
 *   - identity.verification_session.verified  → mark profile verified
 *   - identity.verification_session.requires_input → user needs to retry
 *   - identity.verification_session.canceled  → user gave up
 *
 * Mapping back to a user: we read user_id from session.metadata, which
 * was set when we created the session in /api/identity/create-session.
 *
 * Security: every event is signature-checked against STRIPE_WEBHOOK_SECRET.
 * Without that, anyone could POST fake "verified" events to this endpoint.
 */

// Use Node runtime so we can access the raw request body Stripe needs for
// signature verification — Edge runtime mangles the body bytes.
export const runtime = 'nodejs';

// Service-role Supabase client. RLS doesn't apply to it, which is what we
// need because the webhook acts on behalf of any user without auth.
// IMPORTANT: never expose this key to the browser — server-only route.
function getAdminSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  return createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export async function POST(req: NextRequest) {
  const sig = req.headers.get('stripe-signature');
  if (!sig) {
    return NextResponse.json({ error: 'No signature' }, { status: 400 });
  }
  const secret = process.env.STRIPE_IDENTITY_WEBHOOK_SECRET;
  if (!secret) {
    console.error('[identity/webhook] STRIPE_IDENTITY_WEBHOOK_SECRET missing');
    return NextResponse.json({ error: 'Server misconfigured' }, { status: 500 });
  }

  // Stripe needs the RAW body for signature verification — text(), not json().
  const rawBody = await req.text();

  let event: Stripe.Event;
  try {
    const stripe = getStripe();
    event = stripe.webhooks.constructEvent(rawBody, sig, secret);
  } catch (e: any) {
    console.error('[identity/webhook] signature verification failed:', e?.message);
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  // We only care about verification_session lifecycle events.
  const type = event.type;
  if (!type.startsWith('identity.verification_session.')) {
    return NextResponse.json({ received: true, skipped: true });
  }

  const session = event.data.object as Stripe.Identity.VerificationSession;
  const userId = session.metadata?.user_id;
  if (!userId) {
    console.warn('[identity/webhook] session has no user_id in metadata', session.id);
    return NextResponse.json({ received: true, mapped: false });
  }

  const supabase = getAdminSupabase();

  // Translate Stripe status into our profile update.
  const updates: Record<string, any> = {
    identity_verification_id: session.id,
    identity_verification_status: session.status, // 'verified' | 'requires_input' | 'canceled' | 'processing'
  };

  if (session.status === 'verified') {
    // Source of truth: mark verified now + bump trust tier
    updates.identity_verified_at = new Date().toISOString();
    updates.verification_level = 'verified';
  } else if (session.status === 'canceled' || session.status === 'requires_input') {
    // Clear any previously-set verified timestamp ONLY if it wasn't already
    // set — we don't want a user who is already verified to get downgraded
    // by a stray failed re-attempt.
    // (Nothing to do here: identity_verified_at stays where it was.)
  }

  const { error } = await supabase
    .from('profiles')
    .update(updates)
    .eq('id', userId);
  if (error) {
    console.error('[identity/webhook] DB update failed:', error);
    return NextResponse.json({ error: 'DB update failed' }, { status: 500 });
  }

  return NextResponse.json({ received: true, userId, status: session.status });
}
