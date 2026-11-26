import type { NextRequest } from 'next/server';
import { handleStripeWebhook } from '@/lib/stripe/webhook-handler';

/**
 * POST /api/stripe/webhook — the Jibly UK ('gb') Stripe account's payments +
 * Connect webhook. The logic lives in lib/stripe/webhook-handler.ts, shared
 * with /api/stripe/webhook-uae.
 *
 * Env: STRIPE_WEBHOOK_SECRET and STRIPE_CONNECT_WEBHOOK_SECRET.
 */
export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  return handleStripeWebhook(req, 'gb');
}
