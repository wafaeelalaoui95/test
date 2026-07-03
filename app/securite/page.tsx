// app/securite/page.tsx
//
// Safety rules page. Plain, reassuring language that protects the traveler:
// they must always know what they carry, never take a sealed parcel, can
// refuse without penalty, and know how to report a problem.

'use client';

import Link from 'next/link';
import { ArrowLeft, ShieldCheck, Eye, PackageX, Ban, AlertTriangle, Flag } from 'lucide-react';
import { useI18n } from '@/lib/i18n/context';

type Block = { icon: any; title: string; body: string; list?: string[]; tone?: 'plain' | 'warn' | 'good' };

const CONTENT: Record<'fr' | 'en', {
  badge: string;
  title: string;
  intro: string;
  backHome: string;
  doubtTitle: string;
  doubtBody: string;
  blocks: Block[];
}> = {
  fr: {
    badge: 'Règles de sécurité',
    title: 'Voyager et envoyer en toute confiance',
    intro:
      'Jibly met en relation des expéditeurs et des voyageurs. Pour que tout le monde voyage l’esprit tranquille, quelques règles simples protègent surtout le voyageur.',
    backHome: 'Retour à l’accueil',
    doubtTitle: 'En cas de doute, refusez.',
    doubtBody:
      'Vous n’avez jamais à vous justifier. Si quelque chose vous met mal à l’aise, refusez : c’est votre droit, sans pénalité.',
    blocks: [
      {
        icon: Eye,
        tone: 'plain',
        title: 'Le voyageur doit toujours savoir ce qu’il transporte',
        body: 'L’objet doit être décrit précisément et correspondre exactement à ce qui est annoncé. Vous pouvez toujours le voir et poser des questions avant d’accepter.',
      },
      {
        icon: PackageX,
        tone: 'warn',
        title: 'Pas de colis fermé ou impossible à inspecter',
        body: 'N’acceptez jamais un objet emballé, scellé ou fermé que vous ne pouvez pas ouvrir et vérifier. Si l’expéditeur refuse l’inspection, refusez le transport.',
      },
      {
        icon: Ban,
        tone: 'warn',
        title: 'Objets interdits',
        body: 'Ces objets ne peuvent jamais être transportés via Jibly :',
        list: [
          'Espèces et argent liquide',
          'Drogues et stupéfiants',
          'Armes',
          'Produits dangereux (inflammables, explosifs…)',
          'Animaux',
          'Objets volés',
          'Produits contrefaits',
          'Substances inconnues',
          'Colis fermés ou scellés impossibles à ouvrir',
        ],
      },
      {
        icon: AlertTriangle,
        tone: 'plain',
        title: 'Objets sensibles — prudence',
        body: 'Ces objets peuvent être réglementés selon le pays, la compagnie aérienne ou la douane. Le voyageur doit pouvoir vérifier le contenu et refuser sans pénalité :',
        list: [
          'Médicaments et ordonnances',
          'Passeports et cartes d’identité',
          'Bijoux et montres de luxe',
          'Appareils électroniques avec batterie',
          'Alcool et tabac',
          'Compléments alimentaires',
          'Cosmétiques en grande quantité',
        ],
      },
      {
        icon: ShieldCheck,
        tone: 'good',
        title: 'Droit de refus sans pénalité',
        body: 'Le voyageur peut refuser ou annuler sans pénalité si l’objet ne correspond pas à la description, s’il est fermé/scellé, si l’inspection est refusée, si l’objet semble interdit ou risqué, ou s’il n’est tout simplement pas à l’aise.',
      },
      {
        icon: Flag,
        tone: 'plain',
        title: 'Signaler un objet suspect',
        body: 'Un bouton « Signaler un problème » est disponible sur chaque réservation. Utilisez-le si l’objet est différent de la description, impossible à inspecter, ou si le comportement de l’autre personne vous semble suspect.',
      },
    ],
  },
  en: {
    badge: 'Safety rules',
    title: 'Travel and send with confidence',
    intro:
      'Jibly connects senders and travelers. So everyone travels with peace of mind, a few simple rules protect the traveler above all.',
    backHome: 'Back home',
    doubtTitle: 'When in doubt, refuse.',
    doubtBody:
      'You never have to justify yourself. If something makes you uncomfortable, refuse — it’s your right, with no penalty.',
    blocks: [
      {
        icon: Eye,
        tone: 'plain',
        title: 'The traveler must always know what they carry',
        body: 'The item must be described precisely and match exactly what’s announced. You can always see it and ask questions before accepting.',
      },
      {
        icon: PackageX,
        tone: 'warn',
        title: 'No closed or non-inspectable parcels',
        body: 'Never accept an item that is packed, sealed or closed and that you cannot open and check. If the sender refuses inspection, refuse the trip.',
      },
      {
        icon: Ban,
        tone: 'warn',
        title: 'Prohibited items',
        body: 'These can never be carried through Jibly:',
        list: [
          'Cash',
          'Drugs and narcotics',
          'Weapons',
          'Dangerous goods (flammable, explosive…)',
          'Animals',
          'Stolen goods',
          'Counterfeit products',
          'Unknown substances',
          'Closed or sealed parcels that can’t be opened',
        ],
      },
      {
        icon: AlertTriangle,
        tone: 'plain',
        title: 'Sensitive items — caution',
        body: 'These may be regulated depending on the country, airline or customs. The traveler must be able to check the contents and refuse without penalty:',
        list: [
          'Medication and prescriptions',
          'Passports and ID cards',
          'Jewelry and luxury watches',
          'Electronics with a battery',
          'Alcohol and tobacco',
          'Food supplements',
          'Cosmetics in large quantities',
        ],
      },
      {
        icon: ShieldCheck,
        tone: 'good',
        title: 'Right to refuse without penalty',
        body: 'The traveler can refuse or cancel with no penalty if the item doesn’t match the description, is closed/sealed, if inspection is refused, if it looks prohibited or risky, or if they’re simply not comfortable.',
      },
      {
        icon: Flag,
        tone: 'plain',
        title: 'Report a suspicious item',
        body: 'A “Report a problem” button is available on every booking. Use it if the item differs from the description, can’t be inspected, or if the other person’s behavior seems suspicious.',
      },
    ],
  },
};

export default function SecurityRulesPage() {
  const { locale } = useI18n();
  const c = CONTENT[locale === 'en' ? 'en' : 'fr'];

  const toneClass = (tone?: string) =>
    tone === 'warn'
      ? 'bg-blush-50 border-blush-200/60'
      : tone === 'good'
        ? 'bg-mint-50 border-mint-200/60'
        : 'bg-white border-ink-50';

  return (
    <main className="min-h-screen bg-cream-50">
      <div className="mx-auto max-w-3xl px-5 sm:px-8 py-10 sm:py-14">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-[13px] text-ink-400 hover:text-ink-600 transition-colors mb-8"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          {c.backHome}
        </Link>

        <div className="mb-8">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-mint-50 border border-mint-200/60 mb-4">
            <ShieldCheck className="w-3.5 h-3.5 text-mint-700" />
            <span className="text-[12px] font-bold text-mint-700 tracking-wide">{c.badge}</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-ink-600 tracking-[-0.025em] mb-3">
            {c.title}
          </h1>
          <p className="text-[15px] text-ink-500 leading-relaxed">{c.intro}</p>
        </div>

        {/* "When in doubt, refuse" — the headline reassurance */}
        <div className="rounded-2xl bg-ink-500 text-cream-50 p-5 sm:p-6 mb-6">
          <div className="text-[17px] font-extrabold tracking-[-0.01em] mb-1.5">{c.doubtTitle}</div>
          <p className="text-[14px] text-cream-100/90 leading-relaxed">{c.doubtBody}</p>
        </div>

        <div className="space-y-4">
          {c.blocks.map((b) => {
            const Icon = b.icon;
            return (
              <section key={b.title} className={`rounded-2xl border p-5 sm:p-6 ${toneClass(b.tone)}`}>
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 w-9 h-9 rounded-xl bg-white/70 border border-ink-50 flex items-center justify-center">
                    <Icon className="w-[18px] h-[18px] text-ink-600" strokeWidth={2} />
                  </div>
                  <div className="min-w-0">
                    <h2 className="text-[16px] font-bold text-ink-600 mb-1.5">{b.title}</h2>
                    <p className="text-[14px] text-ink-500 leading-relaxed">{b.body}</p>
                    {b.list && (
                      <ul className="mt-3 grid sm:grid-cols-2 gap-x-4 gap-y-1.5">
                        {b.list.map((it) => (
                          <li key={it} className="text-[13px] text-ink-600 flex items-start gap-1.5">
                            <span className="text-ink-300 mt-0.5">•</span>
                            <span>{it}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>
              </section>
            );
          })}
        </div>
      </div>
    </main>
  );
}
