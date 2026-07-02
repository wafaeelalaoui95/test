// app/confidentialite/page.tsx
//
// Privacy Policy (Politique de confidentialité) - GDPR/RGPD notice.
// MVP draft covering the essentials for a France↔Morocco P2P parcel app
// that collects ID documents (Stripe Identity), contact details and
// payment data: controller, data collected, purposes & legal bases,
// processors, transfers, retention, user rights, cookies, contact.
//
// Like the CGU, this is a DRAFT and must be reviewed by a lawyer before a
// production launch handling real funds and identity data.

'use client';

import Link from 'next/link';
import { ArrowLeft, ShieldCheck } from 'lucide-react';
import { useI18n } from '@/lib/i18n/context';

const LAST_UPDATED = { fr: '2 juillet 2026', en: 'July 2, 2026' };

type Section = { title: string; paragraphs: string[] };

const CONTENT: Record<'fr' | 'en', {
  badge: string;
  title: string;
  lastUpdated: string;
  reviewNote: string;
  intro: string;
  backHome: string;
  sections: Section[];
}> = {
  fr: {
    badge: 'Confidentialité',
    title: 'Politique de confidentialité',
    lastUpdated: `Dernière mise à jour : ${LAST_UPDATED.fr}`,
    reviewNote:
      'Brouillon - ce document doit être relu par un juriste avant le lancement en production.',
    intro:
      'Cette politique explique quelles données personnelles Jibly collecte, pourquoi, avec qui elles sont partagées et quels sont vos droits. Elle s’applique à l’utilisation de la plateforme Jibly.',
    backHome: 'Retour à l’accueil',
    sections: [
      {
        title: '1. Responsable du traitement',
        paragraphs: [
          'Jibly est responsable du traitement des données collectées via la plateforme. Pour toute question relative à vos données, contactez-nous à hello@jibly.io.',
        ],
      },
      {
        title: '2. Données que nous collectons',
        paragraphs: [
          'Compte et profil : nom, adresse email, mot de passe (haché), photo de profil éventuelle.',
          'Vérification d’identité : lorsque vous vous vérifiez, notre prestataire Stripe Identity traite votre pièce d’identité et un selfie. Jibly ne conserve pas l’image de votre pièce, seulement le statut de vérification.',
          'Transactions : détails des envois/trajets, montants, et données de paiement traitées par Stripe (Jibly ne stocke jamais le numéro complet de votre carte).',
          'Communications : messages échangés entre membres via la messagerie intégrée.',
          'Données techniques : logs, cookies de session et données d’usage nécessaires au fonctionnement du service.',
        ],
      },
      {
        title: '3. Finalités et bases légales',
        paragraphs: [
          'Fournir le service et exécuter le contrat (mise en relation, réservations, paiements).',
          'Respecter nos obligations légales, notamment la lutte contre la fraude et le blanchiment (vérification d’identité).',
          'Assurer la sécurité et la confiance sur la plateforme (intérêt légitime).',
          'Vous envoyer des notifications transactionnelles nécessaires à vos échanges.',
        ],
      },
      {
        title: '4. Destinataires et sous-traitants',
        paragraphs: [
          'Nous partageons des données avec des prestataires qui agissent pour notre compte : Supabase (hébergement et base de données), Stripe (paiements et vérification d’identité) et Resend (envoi des emails).',
          'Certaines données de profil (nom, note, statut vérifié) sont visibles par les autres membres avec qui vous interagissez, afin de permettre la mise en relation.',
        ],
      },
      {
        title: '5. Transferts hors Union européenne',
        paragraphs: [
          'Notre communauté couvre notamment la France et le Maroc, et certains prestataires sont situés hors de l’UE. Ces transferts sont encadrés par des garanties appropriées (clauses contractuelles types).',
        ],
      },
      {
        title: '6. Durée de conservation',
        paragraphs: [
          'Nous conservons vos données le temps nécessaire à la fourniture du service et au respect de nos obligations légales, puis les supprimons ou les anonymisons. Vous pouvez demander la suppression de votre compte à tout moment.',
        ],
      },
      {
        title: '7. Vos droits',
        paragraphs: [
          'Conformément au RGPD, vous disposez d’un droit d’accès, de rectification, d’effacement, de limitation, d’opposition et de portabilité de vos données.',
          'Pour exercer ces droits, écrivez à hello@jibly.io. Vous pouvez également introduire une réclamation auprès de la CNIL.',
        ],
      },
      {
        title: '8. Cookies',
        paragraphs: [
          'Nous utilisons des cookies strictement nécessaires au fonctionnement (session d’authentification) ainsi que, le cas échéant, des cookies de mesure. Vous pouvez configurer votre navigateur pour les limiter.',
        ],
      },
    ],
  },
  en: {
    badge: 'Privacy',
    title: 'Privacy Policy',
    lastUpdated: `Last updated: ${LAST_UPDATED.en}`,
    reviewNote:
      'Draft - this document must be reviewed by a lawyer before a production launch.',
    intro:
      'This policy explains what personal data Jibly collects, why, who it is shared with, and what your rights are. It applies to your use of the Jibly platform.',
    backHome: 'Back home',
    sections: [
      {
        title: '1. Data controller',
        paragraphs: [
          'Jibly is the controller of the data collected through the platform. For any question about your data, contact us at hello@jibly.io.',
        ],
      },
      {
        title: '2. Data we collect',
        paragraphs: [
          'Account and profile: name, email address, password (hashed), optional profile photo.',
          'Identity verification: when you verify, our processor Stripe Identity handles your ID document and a selfie. Jibly does not store your ID image, only the verification status.',
          'Transactions: shipment/trip details, amounts, and payment data processed by Stripe (Jibly never stores your full card number).',
          'Communications: messages exchanged between members via the built-in messaging.',
          'Technical data: logs, session cookies and usage data necessary to run the service.',
        ],
      },
      {
        title: '3. Purposes and legal bases',
        paragraphs: [
          'Provide the service and perform the contract (matching, bookings, payments).',
          'Comply with our legal obligations, in particular fraud and money-laundering prevention (identity verification).',
          'Ensure safety and trust on the platform (legitimate interest).',
          'Send you transactional notifications necessary for your exchanges.',
        ],
      },
      {
        title: '4. Recipients and processors',
        paragraphs: [
          'We share data with providers acting on our behalf: Supabase (hosting and database), Stripe (payments and identity verification) and Resend (email delivery).',
          'Some profile data (name, rating, verified status) is visible to other members you interact with, to enable matching.',
        ],
      },
      {
        title: '5. Transfers outside the European Union',
        paragraphs: [
          'Our community notably spans France and Morocco, and some providers are located outside the EU. Such transfers are covered by appropriate safeguards (standard contractual clauses).',
        ],
      },
      {
        title: '6. Retention',
        paragraphs: [
          'We keep your data for as long as needed to provide the service and meet our legal obligations, then delete or anonymise it. You can request deletion of your account at any time.',
        ],
      },
      {
        title: '7. Your rights',
        paragraphs: [
          'Under the GDPR, you have the right to access, rectify, erase, restrict, object to, and port your data.',
          'To exercise these rights, email hello@jibly.io. You may also lodge a complaint with your data protection authority (e.g. the CNIL in France).',
        ],
      },
      {
        title: '8. Cookies',
        paragraphs: [
          'We use cookies strictly necessary for operation (authentication session) and, where applicable, measurement cookies. You can configure your browser to limit them.',
        ],
      },
    ],
  },
};

export default function PrivacyPage() {
  const { locale } = useI18n();
  const c = CONTENT[locale === 'en' ? 'en' : 'fr'];

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

        <div className="mb-10">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white border border-ink-100 mb-4">
            <ShieldCheck className="w-3.5 h-3.5 text-ink-500" />
            <span className="text-[12px] font-bold text-ink-600 tracking-wide">{c.badge}</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-ink-600 tracking-[-0.025em] mb-3">
            {c.title}
          </h1>
          <p className="text-[14px] text-ink-400">{c.lastUpdated}</p>
        </div>

        <p className="text-[12px] text-ink-400 italic mb-6">{c.reviewNote}</p>

        <div className="bg-white rounded-2xl p-5 sm:p-6 border border-ink-50 mb-6">
          <p className="text-[14px] text-ink-500 leading-relaxed">{c.intro}</p>
        </div>

        <div className="space-y-6">
          {c.sections.map((s) => (
            <section key={s.title} className="bg-white rounded-2xl p-5 sm:p-6 border border-ink-50">
              <h2 className="text-[16px] font-bold text-ink-600 mb-3">{s.title}</h2>
              <div className="space-y-2.5 text-[14px] text-ink-500 leading-relaxed">
                {s.paragraphs.map((p, i) => (
                  <p key={i}>{p}</p>
                ))}
              </div>
            </section>
          ))}
        </div>
      </div>
    </main>
  );
}
