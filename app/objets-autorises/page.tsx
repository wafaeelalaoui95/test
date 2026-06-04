// app/objets-autorises/page.tsx
//
// Authoritative policy page for what can and can't be transported via Jibly.
// Linked from /trust, the navbar (added in Navbar.tsx), and referenced from
// the CGU. Designed to be the canonical URL we can point users to AND quote
// in compliance docs.
//
// Style: visual cards with big emoji + short label rather than dense text —
// per the design brief ("présenter cette liste sous forme de cartes ou
// d'icônes plutôt que d'un bloc de texte").

'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  ShieldCheck,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Sparkles,
  ArrowRight,
} from 'lucide-react';

// -----------------------------------------------------------------------------
// AUTHORIZED items — what Jibly is built for
// -----------------------------------------------------------------------------

const ALLOWED = [
  {
    emoji: '📄',
    label: 'Documents',
    examples: 'Papiers administratifs, courriers, certificats',
  },
  {
    emoji: '🔑',
    label: 'Clés',
    examples: 'Clés oubliées, doubles, clés professionnelles',
  },
  {
    emoji: '🎁',
    label: 'Objets personnels',
    examples: 'Vêtements, livres, souvenirs, petits cadeaux',
  },
  {
    emoji: '💊',
    label: 'Médicaments sur ordonnance',
    examples: 'Sous réserve de la réglementation du pays d\'arrivée',
  },
  {
    emoji: '📦',
    label: 'Petits colis',
    examples: 'Échantillons, accessoires, produits non périssables',
  },
];

// -----------------------------------------------------------------------------
// FORBIDDEN items — hard list, no exceptions
// -----------------------------------------------------------------------------

const FORBIDDEN = [
  {
    emoji: '💵',
    label: 'Argent liquide',
    reason: 'Aucun montant, en aucune devise.',
  },
  {
    emoji: '💍',
    label: 'Bijoux et montres',
    reason: 'Y compris ceux à valeur sentimentale.',
  },
  {
    emoji: '💎',
    label: 'Objets de luxe',
    reason: 'Sacs de marque, accessoires de créateurs.',
  },
  {
    emoji: '💰',
    label: 'Valeur > 500 €',
    reason: 'Tout objet d\'une valeur supérieure à 500 €.',
  },
  {
    emoji: '⚠️',
    label: 'Produits dangereux',
    reason: 'Liquides inflammables, gaz, batteries lithium non protégées.',
  },
  {
    emoji: '🔫',
    label: 'Armes',
    reason: 'Toutes catégories, y compris répliques et armes blanches.',
  },
  {
    emoji: '🚫',
    label: 'Produits illicites',
    reason: 'Drogues, médicaments sans ordonnance, contrefaçons.',
  },
  {
    emoji: '🛂',
    label: 'Objets interdits localement',
    reason: 'Tout objet interdit dans le pays de départ ou d\'arrivée.',
  },
];

// =============================================================================

export default function ObjetsAutorisesPage() {
  return (
    <main className="min-h-screen">
      {/* HERO */}
      <section className="relative overflow-hidden bg-gradient-to-br from-cream-100 via-cream-50 to-mint-50/30">
        <div className="relative mx-auto max-w-5xl px-5 sm:px-8 lg:px-12 py-14 sm:py-20">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="text-center"
          >
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white border border-ink-100 mb-5">
              <ShieldCheck className="w-3.5 h-3.5 text-ink-500" />
              <span className="text-[12px] font-bold text-ink-600 tracking-wide">
                Politique d&apos;utilisation
              </span>
            </div>
            <h1 className="text-4xl sm:text-5xl font-extrabold text-ink-600 tracking-[-0.03em] leading-[1.05] mb-4">
              Que peut-on<br />transporter sur Jibly ?
            </h1>
            <p className="text-[16px] text-ink-500 leading-relaxed max-w-2xl mx-auto">
              Jibly est pensé pour les petits objets du quotidien.
              Pour la sécurité de tous, certaines catégories sont strictement interdites.
            </p>
          </motion.div>
        </div>
      </section>

      {/* AUTORISÉS */}
      <section className="py-16 sm:py-20">
        <div className="mx-auto max-w-5xl px-5 sm:px-8 lg:px-12">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-10 h-10 rounded-2xl bg-mint-100 flex items-center justify-center">
              <CheckCircle2 className="w-5 h-5 text-mint-700" />
            </div>
            <div>
              <p className="text-[12px] font-bold tracking-[0.18em] text-mint-700 uppercase">
                Autorisés
              </p>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-ink-600 tracking-[-0.02em]">
                Ce que Jibly transporte
              </h2>
            </div>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {ALLOWED.map((item, i) => (
              <motion.div
                key={item.label}
                initial={{ opacity: 0, y: 12 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.05, duration: 0.3 }}
                className="bg-white rounded-2xl p-5 border border-mint-100/60 hover:border-mint-200 transition-colors"
              >
                <div className="flex items-start gap-3">
                  <div className="text-4xl flex-shrink-0">{item.emoji}</div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-[15px] font-bold text-ink-600 mb-1">
                      {item.label}
                    </h3>
                    <p className="text-[12px] text-ink-400 leading-relaxed">
                      {item.examples}
                    </p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* INTERDITS */}
      <section className="py-16 sm:py-20 bg-blush-50/30">
        <div className="mx-auto max-w-5xl px-5 sm:px-8 lg:px-12">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-10 h-10 rounded-2xl bg-blush-100 flex items-center justify-center">
              <XCircle className="w-5 h-5 text-blush-600" />
            </div>
            <div>
              <p className="text-[12px] font-bold tracking-[0.18em] text-blush-600 uppercase">
                Interdits
              </p>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-ink-600 tracking-[-0.02em]">
                Ce que Jibly ne transporte pas
              </h2>
            </div>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {FORBIDDEN.map((item, i) => (
              <motion.div
                key={item.label}
                initial={{ opacity: 0, y: 12 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.04, duration: 0.3 }}
                className="bg-white rounded-2xl p-5 border border-blush-100/80 relative overflow-hidden"
              >
                {/* Diagonal "INTERDIT" stripe in the corner — subtle visual cue */}
                <div className="absolute top-2 right-2 text-[9px] font-bold tracking-wider text-blush-400 uppercase">
                  Interdit
                </div>
                <div className="text-4xl mb-3 grayscale-[20%]">{item.emoji}</div>
                <h3 className="text-[14px] font-bold text-ink-600 mb-1">
                  {item.label}
                </h3>
                <p className="text-[11px] text-ink-400 leading-relaxed">
                  {item.reason}
                </p>
              </motion.div>
            ))}
          </div>

          {/* Warning banner — consequences */}
          <div className="mt-10 p-5 sm:p-6 rounded-2xl bg-blush-100/40 border border-blush-200/60 flex gap-4 items-start">
            <AlertTriangle className="w-6 h-6 text-blush-600 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="text-[15px] font-bold text-ink-600 mb-1.5">
                Conséquences en cas d&apos;infraction
              </h3>
              <p className="text-[13px] text-ink-500 leading-relaxed">
                Tout colis contenant un objet interdit peut entraîner la
                <strong className="text-ink-600"> suspension immédiate </strong>
                du compte de l&apos;expéditeur et du voyageur. Jibly se réserve
                le droit de signaler aux autorités tout transport d&apos;objet illicite.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* RESPONSABILITÉS */}
      <section className="py-16 sm:py-20">
        <div className="mx-auto max-w-3xl px-5 sm:px-8 lg:px-12">
          <div className="text-center mb-10">
            <p className="text-[12px] font-bold tracking-[0.18em] text-ink-300 uppercase mb-2">
              Vos responsabilités
            </p>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-ink-600 tracking-[-0.025em]">
              Ce que vous devez savoir
            </h2>
          </div>

          <div className="space-y-3">
            <div className="bg-cream-50 rounded-2xl p-5 border border-ink-50 flex gap-4 items-start">
              <span className="text-2xl flex-shrink-0">📋</span>
              <div>
                <h3 className="text-[14px] font-bold text-ink-600 mb-1">
                  Déclarez le contenu honnêtement
                </h3>
                <p className="text-[13px] text-ink-500 leading-relaxed">
                  Une description précise protège tout le monde. Une fausse
                  déclaration peut entraîner la suspension de votre compte.
                </p>
              </div>
            </div>
            <div className="bg-cream-50 rounded-2xl p-5 border border-ink-50 flex gap-4 items-start">
              <span className="text-2xl flex-shrink-0">🌍</span>
              <div>
                <h3 className="text-[14px] font-bold text-ink-600 mb-1">
                  Renseignez-vous sur la réglementation locale
                </h3>
                <p className="text-[13px] text-ink-500 leading-relaxed">
                  Ce qui est autorisé dans un pays peut être interdit ailleurs.
                  Vérifiez les règles douanières du pays d&apos;arrivée.
                </p>
              </div>
            </div>
            <div className="bg-cream-50 rounded-2xl p-5 border border-ink-50 flex gap-4 items-start">
              <span className="text-2xl flex-shrink-0">📸</span>
              <div>
                <h3 className="text-[14px] font-bold text-ink-600 mb-1">
                  Le voyageur peut refuser un colis
                </h3>
                <p className="text-[13px] text-ink-500 leading-relaxed">
                  Si le colis présenté ne correspond pas à la description ou
                  semble suspect, le voyageur a le droit de refuser sans
                  pénalité.
                </p>
              </div>
            </div>
            <div className="bg-cream-50 rounded-2xl p-5 border border-ink-50 flex gap-4 items-start">
              <span className="text-2xl flex-shrink-0">🚨</span>
              <div>
                <h3 className="text-[14px] font-bold text-ink-600 mb-1">
                  Signalez les abus
                </h3>
                <p className="text-[13px] text-ink-500 leading-relaxed">
                  Si on vous demande de transporter un objet interdit,
                  signalez-le immédiatement. Vous protégez la communauté.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 sm:py-20 bg-ink-500">
        <div className="mx-auto max-w-3xl px-5 sm:px-8 lg:px-12 text-center">
          <Sparkles className="w-8 h-8 text-butter-400 mx-auto mb-4" />
          <h2 className="text-2xl sm:text-3xl font-extrabold text-cream-50 tracking-[-0.025em] mb-3">
            En savoir plus sur la sécurité Jibly
          </h2>
          <p className="text-[14px] text-cream-200 leading-relaxed mb-6 max-w-xl mx-auto">
            Découvrez comment nous protégeons votre paiement, vérifions les
            identités et gérons les litiges.
          </p>
          <Link
            href="/trust"
            className="inline-flex items-center gap-2 px-5 py-3 rounded-full bg-cream-50 hover:bg-cream-100 text-ink-600 text-[14px] font-bold transition-colors"
          >
            Lire notre politique de confiance
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </section>
    </main>
  );
}
