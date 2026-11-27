'use client';

import { ShoppingBag, ExternalLink } from 'lucide-react';
import { useI18n } from '@/lib/i18n/context';
import { formatEuros } from '@/lib/utils';
import { MAX_PURCHASE_EUR } from '@/lib/stripe/purchase';

// =============================================================================
// "The traveller buys the item for me"
// =============================================================================
// The sender asks the traveller to buy the item before the trip. They give a
// FIXED price (the traveller is reimbursed exactly that, Jibly cannot check a
// receipt) and, optionally, a link to where it is sold. The price is charged
// on top of the service; see lib/stripe/purchase.ts for the money side.
//
// Copy lives here rather than in translations.ts while the feature is on its
// test branch; move it there if it ships.

const COPY = {
  fr: {
    toggle: "Le voyageur achète l'objet pour moi",
    toggleHint: "Il l'achète avant de partir et vous l'apporte. Vous payez le prix de l'objet en plus du service.",
    price: "Prix de l'objet (€)",
    priceHint: `Le voyageur sera remboursé exactement ce montant, sans commission Jibly. Maximum ${MAX_PURCHASE_EUR} €.`,
    url: 'Lien vers le produit (facultatif)',
    urlInvalid: 'Le lien doit commencer par https://',
    rx: "Rappel : les médicaments sur ordonnance sont interdits sur Jibly, achetés ou non. Uniquement des produits en vente libre.",
    summaryTitle: "Achat demandé",
    summaryText: (p: string) => `L'expéditeur vous demande d'acheter cet objet. Vous serez remboursé ${p} à la livraison, en plus de votre rémunération.`,
    link: 'Voir le produit',
  },
  en: {
    toggle: 'The traveller buys the item for me',
    toggleHint: 'They buy it before leaving and bring it to you. You pay the item price on top of the service.',
    price: 'Item price (€)',
    priceHint: `The traveller is reimbursed exactly this amount, with no Jibly commission. Maximum ${MAX_PURCHASE_EUR} €.`,
    url: 'Link to the product (optional)',
    urlInvalid: 'The link must start with https://',
    rx: 'Reminder: prescription medication is not allowed on Jibly, bought or not. Over-the-counter products only.',
    summaryTitle: 'Purchase requested',
    summaryText: (p: string) => `The sender asks you to buy this item. You will be reimbursed ${p} on delivery, on top of your fee.`,
    link: 'See the product',
  },
} as const;

export type PurchaseState = { on: boolean; price: string; url: string };
export const EMPTY_PURCHASE: PurchaseState = { on: false, price: '', url: '' };

export function isValidPurchaseUrl(url: string): boolean {
  const u = url.trim();
  if (!u) return true;
  try {
    const parsed = new URL(u);
    return parsed.protocol === 'https:' || parsed.protocol === 'http:';
  } catch {
    return false;
  }
}

/** The fixed item price in euros, or null when the option is off or invalid. */
export function purchasePriceOf(p: PurchaseState): number | null {
  if (!p.on) return null;
  const v = Math.round(Number(p.price.replace(',', '.')) * 100) / 100;
  if (!Number.isFinite(v) || v < 1 || v > MAX_PURCHASE_EUR) return null;
  return v;
}

/** Off, or on with a valid price and link. */
export function isPurchaseComplete(p: PurchaseState): boolean {
  return !p.on || (purchasePriceOf(p) != null && isValidPurchaseUrl(p.url));
}

export function PurchaseOption({
  value,
  onChange,
}: {
  value: PurchaseState;
  onChange: (v: PurchaseState) => void;
}) {
  const { locale } = useI18n();
  const c = COPY[locale === 'en' ? 'en' : 'fr'];
  const urlBad = value.url.trim().length > 0 && !isValidPurchaseUrl(value.url);

  return (
    <div className="rounded-xl border border-ink-100 bg-white px-4 py-3.5">
      <label className="flex items-start gap-2.5 cursor-pointer">
        <input
          type="checkbox"
          checked={value.on}
          onChange={(e) => onChange({ ...value, on: e.target.checked })}
          className="mt-0.5 w-4 h-4 rounded border-ink-300 text-ink-500 focus:ring-2 focus:ring-lavender-500/30 cursor-pointer"
        />
        <span>
          <span className="flex items-center gap-1.5 text-[13px] font-semibold text-ink-600">
            <ShoppingBag className="w-3.5 h-3.5" />
            {c.toggle}
          </span>
          <span className="block text-[12px] text-ink-400 leading-relaxed mt-0.5">{c.toggleHint}</span>
        </span>
      </label>

      {value.on && (
        <div className="mt-3.5 space-y-3">
          <div>
            <label className="block text-[12px] font-semibold text-ink-500 mb-1.5">{c.price}</label>
            <input
              type="text"
              inputMode="decimal"
              value={value.price}
              onChange={(e) => onChange({ ...value, price: e.target.value.replace(/[^0-9.,]/g, '') })}
              placeholder="25"
              className="w-full rounded-xl border border-ink-100 bg-cream-50 px-3.5 py-2.5 text-[14px] text-ink-600 focus:outline-none focus:ring-2 focus:ring-lavender-500/30"
            />
            <p className="text-[11px] text-ink-400 mt-1 leading-relaxed">{c.priceHint}</p>
          </div>
          <div>
            <label className="block text-[12px] font-semibold text-ink-500 mb-1.5">{c.url}</label>
            <input
              type="url"
              value={value.url}
              onChange={(e) => onChange({ ...value, url: e.target.value })}
              placeholder="https://"
              maxLength={1000}
              className="w-full rounded-xl border border-ink-100 bg-cream-50 px-3.5 py-2.5 text-[14px] text-ink-600 focus:outline-none focus:ring-2 focus:ring-lavender-500/30"
            />
            {urlBad && <p className="text-[12px] text-blush-500 mt-1">{c.urlInvalid}</p>}
          </div>
          <div className="bg-butter-50 border border-butter-200 rounded-xl px-3.5 py-2.5 text-[12px] text-ink-600 leading-relaxed">
            ⚠️ {c.rx}
          </div>
        </div>
      )}
    </div>
  );
}

/** What the traveller sees on a booking where the sender asked for a purchase. */
export function PurchaseSummary({
  price,
  url,
}: {
  price: number | null | undefined;
  url: string | null | undefined;
}) {
  const { locale } = useI18n();
  const c = COPY[locale === 'en' ? 'en' : 'fr'];
  if (price == null) return null;
  const safeUrl = url && isValidPurchaseUrl(url) ? url : null;
  return (
    <div className="rounded-xl bg-lavender-50 border border-lavender-200/60 px-3.5 py-2.5 text-[12px] text-ink-600 leading-relaxed">
      <div className="font-bold flex items-center gap-1.5 mb-0.5">
        <ShoppingBag className="w-3.5 h-3.5" />
        {c.summaryTitle} · {formatEuros(Number(price))}
      </div>
      {c.summaryText(formatEuros(Number(price)))}
      {safeUrl && (
        <a
          href={safeUrl}
          target="_blank"
          rel="noopener noreferrer nofollow"
          className="mt-1 inline-flex items-center gap-1 font-semibold text-lavender-700 underline"
        >
          {c.link} <ExternalLink className="w-3 h-3" />
        </a>
      )}
    </div>
  );
}
