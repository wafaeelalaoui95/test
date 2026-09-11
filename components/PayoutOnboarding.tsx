'use client';

import { useState, useEffect } from 'react';
import { Elements, IbanElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { Loader2, Check, ArrowLeft, ExternalLink, ShieldCheck } from 'lucide-react';
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
// our server only as a single-use btok_. Identity document images never reach
// us either: the 'verify' step hands the traveler to Stripe Identity, which
// keeps the passport and tells us only whether it was good. The line is drawn
// where holding the data would make us responsible for it.
//
// WHY THE DOCUMENT STEP LIVES HERE AT ALL. It used to be a dead end: Stripe
// asking for an ID meant bouncing the traveler to the hosted form, where they
// uploaded a passport they had ALREADY given us through Stripe Identity —
// because a verification only counts against a connected account if it was
// created with related_person, naming the account's Person. That link can't
// be added afterwards, so the account has to exist first. Hence the order
// below: country, details, then the identity check, bound to the account it
// has to satisfy. One upload.
//
// Copy lives here rather than in lib/i18n/translations.ts because this flow is
// self-contained and new; fold it in there once it has settled.

const COPY = {
  fr: {
    country: 'Dans quel pays est ton compte bancaire ?',
    countryHint: 'Définitif. Stripe ne permet pas de le changer ensuite.',
    countryPlaceholder: 'Choisis un pays',
    start: 'Commencer',
    who: 'Qui es-tu ?',
    whoSub: 'Tel que ces informations apparaissent sur ton compte bancaire.',
    verify: 'Vérifie ton identité',
    verifySub:
      'Une pièce d’identité et un selfie, une seule fois. Elle sert à la fois à ton profil vérifié et à débloquer tes paiements — on ne te la redemandera pas.',
    verifyAgain:
      'Ta pièce d’identité a déjà été vérifiée, mais elle n’était pas rattachée à ton compte de paiement. Une dernière fois, et c’est définitif.',
    verifyCta: 'Vérifier mon identité',
    verifyPending:
      'Ta pièce d’identité est en cours de vérification. Tu peux continuer, on te préviendra.',
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
      'Il reste une information que Stripe doit te demander directement — un numéro d’identité national, un justificatif de domicile. Ta pièce d’identité, elle, est déjà faite : on ne te la redemandera pas.',
    fallbackCta: 'Continuer sur Stripe',
    error: 'Une erreur est survenue. Réessaie.',
    incomplete_iban: 'Cet IBAN est incomplet.',
    invalid_iban: 'Cet IBAN n’est pas valide.',
    invalid_iban_country_code: 'Cet IBAN n’est pas dans une zone acceptée.',
    invalid_bank_account_iban: 'Ta banque a refusé cet IBAN.',
    bank_already_used:
      'Ce compte bancaire est déjà utilisé par un autre voyageur. Chacun doit recevoir ses paiements sur son propre compte.',
    account_number_invalid: 'Ce numéro de compte n’est pas valide.',
    routing_number_invalid: 'Ce sort code n’est pas valide.',
    invalid_dob: 'Cette date de naissance n’est pas valide.',
    country_locked:
      'Ton compte de paiement est déjà vérifié dans un autre pays, et le pays ne peut plus changer. Écris-nous et on s’en occupe.',
    identity_start_failed:
      'La vérification d’identité n’a pas pu démarrer. Réessaie dans un instant.',
  },
  en: {
    country: 'Which country is your bank account in?',
    countryHint: 'Permanent. Stripe does not allow changing it later.',
    countryPlaceholder: 'Choose a country',
    start: 'Get started',
    who: 'Who are you?',
    whoSub: 'As these details appear on your bank account.',
    verify: 'Verify your identity',
    verifySub:
      'An ID and a selfie, once. It covers both your verified profile and unlocking your payouts — you won’t be asked for it again.',
    verifyAgain:
      'Your ID was verified before, but it was never attached to your payout account. One last time, and that’s it for good.',
    verifyCta: 'Verify my identity',
    verifyPending:
      'Your ID is being checked. You can carry on — we’ll let you know.',
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
      'There’s one thing Stripe has to ask you for directly — a national ID number, a proof of address. Your ID document is already done: you won’t be asked for it again.',
    fallbackCta: 'Continue on Stripe',
    error: 'Something went wrong. Please try again.',
    incomplete_iban: 'This IBAN is incomplete.',
    invalid_iban: 'This IBAN isn’t valid.',
    invalid_iban_country_code: 'This IBAN isn’t from a supported country.',
    invalid_bank_account_iban: 'Your bank rejected this IBAN.',
    bank_already_used:
      'This bank account is already used by another traveller. Everyone must be paid into their own account.',
    account_number_invalid: 'This account number isn’t valid.',
    routing_number_invalid: 'This sort code isn’t valid.',
    invalid_dob: 'This date of birth isn’t valid.',
    country_locked:
      'Your payout account is already verified in another country, and the country can’t change. Write to us and we’ll sort it.',
    identity_start_failed:
      'Identity verification couldn’t start. Try again in a moment.',
  },
} as const;

/** SEPA countries take an IBAN; GB and Gibraltar take sort code + number. */
function usesIban(country: string): boolean {
  return !['GB', 'GI'].includes(country.toUpperCase());
}

type Step =
  | 'resuming'
  | 'country'
  | 'details'
  | 'verify'
  | 'bank'
  | 'terms'
  | 'done'
  | 'fallback';

/** Where 'back' goes from each step. Deliberately skips 'verify' on the way
 *  back from the bank: re-entering it would start a second Stripe Identity
 *  session, and a second upload, for someone who has already done it. */
const BACK: Partial<Record<Step, Step>> = {
  details: 'country',
  verify: 'details',
  bank: 'details',
  terms: 'bank',
};

/** Where does this traveler actually stand? Anything already satisfied is a
 *  step they must not be made to repeat — leaving the page mid-form and coming
 *  back to the very first question is how people give up. */
function stepFromStatus(d: any, identityVerified: boolean): Step {
  if (!d?.accountId) return 'country';

  // The status route could not read Stripe, so every field below it is stale
  // cache or an empty default — and an empty requirementsDue falls through to
  // 'done' at the bottom of this function. That is how a traveler ended up
  // being told "C'est fait" by a screen that had just failed to reach Stripe,
  // with no way to start over and a delivered parcel unpaid.
  //
  // accountMissing is the recoverable case: the stored account doesn't exist
  // for our key, and asking for the country again is exactly what clears it
  // and creates a real one. Any other error is not something this screen can
  // resolve, but restarting is still safer than claiming success.
  if (d.stripeError) return 'country';

  if (d.payoutsEnabled) return 'done';

  // The identity document is its own step now, so it must not be mistaken
  // for a field the 'who are you' form can fill.
  const identityDue: string[] = d.identityDue ?? [];
  // Requirements the hosted form has to handle — a national ID number, a
  // proof of address. Excluded from everything below, because asking our own
  // form for one is a loop: the traveler submits, the requirement stays, and
  // the same screen comes back.
  const unsupported: string[] = d.unsupported ?? [];
  const due: string[] = (d.requirementsDue ?? []).filter(
    (r: string) => !identityDue.includes(r) && !unsupported.includes(r)
  );

  // Details BEFORE the document, always. Stripe judges a person from their
  // name, date of birth and address and only asks to see an ID when that
  // isn't enough — so a verification created before Stripe has those has no
  // requirement to attach itself to, and the traveler is asked again later.
  if (due.some((r) => r.startsWith('individual.'))) return 'details';

  // A document sitting with Stripe awaiting judgement is not a document to
  // ask for. Without this the screen re-offers verification during the review
  // window, which is a second upload of the same passport minutes after the
  // first.
  const needsIdentity =
    !d.identityPending && (identityDue.length > 0 || !identityVerified);

  // Verification comes BEFORE the hosted form, not instead of it. Our check
  // is bound to this account, so it settles the document requirement here and
  // Stripe's form is left asking only for what we genuinely cannot collect.
  if (needsIdentity) return 'verify';
  if (unsupported.length) return 'fallback';

  if (due.includes('external_account')) return 'bank';
  if (due.some((r) => r.startsWith('tos_acceptance'))) return 'terms';
  return 'done';
}

const DRAFT_KEY = 'jibly.payout.draft';

export function PayoutOnboarding({
  onDone,
  bankOnly,
}: {
  onDone?: () => void;
  /** Skip straight to the bank step — for changing bank later, not onboarding. */
  bankOnly?: boolean;
}) {
  return (
    <Elements stripe={getStripeClient()}>
      <Flow onDone={onDone} bankOnly={bankOnly} />
    </Elements>
  );
}

function Flow({
  onDone,
  bankOnly,
}: {
  onDone?: () => void;
  bankOnly?: boolean;
}) {
  const { locale } = useI18n();
  const { profile } = useAuth();
  const c = COPY[locale === 'en' ? 'en' : 'fr'];
  const stripe = useStripe();
  const elements = useElements();

  const options = payoutCountryOptions(locale);
  const prefill = profile?.country
    ? findCountryByName(profile.country.trim())?.code ?? ''
    : '';

  // Verified WITH JIBLY. Separate from whether Stripe has accepted the same
  // person: everyone who verified before the accounts-first reorder is the
  // first without being the second, and telling them apart is what decides
  // whether the verify step says "once" or "one last time".
  const identityVerified = !!profile?.identity_verified_at;

  /**
   * Has this traveler just handed Stripe a document that hasn't been judged
   * yet? Three signals, because no single one covers the moment it matters —
   * the seconds after Stripe redirects them back here.
   *
   * `identity=done` is on the URL only because Stripe put it there, after a
   * submission. `processing` is our own record of the same thing. The
   * account's pending_verification is the authoritative one but lags: ask
   * again in that gap and the traveler photographs the same passport twice,
   * minutes apart.
   */
  function awaitingIdentity(d: any): boolean {
    if (d?.identityPending === true) return true;
    if (profile?.identity_verification_status === 'processing') return true;
    if (typeof window === 'undefined') return false;
    return new URLSearchParams(window.location.search).get('identity') === 'done';
  }

  const [step, setStep] = useState<Step>(bankOnly ? 'bank' : 'resuming');
  const [country, setCountry] = useState(
    options.some((o) => o.code === prefill) ? prefill : ''
  );
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [errCode, setErrCode] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  // A document with Stripe, not yet judged. The traveler can carry on with
  // the bank details meanwhile — but they should be told it is in hand, or
  // they will go looking for the upload they have already done.
  const [identityPending, setIdentityPending] = useState(false);

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
  // Resume where Stripe says this traveler actually is. Without this, leaving
  // the page for any reason drops them back at "which country?" with an
  // account already created — the complaint that prompted it.
  useEffect(() => {
    let cancelled = false;
    fetch('/api/connect/status')
      .then((r) => r.json())
      .then((d) => {
        if (cancelled) return;
        // Needed in both modes: it decides IBAN versus sort code.
        if (typeof d?.country === 'string') setCountry(d.country.toUpperCase());
        const pending = awaitingIdentity(d);
        setIdentityPending(pending);
        if (bankOnly) return;
        setStep(stepFromStatus({ ...d, identityPending: pending }, identityVerified));
      })
      .catch(() => {
        // Status is a convenience, not a gate. If it fails, start from the top
        // rather than showing a spinner forever.
        if (!cancelled) setStep('country');
      });
    return () => {
      cancelled = true;
    };
    // awaitingIdentity closes over the profile and the URL, both of which are
    // stable for the life of this screen. Re-running the status read on every
    // render because its identity changed would be a request per keystroke.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bankOnly, identityVerified]);

  // Keep what they've typed across a navigation. Only the plain identity
  // fields: the bank number is inside Stripe's element and never lives here,
  // so there is nothing sensitive to leak. sessionStorage rather than
  // localStorage so it dies with the tab, and cleared once submitted.
  useEffect(() => {
    if (bankOnly || step !== 'details') return;
    try {
      const raw = sessionStorage.getItem(DRAFT_KEY);
      if (!raw) return;
      const d = JSON.parse(raw);
      if (d.firstName) setFirstName(d.firstName);
      if (d.lastName) setLastName(d.lastName);
      if (d.dobDay) setDobDay(d.dobDay);
      if (d.dobMonth) setDobMonth(d.dobMonth);
      if (d.dobYear) setDobYear(d.dobYear);
      if (d.line1) setLine1(d.line1);
      if (d.line2) setLine2(d.line2);
      if (d.city) setCity(d.city);
      if (d.postalCode) setPostalCode(d.postalCode);
    } catch {
      /* private mode, cleared storage — not worth failing over */
    }
    // Restoring once on entering the step is the point; re-running on every
    // keystroke would fight the user's typing.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, bankOnly]);

  useEffect(() => {
    if (bankOnly || step !== 'details') return;
    try {
      sessionStorage.setItem(
        DRAFT_KEY,
        JSON.stringify({
          firstName, lastName, dobDay, dobMonth, dobYear,
          line1, line2, city, postalCode,
        })
      );
    } catch {
      /* ignore */
    }
  }, [
    bankOnly, step, firstName, lastName, dobDay, dobMonth, dobYear,
    line1, line2, city, postalCode,
  ]);

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
      const pending = awaitingIdentity(data);
      setIdentityPending(pending);
      // One resolver for every entry point, so the country step can't disagree
      // with the resume path about where this traveler actually is. The route
      // answers in the same shape /api/connect/status does.
      setStep(stepFromStatus({ ...data, identityPending: pending }, identityVerified));
    } catch (e: any) {
      fail(e.code);
    } finally {
      setLoading(false);
    }
  }

  async function submitDetails() {
    setLoading(true);
    setErr(null);
    setErrCode(null);
    try {
      const data = await post('/api/connect/details', {
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
      try {
        sessionStorage.removeItem(DRAFT_KEY);
      } catch {
        /* ignore */
      }
      // Submitting a name, a date of birth and an address is the moment
      // Stripe decides whether it also needs to see an ID, so the next step
      // comes from this response rather than being assumed.
      const pending = awaitingIdentity(data);
      setIdentityPending(pending);
      setStep(stepFromStatus({ ...data, identityPending: pending }, identityVerified));
    } catch (e: any) {
      fail(e.code);
    } finally {
      setLoading(false);
    }
  }

  /**
   * Hand the traveler to Stripe Identity for the one document upload.
   *
   * The country goes with the request so the server can open the connected
   * account before creating the session — that is what lets the verification
   * carry related_person and settle Stripe's KYC at the same time. Coming
   * back lands on the payouts tab, where this flow resumes at whatever step
   * Stripe now says is next.
   */
  async function startVerification() {
    setLoading(true);
    setErr(null);
    setErrCode(null);
    try {
      const returnTo =
        typeof window !== 'undefined'
          ? `${window.location.pathname}?tab=payouts`
          : '/me?tab=payouts';
      const data = await post('/api/identity/create-session', {
        country,
        returnTo,
      });
      if (data.url) window.location.href = data.url;
      else fail(data.code);
    } catch (e: any) {
      // Verified with us AND accepted by Stripe: there is nothing to upload,
      // the screen was just behind. Move on rather than showing an error.
      if (/already verified/i.test(String(e?.code ?? ''))) {
        setStep('bank');
        return;
      }
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
      // Changing bank later doesn't re-accept the terms — they already did.
      if (bankOnly) {
        setStep('done');
        onDone?.();
      } else {
        setStep('terms');
      }
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

  const detailsReady =
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
      {step === 'resuming' && (
        <div className="flex items-center gap-2 text-[13px] text-ink-400 py-3">
          <Loader2 className="w-4 h-4 animate-spin" />
        </div>
      )}

      {identityPending && step !== 'resuming' && step !== 'verify' && (
        <p className="mb-4 rounded-xl bg-cream-100 border border-ink-50 px-3.5 py-2.5 text-[12px] text-ink-500 leading-relaxed">
          {c.verifyPending}
        </p>
      )}

      {!bankOnly && step !== 'resuming' && step !== 'country' && step !== 'done' && (
        <button
          onClick={() => setStep(BACK[step] ?? 'country')}
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

      {step === 'details' && (
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

          <Button onClick={submitDetails} disabled={!detailsReady || loading} size="sm" fullWidth>
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
            {c.next}
          </Button>
        </>
      )}

      {step === 'verify' && (
        <>
          <h3 className="text-[16px] font-semibold text-ink-900 mb-1">
            {c.verify}
          </h3>
          {/* Someone already verified with us is here because their old check
              was never tied to this account — say so plainly rather than
              pretending this is routine. Everyone else is told, truthfully,
              that this is the only time they will be asked. */}
          <p className="text-[13px] text-ink-400 mb-4 leading-relaxed">
            {identityVerified ? c.verifyAgain : c.verifySub}
          </p>
          <Button onClick={startVerification} disabled={loading} size="sm" fullWidth>
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <ShieldCheck className="w-4 h-4" />
            )}
            {c.verifyCta}
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
            {c.accept}
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
