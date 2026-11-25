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

export type Guide = {
  path: string;
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
  /** Card on the home page ("Que voulez-vous envoyer ?"). */
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

export const GUIDES: Guide[] = [
  {
    path: '/envoyer-colis-maroc',
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
    related: ['/envoyer-document-maroc', '/envoyer-colis-maroc-pas-cher', '/envoi-colis-france-maroc', '/envoi-colis-paris-casablanca', '/alternatives-dhl'],
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
    related: ['/envoyer-colis-maroc', '/envoi-document-urgent-etranger', '/envoi-colis-paris-casablanca', '/envoi-colis-france-maroc'],
    card: {
      fr: { title: 'Un document au Maroc', text: 'Recommandé, express ou en main propre.' },
      en: { title: 'A document to Morocco', text: 'Registered post, express or hand-delivered.' },
    },
  },

  {
    path: '/envoi-document-urgent-etranger',
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
    related: ['/envoyer-document-maroc', '/alternatives-dhl', '/envoyer-colis-maroc'],
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
    related: ['/envoyer-colis-maroc', '/alternatives-dhl', '/envoi-colis-france-maroc'],
    card: {
      fr: { title: 'Petit budget', text: 'Ce qui fait le prix, et comment payer moins.' },
      en: { title: 'On a budget', text: 'What drives the price, and how to pay less.' },
    },
  },

  {
    path: '/alternatives-dhl',
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
    related: ['/envoi-document-urgent-etranger', '/envoyer-colis-maroc', '/envoyer-colis-maroc-pas-cher'],
    card: {
      fr: { title: 'Alternatives à DHL', text: 'Express, poste, comparateurs ou voyageur.' },
      en: { title: 'Alternatives to DHL', text: 'Express, post, comparison sites or traveller.' },
    },
  },
];

/** Label for any guide or route page path (for cross-links). */
export function guideLabel(path: string): string | undefined {
  return GUIDES.find((g) => g.path === path)?.label;
}
