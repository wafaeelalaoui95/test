'use client';

import { useState } from 'react';
import { Elements, IbanElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { Loader2, Check, ArrowLeft, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { getStripeClient } from '@/lib/stripe/client';
import { useI18n } from '@/lib/i18n/context';
import { useAuth } from '@/lib/supabase/auth-provider';
import { findCountryByName } from '@/lib/countries';
import { payoutCountryOptions } from '@/lib/stripe/payout-countries';

// =============================================================================
// PayoutOnboarding — collecting payout details on Jibly's pages, not Stripe's
// =============================================================================
// Stripe's hosted form opens on a "Business details" step for people who have
// no business, and no setting removes it — Stripe confirmed the step is shown
// regardless of collection_options. So we ask for what Stripe actually
// requires, in our own words: a name, a date of birth, an address, a bank
// account. Nothing about industries or websites.
//
// WHAT WE NEVER TOUCH. The bank number is tokenised by Stripe.js and reaches
// our server only as a single-use btok_. Identity documents aren't collected
// here at all — a traveler Stripe wants one from is handed the hosted form
// instead (see `unsupported` below). The line is drawn where holding the data
// would make us responsible for it.
//
// Copy lives here rather than in lib/i18n/translations.ts because this flow is
// self-contained and new; fold it in there once it has settled.

const COPY = {
  fr: {
    country: 'Dans quel pays est ton compte bancaire ?',
    countryHint: 'Définitif — Stripe ne permet pas de le changer ensuite.',
    countryPlaceholder: 'Choisis un pays',
    start: 'Commencer',
    who: 'Qui es-tu ?',
    whoSub: 'Tel que ces informations apparaissent sur ton compte bancaire.',
    firstName: 'Prénom',
    lastName: 'Nom',
    dob: 'Date de naissance',
    day: 'Jour',
    month: 'Mois',
    year: 'Année',
    address: 'Adresse',
    line1: 'Rue et numéro',
    line2: 'Complément (facultatif)',
    city: 'Ville',
    postalCode: 'Code postal',
    bank: 'Où t’envoyer ton argent',
    bankSub: 'Ton numéro de compte va directement chez Stripe. Jibly ne le voit jamais.',
    holder: 'Nom du titulaire du compte',
    sortCode: 'Sort code',
    accountNumber: 'Numéro de compte',
    review: 'Dernière étape',
    reviewSub: 'Vérifie, puis accepte les conditions de Stripe pour être payé.',
    accept: 'J’accepte',
    acceptBody:
      'En continuant, tu acceptes le contrat de compte connecté de Stripe.',
    agreementLink: 'Lire le contrat',
    finish: 'Terminer',
    next: 'Continuer',
    back: 'Retour',
    done: 'C’est fait',
    doneSub: 'Tes paiements sont configurés. Tu seras payé après chaque livraison confirmée.',
    pending: 'Stripe vérifie tes informations. Ça prend en général quelques minutes.',
    fallbackTitle: 'Une vérification supplémentaire est nécessaire',
    fallbackBody:
      'Stripe a besoin d’un document que nous ne collectons pas ici. Tu vas être redirigé vers leur page sécurisée pour cette étape.',
    fallbackCta: 'Continuer sur Stripe',
    error: 'Une erreur est survenue. Réessaie.',
    incomplete_iban: 'Cet IBAN est incomplet.',
    invalid_iban: 'Cet IBAN n’est pas valide.',
    invalid_iban_country_code: 'Cet IBAN n’est pas dans une zone acceptée.',
    invalid_bank_account_iban: 'Ta banque a refusé cet IBAN.',
    account_number_invalid: 'Ce numéro de compte n’est pas valide.',
    routing_number_invalid: 'Ce sort code n’est pas valide.',
    invalid_dob: 'Cette date de naissance n’est pas valide.',
  },
  en: {
    country: 'Which country is your bank account in?',
    countryHint: 'Permanent — Stripe does not allow changing it later.',
    countryPlaceholder: 'Choose a country',
    start: 'Get started',
    who: 'Who are you?',
    whoSub: 'As these details appear on your bank account.',
    firstName: 'First name',
    lastName: 'Last name',
    dob: 'Date of birth',
    day: 'Day',
    month: 'Month',
    year: 'Year',
    address: 'Address',
    line1: 'Street address',
    line2: 'Apartment, suite (optional)',
    city: 'City',
    postalCode: 'Postcode',
    bank: 'Where to send your money',
    bankSub: 'Your account number goes straight to Stripe. Jibly never sees it.',
    holder: 'Account holder name',
    sortCode: 'Sort code',
    accountNumber: 'Account number',
    review: 'Last step',
    reviewSub: 'Check this over, then accept Stripe’s terms to get paid.',
    accept: 'I agree',
    acceptBody:
      'By continuing, you agree to the Stripe Connected Account Agreement.',
    agreementLink: 'Read the agreement',
    finish: 'Finish',
    next: 'Continue',
    back: 'Back',
    done: 'All set',
    doneSub: 'Your payouts are set up. You’ll be paid after each confirmed delivery.',
    pending: 'Stripe is checking your details. This usually takes a few minutes.',
    fallbackTitle: 'One more check is needed',
    fallbackBody:
      'Stripe needs a document we don’t collect here. You’ll be sent to their secure page for that step.',
    fallbackCta: 'Continue on Stripe',
    error: 'Something went wrong. Please try again.',
    incomplete_iban: 'This IBAN is incomplete.',
    invalid_iban: 'This IBAN isn’t valid.',
    invalid_iban_country_code: 'This IBAN isn’t from a supported country.',
    invalid_bank_account_iban: 'Your bank rejected this IBAN.',
    account_number_invalid: 'This account number isn’t valid.',
    routing_number_invalid: 'This sort code isn’t valid.',
    invalid_dob: 'This date of birth isn’t valid.',
  },
} as const;

/** SEPA countries take an IBAN; GB and Gibraltar take sort code + number. */
function usesIban(country: string): boolean {
  return !['GB', 'GI'].includes(country.toUpperCase());
}

type Step = 'country' | 'identity' | 'bank' | 'terms' | 'done' | 'fallback';

export function PayoutOnboarding({ onDone }: { onDone?: () => void }) {
  return (
    <Elements stripe={getStripeClient()}>
      <Flow onDone={onDone} />
    </Elements>
  );
}

function Flow({ onDone }: { onDone?: () => void }) {
  const { locale } = useI18n();
  const { profile } = useAuth();
  const c = COPY[locale === 'en' ? 'en' : 'fr'];
  const stripe = useStripe();
  const elements = useElements();

  const options = payoutCountryOptions(locale);
  const prefill = profile?.country
    ? findCountryByName(profile.country.trim())?.code ?? ''
    : '';

  const [step, setStep] = useState<Step>('country');
  const [country, setCountry] = useState(
    options.some((o) => o.code === prefill) ? prefill : ''
  );
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [errCode, setErrCode] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  // Identity
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [dobDay, setDobDay] = useState('');
  const [dobMonth, setDobMonth] = useState('');
  const [dobYear, setDobYear] = useState('');
  const [line1, setLine1] = useState('');
  const [line2, setLine2] = useState('');
  const [city, setCity] = useState('');
  const [postalCode, setPostalCode] = useState('');

  // Bank
  const [holder, setHolder] = useState('');
  const [sortCode, setSortCode] = useState('');
  const [accountNumber, setAccountNumber] = useState('');

  // Collecting the fields ourselves means Stripe's validation errors are now
  // ours to explain. "Something went wrong" is a lie when Stripe said exactly
  // what was wrong — an incomplete IBAN is the person's to fix, not a fault,
  // and telling them so is the difference between a correction and a dead end.
  function fail(code?: string) {
    const known = code && (c as Record<string, string>)[code];
    setErr(known ?? c.error);
    // The raw code only helps when we had nothing better to say.
    setErrCode(known ? null : code ?? null);
  }

  async function post(path: string, body?: unknown) {
    const res = await fetch(path, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      const e: any = new Error(data?.code ?? data?.error ?? 'failed');
      e.code = data?.code ?? data?.error;
      throw e;
    }
    return data;
  }

  async function startCountry() {
    setLoading(true);
    setErr(null);
    setErrCode(null);
    try {
      const data = await post('/api/connect/account', { country });
      // Stripe wants something our forms don't collect — a document, a
      // national ID number. Rather than trap this traveler in a flow that
      // cannot finish, hand them Stripe's.
      if (!data.canSelfServe) {
        setStep('fallback');
        return;
      }
      if (data.payoutsEnabled) {
        setStep('done');
        return;
      }
      setStep('identity');
    } catch (e: any) {
      fail(e.code);
    } finally {
      setLoading(false);
    }
  }

  async function submitIdentity() {
    setLoading(true);
    setErr(null);
    setErrCode(null);
    try {
      await post('/api/connect/details', {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        dobDay: Number(dobDay),
        dobMonth: Number(dobMonth),
        dobYear: Number(dobYear),
        line1: line1.trim(),
        ...(line2.trim() ? { line2: line2.trim() } : {}),
        city: city.trim(),
        postalCode: postalCode.trim(),
      });
      if (!holder) setHolder(`${firstName.trim()} ${lastName.trim()}`.trim());
      setStep('bank');
    } catch (e: any) {
      fail(e.code);
    } finally {
      setLoading(false);
    }
  }

  async function submitBank() {
    if (!stripe) return;
    setLoading(true);
    setErr(null);
    setErrCode(null);
    try {
      // Either way the number is tokenised in the browser and our server
      // receives only a single-use btok_. With the IBAN Element the number
      // never enters this page at all; on the GB path it lives in this
      // component's memory and goes straight to Stripe.
      let token;
      if (usesIban(country)) {
        const el = elements?.getElement(IbanElement);
        if (!el) throw new Error('iban_element_missing');
        const r = await stripe.createToken(el, {
          currency: 'eur',
          account_holder_name: holder.trim(),
          account_holder_type: 'individual',
        });
        if (r.error) throw Object.assign(new Error('token'), { code: r.error.code });
        token = r.token;
      } else {
        const r = await stripe.createToken('bank_account', {
          country,
          currency: 'gbp',
          routing_number: sortCode.replace(/[^0-9]/g, ''),
          account_number: accountNumber.replace(/\s/g, ''),
          account_holder_name: holder.trim(),
          account_holder_type: 'individual',
        });
        if (r.error) throw Object.assign(new Error('token'), { code: r.error.code });
        token = r.token;
      }

      await post('/api/connect/bank', { token: token!.id });
      setStep('terms');
    } catch (e: any) {
      fail(e.code);
    } finally {
      setLoading(false);
    }
  }

  async function acceptTerms() {
    setLoading(true);
    setErr(null);
    setErrCode(null);
    try {
      const data = await post('/api/connect/accept-terms');
      // Not payable yet doesn't mean something went wrong — Stripe often takes
      // a few minutes. Say so rather than showing a failure.
      setPending(!data.payoutsEnabled);
      setStep('done');
      onDone?.();
    } catch (e: any) {
      fail(e.code);
    } finally {
      setLoading(false);
    }
  }

  async function goToHosted() {
    setLoading(true);
    try {
      const data = await post('/api/connect/onboard', { locale, country });
      if (data.url) window.location.href = data.url;
      else fail(data.code);
    } catch (e: any) {
      fail(e.code);
      setLoading(false);
    }
  }

  const input =
    'w-full rounded-xl border border-ink-100 bg-white px-3.5 py-2.5 text-[14px] text-ink-600';
  const label = 'block text-[13px] font-medium text-ink-600 mb-1.5';

  const identityReady =
    firstName.trim() &&
    lastName.trim() &&
    dobDay &&
    dobMonth &&
    dobYear.length === 4 &&
    line1.trim() &&
    city.trim() &&
    postalCode.trim();

  const bankReady = usesIban(country)
    ? holder.trim().length > 1
    : holder.trim().length > 1 && sortCode.trim() && accountNumber.trim();

  return (
    <div>
      {step !== 'country' && step !== 'done' && (
        <button
          onClick={() =>
            setStep(
              step === 'identity' ? 'country' : step === 'bank' ? 'identity' : 'bank'
            )
          }
          className="flex items-center gap-1.5 text-[13px] text-ink-400 mb-4"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          {c.back}
        </button>
      )}

      {step === 'country' && (
        <>
          <h3 className="text-[16px] font-semibold text-ink-900 mb-1">{c.country}</h3>
          <p className="text-[13px] text-ink-400 mb-4">{c.countryHint}</p>
          <select
            value={country}
            onChange={(e) => setCountry(e.target.value)}
            className={`${input} mb-4`}
          >
            <option value="">{c.countryPlaceholder}</option>
            {options.map((o) => (
              <option key={o.code} value={o.code}>
                {o.name}
              </option>
            ))}
          </select>
          <Button onClick={startCountry} disabled={!country || loading} size="sm" fullWidth>
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
            {c.start}
          </Button>
        </>
      )}

      {step === 'identity' && (
        <>
          <h3 className="text-[16px] font-semibold text-ink-900 mb-1">{c.who}</h3>
          <p className="text-[13px] text-ink-400 mb-4">{c.whoSub}</p>

          <div className="grid grid-cols-2 gap-3 mb-3">
            <label>
              <span className={label}>{c.firstName}</span>
              <input value={firstName} onChange={(e) => setFirstName(e.target.value)} className={input} />
            </label>
            <label>
              <span className={label}>{c.lastName}</span>
              <input value={lastName} onChange={(e) => setLastName(e.target.value)} className={input} />
            </label>
          </div>

          <span className={label}>{c.dob}</span>
          <div className="grid grid-cols-3 gap-3 mb-4">
            <input value={dobDay} onChange={(e) => setDobDay(e.target.value)} placeholder={c.day} inputMode="numeric" maxLength={2} className={input} />
            <input value={dobMonth} onChange={(e) => setDobMonth(e.target.value)} placeholder={c.month} inputMode="numeric" maxLength={2} className={input} />
            <input value={dobYear} onChange={(e) => setDobYear(e.target.value)} placeholder={c.year} inputMode="numeric" maxLength={4} className={input} />
          </div>

          <span className={label}>{c.address}</span>
          <input value={line1} onChange={(e) => setLine1(e.target.value)} placeholder={c.line1} className={`${input} mb-3`} />
          <input value={line2} onChange={(e) => setLine2(e.target.value)} placeholder={c.line2} className={`${input} mb-3`} />
          <div className="grid grid-cols-2 gap-3 mb-4">
            <input value={postalCode} onChange={(e) => setPostalCode(e.target.value)} placeholder={c.postalCode} className={input} />
            <input value={city} onChange={(e) => setCity(e.target.value)} placeholder={c.city} className={input} />
          </div>

          <Button onClick={submitIdentity} disabled={!identityReady || loading} size="sm" fullWidth>
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
            {c.next}
          </Button>
        </>
      )}

      {step === 'bank' && (
        <>
          <h3 className="text-[16px] font-semibold text-ink-900 mb-1">{c.bank}</h3>
          <p className="text-[13px] text-ink-400 mb-4">{c.bankSub}</p>

          <label className="block mb-3">
            <span className={label}>{c.holder}</span>
            <input value={holder} onChange={(e) => setHolder(e.target.value)} className={input} />
          </label>

          {usesIban(country) ? (
            <div className="mb-4">
              <span className={label}>IBAN</span>
              <div className="rounded-xl border border-ink-100 bg-white px-3.5 py-3">
                <IbanElement options={{ supportedCountries: ['SEPA'] }} />
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3 mb-4">
              <label>
                <span className={label}>{c.sortCode}</span>
                <input value={sortCode} onChange={(e) => setSortCode(e.target.value)} inputMode="numeric" className={input} />
              </label>
              <label>
                <span className={label}>{c.accountNumber}</span>
                <input value={accountNumber} onChange={(e) => setAccountNumber(e.target.value)} inputMode="numeric" className={input} />
              </label>
            </div>
          )}

          <Button onClick={submitBank} disabled={!bankReady || loading || !stripe} size="sm" fullWidth>
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
            {c.next}
          </Button>
        </>
      )}

      {step === 'terms' && (
        <>
          <h3 className="text-[16px] font-semibold text-ink-900 mb-1">{c.review}</h3>
          <p className="text-[13px] text-ink-400 mb-4">{c.reviewSub}</p>

          {/* LEGAL. The Connected Account Agreement link is required. Because
              these accounts are on the FULL service agreement rather than the
              recipient one, Stripe also requires its acquirer disclosure here
              — take that wording verbatim from Stripe's docs before launch. */}
          <div className="rounded-xl bg-cream-100 border border-ink-50 p-4 mb-4">
            <p className="text-[13px] text-ink-600 leading-relaxed">
              {c.acceptBody}{' '}
              <a
                href="https://stripe.com/connect-account/legal/full"
                target="_blank"
                rel="noopener noreferrer"
                className="text-ink-900 underline underline-offset-2 inline-flex items-center gap-1"
              >
                {c.agreementLink}
                <ExternalLink className="w-3 h-3" />
              </a>
            </p>
          </div>

          <Button onClick={acceptTerms} disabled={loading} size="sm" fullWidth>
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
            {c.accept} — {c.finish}
          </Button>
        </>
      )}

      {step === 'done' && (
        <div className="flex items-start gap-2.5">
          <div className="w-8 h-8 rounded-full bg-mint-50 flex items-center justify-center shrink-0">
            <Check className="w-4 h-4 text-mint-500" />
          </div>
          <div>
            <p className="text-[14px] font-medium text-ink-900">{c.done}</p>
            <p className="text-[12px] text-ink-400 leading-relaxed">
              {pending ? c.pending : c.doneSub}
            </p>
          </div>
        </div>
      )}

      {step === 'fallback' && (
        <>
          <h3 className="text-[16px] font-semibold text-ink-900 mb-1">{c.fallbackTitle}</h3>
          <p className="text-[13px] text-ink-400 mb-4 leading-relaxed">{c.fallbackBody}</p>
          <Button onClick={goToHosted} disabled={loading} size="sm" fullWidth>
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
            {c.fallbackCta}
          </Button>
        </>
      )}

      {err && <p className="mt-3 text-[12px] text-blush-500 text-center">{err}</p>}
      {errCode && (
        <p className="mt-1 text-[11px] text-ink-300 text-center font-mono">{errCode}</p>
      )}
    </div>
  );
}
