import type { NextRequest } from 'next/server';
import { handleStripeWebhook } from '@/lib/stripe/webhook-handler';

/**
 * POST /api/stripe/webhook-uae — the Jibly UAE (WEF Technologies FZE LLC,
 * 'ae') Stripe account's payments + Connect webhook. Same events as the UK
 * endpoint; logic in lib/stripe/webhook-handler.ts.
 *
 * Env: STRIPE_UAE_WEBHOOK_SECRET, and STRIPE_UAE_CONNECT_WEBHOOK_SECRET if a
 * separate endpoint is created for connected-account events.
 */
export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  return handleStripeWebhook(req, 'ae');
}
