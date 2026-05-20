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

type Props = {
  amountEuros: number;
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
  amountEuros,
  description,
  onAuthorized,
  onCancel,
}: Props) {
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [paymentIntentId, setPaymentIntentId] = useState<string | null>(null);
  const [initError, setInitError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
   fetch('/api/stripe/create-payment-intent', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        // Stripe works in cents. Round to avoid floating-point dust
        // (51.7499999...) that breaks the integer check on the server.
        amountCents: Math.round(amountEuros * 100),
        description,
      }),
    })
      .then(async (r) => {
        const data = await r.json();
        if (!r.ok) throw new Error(data.error ?? 'Payment setup failed');
        return data;
      })
      .then(({ clientSecret, paymentIntentId }) => {
        if (cancelled) return;
        setClientSecret(clientSecret);
        setPaymentIntentId(paymentIntentId);
      })
      .catch((e: any) => {
        if (cancelled) return;
        setInitError(e.message ?? 'Payment setup failed');
      });
    return () => {
      cancelled = true;
    };
  }, [amountEuros, description]);

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
    <Elements stripe={getStripeClient()} options={options}>
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
      setErr(error.message ?? 'Payment failed');
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
    setErr(`Unexpected status: ${paymentIntent?.status ?? 'unknown'}`);
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
        <span>
          Paiement sécurisé par Stripe. Votre carte est <strong className="text-ink-500">autorisée mais pas débitée</strong>.
          Le montant ne sera prélevé que si le voyageur accepte. En cas de refus, l&apos;autorisation est libérée.
        </span>
      </div>

      <div className="flex flex-col sm:flex-row gap-2.5 pt-2">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            disabled={submitting}
            className="flex-1 px-5 py-3 text-[14px] font-medium text-ink-500 hover:text-ink-600 bg-cream-100 hover:bg-cream-200 rounded-full transition-colors disabled:opacity-50"
          >
            Annuler
          </button>
        )}
        <button
          type="submit"
          disabled={!stripe || !elements || submitting}
          className="flex-1 inline-flex items-center justify-center gap-2 px-5 py-3 text-[14px] font-semibold text-cream-50 bg-ink-500 hover:bg-ink-600 disabled:bg-ink-200 disabled:cursor-not-allowed rounded-full transition-colors"
        >
          {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Lock className="w-4 h-4" />}
          {submitting ? 'Confirmation…' : 'Confirmer le paiement'}
        </button>
      </div>
    </form>
  );
}
