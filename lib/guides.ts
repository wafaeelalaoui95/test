// Hand-written shipping guides (SEO / AI search). They answer generic shipping
// questions — "comment envoyer un document au Maroc", "alternatives à DHL" —
// for people who don't know yet that a traveller can carry their envoi.
//
// Rules for anything written here:
// - Jibly is one option among others, never "the" answer. Each guide says when
//   a courier or the post is the better choice.
// - No invented prices, delivery times, guarantees, reviews or statistics —
//   for Jibly or for anyone else. Other services are described in general
//   terms and readers are sent to their sites for current prices and times.
// - Only what Jibly really does: verified identity, price set by the traveller
//   (you can offer less), fees shown before payment, payment through Jibly,
//   hand-to-hand handover confirmed by a code, allowed categories only.
// - French copy says "il / elle" for any person.

import type { RouteMatch } from '@/lib/route-pages';
import { GUIDES_EN } from '@/lib/guides-en';

/** Shown on every guide and used as dateModified in the structured data. */
export const GUIDES_UPDATED = '2026-11-25';

export type GuideOption = {
  name: string;
  bestFor: string;
  speed: string;
  tracking: string;
  price: string;
  limits: string;
  /** The Jibly row, highlighted in the table. */
  jibly?: boolean;
};

export type GuideGroup = 'besoin' | 'destination' | 'objet' | 'regles';
export type GuideLang = 'fr' | 'en';

export const GUIDE_GROUPS: { id: GuideGroup; title: string; titleEn: string }[] = [
  { id: 'besoin', title: 'Selon votre besoin', titleEn: 'By need' },
  { id: 'destination', title: 'Selon la destination', titleEn: 'By destination' },
  { id: 'objet', title: 'Selon ce que vous envoyez', titleEn: 'By item' },
  { id: 'regles', title: 'Comparatifs et règles', titleEn: 'Comparisons and rules' },
];

export type Guide = {
  path: string;
  /** Page language; French when absent. English guides live in lib/guides-en.ts. */
  lang?: GuideLang;
  /** The same guide in the other language (hreflang + "Read in English" link). */
  alt?: string;
  /** Short label for breadcrumbs, the footer and cross-links. */
  label: string;
  title: string;
  description: string;
  h1: string;
  /** The direct answer, first thing on the page (what AI answers quote). */
  answer: string;
  optionsHeading: string;
  options: GuideOption[];
  /** Live trips shown on the page, when the guide is about a route. */
  trips?: { heading: string; match: RouteMatch };
  sections: { heading: string; body?: string; bullets?: string[] }[];
  /** When Jibly is NOT the right choice — said plainly. */
  notJibly: string[];
  faq: { q: string; a: string }[];
  related: string[];
  /** Section on the /guides index. */
  group: GuideGroup;
  /** Shown on the home page and in the footer (keep it to ~6). */
  featured?: boolean;
  /** Card on the home page and the /guides index. */
  card: { fr: { title: string; text: string }; en: { title: string; text: string } };
};

// Rows reused across guides, so every page describes each service the same way.
const POST: GuideOption = {
  name: 'La Poste (Colissimo International, lettre recommandée)',
  bestFor: 'Envois non urgents, colis de plusieurs kilos',
  speed: 'En général plusieurs jours, selon l’offre',
  tracking: 'Selon l’offre choisie',
  price: 'Grille selon le poids et la destination, sur laposte.fr',
  limits: 'Déclaration en douane pour les marchandises',
};
const EXPRESS: GuideOption = {
  name: 'Transporteur express (DHL, FedEx, UPS…)',
  bestFor: 'Urgent, professionnel, objets de valeur',
  speed: 'Parmi les options les plus rapides, avec enlèvement possible',
  tracking: 'Oui, de bout en bout',
  price: 'Devis sur le site du transporteur',
  limits: 'Le transporteur gère les formalités douanières',
};
const COMPARATOR: GuideOption = {
  name: 'Comparateur (Eurosender, Packlink…)',
  bestFor: 'Comparer plusieurs transporteurs en une fois',
  speed: 'Selon le transporteur retenu',
  tracking: 'Selon le transporteur retenu',
  price: 'Devis instantané en ligne',
  limits: 'Les règles du transporteur retenu s’appliquent',
};
const TRAVELLER: GuideOption = {
  name: 'Un voyageur qui fait le trajet (Jibly)',
  bestFor: 'Documents, clés, vêtements, petits objets personnels',
  speed: 'Selon la date du vol du voyageur',
  tracking: 'Remise confirmée par un code, de main à main',
  price: 'Fixé par le voyageur, vous pouvez proposer moins',
  limits: 'Catégories autorisées uniquement, selon les trajets annoncés',
  jibly: true,
};

const NOT_JIBLY_BASE = [
  'Un colis lourd ou volumineux : un voyageur transporte votre envoi dans ses bagages.',
  'Des envois commerciaux ou réguliers : Jibly est fait pour des envois personnels.',
  'Des espèces, des bijoux, des objets de valeur ou des médicaments sur ordonnance : interdits sur Jibly.',
  'Aucun voyageur n’a annoncé le trajet avant votre date limite : un transporteur sera plus sûr.',
];

const GUIDES_FR: Guide[] = [
  {
    path: '/envoyer-colis-maroc',
    alt: '/en/send-parcel-to-morocco',
    label: 'Envoyer un colis au Maroc',
    title: 'Envoyer un colis au Maroc : poste, express ou voyageur',
    description:
      'Comment envoyer un colis au Maroc : La Poste, DHL / FedEx / UPS, comparateurs ou un voyageur qui fait déjà le trajet. Avantages, limites et comment choisir.',
    h1: 'Envoyer un colis au Maroc : quelle option choisir ?',
    answer:
      'Pour envoyer un colis au Maroc, il existe trois grandes options : la poste (Colissimo International depuis la France), un transporteur express comme DHL, FedEx ou UPS, ou un voyageur qui fait déjà le trajet. Le bon choix dépend du poids, de l’urgence et de ce que vous envoyez. Pour un colis lourd ou commercial, passez par la poste ou un transporteur. Pour un document, des clés ou un petit objet personnel, un voyageur peut le remettre en main propre à votre destinataire, au prix que vous fixez ensemble.',
    optionsHeading: 'Les options pour envoyer un colis au Maroc',
    options: [POST, EXPRESS, COMPARATOR, TRAVELLER],
    trips: { heading: 'Voyageurs qui partent vers le Maroc', match: { kind: 'country', from: '*', to: 'MA' } },
    sections: [
      {
        heading: 'Comment ça se passe avec un voyageur',
        bullets: [
          'Trouvez un voyageur qui part vers la ville de votre destinataire, ou publiez votre demande avec votre date limite.',
          'Le voyageur indique son prix ; vous pouvez proposer un montant plus bas. Les frais de service sont affichés avant le paiement.',
          'Vous payez sur Jibly, puis vous remettez l’objet en main propre. Le voyageur vérifie le contenu : jamais de colis fermé.',
          'La remise est confirmée par un code, à la prise en charge puis à la livraison.',
        ],
      },
      {
        heading: 'Ce que l’on peut confier à un voyageur',
        body:
          'Documents, clés, objets personnels, vêtements, électronique légère et médicaments en vente libre (avec conditions). Tout ce qui n’est pas dans cette liste est interdit, notamment les espèces, les bijoux et les médicaments sur ordonnance.',
      },
      {
        heading: 'Douane et règles à respecter',
        body:
          'Un objet confié à un voyageur voyage dans ses bagages : il doit respecter les règles de la compagnie aérienne et des douanes des deux pays. Pour un colis de marchandises envoyé par la poste ou un transporteur, une déclaration en douane est demandée. En cas de doute, renseignez-vous auprès de la douane avant d’envoyer.',
      },
    ],
    notJibly: NOT_JIBLY_BASE,
    faq: [
      {
        q: 'Quel est le moyen le plus simple d’envoyer un petit colis au Maroc ?',
        a: 'Pour un petit objet personnel, un voyageur qui part vers la ville de votre destinataire est souvent le plus direct : vous lui remettez l’objet, il / elle le remet en main propre. Pour un colis plus lourd, la poste ou un transporteur express sont plus adaptés.',
      },
      {
        q: 'Peut-on envoyer un colis du Maroc vers la France ?',
        a: 'Oui, dans les deux sens : la poste marocaine et les transporteurs express proposent l’envoi vers la France, et sur Jibly des voyageurs annoncent aussi des trajets du Maroc vers la France.',
      },
      {
        q: 'Jibly est-il un transporteur ?',
        a: 'Non. Jibly est une plateforme qui met en relation des expéditeurs et des voyageurs vérifiés. Ce sont les voyageurs qui transportent les envois, dans leurs bagages.',
      },
    ],
    related: ['/envoyer-document-maroc', '/envoyer-colis-maroc-france', '/envoyer-colis-maroc-pas-cher', '/envoi-colis-france-maroc', '/alternatives-dhl'],
    group: 'destination',
    featured: true,
    card: {
      fr: { title: 'Un colis au Maroc', text: 'Poste, express ou voyageur : comment choisir.' },
      en: { title: 'A parcel to Morocco', text: 'Post, express courier or traveller: how to choose.' },
    },
  },

  {
    path: '/envoyer-document-maroc',
    label: 'Envoyer un document au Maroc',
    title: 'Envoyer un document au Maroc depuis la France',
    description:
      'Lettre recommandée, express ou voyageur : comment envoyer un document administratif, un contrat ou un original signé de la France vers le Maroc.',
    h1: 'Envoyer un document de la France vers le Maroc',
    answer:
      'Pour envoyer un document au Maroc, vous pouvez utiliser une lettre recommandée internationale (La Poste), un service express de documents (DHL, FedEx, UPS) ou le confier à un voyageur qui part vers le Maroc. Pour un original à faire signer ou un papier attendu rapidement, un voyageur peut le remettre en main propre à votre destinataire. Pour une démarche qui exige une preuve de dépôt postale ou un accusé de réception, préférez la poste ou un transporteur.',
    optionsHeading: 'Envoyer un document au Maroc : les options',
    options: [
      { ...POST, name: 'Lettre recommandée internationale (La Poste)', bestFor: 'Démarches qui demandent une preuve de dépôt', limits: 'Délai variable selon la destination' },
      { ...EXPRESS, name: 'Express documents (DHL, FedEx, UPS…)', bestFor: 'Document urgent, avec suivi complet', limits: 'Documents sans valeur marchande en général' },
      { ...TRAVELLER, bestFor: 'Original à remettre en main propre, papiers administratifs' },
    ],
    trips: { heading: 'Voyageurs de la France vers le Maroc', match: { kind: 'country', from: 'FR', to: 'MA' } },
    sections: [
      {
        heading: 'Préparer votre document',
        bullets: [
          'Scannez ou photographiez le document avant de l’envoyer : vous gardez une copie.',
          'Utilisez une enveloppe rigide ou une pochette cartonnée pour qu’il ne soit pas plié.',
          'Avec un voyageur, ne scellez pas l’enveloppe avant la remise : il / elle doit pouvoir voir ce qu’il / elle transporte.',
          'Prévenez votre destinataire : il / elle convient du rendez-vous avec le voyageur et lui donne le code de livraison.',
        ],
      },
      {
        heading: 'Un original à faire signer, puis à récupérer',
        body:
          'Pour un contrat ou un formulaire à signer au Maroc puis à renvoyer, cherchez un voyageur pour l’aller, puis un autre pour le retour du Maroc vers la France. Les deux trajets se réservent séparément sur Jibly.',
      },
      {
        heading: 'Quels documents peut-on confier à un voyageur ?',
        body:
          'Les papiers administratifs, courriers, certificats et contrats font partie des catégories autorisées. Les espèces, chèques ou objets de valeur glissés dans l’enveloppe sont interdits.',
      },
    ],
    notJibly: [
      'La démarche exige une preuve de dépôt postale ou un accusé de réception officiel.',
      'Vous envoyez de gros volumes de documents ou des envois professionnels réguliers.',
      'Aucun voyageur n’a annoncé le trajet avant votre date limite.',
    ],
    faq: [
      {
        q: 'Combien de temps pour envoyer un document au Maroc ?',
        a: 'Cela dépend du service : l’express fait partie des options les plus rapides, la lettre recommandée prend en général plusieurs jours. Avec un voyageur, le document arrive avec lui / elle, à la date de son vol. Vérifiez les délais à jour sur le site de chaque service.',
      },
      {
        q: 'Peut-on envoyer un document original avec un voyageur ?',
        a: 'Oui, les documents font partie des catégories autorisées sur Jibly. Gardez toujours une copie et remettez l’enveloppe ouverte, pour que le voyageur voie ce qu’il / elle transporte.',
      },
      {
        q: 'Comment mon destinataire récupère-t-il le document ?',
        a: 'Le voyageur et votre destinataire conviennent d’un lieu de rendez-vous. À la remise, votre destinataire donne le code de livraison au voyageur, ce qui confirme que le document est bien arrivé.',
      },
    ],
    related: ['/envoyer-colis-maroc', '/envoyer-document-original-signe', '/envoi-document-urgent-etranger', '/envoi-colis-france-maroc'],
    group: 'objet',
    card: {
      fr: { title: 'Un document au Maroc', text: 'Recommandé, express ou en main propre.' },
      en: { title: 'A document to Morocco', text: 'Registered post, express or hand-delivered.' },
    },
  },

  {
    path: '/envoi-document-urgent-etranger',
    alt: '/en/send-urgent-document-abroad',
    label: 'Document urgent à l’étranger',
    title: 'Envoyer un document en urgence à l’étranger',
    description:
      'Document à envoyer en urgence à l’étranger : express (DHL, FedEx, UPS) ou voyageur qui part dans les prochains jours. Les options, leurs limites et une checklist.',
    h1: 'Envoyer un document en urgence à l’étranger',
    answer:
      'Pour envoyer un document en urgence à l’étranger, les deux options les plus rapides sont un service express (DHL, FedEx, UPS, souvent avec enlèvement à domicile) et un voyageur qui part dans les prochains jours vers la ville de votre destinataire. L’express fonctionne vers presque toutes les destinations et se réserve tout de suite. Un voyageur dépend des trajets annoncés, mais remet le document en main propre, au prix que vous fixez ensemble.',
    optionsHeading: 'Les options pour un document urgent',
    options: [
      EXPRESS,
      { ...TRAVELLER, bestFor: 'Un voyageur part bientôt vers la ville de votre destinataire' },
      { ...POST, bestFor: 'Quand le délai laisse quelques jours de marge' },
    ],
    sections: [
      {
        heading: 'D’abord : un scan suffit-il ?',
        body:
          'Beaucoup d’administrations et d’entreprises acceptent un document scanné ou une signature électronique. Demandez-le avant d’envoyer un original : c’est souvent la solution la plus rapide.',
      },
      {
        heading: 'Trouver un voyageur qui part bientôt',
        bullets: [
          'Cherchez votre trajet sur Jibly : les voyageurs annoncent leur date et leur ville d’arrivée.',
          'Si personne n’est annoncé, publiez votre demande avec votre date limite : les voyageurs qui font la route peuvent vous proposer leur trajet.',
          'Réservez, remettez le document en main propre avant le départ : la prise en charge est confirmée par un code.',
        ],
      },
      {
        heading: 'Checklist pour un envoi urgent',
        bullets: [
          'Gardez une copie numérique du document.',
          'Notez le nom et le téléphone de votre destinataire.',
          'Vérifiez l’heure limite d’enlèvement du transporteur, ou la date du vol du voyageur.',
          'Comparez au moins deux options avant de payer.',
        ],
      },
    ],
    notJibly: [
      'Vous avez besoin d’un délai de livraison garanti.',
      'Aucun voyageur ne part vers la destination avant votre date limite.',
      'La démarche exige une preuve de dépôt postale ou un envoi par transporteur.',
    ],
    faq: [
      {
        q: 'Quel est le moyen le plus rapide d’envoyer un document à l’étranger ?',
        a: 'Un service express (DHL, FedEx, UPS) ou un voyageur qui part dans les prochains jours vers la même ville. L’express est disponible partout ; le voyageur dépend des trajets annoncés.',
      },
      {
        q: 'Jibly garantit-il un délai de livraison ?',
        a: 'Non. Le document voyage avec le voyageur, à la date de son vol. Jibly ne garantit pas de délai : si votre échéance est stricte, un transporteur express est plus adapté.',
      },
      {
        q: 'Peut-on envoyer un document urgent le week-end ?',
        a: 'Selon les transporteurs, l’enlèvement le week-end est limité ; vérifiez sur leur site. Sur Jibly, cela dépend simplement de la date du vol du voyageur.',
      },
    ],
    related: ['/envoyer-document-original-signe', '/alternatives-dhl', '/comparatif-voyageur-express-poste', '/emballer-document-petit-colis'],
    group: 'besoin',
    featured: true,
    card: {
      fr: { title: 'Un document urgent', text: 'Express ou voyageur qui part bientôt.' },
      en: { title: 'An urgent document', text: 'Express courier or a traveller leaving soon.' },
    },
  },

  {
    path: '/envoyer-colis-maroc-pas-cher',
    label: 'Colis au Maroc pas cher',
    title: 'Envoyer un colis au Maroc pas cher : comment comparer',
    description:
      'Comment payer moins pour envoyer un colis au Maroc : ce qui fait le prix, poste, comparateurs, express ou voyageur, et les erreurs à éviter.',
    h1: 'Envoyer un colis au Maroc sans payer trop cher',
    answer:
      'Le moins cher dépend surtout du poids et de l’urgence. Pour un colis de plusieurs kilos sans urgence, la poste ou un comparateur de transporteurs est en général le plus économique. Pour un petit objet personnel (documents, clés, vêtements, un cadeau), un voyageur qui fait déjà le trajet peut revenir moins cher, car le prix se fixe entre vous. Comparez toujours le prix total, frais compris.',
    optionsHeading: 'Comparer les options',
    options: [POST, COMPARATOR, TRAVELLER, EXPRESS],
    trips: { heading: 'Voyageurs de la France vers le Maroc', match: { kind: 'country', from: 'FR', to: 'MA' } },
    sections: [
      {
        heading: 'Ce qui fait le prix d’un envoi',
        bullets: [
          'Le poids et les dimensions du colis.',
          'La rapidité : plus c’est urgent, plus c’est cher.',
          'Le suivi et l’assurance inclus ou en option.',
          'D’éventuels droits et taxes à l’arrivée pour les marchandises.',
        ],
      },
      {
        heading: 'Pour payer moins',
        bullets: [
          'N’envoyez que l’essentiel et évitez les emballages trop grands.',
          'Anticipez : un envoi non urgent coûte moins cher.',
          'Comparez au moins deux ou trois services avec le poids réel.',
          'Sur Jibly, vous pouvez proposer un prix plus bas que celui du voyageur.',
        ],
      },
      {
        heading: 'À éviter',
        body:
          'Ne découpez pas un envoi en plusieurs colis pour passer sous un seuil de douane : c’est interdit. Et ne confiez jamais à un voyageur un objet qu’il / elle ne peut pas voir : sur Jibly, le voyageur vérifie toujours le contenu.',
      },
    ],
    notJibly: NOT_JIBLY_BASE,
    faq: [
      {
        q: 'Quel est le moyen le moins cher d’envoyer un colis au Maroc ?',
        a: 'Il n’y a pas de réponse unique : pour un colis lourd et non urgent, la poste ou un comparateur est souvent le moins cher ; pour un petit objet personnel, un voyageur peut l’être aussi. Comparez avec le poids réel et le prix total.',
      },
      {
        q: 'Combien coûte un envoi avec un voyageur sur Jibly ?',
        a: 'Chaque voyageur fixe son prix et vous pouvez proposer un montant plus bas. Le total, frais de service inclus, est affiché avant le paiement.',
      },
      {
        q: 'Y a-t-il des frais de douane pour un colis vers le Maroc ?',
        a: 'Cela dépend de la nature et de la valeur du contenu. Renseignez-vous auprès de la douane marocaine ou de votre transporteur avant d’envoyer.',
      },
    ],
    related: ['/envoyer-colis-maroc', '/envoyer-petit-colis-etranger', '/comparatif-voyageur-express-poste', '/douane-colis-ue-hors-ue'],
    group: 'besoin',
    card: {
      fr: { title: 'Petit budget', text: 'Ce qui fait le prix, et comment payer moins.' },
      en: { title: 'On a budget', text: 'What drives the price, and how to pay less.' },
    },
  },

  {
    path: '/alternatives-dhl',
    alt: '/en/dhl-alternatives',
    label: 'Alternatives à DHL',
    title: 'Alternatives à DHL pour un document ou un petit colis',
    description:
      'FedEx, UPS, La Poste, comparateurs ou voyageur : les alternatives à DHL pour envoyer un document ou un petit colis à l’étranger, et comment choisir.',
    h1: 'Les alternatives à DHL pour envoyer à l’étranger',
    answer:
      'Les principales alternatives à DHL sont les autres transporteurs express (FedEx, UPS), les services postaux (La Poste et Colissimo International en France), les comparateurs qui proposent plusieurs transporteurs (Eurosender, Packlink…) et, pour un petit objet personnel, un voyageur qui fait déjà le trajet, via une plateforme comme Jibly. Chacune a ses avantages selon l’urgence, le poids et le contenu.',
    optionsHeading: 'DHL et ses alternatives',
    options: [
      { ...EXPRESS, name: 'DHL, FedEx, UPS' },
      POST,
      COMPARATOR,
      TRAVELLER,
    ],
    sections: [
      {
        heading: 'Choisir en trois questions',
        bullets: [
          'Est-ce urgent, avec une date limite stricte ? Un transporteur express.',
          'Est-ce lourd, ou est-ce de la marchandise ? La poste ou un comparateur.',
          'Est-ce un document, des clés ou un petit objet personnel, et quelqu’un fait-il le trajet ? Un voyageur peut être plus simple.',
        ],
      },
      {
        heading: 'Quand un voyageur est une bonne alternative',
        body:
          'Pour un petit envoi personnel, un voyageur qui part déjà vers la ville de votre destinataire le lui remet en main propre. Vous savez qui transporte votre envoi : chaque voyageur vérifie son identité avant de pouvoir être réservé, et le prix se fixe entre vous.',
      },
    ],
    notJibly: NOT_JIBLY_BASE,
    faq: [
      {
        q: 'Quelle est la meilleure alternative à DHL ?',
        a: 'Cela dépend de votre envoi. FedEx et UPS sont les équivalents express les plus directs ; la poste est souvent moins chère si vous avez le temps ; un voyageur convient bien aux documents et petits objets personnels.',
      },
      {
        q: 'Jibly est-il un concurrent de DHL ?',
        a: 'Pas exactement : Jibly n’est pas un transporteur. C’est une plateforme qui met en relation des expéditeurs avec des voyageurs vérifiés, pour de petits envois personnels.',
      },
      {
        q: 'Jibly est-il affilié à DHL, FedEx, UPS ou La Poste ?',
        a: 'Non. Ces services sont cités à titre de comparaison ; vérifiez leurs tarifs et délais à jour sur leur site.',
      },
    ],
    related: ['/comparatif-voyageur-express-poste', '/envoi-document-urgent-etranger', '/envoyer-petit-colis-etranger'],
    group: 'regles',
    featured: true,
    card: {
      fr: { title: 'Alternatives à DHL', text: 'Express, poste, comparateurs ou voyageur.' },
      en: { title: 'Alternatives to DHL', text: 'Express, post, comparison sites or traveller.' },
    },
  },

  // ---------------------------------------------------------------------------
  // Phase 2 — Europe and worldwide. Morocco → France is the pilot direction.
  // ---------------------------------------------------------------------------

  {
    path: '/envoyer-colis-maroc-france',
    alt: '/en/send-parcel-from-morocco-to-europe',
    label: 'Colis du Maroc vers la France',
    title: 'Envoyer un colis du Maroc vers la France et l’Europe',
    description:
      'Envoyer un document ou un petit colis du Maroc vers la France, la Belgique, l’Espagne ou ailleurs en Europe : poste, express ou voyageur, et les règles à l’entrée de l’UE.',
    h1: 'Envoyer un colis du Maroc vers la France et l’Europe',
    answer:
      'Pour envoyer un colis du Maroc vers la France ou un autre pays d’Europe, vous pouvez passer par la poste marocaine (Barid Al-Maghrib), par un transporteur express (DHL, FedEx, UPS) ou par un voyageur qui fait déjà le trajet. Pour un colis lourd ou de la marchandise, la poste ou l’express sont plus adaptés. Pour un document, des clés ou un petit objet personnel, un voyageur peut le remettre en main propre à votre destinataire, en France, en Belgique, en Espagne ou ailleurs en Europe.',
    optionsHeading: 'Les options depuis le Maroc',
    options: [
      { ...POST, name: 'La poste marocaine (Barid Al-Maghrib)', price: 'Tarifs selon le poids et la destination, en bureau de poste ou sur son site' },
      EXPRESS,
      TRAVELLER,
    ],
    trips: { heading: 'Voyageurs du Maroc vers l’Europe', match: { kind: 'country', from: 'MA', to: 'EUROPE' } },
    sections: [
      {
        heading: 'Vers la France, et au-delà',
        body:
          'Les trajets Maroc → France sont les plus fréquents sur Jibly, mais un voyageur peut annoncer n’importe quelle destination : Bruxelles, Madrid, Amsterdam, Milan, Londres… Cherchez votre ville d’arrivée, ou publiez votre demande avec votre date limite.',
      },
      {
        heading: 'À l’entrée de l’Union européenne',
        bullets: [
          'Un colis de marchandises envoyé par la poste ou un transporteur passe en douane : une déclaration est demandée et des taxes peuvent s’appliquer selon la valeur.',
          'Les produits d’origine animale (viande, produits laitiers…) sont très encadrés à l’entrée de l’UE, y compris dans les bagages.',
          'Le Royaume-Uni n’est plus dans l’UE : il a ses propres règles de douane.',
          'En cas de doute, vérifiez sur le site de la douane du pays d’arrivée avant d’envoyer.',
        ],
      },
      {
        heading: 'Ce qu’un voyageur peut transporter',
        body:
          'Sur Jibly : documents, clés, objets personnels, vêtements, électronique légère et médicaments en vente libre (avec conditions). La nourriture, les espèces, les bijoux et les médicaments sur ordonnance ne sont pas acceptés.',
      },
    ],
    notJibly: NOT_JIBLY_BASE,
    faq: [
      {
        q: 'Comment envoyer un document du Maroc vers la France ?',
        a: 'Par la poste marocaine, par un service express de documents, ou en le confiant à un voyageur qui part vers la ville de votre destinataire. Gardez toujours une copie du document.',
      },
      {
        q: 'Peut-on envoyer de la nourriture du Maroc vers la France avec un voyageur ?',
        a: 'Pas sur Jibly : la nourriture ne fait pas partie des catégories autorisées. Et les produits d’origine animale sont de toute façon très encadrés à l’entrée de l’UE.',
      },
      {
        q: 'Jibly fonctionne-t-il vers d’autres pays qu’en France ?',
        a: 'Oui. Un voyageur peut annoncer n’importe quel trajet, vers toute l’Europe et ailleurs. Le Maroc et la France sont simplement nos premiers trajets.',
      },
    ],
    related: ['/envoi-colis-casablanca-paris', '/envoyer-colis-europe', '/douane-colis-ue-hors-ue', '/envoyer-colis-maroc'],
    group: 'destination',
    card: {
      fr: { title: 'Du Maroc vers l’Europe', text: 'France, Belgique, Espagne… : les options.' },
      en: { title: 'From Morocco to Europe', text: 'France, Belgium, Spain…: your options.' },
    },
  },

  {
    path: '/envoyer-colis-europe',
    alt: '/en/send-parcel-within-europe',
    label: 'Envoyer un colis en Europe',
    title: 'Envoyer un colis en Europe : poste, express ou voyageur',
    description:
      'Envoyer un document ou un petit colis en Europe (Belgique, Espagne, Italie, Allemagne, Royaume-Uni…) : options, douane dans l’UE et hors UE, et quand un voyageur est utile.',
    h1: 'Envoyer un document ou un petit colis en Europe',
    answer:
      'Pour envoyer un colis en Europe, les options classiques sont la poste (La Poste en France, bpost, Correos, Deutsche Post…), les transporteurs express (DHL, FedEx, UPS) et les comparateurs qui proposent plusieurs transporteurs. Pour un document, des clés ou un petit objet personnel, un voyageur qui fait déjà le trajet peut aussi le remettre en main propre, au prix que vous fixez ensemble. Entre pays de l’Union européenne, il n’y a pas de droits de douane ; vers le Royaume-Uni, la Suisse ou la Norvège, des formalités s’appliquent.',
    optionsHeading: 'Envoyer en Europe : les options',
    options: [
      { ...POST, name: 'La poste (La Poste, bpost, Correos…)', price: 'Grille selon le poids et le pays, sur le site de la poste', limits: 'Formalités douanières hors UE' },
      EXPRESS,
      COMPARATOR,
      TRAVELLER,
    ],
    trips: { heading: 'Voyageurs entre pays d’Europe', match: { kind: 'country', from: 'EUROPE', to: 'EUROPE' } },
    sections: [
      {
        heading: 'Dans l’UE ou hors de l’UE ?',
        bullets: [
          'Entre deux pays de l’Union européenne (France, Belgique, Espagne, Italie, Allemagne, Pays-Bas, Portugal…), les marchandises circulent sans droits de douane.',
          'Vers le Royaume-Uni, la Suisse ou la Norvège, qui ne sont pas dans l’UE, un colis de marchandises demande une déclaration en douane.',
          'Certains territoires (îles Canaries, départements d’outre-mer…) ont des règles fiscales particulières : vérifiez avant d’envoyer.',
        ],
      },
      {
        heading: 'Quand un voyageur est une bonne idée',
        body:
          'Pour un objet oublié, des clés, un document original ou un petit cadeau, un voyageur qui part déjà vers la même ville évite emballage, étiquette et dépôt : vous le rencontrez, il / elle le remet à votre destinataire. Le prix se fixe entre vous et les frais Jibly sont affichés avant le paiement.',
      },
    ],
    notJibly: NOT_JIBLY_BASE,
    faq: [
      {
        q: 'Quel est le moyen le plus simple d’envoyer un petit colis en Europe ?',
        a: 'Pour un colis standard, la poste ou un comparateur. Pour un petit objet personnel à remettre en main propre, un voyageur qui fait le trajet peut être plus direct.',
      },
      {
        q: 'Faut-il une déclaration en douane pour envoyer un colis au Royaume-Uni ?',
        a: 'Oui, pour des marchandises : depuis le Brexit, le Royaume-Uni n’est plus dans l’UE et une déclaration est demandée. Les documents en sont généralement dispensés ; vérifiez auprès du transporteur.',
      },
      {
        q: 'Y a-t-il des voyageurs Jibly entre pays européens ?',
        a: 'Les voyageurs annoncent librement leurs trajets. Les trajets disponibles apparaissent sur cette page ; s’il n’y en a pas pour vos dates, publiez votre demande.',
      },
    ],
    related: ['/envoyer-petit-colis-etranger', '/douane-colis-ue-hors-ue', '/envoyer-colis-maroc-france', '/comparatif-voyageur-express-poste'],
    group: 'destination',
    featured: true,
    card: {
      fr: { title: 'Un colis en Europe', text: 'Dans l’UE, hors UE : options et règles.' },
      en: { title: 'A parcel within Europe', text: 'In or outside the EU: options and rules.' },
    },
  },

  {
    path: '/envoyer-petit-colis-etranger',
    alt: '/en/send-small-parcel-abroad',
    label: 'Petit colis à l’étranger',
    title: 'Envoyer un petit colis à l’étranger : les options',
    description:
      'Comment envoyer un petit colis à l’étranger : poste, express, comparateurs ou voyageur qui fait le trajet. Avantages, limites, douane et comment choisir.',
    h1: 'Envoyer un petit colis à l’étranger',
    answer:
      'Pour envoyer un petit colis à l’étranger, vous avez le choix entre la poste (souvent la moins chère quand rien ne presse), un transporteur express comme DHL, FedEx ou UPS (rapide, avec suivi complet), un comparateur qui propose plusieurs transporteurs, ou un voyageur qui fait déjà le trajet. Ce dernier convient aux documents, clés, vêtements et petits objets personnels : il / elle le remet en main propre, au prix que vous fixez ensemble.',
    optionsHeading: 'Petit colis à l’étranger : comparer',
    options: [POST, EXPRESS, COMPARATOR, TRAVELLER],
    sections: [
      {
        heading: 'Choisir en trois questions',
        bullets: [
          'Quelle date limite ? Plus c’est urgent, plus l’express ou un voyageur qui part bientôt se justifie.',
          'Quel poids et quelles dimensions ? Au-delà de quelques kilos, la poste ou un transporteur.',
          'Qu’est-ce que c’est ? Marchandise ou objet de valeur : transporteur. Objet personnel autorisé : un voyageur est possible.',
        ],
      },
      {
        heading: 'Avec un voyageur, étape par étape',
        bullets: [
          'Cherchez un trajet vers la ville de votre destinataire, ou publiez votre demande.',
          'Le voyageur indique son prix ; vous pouvez proposer moins. Les frais Jibly sont affichés avant le paiement.',
          'Remettez l’objet en main propre, sans le sceller : le voyageur vérifie toujours le contenu.',
          'À l’arrivée, votre destinataire donne le code de livraison au voyageur.',
        ],
      },
    ],
    notJibly: NOT_JIBLY_BASE,
    faq: [
      {
        q: 'Quel est le moyen le moins cher d’envoyer un petit colis à l’étranger ?',
        a: 'Cela dépend du poids, de la destination et de l’urgence. Comparez la poste, un comparateur et, pour un objet personnel, un voyageur, toujours avec le prix total.',
      },
      {
        q: 'Peut-on suivre un colis confié à un voyageur ?',
        a: 'Sur Jibly, la prise en charge et la livraison sont chacune confirmées par un code : vous savez quand le voyageur a l’objet et quand il a été remis.',
      },
      {
        q: 'Vers quels pays peut-on envoyer avec Jibly ?',
        a: 'Partout où un voyageur annonce un trajet. Les premiers trajets sont entre le Maroc et la France, mais la plateforme n’est pas limitée à une région.',
      },
    ],
    related: ['/envoyer-colis-europe', '/envoyer-cadeau-famille-etranger', '/que-peut-on-envoyer-a-l-etranger', '/emballer-document-petit-colis'],
    group: 'besoin',
    featured: true,
    card: {
      fr: { title: 'Un petit colis à l’étranger', text: 'Poste, express ou voyageur : comparer.' },
      en: { title: 'A small parcel abroad', text: 'Post, express or traveller: compare.' },
    },
  },

  {
    path: '/cles-oubliees-autre-pays',
    alt: '/en/forgotten-keys-abroad',
    label: 'Clés oubliées à l’étranger',
    title: 'Clés oubliées dans un autre pays : comment les récupérer',
    description:
      'Vous avez oublié vos clés à l’étranger, ou chez vous avant de partir ? Les solutions : poste, express, voyageur qui fait le trajet, ou serrurier. Avantages et limites.',
    h1: 'Clés oubliées dans un autre pays : comment les récupérer',
    answer:
      'Pour récupérer des clés oubliées dans un autre pays, la personne qui les a peut les envoyer par la poste (en lettre suivie, dans une enveloppe rembourrée) ou par un transporteur express. Autre solution : les confier à un voyageur qui fait le trajet vers votre ville, qui vous les remet en main propre. Si c’est trop long ou trop cher, un serrurier ou un double chez un proche peut être plus rapide.',
    optionsHeading: 'Récupérer des clés : les options',
    options: [
      { ...POST, name: 'La poste (lettre suivie, enveloppe rembourrée)', bestFor: 'Quand quelques jours d’attente sont possibles' },
      { ...EXPRESS, bestFor: 'Clés attendues rapidement, avec suivi' },
      { ...TRAVELLER, bestFor: 'Un voyageur part bientôt vers votre ville' },
    ],
    sections: [
      {
        heading: 'Avant d’envoyer',
        bullets: [
          'N’indiquez jamais l’adresse du logement avec les clés : une étiquette avec l’adresse et les clés ensemble est un risque.',
          'Utilisez une enveloppe rembourrée, pour que les clés ne percent pas l’emballage.',
          'Pensez à un double : un proche qui en a un, ou un serrurier, est parfois la solution la plus rapide.',
        ],
      },
      {
        heading: 'Avec un voyageur',
        body:
          'Les clés font partie des catégories autorisées sur Jibly. La personne qui les a les remet au voyageur avant son départ ; à l’arrivée, vous les récupérez au lieu de rendez-vous convenu, et vous donnez le code de livraison au voyageur.',
      },
    ],
    notJibly: [
      'Aucun voyageur ne fait le trajet avant le moment où il vous faut les clés.',
      'Il s’agit de clés de coffre ou d’objets de valeur associés : passez par un transporteur assuré.',
    ],
    faq: [
      {
        q: 'Peut-on envoyer des clés par la poste à l’étranger ?',
        a: 'Oui, en général dans une enveloppe rembourrée, de préférence avec suivi. Vérifiez les conditions de votre poste pour les petits objets.',
      },
      {
        q: 'Peut-on confier des clés à un voyageur sur Jibly ?',
        a: 'Oui, les clés font partie des catégories autorisées. Le voyageur voit ce qu’il / elle transporte et la remise est confirmée par un code.',
      },
      {
        q: 'Quelle est la solution la plus rapide ?',
        a: 'Un voyageur qui part le jour même ou le lendemain, s’il y en a un, ou un service express. Un serrurier peut aussi être plus rapide que tout envoi.',
      },
    ],
    related: ['/envoi-document-urgent-etranger', '/envoyer-petit-colis-etranger', '/emballer-document-petit-colis'],
    group: 'objet',
    featured: true,
    card: {
      fr: { title: 'Des clés oubliées', text: 'Poste, express, voyageur ou serrurier.' },
      en: { title: 'Forgotten keys', text: 'Post, express, traveller or locksmith.' },
    },
  },

  {
    path: '/envoyer-document-original-signe',
    label: 'Document original à signer',
    title: 'Faire signer un document original à l’étranger (aller-retour)',
    description:
      'Contrat, acte, formulaire : comment envoyer un document original à l’étranger pour signature et le récupérer. Signature électronique, poste, express ou voyageur.',
    h1: 'Faire signer un document original à l’étranger',
    answer:
      'Pour faire signer un original à l’étranger, vérifiez d’abord si une signature électronique ou une copie scannée est acceptée : c’est souvent le plus rapide. Si l’original est obligatoire, il faut un aller et un retour : par lettre recommandée internationale, par un service express de documents, ou avec un voyageur à l’aller et un autre au retour, qui remettent le document en main propre.',
    optionsHeading: 'L’aller-retour d’un original',
    options: [
      { ...POST, name: 'Lettre recommandée internationale', bestFor: 'Démarches qui exigent une preuve de dépôt' },
      { ...EXPRESS, name: 'Express documents (DHL, FedEx, UPS…)', bestFor: 'Délai court, suivi de bout en bout' },
      { ...TRAVELLER, bestFor: 'Remise en main propre à l’aller et au retour' },
    ],
    sections: [
      {
        heading: 'Une signature électronique suffit-elle ?',
        body:
          'Beaucoup de contrats et de formulaires acceptent la signature électronique. Pour un acte notarié ou une démarche officielle, l’original peut être exigé : demandez à l’organisme concerné avant d’envoyer.',
      },
      {
        heading: 'Organiser l’aller-retour avec des voyageurs',
        bullets: [
          'Réservez un voyageur pour l’aller vers la ville du signataire.',
          'Cherchez ensuite un voyageur pour le retour : les deux trajets se réservent séparément.',
          'Glissez une enveloppe de retour avec les instructions, et gardez une copie de chaque page.',
        ],
      },
    ],
    notJibly: [
      'La démarche exige une preuve de dépôt postale ou un accusé de réception officiel.',
      'Le délai est strict et aucun voyageur ne fait l’aller ou le retour à temps.',
    ],
    faq: [
      {
        q: 'Comment envoyer un contrat à signer à l’étranger ?',
        a: 'Par signature électronique si elle est acceptée ; sinon par recommandé international, express, ou avec un voyageur à l’aller et au retour.',
      },
      {
        q: 'Un voyageur peut-il rapporter le document signé ?',
        a: 'Oui, si un voyageur fait le trajet retour. Sur Jibly, chaque trajet se réserve séparément : cherchez un voyageur pour l’aller, puis un pour le retour.',
      },
    ],
    related: ['/envoyer-document-maroc', '/envoi-document-urgent-etranger', '/emballer-document-petit-colis'],
    group: 'objet',
    card: {
      fr: { title: 'Un original à faire signer', text: 'L’aller-retour, ou la signature électronique.' },
      en: { title: 'An original to be signed', text: 'The round trip, or e-signature.' },
    },
  },

  {
    path: '/envoyer-cadeau-famille-etranger',
    label: 'Cadeau pour la famille à l’étranger',
    title: 'Envoyer un cadeau à sa famille à l’étranger',
    description:
      'Envoyer un petit cadeau à un proche à l’étranger : poste, express ou voyageur qui fait le trajet. Ce qu’on peut envoyer, ce qui coince en douane, et comment choisir.',
    h1: 'Envoyer un cadeau à sa famille à l’étranger',
    answer:
      'Pour envoyer un cadeau à un proche à l’étranger, la poste et les transporteurs express sont les solutions classiques ; un voyageur qui fait déjà le trajet peut aussi remettre un petit cadeau en main propre. Sur Jibly, les vêtements, livres, souvenirs et petits cadeaux non précieux sont acceptés ; la nourriture, les bijoux et les objets de valeur ne le sont pas.',
    optionsHeading: 'Envoyer un cadeau : les options',
    options: [POST, EXPRESS, { ...TRAVELLER, bestFor: 'Vêtements, livres, souvenirs, petits cadeaux non précieux' }],
    sections: [
      {
        heading: 'Ce qui coince le plus souvent',
        bullets: [
          'La nourriture : pas acceptée sur Jibly, et les produits d’origine animale sont très encadrés à l’entrée de l’UE.',
          'Les bijoux, montres et objets de luxe : interdits sur Jibly ; préférez un transporteur assuré.',
          'Hors Union européenne, un cadeau reste une marchandise : une déclaration en douane et des taxes peuvent s’appliquer.',
        ],
      },
      {
        heading: 'Avec un voyageur',
        body:
          'Montrez le cadeau au voyageur avant de fermer le paquet : il / elle doit pouvoir voir ce qu’il / elle transporte. Votre proche convient du rendez-vous avec le voyageur et donne le code de livraison à la remise.',
      },
    ],
    notJibly: NOT_JIBLY_BASE,
    faq: [
      {
        q: 'Peut-on envoyer des vêtements à sa famille avec un voyageur ?',
        a: 'Oui, les vêtements font partie des catégories autorisées sur Jibly, dans la limite de ce qu’un voyageur peut mettre dans ses bagages.',
      },
      {
        q: 'Peut-on envoyer des gâteaux ou des épices ?',
        a: 'Pas sur Jibly : la nourriture ne fait pas partie des catégories autorisées. Par la poste, renseignez-vous sur les règles du pays de destination.',
      },
    ],
    related: ['/envoyer-petit-colis-etranger', '/que-peut-on-envoyer-a-l-etranger', '/douane-colis-ue-hors-ue'],
    group: 'objet',
    card: {
      fr: { title: 'Un cadeau pour la famille', text: 'Ce qu’on peut envoyer, et comment.' },
      en: { title: 'A gift for family abroad', text: 'What you can send, and how.' },
    },
  },

  {
    path: '/comparatif-voyageur-express-poste',
    alt: '/en/traveller-vs-courier-vs-post',
    label: 'Voyageur, express ou poste',
    title: 'Voyageur, express ou poste : comparatif pour envoyer à l’étranger',
    description:
      'Comparatif honnête pour envoyer un document ou un petit colis à l’étranger : transporteur express (DHL, FedEx, UPS), poste, comparateurs ou voyageur. Points forts et limites.',
    h1: 'Voyageur, express ou poste : que choisir ?',
    answer:
      'Un transporteur express (DHL, FedEx, UPS) est le plus fiable quand il faut un délai court et un suivi de bout en bout, partout dans le monde. La poste est souvent la moins chère quand rien ne presse. Un comparateur aide à trouver le bon transporteur. Un voyageur qui fait déjà le trajet est une alternative pour les documents et petits objets personnels : remise en main propre, prix fixé entre vous, mais seulement si quelqu’un fait le trajet à vos dates.',
    optionsHeading: 'Le comparatif',
    options: [EXPRESS, POST, COMPARATOR, TRAVELLER],
    sections: [
      {
        heading: 'Les points forts de chacun',
        bullets: [
          'Express : rapidité, enlèvement à domicile, suivi complet, formalités prises en charge.',
          'Poste : réseau partout, prix souvent plus bas pour les envois non urgents.',
          'Comparateur : plusieurs devis en une fois.',
          'Voyageur : remise en main propre, vous savez qui transporte, prix fixé entre vous.',
        ],
      },
      {
        heading: 'Les limites de chacun',
        bullets: [
          'Express : souvent le plus cher pour un petit envoi personnel.',
          'Poste : délais plus longs, suivi variable selon l’offre.',
          'Comparateur : vous restez soumis aux règles du transporteur choisi.',
          'Voyageur : dépend des trajets annoncés, petits objets autorisés seulement, pas de délai garanti.',
        ],
      },
    ],
    notJibly: NOT_JIBLY_BASE,
    faq: [
      {
        q: 'Est-ce sûr de confier un objet à un voyageur ?',
        a: 'Sur Jibly, chaque voyageur vérifie son identité avant d’être réservé, le paiement passe par la plateforme et la remise est confirmée par un code. Les objets de valeur restent interdits : pour eux, un transporteur assuré est plus adapté.',
      },
      {
        q: 'Un voyageur est-il plus rapide que l’express ?',
        a: 'Parfois, si un voyageur part le jour même vers la même ville. Mais rien n’est garanti : cela dépend des trajets annoncés. L’express, lui, se réserve tout de suite.',
      },
    ],
    related: ['/alternatives-dhl', '/envoi-document-urgent-etranger', '/envoyer-petit-colis-etranger'],
    group: 'regles',
    card: {
      fr: { title: 'Voyageur, express ou poste', text: 'Le comparatif, points forts et limites.' },
      en: { title: 'Traveller, express or post', text: 'Side by side: strengths and limits.' },
    },
  },

  {
    path: '/douane-colis-ue-hors-ue',
    label: 'Douane : UE et hors UE',
    title: 'Douane : envoyer un colis dans l’UE ou hors de l’UE',
    description:
      'Faut-il déclarer un colis en douane ? Les règles générales entre pays de l’UE, vers ou depuis un pays hors UE (Maroc, Royaume-Uni, Suisse…), formulaires CN22 / CN23 et bagages.',
    h1: 'Douane : ce qu’il faut savoir pour envoyer un colis',
    answer:
      'Entre deux pays de l’Union européenne, un colis de marchandises circule sans droits de douane. Vers ou depuis un pays hors UE (Maroc, Royaume-Uni, Suisse, États-Unis…), un colis de marchandises doit être déclaré : par la poste, avec un formulaire CN22 ou CN23 selon la valeur ; avec un transporteur, sur sa déclaration. Des droits et taxes peuvent alors être demandés à l’arrivée. Les documents sans valeur marchande en sont en général dispensés. Ces règles changent selon les pays : vérifiez toujours sur le site de la douane concernée.',
    optionsHeading: 'Qui gère la douane, selon l’option',
    options: [
      { ...POST, limits: 'Formulaire CN22 / CN23 à remplir hors UE' },
      { ...EXPRESS, limits: 'Le transporteur dédouane, les taxes peuvent être refacturées' },
      { ...TRAVELLER, limits: 'L’objet voyage dans les bagages : règles voyageurs des deux pays' },
    ],
    sections: [
      {
        heading: 'Les règles générales',
        bullets: [
          'Dans l’UE : pas de droits de douane entre États membres, mais certains territoires (îles Canaries, outre-mer…) font exception.',
          'Hors UE : déclarez le contenu et la valeur réelle ; des droits et taxes peuvent s’appliquer à l’arrivée.',
          'Ne découpez jamais un envoi pour passer sous un seuil : c’est une fraude.',
          'Certains produits sont interdits ou très encadrés (produits d’origine animale, plantes, médicaments, contrefaçons…).',
        ],
      },
      {
        heading: 'Quand un voyageur transporte l’objet',
        body:
          'L’objet voyage dans ses bagages : il / elle doit respecter les règles de la compagnie aérienne et de la douane des deux pays, comme pour ses propres affaires. C’est pour cela que Jibly limite les envois à des catégories précises et que le voyageur vérifie toujours le contenu.',
      },
    ],
    notJibly: [
      'Des marchandises destinées à la vente, ou en quantité.',
      'Tout objet dont vous n’êtes pas sûr qu’il est autorisé à l’entrée du pays d’arrivée.',
    ],
    faq: [
      {
        q: 'Faut-il déclarer un document en douane ?',
        a: 'En général non pour un document sans valeur marchande, mais les transporteurs demandent souvent de préciser qu’il s’agit de documents. Vérifiez auprès du service choisi.',
      },
      {
        q: 'Qui paie les taxes à l’arrivée ?',
        a: 'Le plus souvent le destinataire, sauf si l’expéditeur a choisi de les payer à l’avance quand le transporteur le permet.',
      },
      {
        q: 'Où trouver les règles officielles ?',
        a: 'Sur le site de la douane du pays d’arrivée, par exemple douane.gouv.fr pour la France ou douane.gov.ma pour le Maroc.',
      },
    ],
    related: ['/que-peut-on-envoyer-a-l-etranger', '/envoyer-colis-europe', '/envoyer-colis-maroc-france'],
    group: 'regles',
    card: {
      fr: { title: 'Douane : UE et hors UE', text: 'Ce qu’il faut déclarer, et quand.' },
      en: { title: 'Customs: EU and non-EU', text: 'What to declare, and when.' },
    },
  },

  {
    path: '/que-peut-on-envoyer-a-l-etranger',
    label: 'Que peut-on envoyer à l’étranger ?',
    title: 'Que peut-on envoyer à l’étranger ? Objets autorisés et interdits',
    description:
      'Ce que l’on peut envoyer à l’étranger par la poste, un transporteur ou un voyageur : objets courants, objets réglementés et objets interdits, et la liste Jibly.',
    h1: 'Que peut-on envoyer à l’étranger ?',
    answer:
      'La plupart des objets du quotidien peuvent être envoyés à l’étranger : documents, vêtements, livres, petits objets. Certains sont réglementés ou interdits partout : espèces, armes, produits dangereux ou inflammables, stupéfiants, contrefaçons, et souvent les médicaments et les produits d’origine animale. Chaque transporteur et chaque pays a sa propre liste. Avec un voyageur sur Jibly, seule une liste précise de catégories est acceptée : documents, clés, objets personnels, vêtements, électronique légère et médicaments en vente libre sous conditions.',
    optionsHeading: 'Les règles selon l’option',
    options: [
      { ...POST, limits: 'Liste d’objets interdits de la poste et du pays d’arrivée' },
      { ...EXPRESS, limits: 'Liste d’objets interdits du transporteur et du pays d’arrivée' },
      { ...TRAVELLER, limits: 'Liste positive : seules les catégories autorisées' },
    ],
    sections: [
      {
        heading: 'Interdits presque partout',
        bullets: [
          'Espèces et moyens de paiement.',
          'Armes, munitions, répliques.',
          'Produits inflammables, gaz, explosifs, batteries lithium non protégées.',
          'Stupéfiants et contrefaçons.',
        ],
      },
      {
        heading: 'Souvent réglementés',
        bullets: [
          'Médicaments : les règles varient selon les pays ; sur Jibly, ceux sur ordonnance sont interdits.',
          'Nourriture, plantes, produits d’origine animale.',
          'Objets de valeur : à assurer auprès d’un transporteur.',
        ],
      },
      {
        heading: 'La liste Jibly',
        body:
          'Jibly fonctionne avec une liste positive : documents, clés, objets personnels, vêtements, électronique légère et médicaments en vente libre (2 unités maximum par produit, dans leur emballage d’origine). Tout le reste est interdit, et le voyageur vérifie toujours le contenu avant d’accepter.',
      },
    ],
    notJibly: NOT_JIBLY_BASE,
    faq: [
      {
        q: 'Peut-on envoyer des médicaments à l’étranger ?',
        a: 'Les règles dépendent du pays et du médicament. Sur Jibly, seuls certains médicaments en vente libre sont acceptés, sous conditions ; ceux sur ordonnance sont interdits.',
      },
      {
        q: 'Peut-on envoyer un téléphone ou un ordinateur ?',
        a: 'Par transporteur, oui en général, avec des règles pour les batteries. Sur Jibly, seule l’électronique légère est acceptée (chargeurs, câbles, écouteurs, petits accessoires).',
      },
    ],
    related: ['/douane-colis-ue-hors-ue', '/emballer-document-petit-colis', '/envoyer-cadeau-famille-etranger'],
    group: 'regles',
    card: {
      fr: { title: 'Que peut-on envoyer ?', text: 'Objets autorisés, réglementés, interdits.' },
      en: { title: 'What can you send?', text: 'Allowed, regulated and forbidden items.' },
    },
  },

  {
    path: '/emballer-document-petit-colis',
    label: 'Emballer un document ou un petit colis',
    title: 'Comment emballer un document ou un petit colis pour l’étranger',
    description:
      'Bien emballer un document, des clés ou un petit objet pour un envoi à l’étranger : enveloppe, protection, étiquette, et ce qui change quand un voyageur le transporte.',
    h1: 'Emballer un document ou un petit colis pour l’étranger',
    answer:
      'Pour un document, utilisez une pochette cartonnée ou une enveloppe rigide pour éviter les plis, et gardez une copie. Pour un petit objet, une boîte à peine plus grande que l’objet, avec du calage, suffit. Avec la poste ou un transporteur, collez l’étiquette bien à plat et ajoutez la déclaration en douane si elle est demandée. Avec un voyageur, ne fermez pas le paquet avant la remise : il / elle doit pouvoir voir ce qu’il / elle transporte.',
    optionsHeading: 'Ce qui change selon l’option',
    options: [
      { ...POST, limits: 'Emballage fermé, étiquette et déclaration si hors UE' },
      { ...EXPRESS, limits: 'Emballage fermé, bordereau du transporteur' },
      { ...TRAVELLER, limits: 'Paquet ouvert à la remise : le voyageur vérifie le contenu' },
    ],
    sections: [
      {
        heading: 'Documents',
        bullets: [
          'Scannez chaque page avant l’envoi.',
          'Pochette cartonnée ou enveloppe rigide, sans agrafes ni trombones qui accrochent.',
          'Une pochette plastique protège de l’humidité.',
        ],
      },
      {
        heading: 'Clés et petits objets',
        bullets: [
          'Enveloppe rembourrée pour des clés ; jamais d’adresse du logement avec les clés.',
          'Petite boîte et calage (papier, papier bulle) pour un objet fragile.',
          'Le plus petit emballage possible : c’est aussi le moins cher et le plus facile à transporter.',
        ],
      },
    ],
    notJibly: [
      'Votre envoi doit voyager scellé et sans être ouvert : passez par la poste ou un transporteur.',
    ],
    faq: [
      {
        q: 'Faut-il fermer le colis avant de le donner à un voyageur ?',
        a: 'Non. Sur Jibly, le voyageur vérifie toujours le contenu avant d’accepter : jamais de colis fermé. Vous pouvez fermer le paquet ensemble, après vérification.',
      },
      {
        q: 'Comment éviter qu’un document soit plié ?',
        a: 'Utilisez une pochette cartonnée ou glissez un carton rigide dans l’enveloppe, et indiquez « Ne pas plier » si vous passez par la poste.',
      },
    ],
    related: ['/que-peut-on-envoyer-a-l-etranger', '/cles-oubliees-autre-pays', '/envoyer-document-original-signe'],
    group: 'regles',
    card: {
      fr: { title: 'Bien emballer', text: 'Document, clés ou petit objet.' },
      en: { title: 'Packing it right', text: 'Documents, keys or small items.' },
    },
  },
];

/** Every guide, French then English. */
export const GUIDES: Guide[] = [...GUIDES_FR, ...GUIDES_EN];

export function guideLang(g: Guide): GuideLang {
  return g.lang ?? 'fr';
}

/** Label for any guide or route page path (for cross-links). */
export function guideLabel(path: string): string | undefined {
  return GUIDES.find((g) => g.path === path)?.label;
}
