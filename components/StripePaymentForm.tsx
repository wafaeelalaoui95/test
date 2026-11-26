'use client';

import { useState, useEffect } from 'react';
import {
  Elements,
  PaymentElement,
  useStripe,
  useElements,
} from '@stripe/react-stripe-js';
import type { StripeElementsOptions } from '@stripe/stripe-js';
import { Loader2, Lock } from 'lucide-react';
import { getStripeClient } from '@/lib/stripe/client';
import { useI18n } from '@/lib/i18n/context';
import { friendlyError } from '@/lib/user-error';

type Props = {
  /**
   * WHAT is being paid for. The server reads the price from the database —
   * the browser never sends an amount (it used to, and the server charged it
   * as given). `tripId`: booking a traveller's trip. `bookingIntentId`:
   * paying a traveller's proposal.
   */
  payFor:
    | { tripId: string; offerTotal?: number }
    | { bookingIntentId: string; offerTotal?: number };
  // offerTotal: the sender proposes this price instead (bargaining). The server
  // checks it against the minimum and the price on the table.
  description?: string;
  /**
   * Called with the paymentIntentId once the card has been successfully
   * authorised on the user's bank. We don't capture yet — that happens
   * later when the traveler accepts.
   */
  onAuthorized: (paymentIntentId: string) => void;
  /** Called if the user closes the form before completing. */
  onCancel?: () => void;
};

/**
 * Drop-in Stripe payment form. Renders the PaymentElement (cards + Apple Pay
 * + Google Pay where supported) and handles the authorisation flow.
 *
 * Two-step internally:
 *   1) On mount, ask our backend to create a PaymentIntent → receive a
 *      client_secret + paymentIntentId.
 *   2) When the user submits, confirm the PaymentIntent client-side. Stripe
 *      handles 3D Secure popups if needed. On success we call onAuthorized.
 */
export function StripePaymentForm({
  payFor,
  description,
  onAuthorized,
  onCancel,
}: Props) {
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [paymentIntentId, setPaymentIntentId] = useState<string | null>(null);
  // Which Stripe account the server made the PaymentIntent on.
  const [platform, setPlatform] = useState<'gb' | 'ae'>('gb');
  const [initError, setInitError] = useState<string | null>(null);
  const { t: tr, locale } = useI18n();
  // A stable key so a re-render with an equal object doesn't mint a second
  // PaymentIntent.
  const payForKey =
    ('tripId' in payFor ? `trip:${payFor.tripId}` : `booking:${payFor.bookingIntentId}`) +
    (payFor.offerTotal != null ? `:offer:${payFor.offerTotal}` : '');

  useEffect(() => {
    let cancelled = false;
    fetch('/api/stripe/create-payment-intent', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...payFor, description }),
    })
      .then(async (r) => {
        const data = await r.json().catch(() => ({}));
        if (!r.ok) throw Object.assign(new Error('payment_setup'), { code: data.error, status: r.status });
        return data;
      })
      .then(({ clientSecret, paymentIntentId, platform }) => {
        if (cancelled) return;
        setPlatform(platform === 'ae' ? 'ae' : 'gb');
        setClientSecret(clientSecret);
        setPaymentIntentId(paymentIntentId);
      })
      .catch((e: any) => {
        if (cancelled) return;
        // A sentence for the person, never the route's code.
        setInitError(friendlyError(tr, e?.code ?? e?.message, e?.status));
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [payForKey, description]);

  if (initError) {
    return (
      <div className="rounded-xl bg-blush-50 px-4 py-3 text-[13px] text-blush-500">
        {initError}
      </div>
    );
  }

  if (!clientSecret || !paymentIntentId) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-5 h-5 text-ink-300 animate-spin" />
      </div>
    );
  }

  const options: StripeElementsOptions = {
    clientSecret,
    // Stripe's own card messages ("Votre carte a été refusée") in the page's language.
    locale: locale === 'en' ? 'en' : 'fr',
    appearance: {
      theme: 'flat',
      variables: {
        colorPrimary: '#7458E8',
        colorBackground: '#FBF8F2',
        colorText: '#2C2620',
        colorDanger: '#E66B6B',
        fontFamily: 'Manrope, system-ui, sans-serif',
        borderRadius: '12px',
        fontSizeBase: '15px',
      },
    },
  };

  return (
    <Elements key={platform} stripe={getStripeClient(platform)} options={options}>
      <InnerForm
        paymentIntentId={paymentIntentId}
        onAuthorized={onAuthorized}
        onCancel={onCancel}
      />
    </Elements>
  );
}

function InnerForm({
  paymentIntentId,
  onAuthorized,
  onCancel,
}: {
  paymentIntentId: string;
  onAuthorized: (id: string) => void;
  onCancel?: () => void;
}) {
  const { t } = useI18n();
  const stripe = useStripe();
  const elements = useElements();
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!stripe || !elements) return;
    setErr(null);
    setSubmitting(true);

    // Confirm the PaymentIntent. Because the intent was created with
    // capture_method='manual', a successful confirm authorises the card
    // but does not yet charge it.
    const { error, paymentIntent } = await stripe.confirmPayment({
      elements,
      redirect: 'if_required',
      confirmParams: {
        // We don't actually want a redirect in normal cases — Stripe only
        // redirects when 3D Secure is involved. The URL is required by the
        // API even if unused.
        return_url: `${window.location.origin}/me`,
      },
    });

    if (error) {
      // Card and form errors are written by Stripe for the cardholder and
      // localised; anything else is technical and gets our own sentence.
      setErr(
        (error.type === 'card_error' || error.type === 'validation_error') && error.message
          ? error.message
          : t.err_payment_failed
      );
      setSubmitting(false);
      return;
    }

    if (paymentIntent && paymentIntent.status === 'requires_capture') {
      // Authorised successfully, awaiting capture by the traveler's acceptance.
      onAuthorized(paymentIntent.id);
      return;
    }

    // Should not reach here in our flow — but cover the case where Stripe
    // returns a different terminal status.
    console.warn('[payment] unexpected status', paymentIntent?.status);
    setErr(t.err_payment_failed);
    setSubmitting(false);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <PaymentElement />

      {err && (
        <div className="rounded-xl bg-blush-50 px-4 py-3 text-[13px] text-blush-500">
          {err}
        </div>
      )}

      <div className="flex items-start gap-2 text-[12px] text-ink-400 leading-relaxed">
        <Lock className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
        <span>{t.pay_security_note}</span>
      </div>

      <div className="flex flex-col sm:flex-row gap-2.5 pt-2">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            disabled={submitting}
            className="flex-1 px-5 py-3 text-[14px] font-medium text-ink-500 hover:text-ink-600 bg-cream-100 hover:bg-cream-200 rounded-full transition-colors disabled:opacity-50"
          >
            {t.common_cancel}
          </button>
        )}
        <button
          type="submit"
          disabled={!stripe || !elements || submitting}
          className="flex-1 inline-flex items-center justify-center gap-2 px-5 py-3 text-[14px] font-semibold text-cream-50 bg-ink-500 hover:bg-ink-600 disabled:bg-ink-200 disabled:cursor-not-allowed rounded-full transition-colors"
        >
          {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Lock className="w-4 h-4" />}
          {submitting ? t.pay_submitting : t.pay_submit}
        </button>
      </div>
    </form>
  );
}
