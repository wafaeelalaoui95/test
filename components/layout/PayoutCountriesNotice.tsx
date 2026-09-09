'use client';

import { useEffect, useState } from 'react';
import { X, ChevronDown, Landmark } from 'lucide-react';
import { useI18n } from '@/lib/i18n/context';
import { payoutCountryNames, PAYOUT_COUNTRIES } from '@/lib/stripe/payout-countries';

// =============================================================================
// PayoutCountriesNotice — where a traveler can be paid, said up front
// =============================================================================
// Until now this was disclosed in one place: the country dropdown inside payout
// onboarding, which a traveler reaches AFTER signing up, listing a trip, and in
// the worst case carrying a parcel. Someone who cannot be paid should learn it
// before they carry something, not after — and the Morocco corridor is where it
// matters, because Stripe does not operate there at all.
//
// Not a marquee. A moving banner reads as an alarm, is hard to read, and moves
// under people who did not ask it to; this says the same thing once, calmly,
// and goes away when dismissed.
//
// Framed as what works rather than what doesn't: a Morocco-based traveler is
// not excluded, they need a European account, and many on that route already
// have one. Saying only "Morocco is not supported" would lose travelers we can
// actually pay.

const DISMISSED_KEY = 'jibly.payout-countries-notice.v1';

export function PayoutCountriesNotice() {
  // Starts hidden and appears after mount. Rendering it during SSR would make
  // the banner flash for someone who dismissed it a week ago, since
  // localStorage isn't readable on the server.
  const [show, setShow] = useState(false);
  const [open, setOpen] = useState(false);
  const { locale } = useI18n();
  const en = locale === 'en';

  useEffect(() => {
    try {
      if (!window.localStorage.getItem(DISMISSED_KEY)) setShow(true);
    } catch {
      // Private mode, or storage blocked. Showing it is the safer failure:
      // an extra banner beats a traveler who never learns this.
      setShow(true);
    }
  }, []);

  if (!show) return null;

  const dismiss = () => {
    setShow(false);
    try {
      window.localStorage.setItem(DISMISSED_KEY, '1');
    } catch {
      /* dismissal just won't stick — still better than blocking the click */
    }
  };

  return (
    <div className="bg-cream-100 border-b border-ink-50">
      <div className="mx-auto max-w-7xl px-5 sm:px-8 lg:px-12 py-2.5">
        <div className="flex items-start gap-3">
          <Landmark
            className="w-4 h-4 text-ink-400 flex-shrink-0 mt-0.5"
            strokeWidth={1.75}
          />

          <div className="flex-1 min-w-0 text-[13px] leading-relaxed text-ink-500">
            <span className="font-semibold text-ink-600">
              {en ? 'Travellers:' : 'Voyageurs :'}
            </span>{' '}
            {en
              ? 'you are paid into a European bank account.'
              : 'vous êtes payés sur un compte bancaire européen.'}{' '}
            <span className="text-ink-400">
              {en
                ? `${PAYOUT_COUNTRIES.length} countries, including France, Belgium, Spain and the UK. Morocco isn't covered by our payment provider — a European account is all you need.`
                : `${PAYOUT_COUNTRIES.length} pays, dont la France, la Belgique, l'Espagne et le Royaume-Uni. Le Maroc n'est pas couvert par notre prestataire de paiement — un compte européen suffit.`}
            </span>{' '}
            <button
              onClick={() => setOpen((v) => !v)}
              className="inline-flex items-center gap-0.5 font-medium text-ink-600 hover:text-ink-900 underline underline-offset-2 transition-colors"
              aria-expanded={open}
            >
              {en ? 'See the list' : 'Voir la liste'}
              <ChevronDown
                className={`w-3 h-3 transition-transform ${open ? 'rotate-180' : ''}`}
                strokeWidth={2}
              />
            </button>

            {open && (
              // The real list rather than a curated sample: someone checking
              // this is checking for one specific country, and a shortened
              // list answers "maybe" when they need yes or no.
              <p className="mt-2 text-[12px] text-ink-400 leading-relaxed">
                {payoutCountryNames(locale).join(' · ')}
              </p>
            )}
          </div>

          <button
            onClick={dismiss}
            aria-label={en ? 'Dismiss' : 'Fermer'}
            className="p-1 -m-1 rounded-full text-ink-300 hover:text-ink-500 hover:bg-ink-50 transition-colors flex-shrink-0"
          >
            <X className="w-3.5 h-3.5" strokeWidth={2} />
          </button>
        </div>
      </div>
    </div>
  );
}
