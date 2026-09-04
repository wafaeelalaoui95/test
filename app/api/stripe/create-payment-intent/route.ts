import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getStripe } from '@/lib/stripe/server';
import { getServerClient } from '@/lib/supabase/server';
import { ensureCustomer, forgetCustomer } from '@/lib/stripe/customer';

/**
 * POST /api/stripe/create-payment-intent
 * Body: { amountEuros: number, bookingIntentId?: string, description?: string }
 *
 * Creates a Stripe PaymentIntent in manual-capture mode. We *authorise* the
 * sender's card now (so they enter their details before knowing if the
 * traveler accepts), and capture later when the traveler accepts. If the
 * traveler declines, we cancel the authorisation and no money moves.
 *
 * Returns the client_secret needed by Stripe Elements on the frontend.
 */
// Validation: amount is in CENTS (Stripe's native unit). The frontend
// converts euros to cents before sending. This avoids decimal-number
// validation headaches.
const schema = z.object({
  amountCents: z.number().int().positive().max(1000000),
  bookingIntentId: z.string().uuid().optional(),
  description: z.string().max(500).optional(),
});

export async function POST(req: NextRequest) {
  // Must be authenticated — anonymous users shouldn't be able to mint
  // PaymentIntents (would let scrapers spam Stripe).
  const supabase = getServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Identity, enforced HERE and not only in the UI. The gate on /envoyer,
  // /voyager and the traveler profile is a courtesy — it explains why the
  // button did nothing. This is the part that cannot be walked around by
  // calling the endpoint directly, and it is the right place for it: no
  // PaymentIntent means no booking, whatever the client does.
  //
  // A traveler putting a stranger's sealed parcel in their bag is trusting
  // that Jibly checked who the sender is. That promise has to hold on the
  // server.
  const { data: senderProfile } = await supabase
    .from('profiles')
    .select('identity_verified_at, full_name, stripe_customer_id')
    .eq('id', user.id)
    .maybeSingle();

  if (!senderProfile?.identity_verified_at) {
    return NextResponse.json({ error: 'identity_required' }, { status: 403 });
  }

  let body: z.infer<typeof schema>;
  try {
    body = schema.parse(await req.json());
  } catch (e: any) {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const stripe = getStripe();

  // Who is paying, in Stripe's own terms. Best-effort: null just means the
  // payment is attached to a guest customer, exactly as before.
  let customerId = await ensureCustomer(
    user,
    senderProfile?.full_name,
    senderProfile?.stripe_customer_id
  );

  const create = (customer?: string) =>
    stripe.paymentIntents.create({
      amount: body.amountCents,
      currency: 'eur',
      capture_method: 'manual', // authorise now, capture later
      automatic_payment_methods: { enabled: true },
      description: body.description ?? `Jibly booking`,
      customer,
      // Keep the metadata even with a customer attached: it's what let us
      // trace the payments made before customers existed, and it survives a
      // customer being deleted.
      metadata: {
        userId: user.id,
        bookingIntentId: body.bookingIntentId ?? '',
      },
    });

  try {
    let intent;
    try {
      intent = await create(customerId ?? undefined);
    } catch (e: any) {
      // The stored id points at a customer that Stripe no longer has —
      // deleted from the dashboard, or belonging to the other mode's keys.
      // Drop it, mint a new one, and let the payment through.
      if (e?.code === 'resource_missing' && customerId) {
        await forgetCustomer(user.id);
        customerId = await ensureCustomer(user, senderProfile?.full_name, null);
        intent = await create(customerId ?? undefined);
      } else {
        throw e;
      }
    }

    return NextResponse.json({
      clientSecret: intent.client_secret,
      paymentIntentId: intent.id,
    });
  } catch (e: any) {
    console.error('Stripe create intent error:', e?.message);
    return NextResponse.json(
      { error: e?.message ?? 'Stripe error' },
      { status: 500 }
    );
  }
}
