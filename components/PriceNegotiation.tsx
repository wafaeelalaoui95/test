'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { X, CheckCircle2 } from 'lucide-react';
import { StripePaymentForm } from '@/components/StripePaymentForm';
import { useIdentityGate, VerifyToAccept } from '@/components/IdentityGate';
import { useI18n } from '@/lib/i18n/context';
import { cityDisplayName } from '@/lib/countries';
import { attestationStatement } from '@/lib/attestations';
import { formatEuros, priceBreakdown, travelerNetFromTotal } from '@/lib/utils';
import {
  MIN_OFFER_TOTAL_EUR,
  canTravelerCounter,
  checkSenderOffer,
  checkTravelerCounter,
  roundEuros,
  type NegotiationFields,
} from '@/lib/negotiation';

// =============================================================================
// Price bargaining — the screens (rules in lib/negotiation.ts)
// =============================================================================
// Structured counter-offers, not a chat: every action here is one call to
// /api/booking/negotiate, which owns the price. After a change the component
// broadcasts the new fields (BOOKING_PATCH_EVENT) and /me patches whichever of
// its lists holds the booking, so the card updates without a reload.

export const BOOKING_PATCH_EVENT = 'jibly:booking-patched';

export function emitBookingPatch(id: string, patch: Record<string, any>) {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent(BOOKING_PATCH_EVENT, { detail: { id, patch } }));
}

type Row = NegotiationFields & {
  id: string;
  pickup_city: string;
  destination_city: string;
  item_title?: string | null;
  item_category?: string | null;
};

function parseEuros(input: string): number | null {
  const v = Number(input.replace(',', '.').replace(/[^0-9.]/g, ''));
  return input.trim() && Number.isFinite(v) && v > 0 ? roundEuros(v) : null;
}

async function negotiate(body: Record<string, any>) {
  const res = await fetch('/api/booking/negotiate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw Object.assign(new Error(data.error ?? 'error'), { code: data.error });
  return data;
}

// -----------------------------------------------------------------------------
// TRAVELLER — answering a price the sender proposed
// -----------------------------------------------------------------------------
// Net first: the traveller reasons in what they receive, as on their listings.
// `ackRequired`: the safety acknowledgement the plain accept already asks for
// ("I can inspect the parcel and refuse it") gates Accept here too.
export function TravelerPriceDecision({
  booking,
  senderName,
  ackRequired = true,
  onDone,
}: {
  booking: Row;
  senderName: string;
  ackRequired?: boolean;
  onDone?: () => void;
}) {
  const { t } = useI18n();
  const [ack, setAck] = useState(!ackRequired);
  const [busy, setBusy] = useState<null | 'accept' | 'refuse' | 'counter'>(null);
  const [err, setErr] = useState<string | null>(null);
  const [countering, setCountering] = useState(false);
  const [netInput, setNetInput] = useState('');
  const gate = useIdentityGate(t.gate_identity_accept);

  const total = Number(booking.proposed_price);
  const original = booking.original_price != null ? Number(booking.original_price) : null;
  const net = travelerNetFromTotal(total);
  const canCounter = canTravelerCounter(booking);

  // Counter typed as the traveller's net; the total follows. At the top of the
  // range, pin to the original total so cent rounding cannot push it above.
  const typedNet = parseEuros(netInput);
  const maxNet = original != null ? travelerNetFromTotal(original) : null;
  const counterTotal =
    typedNet == null
      ? null
      : original != null && maxNet != null && typedNet >= maxNet
        ? original
        : priceBreakdown(typedNet).total;
  const counterErr =
    counterTotal == null ? null : checkTravelerCounter(counterTotal, total, original);

  function errorText(code?: string) {
    if (code === 'payment_expired_or_mismatch') return t.neg_err_payment_expired;
    if (code === 'not_higher') return t.neg_err_not_higher.replace('{price}', formatEuros(net));
    if (code === 'above_original' && maxNet != null)
      return t.neg_err_above_original.replace('{price}', formatEuros(maxNet));
    return t.neg_err_generic;
  }

  async function run(kind: 'accept' | 'refuse' | 'counter') {
    // A trip can be published before the identity check; accepting a
    // booking cannot. /api/booking/negotiate enforces it too.
    if (kind === 'accept' && !gate.ensureVerified()) return;
    setBusy(kind);
    setErr(null);
    try {
      if (kind === 'accept') {
        const data = await negotiate({ action: 'accept', bookingIntentId: booking.id });
        emitBookingPatch(booking.id, {
          status: 'confirmed',
          price_pending_by: null,
          payment_status: data.captured ? 'captured' : 'authorized',
        });
        // Same confirmation emails as a plain accept (pickup code to the
        // traveller, confirmation to the sender).
        for (const event of ['booking-confirmed-sender', 'booking-confirmed-traveler']) {
          fetch('/api/notify', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ event, bookingId: booking.id }),
          }).catch(() => {});
        }
      } else if (kind === 'refuse') {
        await negotiate({ action: 'refuse', bookingIntentId: booking.id });
        emitBookingPatch(booking.id, {
          status: 'cancelled',
          price_pending_by: null,
          payment_status: 'canceled',
        });
      } else {
        if (counterTotal == null || counterErr) return;
        await negotiate({ action: 'counter', bookingIntentId: booking.id, amountTotal: counterTotal });
        emitBookingPatch(booking.id, {
          proposed_price: counterTotal,
          price_pending_by: 'traveler',
          traveler_countered: true,
          payment_status: 'unpaid',
          payment_intent_id: null,
          payment_amount: null,
        });
      }
      onDone?.();
    } catch (e: any) {
      setErr(errorText(e?.code));
    } finally {
      setBusy(null);
    }
  }

  // Unverified traveller: no Accept / Refuse / Counter, only the identity
  // check. Trips can be published before it; answering a booking can't.
  if (!gate.verified) return <VerifyToAccept />;

  return (
    <div>
      {gate.modal}
      <div className="rounded-2xl bg-lavender-50 border border-lavender-200/70 p-4 mb-4">
        <div className="text-[12px] font-semibold text-lavender-700 mb-2">
          {t.neg_sender_proposes.replace('{name}', senderName)}
        </div>
        <div className="flex items-baseline justify-between gap-3">
          <span className="text-[13px] text-ink-500">{t.neg_you_would_receive}</span>
          <span className="text-[24px] font-extrabold text-mint-600 num-display tracking-[-0.02em]">
            {formatEuros(net)}
          </span>
        </div>
        {original != null && original > total && (
          <div className="text-end text-[12px] text-ink-400">
            {t.neg_instead_of.replace('{amount}', formatEuros(travelerNetFromTotal(original)))}
          </div>
        )}
        <div className="text-[11px] text-ink-400 mt-2">
          {t.neg_sender_pays.replace('{amount}', formatEuros(total))}
        </div>
      </div>

      {ackRequired && (
        <label className="flex items-start gap-2.5 cursor-pointer mb-4">
          <input
            type="checkbox"
            checked={ack}
            onChange={(e) => setAck(e.target.checked)}
            className="mt-0.5 w-4 h-4 rounded border-ink-300 text-ink-500 focus:ring-2 focus:ring-lavender-500/30 cursor-pointer"
          />
          <span className="text-[13px] text-ink-600 leading-relaxed">{t.me2_accept_check_label}</span>
        </label>
      )}

      {err && (
        <div className="rounded-xl bg-blush-50 px-4 py-2.5 mb-3 text-[13px] text-blush-500">{err}</div>
      )}

      {countering ? (
        <div className="rounded-xl bg-white border border-ink-100 p-4">
          <label htmlFor={`counter-${booking.id}`} className="block text-[13px] font-semibold text-ink-600 mb-2">
            {t.neg_counter_traveler_label}
          </label>
          <div className="flex items-center gap-2">
            <input
              id={`counter-${booking.id}`}
              inputMode="decimal"
              autoFocus
              value={netInput}
              onChange={(e) => setNetInput(e.target.value)}
              className="w-32 px-3 py-2 rounded-lg bg-cream-50 border border-ink-100 text-[15px] num-display focus:outline-none focus:ring-2 focus:ring-lavender-200"
            />
            <span className="text-[15px] text-ink-500">€</span>
          </div>
          <p className="text-[12px] text-ink-400 mt-2">
            {t.neg_counter_traveler_hint
              .replace('{min}', formatEuros(net))
              .replace('{max}', formatEuros(maxNet ?? net))
              .replace('{total}', formatEuros(counterTotal ?? total))}
          </p>
          {counterErr && <p className="text-[12px] text-blush-500 mt-1">{errorText(counterErr)}</p>}
          <p className="text-[12px] text-ink-500 mt-2">{t.neg_counter_once}</p>
          <div className="flex gap-2 mt-3">
            <button
              onClick={() => setCountering(false)}
              disabled={!!busy}
              className="flex-1 px-4 py-2.5 text-[13px] font-medium text-ink-500 bg-cream-100 hover:bg-cream-200 rounded-full disabled:opacity-50"
            >
              {t.me2_accept_cancel}
            </button>
            <button
              onClick={() => run('counter')}
              disabled={!!busy || counterTotal == null || !!counterErr}
              className="flex-1 px-4 py-2.5 text-[13px] font-semibold text-cream-50 bg-lavender-500 hover:bg-lavender-600 rounded-full disabled:opacity-50"
            >
              {busy === 'counter' ? '…' : t.neg_send_counter}
            </button>
          </div>
        </div>
      ) : (
        <div className="flex flex-col sm:flex-row gap-2">
          <button
            onClick={() => run('refuse')}
            disabled={!!busy}
            className="flex-1 px-4 py-2.5 text-[14px] font-medium text-blush-600 bg-blush-50 hover:bg-blush-100 rounded-full transition-colors disabled:opacity-50"
          >
            {busy === 'refuse' ? '…' : t.neg_refuse}
          </button>
          {canCounter && (
            <button
              onClick={() => setCountering(true)}
              disabled={!!busy}
              className="flex-1 px-4 py-2.5 text-[14px] font-semibold text-lavender-700 bg-lavender-100 hover:bg-lavender-200 rounded-full transition-colors disabled:opacity-50"
            >
              {t.neg_counter}
            </button>
          )}
          <button
            onClick={() => run('accept')}
            disabled={!!busy || !ack}
            className="flex-1 px-4 py-2.5 text-[14px] font-semibold text-cream-50 bg-ink-500 hover:bg-ink-600 rounded-full transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {busy === 'accept' ? '…' : t.neg_accept_price}
          </button>
        </div>
      )}
      {!canCounter && !countering && (
        <p className="text-[12px] text-ink-400 mt-2 text-center">{t.neg_last_word}</p>
      )}
    </div>
  );
}

// -----------------------------------------------------------------------------
// TRAVELLER — a modal around the decision, for cards that have no room
// -----------------------------------------------------------------------------
export function TravelerPriceDecisionModal({
  booking,
  senderName,
  onClose,
}: {
  booking: Row;
  senderName: string;
  onClose: () => void;
}) {
  const { t, locale } = useI18n();
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.15 }}
      className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-4 bg-ink-600/40 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        initial={{ y: 20, opacity: 0, scale: 0.98 }}
        animate={{ y: 0, opacity: 1, scale: 1 }}
        transition={{ duration: 0.2 }}
        onClick={(e) => e.stopPropagation()}
        className="bg-cream-50 rounded-3xl p-6 max-w-md w-full shadow-xl max-h-[90vh] overflow-y-auto"
      >
        <div className="flex items-start justify-between mb-4">
          <div>
            <h3 className="text-xl font-extrabold text-ink-600 tracking-[-0.02em]">{t.neg_pill_price_proposed}</h3>
            <div className="text-[13px] text-ink-400 mt-1">
              {cityDisplayName(booking.pickup_city, locale)} → {cityDisplayName(booking.destination_city, locale)}
              {booking.item_title ? ` · ${booking.item_title}` : ''}
            </div>
          </div>
          <button onClick={onClose} aria-label={t.common_close} className="p-1.5 -me-1 rounded-full hover:bg-ink-50 text-ink-400">
            <X className="w-4 h-4" />
          </button>
        </div>
        <TravelerPriceDecision booking={booking} senderName={senderName} onDone={onClose} />
      </motion.div>
    </motion.div>
  );
}

// -----------------------------------------------------------------------------
// SENDER — counter a traveller's price (authorises the card at the new price)
// -----------------------------------------------------------------------------
export function SenderCounterModal({
  booking,
  travelerName,
  onClose,
}: {
  booking: Row;
  travelerName: string;
  onClose: () => void;
}) {
  const { t, locale } = useI18n();
  const [input, setInput] = useState('');
  const [offer, setOffer] = useState<number | null>(null); // frozen once paying
  const [certified, setCertified] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const current = Number(booking.proposed_price);
  const typed = parseEuros(input);
  const typedErr = typed == null ? null : checkSenderOffer(typed, current);
  const itemLabel = booking.item_title?.trim() || booking.item_category || null;

  function typedErrText() {
    if (typedErr === 'below_minimum') return t.neg_err_below_minimum.replace('{min}', formatEuros(MIN_OFFER_TOTAL_EUR));
    if (typedErr === 'not_lower') return t.neg_err_not_lower.replace('{price}', formatEuros(current));
    return typedErr ? t.neg_err_generic : null;
  }

  async function handleAuthorized(paymentIntentId: string) {
    setBusy(true);
    setErr(null);
    try {
      await negotiate({ action: 'sender-counter', bookingIntentId: booking.id, paymentIntentId });
      // The declaration, same as when paying a proposal: the booking exists
      // and the box was ticked. Best-effort, as there.
      fetch('/api/attestation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bookingIntentId: booking.id, kind: 'sender_certification', locale }),
      }).catch(() => {});
      emitBookingPatch(booking.id, {
        proposed_price: offer,
        price_pending_by: 'sender',
        sender_countered: true,
        payment_status: 'authorized',
        payment_intent_id: paymentIntentId,
      });
      setDone(true);
    } catch {
      setErr(t.neg_err_generic);
    } finally {
      setBusy(false);
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.15 }}
      className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-4 bg-ink-600/40 backdrop-blur-sm"
      onClick={() => !busy && onClose()}
    >
      <motion.div
        initial={{ y: 20, opacity: 0, scale: 0.98 }}
        animate={{ y: 0, opacity: 1, scale: 1 }}
        transition={{ duration: 0.2 }}
        onClick={(e) => e.stopPropagation()}
        className="bg-cream-50 rounded-3xl p-6 sm:p-7 max-w-md w-full shadow-xl max-h-[90vh] overflow-y-auto"
      >
        {done ? (
          <div className="text-center py-4">
            <div className="w-14 h-14 rounded-full bg-mint-500 mx-auto flex items-center justify-center mb-5">
              <CheckCircle2 className="w-7 h-7 text-white" strokeWidth={2.5} />
            </div>
            <h3 className="text-2xl font-extrabold text-ink-600 tracking-[-0.02em] mb-2">{t.neg_offer_sent_title}</h3>
            <p className="text-[15px] text-ink-400 mb-7 leading-relaxed">
              {t.neg_offer_sent_desc.replace('{name}', travelerName).replace('{amount}', formatEuros(offer ?? 0))}
            </p>
            <button
              onClick={onClose}
              className="w-full px-5 py-3 rounded-full bg-ink-500 hover:bg-ink-600 text-cream-50 text-[14px] font-semibold"
            >
              {t.common_close}
            </button>
          </div>
        ) : (
          <>
            <div className="flex items-start justify-between mb-5">
              <div>
                <div className="text-[11px] font-semibold text-lavender-500 tracking-[0.12em] uppercase mb-2">
                  {t.neg_counter_title}
                </div>
                <div className="text-[13px] text-ink-400">
                  {t.neg_traveler_counters.replace('{name}', travelerName).replace('{amount}', formatEuros(current))} ·{' '}
                  {cityDisplayName(booking.pickup_city, locale)} → {cityDisplayName(booking.destination_city, locale)}
                </div>
              </div>
              <button
                onClick={onClose}
                disabled={busy}
                aria-label={t.common_close}
                className="p-1.5 -me-1 -mt-1 rounded-full hover:bg-ink-50 text-ink-400 disabled:opacity-50"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {err && <div className="rounded-xl bg-blush-50 px-4 py-3 mb-4 text-[13px] text-blush-500">{err}</div>}

            {offer == null ? (
              <>
                <label htmlFor={`sender-counter-${booking.id}`} className="block text-[13px] font-semibold text-ink-600 mb-2">
                  {t.neg_your_price_label}
                </label>
                <div className="flex items-center gap-2">
                  <input
                    id={`sender-counter-${booking.id}`}
                    inputMode="decimal"
                    autoFocus
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    className="w-32 px-3 py-2 rounded-lg bg-white border border-ink-100 text-[15px] num-display focus:outline-none focus:ring-2 focus:ring-lavender-200"
                  />
                  <span className="text-[15px] text-ink-500">€</span>
                </div>
                <p className="text-[12px] text-ink-400 mt-2">
                  {t.neg_min_hint
                    .replace('{min}', formatEuros(MIN_OFFER_TOTAL_EUR))
                    .replace('{net}', formatEuros(travelerNetFromTotal(typed ?? MIN_OFFER_TOTAL_EUR)))}
                </p>
                {typedErrText() && <p className="text-[12px] text-blush-500 mt-1">{typedErrText()}</p>}
                <p className="text-[12px] text-ink-500 leading-relaxed mt-3">{t.neg_sender_counter_note}</p>
                <p className="text-[12px] text-ink-500 mt-1">{t.neg_counter_once}</p>
                <button
                  disabled={typed == null || !!typedErr}
                  onClick={() => setOffer(typed)}
                  className="w-full mt-4 px-5 py-3 rounded-full bg-ink-500 hover:bg-ink-600 text-cream-50 text-[14px] font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {typed != null && !typedErr ? t.neg_authorise.replace('{amount}', formatEuros(typed)) : t.neg_send_counter}
                </button>
              </>
            ) : (
              <>
                <div className="flex items-baseline justify-between mb-4">
                  <span className="text-[14px] text-ink-500">{t.neg_your_offer_was.replace('{amount}', '')}</span>
                  <span className="text-2xl font-extrabold text-ink-600 num-display">{formatEuros(offer)}</span>
                </div>
                <label className="flex items-start gap-3 rounded-xl bg-cream-100 px-4 py-3.5 mb-4 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={certified}
                    onChange={(e) => setCertified(e.target.checked)}
                    disabled={busy}
                    className="mt-0.5 w-4 h-4 flex-shrink-0 accent-ink-500"
                  />
                  <span className="text-[12.5px] text-ink-500 leading-relaxed">
                    {attestationStatement('sender_certification', locale, itemLabel)}
                  </span>
                </label>
                {certified ? (
                  <StripePaymentForm
                    payFor={{ bookingIntentId: booking.id, offerTotal: offer }}
                    description={`Jibly · ${cityDisplayName(booking.pickup_city, locale)} → ${cityDisplayName(booking.destination_city, locale)}`}
                    onAuthorized={handleAuthorized}
                    onCancel={() => setOffer(null)}
                  />
                ) : (
                  <p className="text-[13px] text-ink-400 text-center py-4 leading-relaxed">{t.me2_certify_to_pay}</p>
                )}
              </>
            )}
          </>
        )}
      </motion.div>
    </motion.div>
  );
}

// -----------------------------------------------------------------------------
// SENDER — "Proposer un autre prix" under a listed trip's price
// -----------------------------------------------------------------------------
// Controlled by the booking modal (app/u/[id]/ProfileClient.tsx), which owns
// the value because it freezes it before payment and validates it on submit.
export function OfferPriceBox({
  open,
  value,
  error,
  onOpen,
  onChange,
  onClose,
}: {
  open: boolean;
  value: string;
  error: string | null;
  onOpen: () => void;
  onChange: (v: string) => void;
  onClose: () => void;
}) {
  const { t } = useI18n();
  if (!open) {
    return (
      <button
        type="button"
        onClick={onOpen}
        className="mt-2.5 text-[13px] font-semibold text-lavender-600 hover:text-lavender-700 underline underline-offset-2"
      >
        {t.neg_propose_other_price}
      </button>
    );
  }
  const typed = parseEuros(value);
  return (
    <div className="mt-3 rounded-xl bg-white border border-lavender-200 px-4 py-3">
      <label htmlFor="offer-total" className="block text-[13px] font-semibold text-ink-600 mb-2">
        {t.neg_your_price_label}
      </label>
      <div className="flex items-center gap-2">
        <input
          id="offer-total"
          inputMode="decimal"
          autoFocus
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={MIN_OFFER_TOTAL_EUR.toFixed(2).replace('.', ',')}
          className="w-32 px-3 py-2 rounded-lg bg-cream-50 border border-ink-100 text-[15px] num-display focus:outline-none focus:ring-2 focus:ring-lavender-200"
        />
        <span className="text-[15px] text-ink-500">€</span>
      </div>
      <p className="text-[12px] text-ink-400 mt-2">
        {t.neg_min_hint
          .replace('{min}', formatEuros(MIN_OFFER_TOTAL_EUR))
          .replace('{net}', formatEuros(travelerNetFromTotal(typed ?? MIN_OFFER_TOTAL_EUR)))}
      </p>
      {error && <p className="text-[12px] text-blush-500 mt-1">{error}</p>}
      <p className="text-[12px] text-ink-500 leading-relaxed mt-2">{t.neg_offer_note}</p>
      <button
        type="button"
        onClick={onClose}
        className="mt-2 text-[12px] font-medium text-ink-400 hover:text-ink-600 underline underline-offset-2"
      >
        {t.neg_keep_listed}
      </button>
    </div>
  );
}
