// lib/email/templates.ts
//
// HTML templates for transactional emails. Kept inline (no React Email
// dependency) because they're short and stable. Each template returns
// { subject, html, text } so Resend can send both versions.
//
// Style: warm but minimal, mirrors the Jibly product palette (cream
// background, ink text, lavender accent). Wide-compatible HTML (table-
// based for Gmail/Outlook), no external CSS or webfonts.

const BRAND = {
  cream: '#FFF8F0',
  ink: '#1A1614',
  inkSoft: '#5A524A',
  inkMuted: '#9A9189',
  lavender: '#7C6FD9',
  lavenderLight: '#EDE8FB',
  mint: '#3FB985',
};

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://jibly.io';

// Shared HTML scaffold — used by every email template
function wrapHtml(content: string, preheader: string): string {
  return `<!DOCTYPE html>
<html lang="fr">
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
                Vous recevez cet email parce que vous avez un compte Jibly.<br>
                <a href="${BASE_URL}/me" style="color:${BRAND.inkSoft};text-decoration:underline;">Gérer mon espace</a>
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
// 1. Sender receives a proposal from a traveler
// =============================================================================
// Triggered when a traveler clicks "Je peux transporter" on a public request.
// The sender needs to be pulled back to the app to accept/decline.
export function senderGotProposalEmail(input: {
  senderFirstName: string | null;
  travelerFirstName: string | null;
  pickupCity: string;
  destinationCity: string;
  proposedPrice: number;
  bookingId: string;
}) {
  const senderName = input.senderFirstName || 'Bonjour';
  const travelerName = input.travelerFirstName || 'Un voyageur';
  const route = `${input.pickupCity} → ${input.destinationCity}`;
  const url = `${BASE_URL}/me`;

  const content = `
    <p style="margin:0 0 8px;font-size:13px;color:${BRAND.lavender};font-weight:600;letter-spacing:0.05em;text-transform:uppercase;">Nouvelle proposition</p>
    <h1 style="margin:0 0 16px;font-size:24px;font-weight:700;color:${BRAND.ink};letter-spacing:-0.01em;line-height:1.3;">
      ${travelerName} peut transporter votre colis
    </h1>
    <p style="margin:0 0 24px;font-size:15px;color:${BRAND.inkSoft};line-height:1.6;">
      ${senderName}, bonne nouvelle ! Quelqu'un a vu votre demande et peut s'en occuper.
    </p>
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:${BRAND.lavenderLight};border-radius:12px;margin-bottom:24px;">
      <tr>
        <td style="padding:18px 20px;">
          <p style="margin:0 0 6px;font-size:13px;color:${BRAND.inkSoft};">Trajet</p>
          <p style="margin:0 0 14px;font-size:17px;font-weight:600;color:${BRAND.ink};">${route}</p>
          <p style="margin:0 0 6px;font-size:13px;color:${BRAND.inkSoft};">Prix proposé</p>
          <p style="margin:0;font-size:17px;font-weight:600;color:${BRAND.ink};">${input.proposedPrice}€</p>
        </td>
      </tr>
    </table>
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" align="center">
      <tr>
        <td style="background:${BRAND.ink};border-radius:999px;">
          <a href="${url}" style="display:inline-block;padding:14px 28px;font-size:15px;font-weight:600;color:#ffffff;text-decoration:none;">
            Voir la proposition
          </a>
        </td>
      </tr>
    </table>
    <p style="margin:24px 0 0;font-size:13px;color:${BRAND.inkMuted};line-height:1.6;">
      La proposition vous attend dans votre espace. Vous pouvez accepter, refuser ou discuter avec le voyageur avant de décider.
    </p>
  `;

  return {
    subject: `${travelerName} peut transporter votre colis ${route}`,
    html: wrapHtml(content, `Une proposition pour votre demande ${route}`),
    text: `${senderName},\n\n${travelerName} peut transporter votre colis ${route} pour ${input.proposedPrice}€.\n\nVoir la proposition : ${url}\n\n— L'équipe Jibly`,
  };
}

// =============================================================================
// 2. Traveler receives a booking from a sender
// =============================================================================
// Triggered when a sender books a traveler's trip (instant book flow with
// payment held). The traveler is paid only on delivery — they need to
// accept and pick up the package.
export function travelerGotBookingEmail(input: {
  travelerFirstName: string | null;
  senderFirstName: string | null;
  pickupCity: string;
  destinationCity: string;
  proposedPrice: number;
  itemDescription: string | null;
  bookingId: string;
}) {
  const travelerName = input.travelerFirstName || 'Bonjour';
  const senderName = input.senderFirstName || 'Un expéditeur';
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
      ${travelerName}, ${senderName} souhaite vous confier un colis sur votre trajet.
      Le paiement est déjà sécurisé — il sera versé après la livraison.
    </p>
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:#E6F5EE;border-radius:12px;margin-bottom:24px;">
      <tr>
        <td style="padding:18px 20px;">
          <p style="margin:0 0 6px;font-size:13px;color:${BRAND.inkSoft};">Trajet</p>
          <p style="margin:0 0 14px;font-size:17px;font-weight:600;color:${BRAND.ink};">${route}</p>
          <p style="margin:0 0 6px;font-size:13px;color:${BRAND.inkSoft};">Compensation</p>
          <p style="margin:0 0 ${priceMarginBottom};font-size:17px;font-weight:600;color:${BRAND.ink};">${input.proposedPrice}€</p>
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
      Vous pourrez contacter ${senderName} via la messagerie pour convenir du point de récupération.
    </p>
  `;

  return {
    subject: `${senderName} a réservé votre trajet ${route}`,
    html: wrapHtml(content, `Nouvelle réservation sur votre trajet ${route}`),
    text: `${travelerName},\n\n${senderName} a réservé votre trajet ${route} pour ${input.proposedPrice}€.\n\nVoir la réservation : ${url}\n\n— L'équipe Jibly`,
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
