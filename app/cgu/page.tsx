// app/cgu/page.tsx
//
// Terms of Service (Conditions Générales d'Utilisation). MVP version —
// short, readable, covers the critical points for a P2P parcel marketplace:
//   - Jibly is a matching platform, not a carrier
//   - Whitelist-based content policy with double declaration
//   - Right to suspend permanently for violations
//   - Cooperation with authorities + evidence retention
//   - Reporting mechanism
//
// Should be reviewed by a lawyer before production launch with real funds.
// French jurisdiction is chosen for protective consumer law alignment with
// the France↔Morocco user base.

'use client';

import Link from 'next/link';
import { ArrowLeft, Scale, ShieldAlert, FileCheck2, AlertTriangle, Flag } from 'lucide-react';

const LAST_UPDATED = '12 juin 2026';

export default function CguPage() {
  return (
    <main className="min-h-screen bg-cream-50">
      <div className="mx-auto max-w-3xl px-5 sm:px-8 py-10 sm:py-14">
        {/* Back link */}
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-[13px] text-ink-400 hover:text-ink-600 transition-colors mb-8"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Retour à l&apos;accueil
        </Link>

        {/* Header */}
        <div className="mb-10">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white border border-ink-100 mb-4">
            <Scale className="w-3.5 h-3.5 text-ink-500" />
            <span className="text-[12px] font-bold text-ink-600 tracking-wide">
              Conditions Générales d&apos;Utilisation
            </span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-ink-600 tracking-[-0.025em] mb-3">
            CGU de Jibly
          </h1>
          <p className="text-[14px] text-ink-400">
            Dernière mise à jour : {LAST_UPDATED}
          </p>
        </div>

        {/* Intro */}
        <div className="bg-white rounded-2xl p-5 sm:p-6 border border-ink-50 mb-6">
          <p className="text-[14px] text-ink-500 leading-relaxed">
            Bienvenue sur Jibly. En utilisant notre plateforme, vous acceptez les conditions
            décrites ci-dessous. Nous les avons voulues aussi courtes et claires que
            possible, mais leur lecture est importante pour comprendre vos droits et vos
            responsabilités.
          </p>
        </div>

        {/* Sections */}
        <div className="space-y-6">

          {/* 1. Nature de la plateforme */}
          <Section number="1" title="Nature de la plateforme">
            <p>
              Jibly est une <strong>plateforme de mise en relation</strong> entre des
              voyageurs (transporteurs occasionnels) et des expéditeurs souhaitant
              envoyer un objet personnel. Jibly <strong>n&apos;est pas un transporteur</strong>,
              ne manipule physiquement aucun colis, et n&apos;assume pas la responsabilité
              du transport lui-même.
            </p>
            <p>
              Le contrat de transport est conclu directement entre l&apos;expéditeur et
              le voyageur. Jibly facilite leur rencontre, sécurise le paiement et
              fournit les outils de communication, mais n&apos;est pas partie au contrat
              de transport.
            </p>
          </Section>

          {/* 2. Inscription et compte */}
          <Section number="2" title="Inscription et compte">
            <p>
              L&apos;inscription est gratuite et réservée aux personnes majeures. Vous
              vous engagez à fournir des informations exactes (nom, email, téléphone).
              La vérification d&apos;identité peut être requise pour certaines fonctionnalités.
            </p>
            <p>
              Vous êtes responsable de la confidentialité de vos identifiants. Tout
              usage de votre compte est présumé fait par vous.
            </p>
          </Section>

          {/* 3. Objets autorisés — CRITICAL */}
          <Section number="3" title="Objets autorisés et interdits" highlight>
            <p>
              Jibly fonctionne sur le principe d&apos;une <strong>liste positive</strong> :
              seules les catégories d&apos;objets explicitement autorisées peuvent être
              transportées. Tout autre objet est interdit par défaut.
            </p>
            <p>
              Les catégories autorisées sont : documents, clés, objets personnels,
              vêtements, électronique légère, médicaments en vente libre (sans
              ordonnance, dans leur emballage d&apos;origine fermé, max. 2 unités).
            </p>
            <p>
              Sont <strong>strictement interdits</strong>, sans exception et sans liste
              exhaustive : espèces, médicaments sur ordonnance, drogues et stupéfiants,
              armes, contrefaçons, bijoux et objets de luxe (valeur &gt; 500 €), produits
              dangereux, alcool, tabac et produits réglementés, et tout objet interdit
              par les douanes ou la législation du pays de départ ou d&apos;arrivée.
            </p>
            <p>
              La liste complète et illustrée est disponible sur{' '}
              <Link href="/objets-autorises" className="underline text-lavender-600 hover:text-lavender-700">
                la page Objets autorisés
              </Link>.
            </p>
          </Section>

          {/* 4. Double déclaration */}
          <Section number="4" title="Double déclaration du contenu">
            <p>
              Avant tout transport, l&apos;expéditeur et le voyageur doivent chacun
              certifier le contenu du colis :
            </p>
            <ul className="list-disc pl-5 space-y-2 mt-2">
              <li>
                <strong>L&apos;expéditeur</strong> certifie que le contenu décrit est
                exact et ne contient aucun produit interdit.
              </li>
              <li>
                <strong>Le voyageur</strong> vérifie le contenu avant d&apos;accepter
                de le transporter et reste libre de refuser à tout moment.
              </li>
            </ul>
            <p className="mt-2">
              Toute fausse déclaration engage la responsabilité personnelle de son auteur,
              y compris sur le plan pénal et douanier.
            </p>
          </Section>

          {/* 5. Paiement et compensation */}
          <Section number="5" title="Paiement et compensation">
            <p>
              Le paiement est effectué via Stripe au moment de la réservation et
              conservé en séquestre par Jibly. Le voyageur reçoit sa compensation
              uniquement après confirmation de la livraison par l&apos;expéditeur via
              le code de livraison.
            </p>
            <p>
              Jibly prélève une commission sur chaque transaction réussie. Le détail
              du prix est affiché avant validation par chaque partie.
            </p>
          </Section>

          {/* 6. Codes de remise et de livraison */}
          <Section number="6" title="Codes de remise et de livraison">
            <p>
              Chaque réservation génère deux codes confidentiels à 6 chiffres : un
              code de remise (détenu par l&apos;expéditeur) et un code de livraison
              (détenu par le voyageur). Ces codes ne doivent jamais être partagés en
              dehors du moment du rendez-vous physique. Le déblocage du paiement
              dépend de leur saisie correcte par la partie destinataire.
            </p>
          </Section>

          {/* 7. Comportements interdits + exclusion — CRITICAL */}
          <Section number="7" title="Comportements interdits et exclusion" highlight>
            <p>
              Les comportements suivants entraînent la <strong>suspension permanente</strong> du
              compte, sans préavis ni remboursement :
            </p>
            <ul className="list-disc pl-5 space-y-2 mt-2">
              <li>Transport d&apos;un objet interdit (cf. article 3)</li>
              <li>Fausse déclaration de contenu</li>
              <li>Tentative de paiement en dehors de la plateforme</li>
              <li>Usurpation d&apos;identité ou compte multiple frauduleux</li>
              <li>Harcèlement, menaces, discrimination envers un autre utilisateur</li>
              <li>Tentative de contournement des codes de remise / livraison</li>
            </ul>
            <p className="mt-3">
              En cas d&apos;infraction, Jibly se réserve le droit de :
            </p>
            <ul className="list-disc pl-5 space-y-2 mt-2">
              <li>Suspendre le compte de manière définitive</li>
              <li>Conserver les preuves (messages, photos, données de compte) à des fins légales</li>
              <li>Transmettre les informations aux autorités compétentes (police, douanes, justice)</li>
              <li>Refuser tout remboursement des sommes engagées</li>
            </ul>
          </Section>

          {/* 8. Signalement */}
          <Section number="8" title="Signalement">
            <p>
              Tout utilisateur peut signaler un comportement suspect, un colis non
              conforme, ou une violation de ces conditions via le bouton « Signaler »
              présent dans l&apos;application. Les signalements sont traités dans les
              meilleurs délais et de manière confidentielle.
            </p>
          </Section>

          {/* 9. Limitation de responsabilité */}
          <Section number="9" title="Limitation de responsabilité">
            <p>
              Jibly fait ses meilleurs efforts pour faciliter une expérience sûre,
              mais ne peut garantir le résultat de chaque transport. La responsabilité
              de Jibly est limitée aux services qu&apos;elle fournit directement
              (mise en relation, séquestre, messagerie).
            </p>
            <p>
              En cas de litige entre un expéditeur et un voyageur, Jibly peut
              intervenir comme médiateur via la fonction Litige, mais ne se substitue
              pas à un tribunal. La responsabilité finale du transport, des objets
              transportés et du respect des lois locales incombe aux utilisateurs.
            </p>
          </Section>

          {/* 10. Données personnelles */}
          <Section number="10" title="Données personnelles">
            <p>
              Vos données sont traitées conformément au RGPD. Vous pouvez à tout
              moment exporter ou supprimer vos données via votre espace personnel.
              Les conversations, transactions et signalements peuvent être conservés
              jusqu&apos;à 5 ans pour des raisons légales et de sécurité.
            </p>
          </Section>

          {/* 11. Modification des CGU */}
          <Section number="11" title="Modification des conditions">
            <p>
              Jibly peut faire évoluer ces CGU. Les utilisateurs seront notifiés par
              email en cas de modification substantielle. La poursuite de
              l&apos;utilisation après notification vaut acceptation.
            </p>
          </Section>

          {/* 12. Droit applicable */}
          <Section number="12" title="Droit applicable et juridiction">
            <p>
              Ces conditions sont soumises au droit français. En cas de litige et à
              défaut d&apos;accord amiable, les tribunaux français sont seuls
              compétents, sous réserve des dispositions impératives applicables au
              consommateur.
            </p>
          </Section>

        </div>

        {/* Quick callouts grid */}
        <div className="mt-12">
          <h2 className="text-xl font-bold text-ink-600 tracking-[-0.015em] mb-5">
            Les 4 points à retenir
          </h2>
          <div className="grid sm:grid-cols-2 gap-3">
            <Callout
              icon={<FileCheck2 className="w-4 h-4 text-lavender-600" />}
              title="Double déclaration"
              body="Expéditeur et voyageur certifient chacun le contenu avant transport."
            />
            <Callout
              icon={<ShieldAlert className="w-4 h-4 text-blush-600" />}
              title="Suspension permanente"
              body="Toute fausse déclaration ou objet interdit entraîne l'exclusion définitive."
            />
            <Callout
              icon={<AlertTriangle className="w-4 h-4 text-butter-600" />}
              title="Coopération autorités"
              body="Jibly conserve les preuves et coopère avec la police et les douanes."
            />
            <Callout
              icon={<Flag className="w-4 h-4 text-mint-600" />}
              title="Signalement"
              body="Tout utilisateur peut signaler un comportement suspect à tout moment."
            />
          </div>
        </div>

        {/* Bottom CTA */}
        <div className="mt-12 p-5 sm:p-6 rounded-2xl bg-white border border-ink-50 text-center">
          <p className="text-[14px] text-ink-500 leading-relaxed mb-4">
            Une question avant de vous lancer ?
          </p>
          <Link
            href="/trust"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-full bg-ink-500 hover:bg-ink-600 text-cream-50 text-[14px] font-bold transition-colors"
          >
            Consulter notre FAQ Sérénité
          </Link>
        </div>
      </div>
    </main>
  );
}

// =============================================================================

function Section({
  number,
  title,
  highlight,
  children,
}: {
  number: string;
  title: string;
  highlight?: boolean;
  children: React.ReactNode;
}) {
  return (
    <section
      className={`rounded-2xl border p-5 sm:p-6 ${
        highlight
          ? 'bg-blush-50/50 border-blush-100'
          : 'bg-white border-ink-50'
      }`}
    >
      <div className="flex items-baseline gap-3 mb-3">
        <span className="text-[12px] font-bold text-ink-300 tracking-[0.08em] tabular-nums">
          {number.padStart(2, '0')}
        </span>
        <h2 className="text-[17px] sm:text-[18px] font-bold text-ink-600 tracking-[-0.01em]">
          {title}
        </h2>
      </div>
      <div className="text-[14px] text-ink-500 leading-relaxed space-y-3 pl-7">
        {children}
      </div>
    </section>
  );
}

function Callout({
  icon,
  title,
  body,
}: {
  icon: React.ReactNode;
  title: string;
  body: string;
}) {
  return (
    <div className="bg-white rounded-2xl p-4 border border-ink-50">
      <div className="flex items-start gap-3">
        <div className="w-8 h-8 rounded-lg bg-cream-100 flex items-center justify-center flex-shrink-0">
          {icon}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-[14px] font-bold text-ink-600 mb-1">{title}</h3>
          <p className="text-[12px] text-ink-400 leading-relaxed">{body}</p>
        </div>
      </div>
    </div>
  );
}
