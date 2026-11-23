import { formatEuros } from '@/lib/utils';
import { getSiteUrl } from '@/lib/site-url';
// lib/email/templates.ts
//
// HTML templates for transactional emails. Kept inline (no React Email
// dependency) because they're short and stable. Each template returns
// { subject, html, text } so Resend can send both versions.
//
// Style: warm but minimal, mirrors the Jibly product palette (cream
// background, ink text, lavender accent). Wide-compatible HTML (table-
// based for Gmail/Outlook), no external CSS or webfonts.
//
// FRENCH ONLY, at the operator's request (2026-11-23). Nothing records a
// person's language — there is no locale column on a profile — so there is one
// version of each email, written in French with "vous". Amounts use French
// formatting (17,75 €) through eur() below.

const BRAND = {
  cream: '#FFF8F0',
  ink: '#1A1614',
  inkSoft: '#5A524A',
  inkMuted: '#9A9189',
  lavender: '#7C6FD9',
  lavenderLight: '#EDE8FB',
  mint: '#3FB985',
  // Reserved for the one thing in these emails that costs money if skimmed
  // past: the delivery code not reaching whoever actually collects the parcel.
  // Nothing else gets to be red, or this stops meaning anything.
  alert: '#C2372B',
  alertBg: '#FDF2F0',
};

const BASE_URL = getSiteUrl();

/** French euro amount for an email: 17,75 € (non-breaking space before €). */
function eur(amount: number): string {
  return formatEuros(amount).replace('€', ' €');
}

/** "1 décembre" → "1er décembre", as French writes the first of the month. */
function premier(date: string): string {
  return date.replace(/^1 /, '1er ');
}

/** "Bonjour Yassine," — or "Bonjour," when we have no first name. */
function greet(firstName: string | null): string {
  return firstName ? `Bonjour ${firstName},` : 'Bonjour,';
}

// Shared HTML scaffold — used by every email template
// `lang` only changes the wrapper's own words (footer). Every email is French
// now, so French is the default.
function wrapHtml(content: string, preheader: string, lang: 'en' | 'fr' = 'fr'): string {
  const footer =
    lang === 'fr'
      ? { why: 'Vous recevez cet e-mail car vous avez un compte Jibly.', link: 'Accéder à mon espace' }
      : { why: 'You are receiving this because you have a Jibly account.', link: 'Go to your account' };
  return `<!DOCTYPE html>
<html lang="${lang}">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0;padding:0;background:${BRAND.cream};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:${BRAND.ink};">
  <span style="display:none;font-size:0;line-height:0;max-height:0;max-width:0;opacity:0;overflow:hidden;">${preheader}</span>
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:${BRAND.cream};">
    <tr>
      <td align="center" style="padding:40px 20px;">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="560" style="max-width:560px;background:#ffffff;border-radius:16px;overflow:hidden;">
          <tr>
            <td style="padding:32px 32px 24px;">
              <a href="${BASE_URL}" style="text-decoration:none;color:${BRAND.ink};font-size:22px;font-weight:700;letter-spacing:-0.02em;">Jibly</a>
            </td>
          </tr>
          <tr>
            <td style="padding:0 32px 32px;">
              ${content}
            </td>
          </tr>
          <tr>
            <td style="padding:24px 32px;border-top:1px solid #EFE9E2;">
              <p style="margin:0;font-size:12px;color:${BRAND.inkMuted};line-height:1.6;">
                ${footer.why}<br>
                <a href="${BASE_URL}/me" style="color:${BRAND.inkSoft};text-decoration:underline;">${footer.link}</a>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

// =============================================================================
// 1. Sender receives an offer from a traveller
// =============================================================================
// Triggered when a traveller offers to carry a public request. The sender
// needs to be pulled back to the app to accept or decline.
//
// No "ask the traveller a question first": there is no chat before the money
// is captured (memory: no chat before booking).
export function senderGotProposalEmail(input: {
  senderFirstName: string | null;
  travelerFirstName: string | null;
  pickupCity: string;
  destinationCity: string;
  proposedPrice: number;
  bookingId: string;
}) {
  const hello = greet(input.senderFirstName);
  const travelerName = input.travelerFirstName || 'Un voyageur';
  const route = `${input.pickupCity} → ${input.destinationCity}`;
  const url = `${BASE_URL}/me`;

  const content = `
    <p style="margin:0 0 8px;font-size:13px;color:${BRAND.lavender};font-weight:600;letter-spacing:0.05em;text-transform:uppercase;">Nouvelle offre</p>
    <h1 style="margin:0 0 16px;font-size:24px;font-weight:700;color:${BRAND.ink};letter-spacing:-0.01em;line-height:1.3;">
      ${travelerName} peut transporter votre colis
    </h1>
    <p style="margin:0 0 24px;font-size:15px;color:${BRAND.inkSoft};line-height:1.6;">
      ${hello}<br>
      Bonne nouvelle : ${travelerName} a vu votre demande et propose de s’en charger.
    </p>
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:${BRAND.lavenderLight};border-radius:12px;margin-bottom:24px;">
      <tr>
        <td style="padding:18px 20px;">
          <p style="margin:0 0 6px;font-size:13px;color:${BRAND.inkSoft};">Trajet</p>
          <p style="margin:0 0 14px;font-size:17px;font-weight:600;color:${BRAND.ink};">${route}</p>
          <p style="margin:0 0 6px;font-size:13px;color:${BRAND.inkSoft};">Prix proposé</p>
          <p style="margin:0;font-size:17px;font-weight:600;color:${BRAND.ink};">${eur(input.proposedPrice)}</p>
        </td>
      </tr>
    </table>
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" align="center">
      <tr>
        <td style="background:${BRAND.ink};border-radius:999px;">
          <a href="${url}" style="display:inline-block;padding:14px 28px;font-size:15px;font-weight:600;color:#ffffff;text-decoration:none;">
            Voir l’offre
          </a>
        </td>
      </tr>
    </table>
    <p style="margin:24px 0 0;font-size:13px;color:${BRAND.inkMuted};line-height:1.6;">
      L’offre vous attend dans votre espace. Vous pouvez l’accepter ou la refuser.
    </p>
  `;

  return {
    subject: `${travelerName} peut transporter votre colis · ${route}`,
    html: wrapHtml(content, `Une offre sur votre demande ${route}`),
    text: `${hello}\n\n${travelerName} peut transporter votre colis ${route} pour ${eur(input.proposedPrice)}.\n\nVoir l’offre : ${url}\n\n— L’équipe Jibly`,
  };
}

// =============================================================================
// 2. Traveller receives a booking from a sender
// =============================================================================
// Triggered when a sender books a traveller's trip (instant book, payment
// held). The traveller is paid only on delivery — they need to accept and
// collect the parcel.
export function travelerGotBookingEmail(input: {
  travelerFirstName: string | null;
  senderFirstName: string | null;
  pickupCity: string;
  destinationCity: string;
  /** What the TRAVELLER receives — see bookingConfirmedTravelerEmail. */
  travelerReceives: number;
  itemDescription: string | null;
  bookingId: string;
}) {
  const hello = greet(input.travelerFirstName);
  const senderName = input.senderFirstName || 'Un expéditeur';
  const senderMid = input.senderFirstName || 'l’expéditeur';
  const route = `${input.pickupCity} → ${input.destinationCity}`;
  const url = `${BASE_URL}/me`;

  const itemBlock = input.itemDescription
    ? `<p style="margin:0 0 6px;font-size:13px;color:${BRAND.inkSoft};">Contenu</p>
       <p style="margin:0;font-size:14px;color:${BRAND.ink};line-height:1.5;">${escapeHtml(input.itemDescription)}</p>`
    : '';

  const priceMarginBottom = input.itemDescription ? '14px' : '0';

  const content = `
    <p style="margin:0 0 8px;font-size:13px;color:${BRAND.mint};font-weight:600;letter-spacing:0.05em;text-transform:uppercase;">Nouvelle réservation</p>
    <h1 style="margin:0 0 16px;font-size:24px;font-weight:700;color:${BRAND.ink};letter-spacing:-0.01em;line-height:1.3;">
      ${senderName} a réservé votre trajet
    </h1>
    <p style="margin:0 0 24px;font-size:15px;color:${BRAND.inkSoft};line-height:1.6;">
      ${hello}<br>
      ${senderName} souhaite vous confier un colis pendant votre trajet.
      Le paiement est déjà bloqué : il vous est versé après la livraison.
    </p>
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:#E6F5EE;border-radius:12px;margin-bottom:24px;">
      <tr>
        <td style="padding:18px 20px;">
          <p style="margin:0 0 6px;font-size:13px;color:${BRAND.inkSoft};">Trajet</p>
          <p style="margin:0 0 14px;font-size:17px;font-weight:600;color:${BRAND.ink};">${route}</p>
          <p style="margin:0 0 6px;font-size:13px;color:${BRAND.inkSoft};">Vous recevrez</p>
          <p style="margin:0 0 ${priceMarginBottom};font-size:17px;font-weight:600;color:${BRAND.ink};">${eur(input.travelerReceives)}</p>
          ${itemBlock}
        </td>
      </tr>
    </table>
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" align="center">
      <tr>
        <td style="background:${BRAND.ink};border-radius:999px;">
          <a href="${url}" style="display:inline-block;padding:14px 28px;font-size:15px;font-weight:600;color:#ffffff;text-decoration:none;">
            Voir la réservation
          </a>
        </td>
      </tr>
    </table>
    <p style="margin:24px 0 0;font-size:13px;color:${BRAND.inkMuted};line-height:1.6;">
      Une fois la réservation acceptée, vous pourrez écrire à ${senderMid} pour convenir du lieu et de l’heure de remise du colis.
    </p>
  `;

  return {
    subject: `${senderName} a réservé votre trajet · ${route}`,
    html: wrapHtml(content, `Nouvelle réservation sur votre trajet ${route}`),
    text: `${hello}\n\n${senderName} a réservé votre trajet ${route}. Vous recevrez ${eur(input.travelerReceives)}.\n\nVoir la réservation : ${url}\n\n— L’équipe Jibly`,
  };
}

// =============================================================================
// 3. Sender receives confirmation that the traveller accepted
// =============================================================================
// Triggered when status flips to 'confirmed'. Carries NO code at all.
//
// It used to carry the delivery code, sent the same minute the traveller got
// their pickup code. Two codes landed in two inboxes days before either was
// needed, and the first pair of testers to reach a handover had four codes
// between them, no idea which was which, and froze. The codes were never the
// hard part — holding both at once was.
//
// So the sender's code now waits for the moment it means something: the parcel
// is collected, and only then does the delivery code go out (#3b). At any
// point in a booking exactly one code exists in the world, and the person
// holding it is the person about to be handed something. This email's job is
// to set up the first of those two moments and stop there.
//
// SECURITY: never include the pickup code here. The rule across both handovers
// is that WHOEVER RECEIVES holds the code and WHOEVER GIVES enters it, so the
// giver ends up with proof they handed the parcel over. Sending the sender the
// pickup code — which this email used to do — put the same code in both pairs
// of hands, and a sender could then confirm a collection that never happened.
export function bookingConfirmedSenderEmail(input: {
  senderFirstName: string | null;
  travelerFirstName: string | null;
  pickupCity: string;
  destinationCity: string;
  proposedPrice: number;
  bookingId: string;
}) {
  const hello = greet(input.senderFirstName);
  const travelerName = input.travelerFirstName || 'Le voyageur';
  const travelerMid = input.travelerFirstName || 'le voyageur';
  const route = `${input.pickupCity} → ${input.destinationCity}`;
  const url = `${BASE_URL}/me`;

  const content = `
    <p style="margin:0 0 8px;font-size:13px;color:${BRAND.mint};font-weight:600;letter-spacing:0.05em;text-transform:uppercase;">Confirmé</p>
    <h1 style="margin:0 0 16px;font-size:24px;font-weight:700;color:${BRAND.ink};letter-spacing:-0.01em;line-height:1.3;">
      ${travelerName} transporte votre colis
    </h1>
    <p style="margin:0 0 24px;font-size:15px;color:${BRAND.inkSoft};line-height:1.6;">
      ${hello}<br>
      C’est confirmé. Il n’existe pour l’instant qu’un seul code pour cette réservation, et ce n’est pas le vôtre : c’est ${travelerMid} qui le détient. Vous n’avez rien à faire d’ici la remise du colis.
    </p>
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:${BRAND.lavenderLight};border-radius:12px;margin-bottom:24px;">
      <tr>
        <td style="padding:20px;">
          <p style="margin:0 0 6px;font-size:13px;color:${BRAND.inkSoft};letter-spacing:0.08em;text-transform:uppercase;font-weight:600;">Au moment de remettre le colis</p>
          <p style="margin:0;font-size:15px;color:${BRAND.inkSoft};line-height:1.6;">
            ${travelerName} vous donne un code. Saisissez-le dans l’application : c’est votre preuve que le colis a bien quitté vos mains, et c’est le seul code dont vous avez besoin pour l’instant.
          </p>
        </td>
      </tr>
    </table>
    <p style="margin:0 0 24px;font-size:15px;color:${BRAND.inkSoft};line-height:1.6;">
      <strong>Votre code de livraison arrivera plus tard</strong> : nous vous l’envoyons par e-mail dès que le colis est récupéré, pas avant. C’est lui qui sera donné à l’arrivée, au moment de la réception du colis. Un code à la fois, chacun au moment où il sert.
    </p>
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:#FAF7F2;border-radius:12px;margin-bottom:24px;">
      <tr>
        <td style="padding:16px 20px;">
          <p style="margin:0 0 6px;font-size:13px;color:${BRAND.inkSoft};">Trajet</p>
          <p style="margin:0 0 12px;font-size:15px;font-weight:600;color:${BRAND.ink};">${route}</p>
          <p style="margin:0 0 6px;font-size:13px;color:${BRAND.inkSoft};">Montant payé</p>
          <p style="margin:0;font-size:15px;font-weight:600;color:${BRAND.ink};">${eur(input.proposedPrice)}</p>
        </td>
      </tr>
    </table>
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" align="center">
      <tr>
        <td style="background:${BRAND.ink};border-radius:999px;">
          <a href="${url}" style="display:inline-block;padding:14px 28px;font-size:15px;font-weight:600;color:#ffffff;text-decoration:none;">
            Voir mes colis
          </a>
        </td>
      </tr>
    </table>
    <p style="margin:24px 0 0;font-size:13px;color:${BRAND.inkMuted};line-height:1.6;">
      Si quelqu’un d’autre réceptionne le colis à ${input.destinationCity}, prévenez cette personne dès maintenant qu’un code lui parviendra par votre intermédiaire. Vous l’aurez à lui transmettre une fois le colis en route.
    </p>
  `;

  return {
    subject: `Confirmé · ${route} · ${travelerName} transporte votre colis`,
    html: wrapHtml(content, `${travelerName} a accepté : voici comment se passe la remise du colis`),
    text: `${hello}\n\n${travelerName} transporte votre colis ${route}.\n\nIl n’existe pour l’instant qu’un seul code pour cette réservation, et ce n’est pas le vôtre : c’est ${travelerMid} qui le détient. Vous n’avez rien à faire d’ici la remise du colis.\n\nAU MOMENT DE REMETTRE LE COLIS : ${travelerName} vous donne un code. Saisissez-le dans l’application : c’est votre preuve que le colis a bien quitté vos mains, et c’est le seul code dont vous avez besoin pour l’instant.\n\nVotre code de livraison arrivera plus tard. Nous vous l’envoyons par e-mail dès que le colis est récupéré, pas avant. C’est lui qui sera donné à l’arrivée, au moment de la réception du colis.\n\nSi quelqu’un d’autre réceptionne le colis à ${input.destinationCity}, prévenez cette personne dès maintenant qu’un code lui parviendra par votre intermédiaire.\n\nVoir mes colis : ${url}\n\n— L’équipe Jibly`,
  };
}

// =============================================================================
// 3b. Sender's parcel has been collected — NOW they get the delivery code
// =============================================================================
// Sent from /api/booking/confirm-pickup, the moment the sender types in the
// traveller's code. This is the second half of the split described in #3: the
// delivery code is withheld at booking and released here, when the parcel is
// physically on its way and the code is about to matter.
//
// Sending it from the server rather than the browser is deliberate. This email
// is now the ONLY route by which a sender learns their delivery code before
// they open the app, so it cannot depend on a tab surviving a modal on a phone
// at an airport.
//
// SECURITY: same rule as everywhere else — the delivery code goes to the
// RECIPIENT side only. It must never appear in anything the traveller reads,
// because entering it is what releases their own payment.
export function pickupConfirmedSenderEmail(input: {
  senderFirstName: string | null;
  travelerFirstName: string | null;
  pickupCity: string;
  destinationCity: string;
  /** The DELIVERY code — read out at the destination, entered by the traveller. */
  code: string;
}) {
  const hello = greet(input.senderFirstName);
  const travelerName = input.travelerFirstName || 'Le voyageur';
  const route = `${input.pickupCity} → ${input.destinationCity}`;
  const url = `${BASE_URL}/me`;
  // "donné à Yassine" / "donné au voyageur"
  const toTraveler = input.travelerFirstName ? `à ${input.travelerFirstName}` : 'au voyageur';

  const content = `
    <p style="margin:0 0 8px;font-size:13px;color:${BRAND.mint};font-weight:600;letter-spacing:0.05em;text-transform:uppercase;">En route</p>
    <h1 style="margin:0 0 16px;font-size:24px;font-weight:700;color:${BRAND.ink};letter-spacing:-0.01em;line-height:1.3;">
      ${travelerName} a récupéré votre colis
    </h1>
    <p style="margin:0 0 24px;font-size:15px;color:${BRAND.inkSoft};line-height:1.6;">
      ${hello}<br>
      La remise est enregistrée. Voici votre <strong>code de livraison</strong>, le second et dernier. Il sera donné ${toTraveler} à ${input.destinationCity}, une fois le colis effectivement réceptionné. C’est ce qui enregistre la livraison.
    </p>
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:${BRAND.alertBg};border-left:4px solid ${BRAND.alert};border-radius:8px;margin:0 0 24px;">
      <tr>
        <td style="padding:16px 18px;">
          <p style="margin:0 0 6px;font-size:15px;font-weight:700;color:${BRAND.alert};line-height:1.5;">
            Si quelqu’un d’autre réceptionne le colis, envoyez-lui ce code maintenant.
          </p>
          <p style="margin:0;font-size:14px;color:${BRAND.inkSoft};line-height:1.6;">
            Cette personne n’a aucun moyen de l’obtenir elle-même. Sans ce code, ${input.travelerFirstName || 'le voyageur'} et votre destinataire se retrouvent face à face, colis en main, sans pouvoir clôturer la livraison.
          </p>
        </td>
      </tr>
    </table>
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:${BRAND.lavenderLight};border-radius:12px;margin-bottom:24px;">
      <tr>
        <td style="padding:24px 20px;text-align:center;">
          <p style="margin:0 0 8px;font-size:12px;color:${BRAND.inkSoft};letter-spacing:0.08em;text-transform:uppercase;font-weight:600;">Code de livraison</p>
          <p style="margin:0;font-size:36px;font-weight:700;color:${BRAND.ink};letter-spacing:0.2em;font-family:'SF Mono',Monaco,Consolas,monospace;">${input.code}</p>
        </td>
      </tr>
    </table>
    <p style="margin:0 0 24px;font-size:15px;color:${BRAND.inkSoft};line-height:1.6;">
      Ne le donnez qu’une fois le colis en main. Le donner trop tôt enregistre une livraison qui n’a pas eu lieu.
    </p>
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" align="center">
      <tr>
        <td style="background:${BRAND.ink};border-radius:999px;">
          <a href="${url}" style="display:inline-block;padding:14px 28px;font-size:15px;font-weight:600;color:#ffffff;text-decoration:none;">
            Voir mes colis
          </a>
        </td>
      </tr>
    </table>
  `;

  return {
    subject: `Colis récupéré · ${route} · code de livraison ${input.code}`,
    html: wrapHtml(content, `${travelerName} a récupéré votre colis : voici votre code de livraison`),
    text: `${hello}\n\n${travelerName} a récupéré votre colis ${route}. La remise est enregistrée.\n\nVotre code de livraison : ${input.code}\nIl sera donné ${toTraveler} à ${input.destinationCity}, une fois le colis effectivement réceptionné. C’est ce qui enregistre la livraison.\n\nSI QUELQU’UN D’AUTRE RÉCEPTIONNE LE COLIS, ENVOYEZ-LUI CE CODE MAINTENANT. Cette personne n’a aucun moyen de l’obtenir elle-même.\n\nNe le donnez qu’une fois le colis en main. Le donner trop tôt enregistre une livraison qui n’a pas eu lieu.\n\nVoir mes colis : ${url}\n\n— L’équipe Jibly`,
  };
}

// =============================================================================
// 4. Traveller receives confirmation + their handover code
// =============================================================================
// Triggered alongside #3. Carries the PICKUP code — the one the traveller
// reads to the sender when collecting the parcel, which the sender then enters
// as proof of having handed it over.
//
// SECURITY: never include the delivery code here. Mirror of the sender email
// above: the traveller must not hold the code that releases their own payment.
export function bookingConfirmedTravelerEmail(input: {
  travelerFirstName: string | null;
  senderFirstName: string | null;
  pickupCity: string;
  destinationCity: string;
  /**
   * What the TRAVELLER receives — not what the sender paid.
   *
   * This used to take proposedPrice, the total charged, and print it under
   * "You will receive": a 5 EUR trip told its traveller they would get 5.75,
   * the figure the sender was billed. Named for what it means so the two
   * cannot be confused again at the call site.
   */
  travelerReceives: number;
  code: string;
  bookingId: string;
}) {
  const hello = greet(input.travelerFirstName);
  const senderMid = input.senderFirstName || 'l’expéditeur';
  const toSender = input.senderFirstName ? `à ${input.senderFirstName}` : 'à l’expéditeur';
  const route = `${input.pickupCity} → ${input.destinationCity}`;
  const url = `${BASE_URL}/me`;

  const content = `
    <p style="margin:0 0 8px;font-size:13px;color:${BRAND.mint};font-weight:600;letter-spacing:0.05em;text-transform:uppercase;">Confirmé</p>
    <h1 style="margin:0 0 16px;font-size:24px;font-weight:700;color:${BRAND.ink};letter-spacing:-0.01em;line-height:1.3;">
      C’est confirmé
    </h1>
    <p style="margin:0 0 24px;font-size:15px;color:${BRAND.inkSoft};line-height:1.6;">
      ${hello}<br>
      Voici votre <strong>code de remise</strong>. Donnez-le ${toSender} au moment où le colis vous est remis : c’est la preuve que la remise a bien eu lieu. Ne le communiquez qu’une fois le colis entre vos mains.
    </p>
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:#E6F5EE;border-radius:12px;margin-bottom:24px;">
      <tr>
        <td style="padding:24px 20px;text-align:center;">
          <p style="margin:0 0 8px;font-size:12px;color:${BRAND.inkSoft};letter-spacing:0.08em;text-transform:uppercase;font-weight:600;">Code de remise</p>
          <p style="margin:0;font-size:36px;font-weight:700;color:${BRAND.ink};letter-spacing:0.2em;font-family:'SF Mono',Monaco,Consolas,monospace;">${input.code}</p>
        </td>
      </tr>
    </table>
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:#FAF7F2;border-radius:12px;margin-bottom:24px;">
      <tr>
        <td style="padding:16px 20px;">
          <p style="margin:0 0 6px;font-size:13px;color:${BRAND.inkSoft};">Trajet</p>
          <p style="margin:0 0 12px;font-size:15px;font-weight:600;color:${BRAND.ink};">${route}</p>
          <p style="margin:0 0 6px;font-size:13px;color:${BRAND.inkSoft};">Vous recevrez</p>
          <p style="margin:0;font-size:15px;font-weight:600;color:${BRAND.ink};">${eur(input.travelerReceives)}</p>
        </td>
      </tr>
    </table>
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" align="center">
      <tr>
        <td style="background:${BRAND.ink};border-radius:999px;">
          <a href="${url}" style="display:inline-block;padding:14px 28px;font-size:15px;font-weight:600;color:#ffffff;text-decoration:none;">
            Voir mes trajets
          </a>
        </td>
      </tr>
    </table>
    <p style="margin:24px 0 0;font-size:13px;color:${BRAND.inkMuted};line-height:1.6;">
      <strong>À l’arrivée</strong>, la personne qui réceptionne le colis vous donne un second code : le code de livraison. Saisissez-le dans l’application pour débloquer votre paiement. Gardez votre code de remise pour vous jusqu’à la récupération du colis.
    </p>
  `;

  return {
    subject: `Confirmé · ${route} · code de remise ${input.code}`,
    html: wrapHtml(content, `Vous transportez un colis pour ${senderMid} : voici votre code de remise`),
    text: `${hello}\n\nVous transportez un colis pour ${senderMid} sur le trajet ${route}.\n\nVotre code de remise : ${input.code}\nDonnez-le ${toSender} au moment où le colis vous est remis.\n\nÀ l’arrivée, la personne qui réceptionne le colis vous donne un second code : le code de livraison. Saisissez-le dans l’application pour débloquer votre paiement.\n\nVoir mes trajets : ${url}\n\n— L’équipe Jibly`,
  };
}

// =============================================================================
// 5. The date on a request has come and nobody took it
// =============================================================================
// Sent once, by the daily sweep in /api/cron/stale-requests.
//
// Requests are listed to travellers only while desired_delivery_date is still
// ahead, so the day after it passes the request quietly stops being shown. The
// sender is told nothing and goes on believing they are on the market. This
// arrives on the day, while the listing is still visible and moving the date
// still saves it.
//
// Deliberately a question rather than an alert. Plans change, and the honest
// answer is often "no, I sorted it" — an email that assumes they still want it
// and pushes them to act reads as nagging.
export function requestDateReachedEmail(input: {
  senderFirstName: string | null;
  /** Already French and ready for a sentence: « Livres » or "vos documents". */
  itemLabel: string;
  pickupCity: string;
  destinationCity: string;
  budget: number;
}) {
  const hello = greet(input.senderFirstName);
  const route = `${input.pickupCity} → ${input.destinationCity}`;
  const url = `${BASE_URL}/me?tab=sends`;

  const content = `
    <p style="margin:0 0 8px;font-size:13px;color:${BRAND.lavender};font-weight:600;letter-spacing:0.05em;text-transform:uppercase;">Toujours en recherche ?</p>
    <h1 style="margin:0 0 16px;font-size:24px;font-weight:700;color:${BRAND.ink};letter-spacing:-0.01em;line-height:1.3;">
      Personne n’a encore pris votre colis
    </h1>
    <p style="margin:0 0 24px;font-size:15px;color:${BRAND.inkSoft};line-height:1.6;">
      ${hello}<br>
      La date que vous aviez fixée pour ${escapeHtml(input.itemLabel)} est arrivée, et aucun voyageur ne s’en est chargé.
      Après aujourd’hui, votre demande n’apparaît plus aux voyageurs : si l’envoi est toujours d’actualité, choisissez une nouvelle date et votre demande sera de nouveau en ligne.
    </p>
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:#FAF7F2;border-radius:12px;margin-bottom:24px;">
      <tr>
        <td style="padding:16px 20px;">
          <p style="margin:0 0 6px;font-size:13px;color:${BRAND.inkSoft};">Trajet</p>
          <p style="margin:0 0 12px;font-size:15px;font-weight:600;color:${BRAND.ink};">${route}</p>
          <p style="margin:0 0 6px;font-size:13px;color:${BRAND.inkSoft};">Votre budget</p>
          <p style="margin:0;font-size:15px;font-weight:600;color:${BRAND.ink};">${eur(input.budget)}</p>
        </td>
      </tr>
    </table>
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" align="center">
      <tr>
        <td style="background:${BRAND.ink};border-radius:999px;">
          <a href="${url}" style="display:inline-block;padding:14px 28px;font-size:15px;font-weight:600;color:#ffffff;text-decoration:none;">
            Changer la date
          </a>
        </td>
      </tr>
    </table>
    <p style="margin:24px 0 0;font-size:13px;color:${BRAND.inkMuted};line-height:1.6;">
      Vous avez trouvé une autre solution ? Supprimez la demande depuis le même écran et nous ne l’afficherons plus. C’est le seul rappel que nous vous enverrons à ce sujet.
    </p>
  `;

  return {
    subject: `Toujours besoin d’envoyer ${input.itemLabel} ? · ${route}`,
    html: wrapHtml(content, `Votre demande ${route} a atteint sa date sans voyageur`),
    text: `${hello}\n\nLa date que vous aviez fixée pour ${input.itemLabel} (${route}) est arrivée, et aucun voyageur ne s’en est chargé. Après aujourd’hui, votre demande n’apparaît plus aux voyageurs.\n\nSi l’envoi est toujours d’actualité, choisissez une nouvelle date : ${url}\nVous avez trouvé une autre solution ? Supprimez la demande depuis le même écran.\n\nC’est le seul rappel que nous vous enverrons à ce sujet.\n\n— L’équipe Jibly`,
  };
}

// Tiny HTML escape — used only on user-controlled fields (item descriptions).
// Keeps the templates safe from senders injecting markup. Not exhaustive,
// but enough for Gmail/Outlook rendering.
function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// =============================================================================
// 6. Sender reminder, the day before the trip: has the code been passed on?
// =============================================================================
// The person collecting at the other end is the one this booking can quietly
// fail on. They need a code, they have no way of getting it themselves, and
// the failure shows up at the worst possible moment: traveller and recipient
// standing together, parcel in hand, nobody able to close the delivery.
//
// This fires on the eve of departure, while there is still an evening to sort
// it out. It deliberately carries NO code: this cron only selects bookings
// where pickup has not been confirmed, and under the split introduced in #3/#3b
// the sender does not have their delivery code yet at this point. Printing one
// here would put a code back in an inbox days before the handover — the exact
// thing the split removed. So this warns, and #3b delivers.
export function codeHandoverReminderEmail(input: {
  senderFirstName: string | null;
  travelerFirstName: string | null;
  pickupCity: string;
  destinationCity: string;
  departureDate: string;
}) {
  const hello = greet(input.senderFirstName);
  const travelerName = input.travelerFirstName || 'Votre voyageur';
  // "à Yassine" / "à votre voyageur"
  const toTraveler = `à ${input.travelerFirstName || 'votre voyageur'}`;
  const route = `${input.pickupCity} → ${input.destinationCity}`;
  const url = `${BASE_URL}/me`;

  const content = `
    <p style="margin:0 0 8px;font-size:13px;color:${BRAND.lavender};font-weight:600;letter-spacing:0.05em;text-transform:uppercase;">Demain</p>
    <h1 style="margin:0 0 16px;font-size:24px;font-weight:700;color:${BRAND.ink};letter-spacing:-0.01em;line-height:1.3;">
      ${travelerName} part demain
    </h1>
    <p style="margin:0 0 24px;font-size:15px;color:${BRAND.inkSoft};line-height:1.6;">
      ${hello}<br>
      Votre colis voyage demain sur le trajet ${route}. Une chose à vérifier ce soir.
    </p>

    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:${BRAND.alertBg};border-left:4px solid ${BRAND.alert};border-radius:8px;margin:0 0 24px;">
      <tr>
        <td style="padding:16px 18px;">
          <p style="margin:0 0 6px;font-size:15px;font-weight:700;color:${BRAND.alert};line-height:1.5;">
            Si quelqu’un d’autre réceptionne le colis à ${input.destinationCity}, assurez-vous de pouvoir joindre cette personne rapidement.
          </p>
          <p style="margin:0;font-size:14px;color:${BRAND.inkSoft};line-height:1.6;">
            Un code de livraison doit lui parvenir par votre intermédiaire, et elle n’a aucun moyen de l’obtenir elle-même. Elle le donne ${toTraveler} une fois le colis entre ses mains : c’est ce qui enregistre la livraison.
          </p>
        </td>
      </tr>
    </table>

    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:${BRAND.lavenderLight};border-radius:12px;margin-bottom:24px;">
      <tr>
        <td style="padding:20px;">
          <p style="margin:0 0 6px;font-size:13px;color:${BRAND.inkSoft};letter-spacing:0.08em;text-transform:uppercase;font-weight:600;">Quand vous recevrez le code</p>
          <p style="margin:0;font-size:15px;color:${BRAND.inkSoft};line-height:1.6;">
            Nous vous l’envoyons par e-mail dès que vous avez remis le colis ${toTraveler} et confirmé la remise dans l’application, pas avant : vous n’avez ainsi jamais qu’un seul code à suivre. Transférez-le à la personne qui réceptionne le colis dès que vous le recevez.
          </p>
        </td>
      </tr>
    </table>

    <p style="margin:0 0 24px;font-size:15px;color:${BRAND.inkSoft};line-height:1.6;">
      Elle ne doit le donner qu’une fois le colis réellement en main : le code confirme la réception, et le donner trop tôt enregistre une livraison qui n’a pas eu lieu. Si vous réceptionnez le colis vous-même, vous n’avez rien à faire.
    </p>

    <a href="${url}" style="display:inline-block;background:${BRAND.ink};color:#ffffff;text-decoration:none;padding:13px 26px;border-radius:999px;font-size:15px;font-weight:600;">Voir mes colis</a>
  `;

  return {
    subject: `Demain · ${route} · qui réceptionne votre colis ?`,
    html: wrapHtml(content, `${travelerName} part demain : vérifiez qui réceptionne le colis`),
    text: `${hello}\n\nVotre colis voyage demain sur le trajet ${route}, avec ${input.travelerFirstName || 'votre voyageur'}.\n\nSI QUELQU’UN D’AUTRE RÉCEPTIONNE LE COLIS À ${input.destinationCity.toUpperCase()}, ASSUREZ-VOUS DE POUVOIR JOINDRE CETTE PERSONNE RAPIDEMENT. Un code de livraison doit lui parvenir par votre intermédiaire, et elle n’a aucun moyen de l’obtenir elle-même. Elle le donne ${toTraveler} une fois le colis entre ses mains : c’est ce qui enregistre la livraison.\n\nNous vous envoyons ce code par e-mail dès que vous avez remis le colis ${toTraveler} et confirmé la remise dans l’application, pas avant : vous n’avez ainsi jamais qu’un seul code à suivre. Transférez-le à la personne qui réceptionne le colis dès que vous le recevez.\n\nElle ne doit le donner qu’une fois le colis réellement en main : le donner trop tôt enregistre une livraison qui n’a pas eu lieu. Si vous réceptionnez le colis vous-même, vous n’avez rien à faire.\n\nVoir mes colis : ${url}\n\n— L’équipe Jibly`,
  };
}

// =============================================================================
// 7. Sender's traveller cancelled the trip
// =============================================================================
// The one email in this file that carries bad news, and the reason the whole
// cancellation flow was rebuilt: a traveller could withdraw a trip and the
// sender would find out only by noticing their parcel had moved into a bucket
// labelled "declined" — a word that describes a traveller saying no, not a
// traveller who said yes and then stopped flying.
//
// Three things have to land, in this order, because it is the order the sender
// cares about: nobody is carrying your parcel, here is your money, here is who
// else is going that way.
//
// The alternatives are deliberately NOT filtered to the sender's original
// date. A parcel that needed to be in Casablanca on the 3rd is usually still
// wanted on the 10th, and the version of this email that showed nothing
// because no trip matched the old date would be the one that reads as a shrug.
export function tripCancelledSenderEmail(input: {
  senderFirstName: string | null;
  travelerFirstName: string | null;
  /** Already French and ready for a sentence: « Livres » or "vos documents". */
  itemLabel: string;
  pickupCity: string;
  destinationCity: string;
  departureDate: string;
  /** Why the traveller says they cancelled, already turned into a sentence. */
  reasonLine: string;
  /** The traveller's own words, if they added any. */
  note?: string | null;
  /** What happened to the money. null when there was never a payment. */
  refund: { kind: 'released' | 'refunded' | 'pending'; amountCents: number } | null;
  alternatives: Array<{
    travelerFirstName: string | null;
    departureCity: string;
    arrivalCity: string;
    departureDate: string;
    compensationMin: number;
  }>;
  /** Prefilled search for the same route, so "find another" is one click. */
  searchUrl: string;
}) {
  const hello = greet(input.senderFirstName);
  const travelerName = input.travelerFirstName || 'Votre voyageur';
  const route = `${input.pickupCity} → ${input.destinationCity}`;

  // Money first among the reassurances, because it is the question a sender
  // asks before they have finished reading the first line.
  const moneyBlock = !input.refund
    ? ''
    : input.refund.kind === 'released'
    ? `<p style="margin:0 0 8px;font-size:15px;color:${BRAND.inkSoft};line-height:1.6;">
         <strong style="color:${BRAND.ink};">Aucun montant ne vous a été prélevé.</strong>
         L’autorisation sur votre carte a été levée : si votre banque l’affiche encore, elle disparaîtra d’ici quelques jours.
       </p>`
    : input.refund.kind === 'refunded'
    ? `<p style="margin:0 0 8px;font-size:15px;color:${BRAND.inkSoft};line-height:1.6;">
         <strong style="color:${BRAND.ink};">Nous vous remboursons ${eur(input.refund.amountCents / 100)}.</strong>
         Le montant revient sur la carte utilisée pour le paiement, généralement sous 5 à 10 jours selon votre banque.
       </p>`
    : `<p style="margin:0 0 8px;font-size:15px;color:${BRAND.inkSoft};line-height:1.6;">
         <strong style="color:${BRAND.ink};">Vos ${eur(input.refund.amountCents / 100)} sont en cours de remboursement.</strong>
         Le remboursement automatique n’a pas abouti, un membre de l’équipe le finalise donc manuellement. Vous recevrez une confirmation une fois l’opération terminée.
       </p>`;

  const alternativesBlock = input.alternatives.length
    ? `
    <p style="margin:28px 0 12px;font-size:15px;font-weight:600;color:${BRAND.ink};">
      ${input.alternatives.length === 1 ? 'Un autre voyageur sur votre trajet' : 'D’autres voyageurs sur votre trajet'}
    </p>
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin-bottom:20px;">
      ${input.alternatives
        .map(
          (alt) => `
      <tr>
        <td style="padding:0 0 8px;">
          <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:${BRAND.lavenderLight};border-radius:12px;">
            <tr>
              <td style="padding:14px 18px;">
                <p style="margin:0 0 4px;font-size:15px;font-weight:600;color:${BRAND.ink};">
                  ${escapeHtml(alt.departureCity)} → ${escapeHtml(alt.arrivalCity)}
                </p>
                <p style="margin:0;font-size:13px;color:${BRAND.inkSoft};">
                  ${escapeHtml(alt.travelerFirstName || 'Un voyageur')} · ${escapeHtml(alt.departureDate)} · à partir de ${eur(alt.compensationMin)}
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>`
        )
        .join('')}
    </table>`
    : `
    <p style="margin:28px 0 20px;font-size:15px;color:${BRAND.inkSoft};line-height:1.6;">
      Aucun autre voyageur n’est inscrit sur le trajet ${escapeHtml(route)} pour le moment. De nouveaux trajets sont publiés chaque jour, et vous pouvez aussi publier votre colis sous forme de demande pour que le prochain voyageur qui part dans cette direction vous trouve.
    </p>`;

  const content = `
    <p style="margin:0 0 8px;font-size:13px;color:${BRAND.lavender};font-weight:600;letter-spacing:0.05em;text-transform:uppercase;">Trajet annulé</p>
    <h1 style="margin:0 0 16px;font-size:24px;font-weight:700;color:${BRAND.ink};letter-spacing:-0.01em;line-height:1.3;">
      ${escapeHtml(travelerName)} ne peut plus transporter ${escapeHtml(input.itemLabel)}
    </h1>
    <p style="margin:0 0 20px;font-size:15px;color:${BRAND.inkSoft};line-height:1.6;">
      ${escapeHtml(hello)}<br>
      Le trajet ${escapeHtml(route)} du ${escapeHtml(input.departureDate)} a été annulé : votre colis ne sera donc pas transporté. ${escapeHtml(input.reasonLine)}
    </p>
    ${
      input.note
        ? `<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:#FAF7F2;border-radius:12px;margin-bottom:20px;">
      <tr><td style="padding:16px 20px;">
        <p style="margin:0 0 6px;font-size:13px;color:${BRAND.inkSoft};">Son message</p>
        <p style="margin:0;font-size:15px;color:${BRAND.ink};line-height:1.6;">«&nbsp;${escapeHtml(input.note)}&nbsp;»</p>
      </td></tr>
    </table>`
        : ''
    }
    ${moneyBlock}
    ${alternativesBlock}
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" align="center">
      <tr>
        <td style="background:${BRAND.ink};border-radius:999px;">
          <a href="${input.searchUrl}" style="display:inline-block;padding:14px 28px;font-size:15px;font-weight:600;color:#ffffff;text-decoration:none;">
            Trouver un autre voyageur
          </a>
        </td>
      </tr>
    </table>
    <p style="margin:24px 0 0;font-size:13px;color:${BRAND.inkMuted};line-height:1.6;">
      Vous n’avez rien à faire concernant la réservation annulée : elle est déjà clôturée de votre côté. Rien ne vous a été facturé pour celle-ci en dehors de ce qui est indiqué ci-dessus.
    </p>
  `;

  const altText = input.alternatives.length
    ? '\n\nD’autres voyageurs sur votre trajet :\n' +
      input.alternatives
        .map(
          (a) =>
            `- ${a.departureCity} → ${a.arrivalCity}, ${a.departureDate}, ${
              a.travelerFirstName || 'un voyageur'
            }, à partir de ${eur(a.compensationMin)}`
        )
        .join('\n')
    : `\n\nAucun autre voyageur n’est inscrit sur le trajet ${route} pour le moment. De nouveaux trajets sont publiés chaque jour.`;

  const moneyText = !input.refund
    ? ''
    : input.refund.kind === 'released'
    ? '\n\nAucun montant ne vous a été prélevé. L’autorisation sur votre carte a été levée.'
    : input.refund.kind === 'refunded'
    ? `\n\nNous vous remboursons ${eur(input.refund.amountCents / 100)} sur la carte utilisée pour le paiement, généralement sous 5 à 10 jours.`
    : `\n\nVos ${eur(input.refund.amountCents / 100)} sont en cours de remboursement manuel ; vous recevrez une confirmation une fois l’opération terminée.`;

  return {
    subject: `${travelerName} a annulé · votre colis ${route} ne sera pas transporté`,
    html: wrapHtml(
      content,
      `Le trajet qui devait transporter ${input.itemLabel} a été annulé : voici la suite`
    ),
    text: `${hello}\n\nLe trajet ${route} du ${input.departureDate} a été annulé : votre colis ne sera donc pas transporté. ${input.reasonLine}${
      input.note ? `\n\nSon message : « ${input.note} »` : ''
    }${moneyText}${altText}\n\nTrouver un autre voyageur : ${input.searchUrl}\n\n— L’équipe Jibly`,
  };
}

// =============================================================================
// 8. Sender: the traveller says it is delivered, and the clock has started
// =============================================================================
// This email is the reason the auto-release is defensible. Money moving on a
// timer that nobody was told about is indistinguishable from money going
// missing — so the timer is announced the moment it starts, with the date it
// runs out and both ways to stop it.
//
// It leads with the proof rather than the deadline. The sender's first
// question is whether their parcel actually arrived, and a mail that opens
// with a countdown reads as a threat from the company holding their money.
//
// The closing line no longer explains the wait by a code going unread: to a
// sender, the code records the delivery, it is never described as what pays
// the traveller (memory: sender copy, no payment lever).
export function deliveryProvedEmail(input: {
  senderFirstName: string | null;
  travelerFirstName: string | null;
  /** Already French and ready for a sentence: « Livres » or "votre colis". */
  itemLabel: string;
  pickupCity: string;
  destinationCity: string;
  /** Who the traveller says took the parcel, if they named anyone. */
  receiverName?: string | null;
  /** Already formatted for the reader — see emailDate in the cron. */
  deadline: string;
  days: number;
  bookingId: string;
}) {
  const hello = greet(input.senderFirstName);
  const travelerName = input.travelerFirstName || 'Votre voyageur';
  const travelerMid = input.travelerFirstName || 'votre voyageur';
  const route = `${input.pickupCity} → ${input.destinationCity}`;
  const url = `${BASE_URL}/me?booking=${input.bookingId}`;

  const content = `
    <p style="margin:0 0 8px;font-size:13px;color:${BRAND.lavender};font-weight:600;letter-spacing:0.05em;text-transform:uppercase;">Livré</p>
    <h1 style="margin:0 0 16px;font-size:24px;font-weight:700;color:${BRAND.ink};letter-spacing:-0.01em;line-height:1.3;">
      ${escapeHtml(travelerName)} a livré ${escapeHtml(input.itemLabel)}
    </h1>
    <p style="margin:0 0 24px;font-size:15px;color:${BRAND.inkSoft};line-height:1.6;">
      ${escapeHtml(hello)}<br>
      ${escapeHtml(travelerName)} a envoyé une photo de votre colis ${escapeHtml(route)}${
        input.receiverName
          ? ` et indique l’avoir remis à ${escapeHtml(input.receiverName)}`
          : ''
      }.
    </p>

    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:${BRAND.lavenderLight};border-radius:12px;margin-bottom:24px;">
      <tr>
        <td style="padding:18px 20px;">
          <p style="margin:0 0 8px;font-size:15px;font-weight:600;color:${BRAND.ink};">Si le colis est bien arrivé, vous n’avez rien à faire</p>
          <p style="margin:0;font-size:14px;color:${BRAND.inkSoft};line-height:1.6;">
            La livraison se clôturera automatiquement le <strong style="color:${BRAND.ink};">${escapeHtml(input.deadline)}</strong>, et ${escapeHtml(travelerMid)} recevra alors son paiement. Vous pouvez aussi la clôturer dès maintenant depuis votre espace.
          </p>
        </td>
      </tr>
    </table>

    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:${BRAND.alertBg};border-left:4px solid ${BRAND.alert};border-radius:8px;margin:0 0 24px;">
      <tr>
        <td style="padding:16px 18px;">
          <p style="margin:0 0 6px;font-size:15px;font-weight:700;color:${BRAND.alert};line-height:1.5;">
            En cas de problème, prévenez-nous avant le ${escapeHtml(input.deadline)}
          </p>
          <p style="margin:0;font-size:14px;color:${BRAND.inkSoft};line-height:1.6;">
            Colis jamais arrivé, abîmé, différent de ce que vous avez envoyé : signalez un problème depuis le colis dans votre espace, et rien ne sera versé pendant que nous examinons la situation.
          </p>
        </td>
      </tr>
    </table>

    <a href="${url}" style="display:inline-block;background:${BRAND.ink};color:#ffffff;text-decoration:none;padding:13px 26px;border-radius:999px;font-size:15px;font-weight:600;">Voir la photo</a>

    <p style="margin:24px 0 0;font-size:13px;color:${BRAND.inkMuted};line-height:1.6;">
      Ce délai de ${input.days} jours vous laisse le temps de vérifier que tout s’est bien passé. Il est là pour vous.
    </p>
  `;

  return {
    subject: `${travelerName} a livré ${input.itemLabel} · ${route}`,
    html: wrapHtml(content, `Une photo de votre colis, et ce qui se passe d’ici le ${input.deadline}`),
    text: `${hello}\n\n${travelerName} a envoyé une photo de votre colis ${route}${
      input.receiverName ? ` et indique l’avoir remis à ${input.receiverName}` : ''
    }.\n\nSI LE COLIS EST BIEN ARRIVÉ : vous n’avez rien à faire. La livraison se clôturera automatiquement le ${input.deadline}, et ${travelerMid} recevra alors son paiement. Vous pouvez aussi la clôturer dès maintenant depuis votre espace.\n\nEN CAS DE PROBLÈME : signalez-le avant le ${input.deadline}, depuis le colis dans votre espace. Rien ne sera versé pendant que nous examinons la situation.\n\nVoir la photo : ${url}\n\nCe délai de ${input.days} jours vous laisse le temps de vérifier que tout s’est bien passé.\n\n— L’équipe Jibly`,
  };
}

// =============================================================================
// 9. Sender: the clock ran out and the delivery closed
// =============================================================================
// Sent at the moment of release, never before, and to the sender only — the
// traveller finds out because they get paid.
//
// It exists so that the money never moves silently. A sender who reads this
// and disagrees still has somewhere to go, and saying so plainly is cheaper
// than the chargeback that follows from "they paid him without asking me".
export function deliveryAutoClosedEmail(input: {
  senderFirstName: string | null;
  travelerFirstName: string | null;
  /** Already French: « Livres » or "votre colis". */
  itemLabel: string;
  pickupCity: string;
  destinationCity: string;
  days: number;
  bookingId: string;
}) {
  const hello = greet(input.senderFirstName);
  const travelerName = input.travelerFirstName || 'Votre voyageur';
  const travelerMid = input.travelerFirstName || 'votre voyageur';
  const route = `${input.pickupCity} → ${input.destinationCity}`;
  const url = `${BASE_URL}/me?booking=${input.bookingId}`;

  const content = `
    <p style="margin:0 0 8px;font-size:13px;color:${BRAND.lavender};font-weight:600;letter-spacing:0.05em;text-transform:uppercase;">Clôturé</p>
    <h1 style="margin:0 0 16px;font-size:24px;font-weight:700;color:${BRAND.ink};letter-spacing:-0.01em;line-height:1.3;">
      Votre livraison est clôturée
    </h1>
    <p style="margin:0 0 24px;font-size:15px;color:${BRAND.inkSoft};line-height:1.6;">
      ${escapeHtml(hello)}<br>
      ${escapeHtml(travelerName)} a prouvé la livraison de ${escapeHtml(input.itemLabel)} (${escapeHtml(route)}) il y a ${input.days} jours et aucun problème n’a été signalé : la livraison s’est donc clôturée automatiquement, et ${escapeHtml(travelerMid)} a reçu son paiement.
    </p>

    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:#FAF7F2;border-radius:12px;margin-bottom:24px;">
      <tr>
        <td style="padding:16px 20px;">
          <p style="margin:0 0 6px;font-size:14px;font-weight:600;color:${BRAND.ink};">Quelque chose ne va pas ?</p>
          <p style="margin:0;font-size:14px;color:${BRAND.inkSoft};line-height:1.6;">
            Prévenez-nous quand même. Signalez un problème depuis le colis dans votre espace : le paiement est parti, mais un colis jamais arrivé reste quelque chose que nous devons savoir et traiter.
          </p>
        </td>
      </tr>
    </table>

    <a href="${url}" style="display:inline-block;background:${BRAND.ink};color:#ffffff;text-decoration:none;padding:13px 26px;border-radius:999px;font-size:15px;font-weight:600;">Voir ce colis</a>

    <p style="margin:24px 0 0;font-size:13px;color:${BRAND.inkMuted};line-height:1.6;">
      Vous pouvez maintenant laisser un avis à ${escapeHtml(travelerMid)} : c’est ce que lira le prochain expéditeur sur ce trajet.
    </p>
  `;

  return {
    subject: `Livraison clôturée · ${input.itemLabel} · ${route}`,
    html: wrapHtml(content, `Aucun problème signalé : la livraison s’est clôturée automatiquement`),
    text: `${hello}\n\n${travelerName} a prouvé la livraison de ${input.itemLabel} (${route}) il y a ${input.days} jours et aucun problème n’a été signalé : la livraison s’est donc clôturée automatiquement, et ${travelerMid} a reçu son paiement.\n\nQUELQUE CHOSE NE VA PAS ? Prévenez-nous quand même, en signalant un problème depuis le colis dans votre espace. Le paiement est parti, mais un colis jamais arrivé reste quelque chose que nous devons savoir.\n\nVoir ce colis : ${url}\n\nVous pouvez maintenant laisser un avis à ${travelerMid}.\n\n— L’équipe Jibly`,
  };
}

// =============================================================================
// 10. Traveller reminder, the evening before: what you are carrying tomorrow
// =============================================================================
// The sender gets an eve-of-departure reminder. The traveller got nothing —
// they agreed to carry something days or weeks ago, in an email read once, and
// the next event is a person waiting for them somewhere with a parcel.
//
// A forgotten parcel is not a small miss. The sender's money is already
// captured, the flight goes without the parcel, and the first person to learn
// of it is the recipient who is handed nothing.
//
// So it lists the parcels by name rather than counting them, and it carries
// each handover code. The traveller SHOWS that code and the sender types it
// in — the person receiving the parcel holds the code, so they cannot later
// deny having received it. Same rule at the other end, reversed.
export function tripDepartureReminderEmail(input: {
  travelerFirstName: string | null;
  departureCity: string;
  arrivalCity: string;
  /** Already formatted for the reader. */
  departureDate: string;
  flightNumber?: string | null;
  parcels: Array<{
    itemLabel: string;
    senderName: string | null;
    pickupCity: string;
    pickupCode: string | null;
  }>;
}) {
  const hello = greet(input.travelerFirstName);
  const route = `${input.departureCity} → ${input.arrivalCity}`;
  const url = `${BASE_URL}/me`;
  const n = input.parcels.length;

  const rows = input.parcels
    .map(
      (p) => `
      <tr>
        <td style="padding:0 0 10px;">
          <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:${BRAND.lavenderLight};border-radius:12px;">
            <tr>
              <td style="padding:16px 18px;">
                <p style="margin:0 0 4px;font-size:16px;font-weight:700;color:${BRAND.ink};">
                  ${escapeHtml(p.itemLabel)}
                </p>
                <p style="margin:0;font-size:14px;color:${BRAND.inkSoft};line-height:1.6;">
                  De la part de ${escapeHtml(p.senderName || 'l’expéditeur')} · à récupérer à ${escapeHtml(p.pickupCity)}
                </p>
                ${
                  p.pickupCode
                    ? `<p style="margin:10px 0 0;font-size:13px;color:${BRAND.inkSoft};">
                         Votre code de remise :
                         <strong style="font-size:16px;color:${BRAND.ink};letter-spacing:0.15em;font-family:'SF Mono',Monaco,Consolas,monospace;">${escapeHtml(p.pickupCode)}</strong>
                       </p>`
                    : ''
                }
              </td>
            </tr>
          </table>
        </td>
      </tr>`
    )
    .join('');

  const content = `
    <p style="margin:0 0 8px;font-size:13px;color:${BRAND.lavender};font-weight:600;letter-spacing:0.05em;text-transform:uppercase;">Demain</p>
    <h1 style="margin:0 0 16px;font-size:24px;font-weight:700;color:${BRAND.ink};letter-spacing:-0.01em;line-height:1.3;">
      ${n === 1 ? 'N’oubliez pas le colis' : `N’oubliez pas les ${n} colis`}
    </h1>
    <p style="margin:0 0 24px;font-size:15px;color:${BRAND.inkSoft};line-height:1.6;">
      ${escapeHtml(hello)}<br>
      Vous partez le ${escapeHtml(input.departureDate)} sur le trajet ${escapeHtml(route)}${
        input.flightNumber ? ` (vol ${escapeHtml(input.flightNumber)})` : ''
      }. ${n === 1 ? 'Quelqu’un compte sur vous pour récupérer ce colis avant votre départ.' : 'Plusieurs personnes comptent sur vous pour récupérer ces colis avant votre départ.'}
    </p>

    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin-bottom:16px;">
      ${rows}
    </table>

    <p style="margin:0 0 24px;font-size:14px;color:${BRAND.inkSoft};line-height:1.6;">
      Lors de la remise, montrez votre code et l’expéditeur le saisit : c’est ce qui enregistre la récupération du colis. Votre paiement vous est versé une fois la livraison confirmée à l’arrivée.
    </p>

    <a href="${url}" style="display:inline-block;background:${BRAND.ink};color:#ffffff;text-decoration:none;padding:13px 26px;border-radius:999px;font-size:15px;font-weight:600;">Voir mon trajet</a>

    <p style="margin:24px 0 0;font-size:13px;color:${BRAND.inkMuted};line-height:1.6;">
      Vos plans ont changé et vous ne pouvez plus ${n === 1 ? 'le' : 'les'} transporter ? Annulez le trajet depuis votre espace dès ce soir plutôt que demain : ${n === 1 ? 'l’expéditeur est remboursé' : 'les expéditeurs sont remboursés'} immédiatement et nous ${n === 1 ? 'l’aidons' : 'les aidons'} à trouver quelqu’un d’autre.
    </p>
  `;

  const parcelText = input.parcels
    .map(
      (p) =>
        `- ${p.itemLabel} — de la part de ${p.senderName || 'l’expéditeur'}, à récupérer à ${p.pickupCity}${
          p.pickupCode ? ` — votre code de remise : ${p.pickupCode}` : ''
        }`
    )
    .join('\n');

  return {
    subject:
      n === 1
        ? `Demain · ${route} · n’oubliez pas le colis`
        : `Demain · ${route} · n’oubliez pas les ${n} colis`,
    html: wrapHtml(
      content,
      `Vous partez demain sur le trajet ${route} : ${n === 1 ? 'un colis' : `${n} colis`} à récupérer`
    ),
    text: `${hello}\n\nVous partez le ${input.departureDate} sur le trajet ${route}${
      input.flightNumber ? ` (vol ${input.flightNumber})` : ''
    }.\n\nCOLIS À RÉCUPÉRER :\n${parcelText}\n\nLors de la remise, montrez votre code et l’expéditeur le saisit : c’est ce qui enregistre la récupération du colis. Votre paiement vous est versé une fois la livraison confirmée à l’arrivée.\n\nVoir mon trajet : ${url}\n\nVos plans ont changé ? Annulez le trajet depuis votre espace dès ce soir plutôt que demain : ${n === 1 ? 'l’expéditeur est remboursé' : 'les expéditeurs sont remboursés'} immédiatement et nous ${n === 1 ? 'l’aidons' : 'les aidons'} à trouver quelqu’un d’autre.\n\n— L’équipe Jibly`,
  };
}

// =============================================================================
// 11. Traveller: the sender declined their offer
// =============================================================================
// This got nothing at all. A traveller offered to carry a parcel, the sender
// said no, and the traveller found out — if ever — by noticing the offer had
// gone grey in a list they had no reason to reopen.
//
// It matters more than it looks. The traveller has usually shaped a plan
// around it: a suitcase corner kept free, a meeting point half-agreed. And
// declining is now the mandatory step before a sender can withdraw a parcel,
// so this is the message that makes that rule honest — the block only protects
// the traveller if somebody actually tells them.
//
// It does not apologise and it does not explain more than it knows. A sender
// is allowed to change their mind, and dressing that up as a misfortune reads
// as evasive. What the traveller can use is the next route, so that is what it
// ends on.
export function proposalDeclinedTravelerEmail(input: {
  travelerFirstName: string | null;
  senderFirstName: string | null;
  /** Already French and ready for a sentence: « Livres » or "ce colis". */
  itemLabel: string;
  pickupCity: string;
  destinationCity: string;
  /** Other parcels wanted on the same corridor, if any. */
  alternatives: Array<{
    itemLabel: string;
    pickupCity: string;
    destinationCity: string;
    budget: number;
    byDate: string;
  }>;
}) {
  const hello = greet(input.travelerFirstName);
  const senderName = input.senderFirstName || 'L’expéditeur';
  const senderMid = input.senderFirstName || 'l’expéditeur';
  const route = `${input.pickupCity} → ${input.destinationCity}`;
  const url = `${BASE_URL}/voyager`;

  const alternativesBlock = input.alternatives.length
    ? `
    <p style="margin:28px 0 12px;font-size:15px;font-weight:600;color:${BRAND.ink};">
      ${input.alternatives.length === 1 ? 'Un autre colis sur votre trajet' : 'D’autres colis sur votre trajet'}
    </p>
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin-bottom:20px;">
      ${input.alternatives
        .map(
          (a) => `
      <tr>
        <td style="padding:0 0 8px;">
          <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:${BRAND.lavenderLight};border-radius:12px;">
            <tr>
              <td style="padding:14px 18px;">
                <p style="margin:0 0 4px;font-size:15px;font-weight:600;color:${BRAND.ink};">
                  ${escapeHtml(a.itemLabel)}
                </p>
                <p style="margin:0;font-size:13px;color:${BRAND.inkSoft};">
                  ${escapeHtml(a.pickupCity)} → ${escapeHtml(a.destinationCity)} · avant le ${escapeHtml(a.byDate)} · ${eur(a.budget)}
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>`
        )
        .join('')}
    </table>`
    : `
    <p style="margin:28px 0 20px;font-size:15px;color:${BRAND.inkSoft};line-height:1.6;">
      Aucun autre colis n’attend sur le trajet ${escapeHtml(route)} pour le moment. De nouveaux colis sont publiés chaque jour, et votre trajet reste en ligne : un expéditeur peut toujours le réserver directement.
    </p>`;

  const content = `
    <p style="margin:0 0 8px;font-size:13px;color:${BRAND.lavender};font-weight:600;letter-spacing:0.05em;text-transform:uppercase;">Offre refusée</p>
    <h1 style="margin:0 0 16px;font-size:24px;font-weight:700;color:${BRAND.ink};letter-spacing:-0.01em;line-height:1.3;">
      ${escapeHtml(senderName)} n’enverra pas ${escapeHtml(input.itemLabel)} avec vous
    </h1>
    <p style="margin:0 0 8px;font-size:15px;color:${BRAND.inkSoft};line-height:1.6;">
      ${escapeHtml(hello)}<br>
      Votre offre sur le trajet ${escapeHtml(route)} a été refusée. Rien n’a été facturé et vous ne devez rien : vous êtes libre de tout engagement.
    </p>
    <p style="margin:0 0 4px;font-size:14px;color:${BRAND.inkMuted};line-height:1.6;">
      Les expéditeurs changent parfois leurs plans, trouvent une autre solution ou choisissent simplement quelqu’un d’autre. Cela ne remet pas en cause votre profil.
    </p>
    ${alternativesBlock}
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" align="center">
      <tr>
        <td style="background:${BRAND.ink};border-radius:999px;">
          <a href="${url}" style="display:inline-block;padding:14px 28px;font-size:15px;font-weight:600;color:#ffffff;text-decoration:none;">
            Voir les colis à transporter
          </a>
        </td>
      </tr>
    </table>
  `;

  const altText = input.alternatives.length
    ? '\n\nD’autres colis sur votre trajet :\n' +
      input.alternatives
        .map(
          (a) =>
            `- ${a.itemLabel} — ${a.pickupCity} → ${a.destinationCity}, avant le ${a.byDate}, ${eur(a.budget)}`
        )
        .join('\n')
    : `\n\nAucun autre colis n’attend sur le trajet ${route} pour le moment. De nouveaux colis sont publiés chaque jour, et votre trajet reste en ligne.`;

  return {
    subject: `Offre refusée · ${route}`,
    html: wrapHtml(content, `Votre offre sur le trajet ${route} n’a pas été retenue`),
    text: `${hello}\n\nVotre offre pour transporter ${input.itemLabel} (${route}) a été refusée par ${senderMid}. Rien n’a été facturé et vous ne devez rien.\n\nLes expéditeurs changent parfois leurs plans, trouvent une autre solution ou choisissent simplement quelqu’un d’autre. Cela ne remet pas en cause votre profil.${altText}\n\nVoir les colis à transporter : ${url}\n\n— L’équipe Jibly`,
  };
}

// =============================================================================
// Sender: a traveller has posted a trip on (or near) their route
// =============================================================================
// Queued when a trip is published, sent only after the operator approves it on
// /admin (lib/match-alerts.ts). French only, like every other email (it used to
// carry an English copy underneath).
//
// The button books the trip; it does not open a chat. Contact comes with the
// booking (memory: no chat before the money is captured).
export function tripMatchSenderEmail(input: {
  senderFirstName: string | null;
  travelerFirstName: string | null;
  tier: 'exact' | 'nearby';
  /** Days the trip leaves after the sender's date; 0 = on time. */
  daysLate: number;
  /** YYYY-MM-DD — the sender's "before" date. */
  requestDate: string;
  tripDepartureCity: string;
  tripArrivalCity: string;
  /** YYYY-MM-DD */
  tripDate: string;
  requestPickupCity: string;
  itemLabel: string | null;
  bookUrlPath: string;
}) {
  const url = `${BASE_URL}${input.bookUrlPath}`;
  const d = new Date(`${input.tripDate}T12:00:00Z`);
  const dateFr = premier(new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'long' }).format(d));
  const route = `${input.tripDepartureCity} → ${input.tripArrivalCity}`;
  const nearby = input.tier === 'nearby';
  // Exact route, but after the sender's date — "better late than never".
  const late = !nearby && input.daysLate > 0;
  const n = input.daysLate;
  const rd = new Date(`${input.requestDate}T12:00:00Z`);
  const reqDateFr = premier(new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'long' }).format(rd));
  const traveler = input.travelerFirstName;
  const itemFr = input.itemLabel ? `« ${input.itemLabel} »` : 'votre colis';

  const fr = {
    hello: greet(input.senderFirstName),
    eyebrow: late ? 'Mieux vaut tard que jamais' : nearby ? 'Un voyageur près de chez vous' : 'Un voyageur sur votre trajet',
    title: late
      ? `${traveler ?? 'Un voyageur'} fait ${route} le ${dateFr}, ${n} jour${n > 1 ? 's' : ''} après votre date`
      : nearby
      ? `${traveler ?? 'Un voyageur'} part de ${input.tripDepartureCity} pour ${input.tripArrivalCity} le ${dateFr}`
      : `${traveler ?? 'Un voyageur'} fait ${route} le ${dateFr}`,
    body: late
      ? `Vous vouliez envoyer ${itemFr} de ${input.requestPickupCity} à ${input.tripArrivalCity} avant le ${reqDateFr}. Ce voyageur fait exactement ce trajet, ${n} jour${n > 1 ? 's' : ''} plus tard. Si votre envoi peut encore attendre un peu, mieux vaut tard que jamais !`
      : nearby
      ? `Vous attendez quelqu’un pour envoyer ${itemFr} de ${input.requestPickupCity} à ${input.tripArrivalCity}. Personne ne part de ${input.requestPickupCity} pour l’instant, mais ce voyageur part de ${input.tripDepartureCity}. Si vous pouvez faire parvenir votre colis à ${input.tripDepartureCity} avant son départ, il / elle peut l’emporter.`
      : `Vous attendez quelqu’un pour envoyer ${itemFr} de ${input.requestPickupCity} à ${input.tripArrivalCity}. Ce voyageur fait exactement ce trajet.`,
    ask: late ? 'Toujours intéressé(e) ? Réservez le trajet.' : nearby ? 'Ça vous intéresse ?' : 'Vous voulez lui confier votre colis ?',
    cta: 'Voir le trajet et réserver',
    // A request past its date is no longer listed, so don't promise it is.
    note: late
      ? 'Si ce n’est plus utile, ignorez simplement cet e-mail.'
      : 'Si ce trajet ne vous convient pas, ignorez simplement cet e-mail : votre demande reste en ligne.',
  };

  const content = `
    <p style="margin:0 0 8px;font-size:13px;color:${BRAND.lavender};font-weight:600;letter-spacing:0.05em;text-transform:uppercase;">${fr.eyebrow}</p>
    <h1 style="margin:0 0 16px;font-size:22px;font-weight:700;color:${BRAND.ink};letter-spacing:-0.01em;line-height:1.3;">
      ${escapeHtml(fr.title)}
    </h1>
    <p style="margin:0 0 8px;font-size:15px;color:${BRAND.inkSoft};line-height:1.6;">${escapeHtml(fr.hello)}</p>
    <p style="margin:0 0 8px;font-size:15px;color:${BRAND.inkSoft};line-height:1.6;">${escapeHtml(fr.body)}</p>
    <p style="margin:12px 0 0;font-size:15px;font-weight:600;color:${BRAND.ink};">${escapeHtml(fr.ask)}</p>
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" align="center" style="margin:20px auto 12px;">
      <tr>
        <td style="background:${BRAND.ink};border-radius:999px;">
          <a href="${url}" style="display:inline-block;padding:14px 28px;font-size:15px;font-weight:600;color:#ffffff;text-decoration:none;">
            ${escapeHtml(fr.cta)}
          </a>
        </td>
      </tr>
    </table>
    <p style="margin:0;font-size:13px;color:${BRAND.inkMuted};line-height:1.6;text-align:center;">${escapeHtml(fr.note)}</p>
  `;

  return {
    subject: late
      ? `Mieux vaut tard que jamais : un voyageur fait ${route} le ${dateFr}`
      : nearby
      ? `Un voyageur part de ${input.tripDepartureCity} pour ${input.tripArrivalCity}`
      : `Un voyageur sur votre trajet ${route}`,
    html: wrapHtml(content, fr.title),
    text: `${fr.hello}\n\n${fr.title}.\n\n${fr.body}\n\n${fr.ask} ${fr.cta} : ${url}\n\n${fr.note}\n\n— L’équipe Jibly`,
  };
}

// =============================================================================
// Sender: their date is (almost) here and a traveller's offer is unanswered
// =============================================================================
// Sent on the day of the sender's date — at noon Paris time by
// /api/cron/offer-reminders, or by hand from /admin (lib/offer-reminders.ts).
// `isToday: false` ("demain") is supported but not used. The deadline-day email ("nobody has
// taken your parcel yet") deliberately skips any request with an offer on it,
// so without this a sender with a waiting offer heard nothing at all — and the
// traveller who offered never got an answer.
//
// French only, at the operator's request. The button books (accept + pay); it
// does not open a chat — contact comes with the booking.
export function offerWaitingReminderEmail(input: {
  senderFirstName: string | null;
  /** First name of the traveller when there is exactly one offer. */
  travelerFirstName: string | null;
  offerCount: number;
  itemLabel: string | null;
  pickupCity: string;
  destinationCity: string;
  /** YYYY-MM-DD — the sender's "before" date. */
  requestDate: string;
  /** True when the date is today (Paris time), false when it is tomorrow. */
  isToday: boolean;
}) {
  const url = `${BASE_URL}/me?tab=sends`;
  const d = new Date(`${input.requestDate}T12:00:00Z`);
  const date = new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'long' }).format(d);
  const when = input.isToday ? `aujourd’hui, le ${date}` : `demain, le ${date}`;
  const item = input.itemLabel ? `« ${input.itemLabel} »` : 'votre colis';
  const one = input.offerCount <= 1;
  const traveler = input.travelerFirstName ?? 'Un voyageur';

  const hello = input.senderFirstName ? `Bonjour ${input.senderFirstName},` : 'Bonjour,';
  const title = input.isToday ? 'Votre colis peut encore partir aujourd’hui' : 'Votre colis peut encore partir à temps';
  const intro = `Vous souhaitiez envoyer ${item} de ${input.pickupCity} à ${input.destinationCity} avant ${when}.`;
  const news = one
    ? `Bonne nouvelle : ${traveler} s’est proposé pour le transporter, et son offre vous attend toujours.`
    : `Bonne nouvelle : ${input.offerCount} voyageurs se sont proposés pour le transporter, et leurs offres vous attendent toujours.`;
  const next = one
    ? `Si elle vous convient, acceptez-la et réglez en ligne : votre réservation est confirmée tout de suite. Si vous n’en avez plus besoin, vous pouvez aussi la refuser, pour que ${input.travelerFirstName ?? 'le voyageur'} le sache.`
    : 'Si l’une d’elles vous convient, acceptez-la et réglez en ligne : votre réservation est confirmée tout de suite. Si vous n’en avez plus besoin, vous pouvez aussi les refuser, pour que les voyageurs le sachent.';
  const cta = one && input.travelerFirstName ? `Voir l’offre de ${input.travelerFirstName}` : one ? 'Voir l’offre' : 'Voir les offres';
  const help = 'Une question ? Écrivez-nous à contact@jibly.io, nous vous répondrons avec plaisir.';

  const p = (text: string, extra = '') =>
    `<p style="margin:0 0 14px;font-size:15px;color:${BRAND.inkSoft};line-height:1.6;${extra}">${text}</p>`;

  const content = `
    <p style="margin:0 0 8px;font-size:13px;color:${BRAND.lavender};font-weight:600;letter-spacing:0.05em;text-transform:uppercase;">Un voyageur attend votre réponse</p>
    <h1 style="margin:0 0 16px;font-size:24px;font-weight:700;color:${BRAND.ink};letter-spacing:-0.01em;line-height:1.3;">${escapeHtml(title)}</h1>
    ${p(escapeHtml(hello))}
    ${p(escapeHtml(intro))}
    ${p(`<strong style="color:${BRAND.ink};">${escapeHtml(news)}</strong>`)}
    ${p(escapeHtml(next))}
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" align="center" style="margin:8px auto 24px;">
      <tr>
        <td style="background:${BRAND.ink};border-radius:999px;">
          <a href="${url}" style="display:inline-block;padding:14px 28px;font-size:15px;font-weight:600;color:#ffffff;text-decoration:none;">${escapeHtml(cta)}</a>
        </td>
      </tr>
    </table>
    ${p(`Une question ? Écrivez-nous à <a href="mailto:contact@jibly.io" style="color:${BRAND.ink};font-weight:600;">contact@jibly.io</a>, nous vous répondrons avec plaisir.`)}
    <p style="margin:0;font-size:15px;color:${BRAND.inkSoft};">— L’équipe Jibly</p>
  `;

  return {
    subject: one ? 'Un voyageur attend votre réponse' : `${input.offerCount} voyageurs attendent votre réponse`,
    html: wrapHtml(content, `${news}`, 'fr'),
    text: `${hello}\n\n${intro}\n\n${news}\n\n${next}\n\n${cta} : ${url}\n\n${help}\n\n— L’équipe Jibly`,
  };
}

// =============================================================================
// Price bargaining — a new price to answer, or an answer to a price
// =============================================================================
// One template, three moments (rules in lib/negotiation.ts):
//   'offer_to_traveler'  the sender proposes a price — on a listed trip, or as
//                        a counter to the traveller's offer. The traveller sees
//                        what THEY would receive, net of Jibly's fee.
//   'counter_to_sender'  the traveller answers with a price of their own. The
//                        sender sees the total they would pay.
//   'refused_to_sender'  the traveller turned the sender's price down. The card
//                        hold is released; nothing was charged.
//
// French only, like every Jibly email. No chat link — the conversation only
// opens once a price is agreed and paid.
export function priceNegotiationEmail(input: {
  kind: 'offer_to_traveler' | 'counter_to_sender' | 'refused_to_sender';
  recipientFirstName: string | null;
  otherFirstName: string | null;
  pickupCity: string;
  destinationCity: string;
  itemLabel: string | null;
  /** offer_to_traveler: the traveller's net. Otherwise: the sender's total. */
  amount: number;
  /** offer_to_traveler only: the total the sender pays, shown small. */
  senderTotal?: number;
  /** True when the recipient can still answer with one counter-proposal. */
  canCounter: boolean;
  /** Where the recipient answers. */
  path: string;
}) {
  const url = `${BASE_URL}${input.path}`;
  const route = `${input.pickupCity} → ${input.destinationCity}`;
  const other = input.otherFirstName;
  const hello = input.recipientFirstName ? `Bonjour ${input.recipientFirstName},` : 'Bonjour,';
  const item = input.itemLabel ? ` (« ${input.itemLabel} »)` : '';
  const amount = formatEuros(input.amount);

  let label: string, title: string, fr: string, frNext: string, cta: string, amountLabel: string;
  if (input.kind === 'offer_to_traveler') {
    label = 'Nouvelle proposition de prix';
    title = `${other ?? 'Un expéditeur'} vous propose ${amount}`;
    amountLabel = 'Vous recevrez';
    fr = `${other ?? 'Un expéditeur'} souhaite vous confier un colis${item} sur ${route} et propose un autre prix. Son paiement est déjà bloqué sur sa carte, rien n’est encore débité.`;
    frNext = input.canCounter
      ? 'Vous pouvez accepter, refuser, ou faire une contre-proposition (une seule).'
      : 'Vous pouvez accepter ou refuser.';
    cta = 'Répondre à la proposition';
  } else if (input.kind === 'counter_to_sender') {
    label = 'Contre-proposition';
    title = `${other ?? 'Le voyageur'} propose ${amount}`;
    amountLabel = 'Prix total proposé';
    fr = `Pour votre colis${item} sur ${route}, ${other ?? 'le voyageur'} vous fait une contre-proposition à ${amount} (frais Jibly inclus). Votre précédente autorisation de paiement a été annulée.`;
    frNext = input.canCounter
      ? 'Vous pouvez l’accepter en payant, la refuser, ou proposer un dernier prix.'
      : 'Vous pouvez l’accepter en payant (la réservation est alors confirmée), ou la refuser.';
    cta = 'Voir la contre-proposition';
  } else {
    label = 'Proposition refusée';
    title = `${other ?? 'Le voyageur'} n’a pas accepté votre prix`;
    amountLabel = 'Prix proposé';
    fr = `${other ?? 'Le voyageur'} a refusé votre proposition à ${amount} sur ${route}. Rien n’a été débité : le blocage sur votre carte est levé.`;
    frNext = 'Votre demande reste visible : d’autres voyageurs peuvent encore vous faire une offre.';
    cta = 'Voir mes envois';
  }

  const small =
    input.kind === 'offer_to_traveler' && input.senderTotal != null
      ? `<p style="margin:6px 0 0;font-size:12px;color:${BRAND.inkMuted};">L’expéditeur paie ${formatEuros(input.senderTotal)} frais Jibly inclus.</p>`
      : '';
  const p = (text: string, extra = '') =>
    `<p style="margin:0 0 14px;font-size:15px;color:${BRAND.inkSoft};line-height:1.6;${extra}">${text}</p>`;

  const content = `
    <p style="margin:0 0 8px;font-size:13px;color:${BRAND.lavender};font-weight:600;letter-spacing:0.05em;text-transform:uppercase;">${escapeHtml(label)}</p>
    <h1 style="margin:0 0 16px;font-size:24px;font-weight:700;color:${BRAND.ink};letter-spacing:-0.01em;line-height:1.3;">${escapeHtml(title)}</h1>
    ${p(escapeHtml(hello))}
    ${p(escapeHtml(fr))}
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:${BRAND.lavenderLight};border-radius:12px;margin-bottom:20px;">
      <tr>
        <td style="padding:18px 20px;">
          <p style="margin:0 0 6px;font-size:13px;color:${BRAND.inkSoft};">Trajet</p>
          <p style="margin:0 0 14px;font-size:17px;font-weight:600;color:${BRAND.ink};">${escapeHtml(route)}</p>
          <p style="margin:0 0 6px;font-size:13px;color:${BRAND.inkSoft};">${escapeHtml(amountLabel)}</p>
          <p style="margin:0;font-size:20px;font-weight:700;color:${BRAND.ink};">${amount}</p>
          ${small}
        </td>
      </tr>
    </table>
    ${p(escapeHtml(frNext))}
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" align="center" style="margin:8px auto 24px;">
      <tr>
        <td style="background:${BRAND.ink};border-radius:999px;">
          <a href="${url}" style="display:inline-block;padding:14px 28px;font-size:15px;font-weight:600;color:#ffffff;text-decoration:none;">${escapeHtml(cta)}</a>
        </td>
      </tr>
    </table>
    <p style="margin:0;font-size:15px;color:${BRAND.inkSoft};">— L’équipe Jibly</p>
  `;

  return {
    subject: `${title} · ${route}`,
    html: wrapHtml(content, fr, 'fr'),
    text: `${hello}\n\n${fr}\n\n${amountLabel} : ${amount}\n\n${frNext}\n\n${cta} : ${url}\n\n— L’équipe Jibly`,
  };
}
