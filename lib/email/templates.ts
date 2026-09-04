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
// ENGLISH ONLY, by decision. Nothing records a person's language — there is no
// locale column on a profile — so a template could not choose even if it
// wanted to. Writing to everyone in French was the worse of the two guesses
// for a product whose testers already include English speakers. Same reasoning
// as the Supabase auth emails.

const BRAND = {
  cream: '#FFF8F0',
  ink: '#1A1614',
  inkSoft: '#5A524A',
  inkMuted: '#9A9189',
  lavender: '#7C6FD9',
  lavenderLight: '#EDE8FB',
  mint: '#3FB985',
};

const BASE_URL = getSiteUrl();

// Shared HTML scaffold — used by every email template
function wrapHtml(content: string, preheader: string): string {
  return `<!DOCTYPE html>
<html lang="en">
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
                You are receiving this because you have a Jibly account.<br>
                <a href="${BASE_URL}/me" style="color:${BRAND.inkSoft};text-decoration:underline;">Go to your account</a>
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
export function senderGotProposalEmail(input: {
  senderFirstName: string | null;
  travelerFirstName: string | null;
  pickupCity: string;
  destinationCity: string;
  proposedPrice: number;
  bookingId: string;
}) {
  const senderName = input.senderFirstName || 'Hello';
  const travelerName = input.travelerFirstName || 'A traveller';
  const route = `${input.pickupCity} → ${input.destinationCity}`;
  const url = `${BASE_URL}/me`;

  const content = `
    <p style="margin:0 0 8px;font-size:13px;color:${BRAND.lavender};font-weight:600;letter-spacing:0.05em;text-transform:uppercase;">New offer</p>
    <h1 style="margin:0 0 16px;font-size:24px;font-weight:700;color:${BRAND.ink};letter-spacing:-0.01em;line-height:1.3;">
      ${travelerName} can carry your parcel
    </h1>
    <p style="margin:0 0 24px;font-size:15px;color:${BRAND.inkSoft};line-height:1.6;">
      ${senderName}, good news — someone saw your request and can take it.
    </p>
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:${BRAND.lavenderLight};border-radius:12px;margin-bottom:24px;">
      <tr>
        <td style="padding:18px 20px;">
          <p style="margin:0 0 6px;font-size:13px;color:${BRAND.inkSoft};">Route</p>
          <p style="margin:0 0 14px;font-size:17px;font-weight:600;color:${BRAND.ink};">${route}</p>
          <p style="margin:0 0 6px;font-size:13px;color:${BRAND.inkSoft};">Offered price</p>
          <p style="margin:0;font-size:17px;font-weight:600;color:${BRAND.ink};">${formatEuros(input.proposedPrice)}</p>
        </td>
      </tr>
    </table>
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" align="center">
      <tr>
        <td style="background:${BRAND.ink};border-radius:999px;">
          <a href="${url}" style="display:inline-block;padding:14px 28px;font-size:15px;font-weight:600;color:#ffffff;text-decoration:none;">
            See the offer
          </a>
        </td>
      </tr>
    </table>
    <p style="margin:24px 0 0;font-size:13px;color:${BRAND.inkMuted};line-height:1.6;">
      The offer is waiting in your account. You can accept it, decline it, or ask the traveller a question before you decide.
    </p>
  `;

  return {
    subject: `${travelerName} can carry your parcel · ${route}`,
    html: wrapHtml(content, `An offer on your request ${route}`),
    text: `${senderName},\n\n${travelerName} can carry your parcel ${route} for ${formatEuros(input.proposedPrice)}.\n\nSee the offer: ${url}\n\n— The Jibly team`,
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
  const travelerName = input.travelerFirstName || 'Hello';
  const senderName = input.senderFirstName || 'A sender';
  const route = `${input.pickupCity} → ${input.destinationCity}`;
  const url = `${BASE_URL}/me`;

  const itemBlock = input.itemDescription
    ? `<p style="margin:0 0 6px;font-size:13px;color:${BRAND.inkSoft};">What it is</p>
       <p style="margin:0;font-size:14px;color:${BRAND.ink};line-height:1.5;">${escapeHtml(input.itemDescription)}</p>`
    : '';

  const priceMarginBottom = input.itemDescription ? '14px' : '0';

  const content = `
    <p style="margin:0 0 8px;font-size:13px;color:${BRAND.mint};font-weight:600;letter-spacing:0.05em;text-transform:uppercase;">New booking</p>
    <h1 style="margin:0 0 16px;font-size:24px;font-weight:700;color:${BRAND.ink};letter-spacing:-0.01em;line-height:1.3;">
      ${senderName} booked your trip
    </h1>
    <p style="margin:0 0 24px;font-size:15px;color:${BRAND.inkSoft};line-height:1.6;">
      ${travelerName}, ${senderName} would like you to carry a parcel on your trip.
      The payment is already held — it is released to you after delivery.
    </p>
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:#E6F5EE;border-radius:12px;margin-bottom:24px;">
      <tr>
        <td style="padding:18px 20px;">
          <p style="margin:0 0 6px;font-size:13px;color:${BRAND.inkSoft};">Route</p>
          <p style="margin:0 0 14px;font-size:17px;font-weight:600;color:${BRAND.ink};">${route}</p>
          <p style="margin:0 0 6px;font-size:13px;color:${BRAND.inkSoft};">You will receive</p>
          <p style="margin:0 0 ${priceMarginBottom};font-size:17px;font-weight:600;color:${BRAND.ink};">${formatEuros(input.travelerReceives)}</p>
          ${itemBlock}
        </td>
      </tr>
    </table>
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" align="center">
      <tr>
        <td style="background:${BRAND.ink};border-radius:999px;">
          <a href="${url}" style="display:inline-block;padding:14px 28px;font-size:15px;font-weight:600;color:#ffffff;text-decoration:none;">
            See the booking
          </a>
        </td>
      </tr>
    </table>
    <p style="margin:24px 0 0;font-size:13px;color:${BRAND.inkMuted};line-height:1.6;">
      Once you accept, you can message ${senderName} to agree where and when to collect the parcel.
    </p>
  `;

  return {
    subject: `${senderName} booked your trip · ${route}`,
    html: wrapHtml(content, `New booking on your trip ${route}`),
    text: `${travelerName},\n\n${senderName} booked your trip ${route}. You will receive ${formatEuros(input.travelerReceives)}.\n\nSee the booking: ${url}\n\n— The Jibly team`,
  };
}

// =============================================================================
// 3. Sender receives confirmation that the traveller accepted
// =============================================================================
// Triggered when status flips to 'confirmed'. Carries the sender's DELIVERY
// code — read out at the destination, entered by the traveller, and that is
// what releases payment.
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
  /**
   * The DELIVERY code. The sender (or whoever collects at the other end) reads
   * it to the traveller at drop-off, and the traveller enters it to release
   * payment.
   */
  code: string;
  bookingId: string;
}) {
  const senderName = input.senderFirstName || 'Hello';
  const travelerName = input.travelerFirstName || 'The traveller';
  const route = `${input.pickupCity} → ${input.destinationCity}`;
  const url = `${BASE_URL}/me`;

  const content = `
    <p style="margin:0 0 8px;font-size:13px;color:${BRAND.mint};font-weight:600;letter-spacing:0.05em;text-transform:uppercase;">Confirmed</p>
    <h1 style="margin:0 0 16px;font-size:24px;font-weight:700;color:${BRAND.ink};letter-spacing:-0.01em;line-height:1.3;">
      ${travelerName} is carrying your parcel
    </h1>
    <p style="margin:0 0 24px;font-size:15px;color:${BRAND.inkSoft};line-height:1.6;">
      ${senderName}, it is confirmed. Here is your <strong>delivery code</strong>. Give it to the traveller <strong>at the destination</strong>, once the parcel has been handed over — to you, or to whoever collects it for you. This code is what releases their payment, so only share it after the parcel is in hand.
    </p>
    <p style="margin:0 0 24px;font-size:15px;color:${BRAND.inkSoft};line-height:1.6;">
      <strong style="color:${BRAND.ink};">If someone else is collecting the parcel, pass this code on to them.</strong> Without it, the traveller cannot confirm the delivery.
    </p>
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:${BRAND.lavenderLight};border-radius:12px;margin-bottom:24px;">
      <tr>
        <td style="padding:24px 20px;text-align:center;">
          <p style="margin:0 0 8px;font-size:12px;color:${BRAND.inkSoft};letter-spacing:0.08em;text-transform:uppercase;font-weight:600;">Delivery code</p>
          <p style="margin:0;font-size:36px;font-weight:700;color:${BRAND.ink};letter-spacing:0.2em;font-family:'SF Mono',Monaco,Consolas,monospace;">${input.code}</p>
        </td>
      </tr>
    </table>
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:#FAF7F2;border-radius:12px;margin-bottom:24px;">
      <tr>
        <td style="padding:16px 20px;">
          <p style="margin:0 0 6px;font-size:13px;color:${BRAND.inkSoft};">Route</p>
          <p style="margin:0 0 12px;font-size:15px;font-weight:600;color:${BRAND.ink};">${route}</p>
          <p style="margin:0 0 6px;font-size:13px;color:${BRAND.inkSoft};">Amount paid</p>
          <p style="margin:0;font-size:15px;font-weight:600;color:${BRAND.ink};">${formatEuros(input.proposedPrice)}</p>
        </td>
      </tr>
    </table>
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" align="center">
      <tr>
        <td style="background:${BRAND.ink};border-radius:999px;">
          <a href="${url}" style="display:inline-block;padding:14px 28px;font-size:15px;font-weight:600;color:#ffffff;text-decoration:none;">
            View my parcels
          </a>
        </td>
      </tr>
    </table>
    <p style="margin:24px 0 0;font-size:13px;color:${BRAND.inkMuted};line-height:1.6;">
      <strong>When you hand the parcel over</strong> at the start of the trip, ${travelerName} shows you a different code — theirs. You enter that one in the app. Keep your delivery code to yourself until the parcel arrives.
    </p>
  `;

  return {
    subject: `Confirmed · ${route} · delivery code ${input.code}`,
    html: wrapHtml(content, `${travelerName} accepted — here is your delivery code`),
    text: `${senderName},\n\n${travelerName} is carrying your parcel ${route}.\n\nYour delivery code: ${input.code}\nGive it to the traveller at the destination, once the parcel has been handed over — to you, or to whoever collects it for you. This code releases their payment, so only share it after the parcel is in hand.\n\nIf someone else is collecting the parcel, pass this code on to them. Without it, the traveller cannot confirm the delivery.\n\nWhen you hand the parcel over at the start of the trip, ${travelerName} shows you a different code — theirs. You enter that one in the app.\n\nView my parcels: ${url}\n\n— The Jibly team`,
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
  const travelerName = input.travelerFirstName || 'Hello';
  const senderName = input.senderFirstName || 'The sender';
  const route = `${input.pickupCity} → ${input.destinationCity}`;
  const url = `${BASE_URL}/me`;

  const content = `
    <p style="margin:0 0 8px;font-size:13px;color:${BRAND.mint};font-weight:600;letter-spacing:0.05em;text-transform:uppercase;">Confirmed</p>
    <h1 style="margin:0 0 16px;font-size:24px;font-weight:700;color:${BRAND.ink};letter-spacing:-0.01em;line-height:1.3;">
      You are on
    </h1>
    <p style="margin:0 0 24px;font-size:15px;color:${BRAND.inkSoft};line-height:1.6;">
      ${travelerName}, here is your <strong>handover code</strong>. Give it to ${senderName} at the moment they hand you the parcel — it is their proof that they did. Only share it once the parcel is in your hands.
    </p>
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:#E6F5EE;border-radius:12px;margin-bottom:24px;">
      <tr>
        <td style="padding:24px 20px;text-align:center;">
          <p style="margin:0 0 8px;font-size:12px;color:${BRAND.inkSoft};letter-spacing:0.08em;text-transform:uppercase;font-weight:600;">Handover code</p>
          <p style="margin:0;font-size:36px;font-weight:700;color:${BRAND.ink};letter-spacing:0.2em;font-family:'SF Mono',Monaco,Consolas,monospace;">${input.code}</p>
        </td>
      </tr>
    </table>
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:#FAF7F2;border-radius:12px;margin-bottom:24px;">
      <tr>
        <td style="padding:16px 20px;">
          <p style="margin:0 0 6px;font-size:13px;color:${BRAND.inkSoft};">Route</p>
          <p style="margin:0 0 12px;font-size:15px;font-weight:600;color:${BRAND.ink};">${route}</p>
          <p style="margin:0 0 6px;font-size:13px;color:${BRAND.inkSoft};">You will receive</p>
          <p style="margin:0;font-size:15px;font-weight:600;color:${BRAND.ink};">${formatEuros(input.travelerReceives)}</p>
        </td>
      </tr>
    </table>
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" align="center">
      <tr>
        <td style="background:${BRAND.ink};border-radius:999px;">
          <a href="${url}" style="display:inline-block;padding:14px 28px;font-size:15px;font-weight:600;color:#ffffff;text-decoration:none;">
            View my trips
          </a>
        </td>
      </tr>
    </table>
    <p style="margin:24px 0 0;font-size:13px;color:${BRAND.inkMuted};line-height:1.6;">
      <strong>At the destination</strong>, whoever receives the parcel gives you a second code — the delivery code. You enter that one in the app, and it releases your payment. Keep your handover code to yourself until collection.
    </p>
  `;

  return {
    subject: `Confirmed · ${route} · handover code ${input.code}`,
    html: wrapHtml(content, `You are carrying for ${senderName} — here is your handover code`),
    text: `${travelerName},\n\nYou are carrying a parcel for ${senderName} ${route}.\n\nYour handover code: ${input.code}\nGive it to ${senderName} at the moment they hand you the parcel.\n\nAt the destination, whoever receives the parcel gives you a second code — the delivery code. You enter that one in the app, and it releases your payment.\n\nView my trips: ${url}\n\n— The Jibly team`,
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
