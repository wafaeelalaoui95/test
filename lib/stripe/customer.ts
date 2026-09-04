import { getStripe } from '@/lib/stripe/server';
import { getAdminClient } from '@/lib/supabase/server';
import { formatName } from '@/lib/utils';

// =============================================================================
// ensureCustomer — the sender's Stripe customer, created once and reused.
// =============================================================================
// Without this, every payment produced a fresh guest customer (gcus_…) with no
// name and no email, and the Customers list was a column of identifiers. Stripe
// support, disputes, refunds and receipts all key off the customer, so it has
// to carry who the person actually is.
//
// Writes go through the service-role client: stripe_customer_id is revoked from
// `authenticated` like every other Stripe column, so a user can't point their
// profile at someone else's customer from the browser console.
//
// Returns null rather than throwing: a payment must not fail because we
// couldn't attach a nicer label to it. The caller passes `customer` only when
// there is one, and metadata.userId still ties the charge back either way.
export async function ensureCustomer(
  user: { id: string; email?: string | null },
  fullName?: string | null,
  existingId?: string | null
): Promise<string | null> {
  // Trust the stored id without a round-trip. The one case where it goes stale
  // is a customer deleted in the dashboard, which surfaces as resource_missing
  // on the PaymentIntent — handled by the caller retrying with a fresh one.
  if (existingId) return existingId;

  try {
    const stripe = getStripe();
    const customer = await stripe.customers.create({
      // Title-cased for the same reason as everywhere else: this name appears
      // in Stripe's UI, on receipts, and in dispute paperwork.
      name: fullName ? formatName(fullName) : undefined,
      email: user.email ?? undefined,
      metadata: { userId: user.id },
    });

    // Persist so the next payment reuses it. If this write fails the payment
    // still goes through; we'd just create a second customer next time, which
    // is the behaviour we had before and not worth failing over.
    const { error } = await getAdminClient()
      .from('profiles')
      .update({ stripe_customer_id: customer.id })
      .eq('id', user.id);
    if (error) {
      console.warn('[stripe/customer] could not store customer id:', error.message);
    }

    return customer.id;
  } catch (e: any) {
    console.warn('[stripe/customer] create failed:', e?.message);
    return null;
  }
}

// Clear a customer id we know Stripe no longer has, so the next attempt makes
// a new one instead of failing forever on the same missing reference.
export async function forgetCustomer(userId: string): Promise<void> {
  try {
    await getAdminClient()
      .from('profiles')
      .update({ stripe_customer_id: null })
      .eq('id', userId);
  } catch (e: any) {
    console.warn('[stripe/customer] could not clear customer id:', e?.message);
  }
}
