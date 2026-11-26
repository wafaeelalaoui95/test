import type { NextRequest } from 'next/server';
import { handleStripeWebhook } from '@/lib/stripe/webhook-handler';

/**
 * POST /api/stripe/webhook-uae — the Jibly UAE (WEF Technologies FZE LLC,
 * 'ae') Stripe account's payments + Connect webhook. Same events as the UK
 * endpoint; logic in lib/stripe/webhook-handler.ts.
 *
 * Two Stripe destinations point here (both Snapshot payloads), as on the UK
 * account — one destination cannot carry both scopes:
 *   jibly-uae-payments  "Your account": payment_intent.succeeded / .canceled /
 *                       .payment_failed, transfer.reversed
 *                       → STRIPE_UAE_WEBHOOK_SECRET
 *   jibly-uae-connect   "Connected accounts": account.updated, payout.paid /
 *                       .failed / .canceled / .updated
 *                       → STRIPE_UAE_CONNECT_WEBHOOK_SECRET
 * Keys and destinations must all come from the same mode (sandbox or live).
 */
export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  return handleStripeWebhook(req, 'ae');
}
