// Hand-written route landing pages (SEO). Deliberately a short list: each page
// has its own text and shows the live trips for that route — no generated
// city-pair pages. Add a route here only when there is real demand on it.

export type RouteMatch =
  | { kind: 'city'; from: string; to: string }
  | { kind: 'country'; from: string; to: string };

export type RoutePage = {
  path: string;
  /** Short label used in breadcrumbs, the footer and cross-links. */
  label: string;
  title: string;
  description: string;
  h1: string;
  intro: string;
  match: RouteMatch;
  /** Two or three paragraphs specific to this route. */
  sections: { heading: string; body: string }[];
  faq: { q: string; a: string }[];
};

export const ROUTE_PAGES: RoutePage[] = [
  {
    path: '/envoi-colis-paris-casablanca',
    label: 'Paris → Casablanca',
    title: 'Envoi de colis Paris → Casablanca entre particuliers',
    description:
      'Envoyez documents, clés ou petits colis de Paris à Casablanca avec un voyageur vérifié qui fait déjà le trajet. Prix fixé entre vous, réservation sécurisée.',
    h1: 'Envoyer un colis de Paris à Casablanca avec un voyageur',
    intro:
      'Un document à faire signer, des clés, un cadeau pour la famille ? Des voyageurs prennent l’avion de Paris vers Casablanca chaque semaine. Sur Jibly, vous en trouvez un qui fait déjà le trajet, vous fixez le prix ensemble et vous réservez en toute sécurité.',
    match: { kind: 'city', from: 'Paris', to: 'Casablanca' },
    sections: [
      {
        heading: 'Pourquoi passer par un voyageur ?',
        body:
          'Pour un petit envoi, un voyageur qui part déjà de Paris est souvent plus simple qu’un transporteur : vous le rencontrez, vous lui remettez l’objet en main propre et il le remet à votre destinataire à Casablanca. Le prix est libre et se décide entre vous.',
      },
      {
        heading: 'Ce que vous pouvez envoyer',
        body:
          'Documents, clés, vêtements, petits objets et électronique personnelle font partie des catégories autorisées. Le voyageur vérifie toujours le contenu avant de l’accepter : jamais de colis fermé. Tout ce qui n’est pas dans la liste est interdit.',
      },
    ],
    faq: [
      {
        q: 'Comment trouver un voyageur Paris → Casablanca ?',
        a: 'Les trajets annoncés apparaissent sur cette page et sur la page d’accueil. S’il n’y en a pas encore pour vos dates, publiez votre demande : les voyageurs qui font le trajet peuvent vous proposer de la transporter.',
      },
      {
        q: 'Combien coûte un envoi ?',
        a: 'Il n’y a pas de tarif imposé : chaque voyageur indique son prix, et vous pouvez proposer un montant plus bas. Les frais de service Jibly sont affichés avant le paiement.',
      },
      {
        q: 'Comment se passe la remise à Casablanca ?',
        a: 'Le voyageur et votre destinataire conviennent d’un lieu de rendez-vous. La remise est confirmée par un code, ce qui permet de savoir que l’envoi est bien arrivé.',
      },
    ],
  },
  {
    path: '/envoi-colis-casablanca-paris',
    label: 'Casablanca → Paris',
    title: 'Envoi de colis Casablanca → Paris entre particuliers',
    description:
      'Envoyez documents, clés ou petits colis de Casablanca à Paris avec un voyageur vérifié qui fait déjà le trajet. Prix fixé entre vous, réservation sécurisée.',
    h1: 'Envoyer un colis de Casablanca à Paris avec un voyageur',
    intro:
      'Un papier administratif à faire parvenir en France, un objet oublié, un petit cadeau ? Trouvez un voyageur qui part déjà de Casablanca vers Paris, fixez le prix ensemble et réservez en toute sécurité avec Jibly.',
    match: { kind: 'city', from: 'Casablanca', to: 'Paris' },
    sections: [
      {
        heading: 'Un envoi simple, de main à main',
        body:
          'Vous remettez l’objet au voyageur à Casablanca, il le transporte dans ses bagages et le remet à votre destinataire à Paris. Vous savez qui transporte votre envoi : chaque voyageur vérifie son identité avant de pouvoir être réservé.',
      },
      {
        heading: 'Les règles à connaître',
        body:
          'Seuls les objets des catégories autorisées peuvent être confiés à un voyageur. Le voyageur regarde le contenu avant d’accepter et peut refuser sans pénalité s’il a un doute. Les médicaments sur ordonnance sont strictement interdits.',
      },
    ],
    faq: [
      {
        q: 'Et si aucun voyageur n’est annoncé pour mes dates ?',
        a: 'Publiez votre demande sur Jibly en indiquant le trajet et la date limite. Les voyageurs qui partent de Casablanca vers Paris peuvent alors vous proposer leur trajet.',
      },
      {
        q: 'Qui fixe le prix ?',
        a: 'Le voyageur indique un prix pour son trajet et vous pouvez proposer moins. Le montant total, frais de service inclus, est affiché avant que vous payiez.',
      },
      {
        q: 'Que se passe-t-il en cas de problème ?',
        a: 'Vous pouvez signaler un problème depuis votre espace. L’équipe Jibly examine chaque litige ; les règles d’annulation et de remboursement sont détaillées dans nos conditions.',
      },
    ],
  },
  {
    path: '/envoi-colis-france-maroc',
    label: 'France → Maroc',
    title: 'Envoi de colis France → Maroc entre particuliers',
    description:
      'Envoyez un colis de la France vers le Maroc avec un voyageur qui fait déjà le trajet : Paris, Lyon, Marseille vers Casablanca, Marrakech, Rabat… Prix fixé entre vous.',
    h1: 'Envoyer un colis de la France vers le Maroc avec un voyageur',
    intro:
      'Paris, Lyon, Marseille, Toulouse… vers Casablanca, Marrakech, Rabat ou Tanger : beaucoup de voyageurs font la route entre la France et le Maroc. Jibly vous met en relation avec l’un d’eux pour envoyer vos documents et petits colis, au prix que vous fixez ensemble.',
    match: { kind: 'country', from: 'FR', to: 'MA' },
    sections: [
      {
        heading: 'Toutes les villes, pas seulement Paris',
        body:
          'Les voyageurs annoncent leur ville de départ et d’arrivée. Que vous soyez à Lille ou à Nice, et que votre destinataire habite à Agadir ou à Fès, cherchez un trajet qui correspond ou publiez votre demande pour être contacté.',
      },
      {
        heading: 'Une mise en relation entre particuliers',
        body:
          'Jibly n’est pas un transporteur : c’est une plateforme qui met en relation des particuliers vérifiés. L’envoi se fait de main à main, le contenu est vérifié par le voyageur et le paiement passe par la plateforme.',
      },
    ],
    faq: [
      {
        q: 'Jibly fonctionne-t-il seulement entre la France et le Maroc ?',
        a: 'Non. La France et le Maroc sont nos premiers trajets, mais un voyageur peut annoncer n’importe quel trajet, partout dans le monde.',
      },
      {
        q: 'Quels objets peut-on envoyer au Maroc ?',
        a: 'Uniquement les catégories autorisées sur Jibly : documents, clés, vêtements, petits objets, électronique personnelle et certains produits sans ordonnance. La liste complète est sur la page Objets autorisés.',
      },
      {
        q: 'Faut-il un compte pour envoyer un colis ?',
        a: 'Oui : il faut un compte et une identité vérifiée pour réserver un voyageur ou publier une demande. C’est ce qui permet à chacun de savoir avec qui il échange.',
      },
    ],
  },
];
