import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getStripe } from '@/lib/stripe/server';
import { getServerClient } from '@/lib/supabase/server';

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

  let body: z.infer<typeof schema>;
  try {
    body = schema.parse(await req.json());
  } catch (e: any) {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const stripe = getStripe();
  try {
    const intent = await stripe.paymentIntents.create({
    amount: body.amountCents,
      currency: 'eur',
      capture_method: 'manual', // authorise now, capture later
      automatic_payment_methods: { enabled: true },
      description: body.description ?? `Jibly booking`,
      metadata: {
        userId: user.id,
        bookingIntentId: body.bookingIntentId ?? '',
      },
    });

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
