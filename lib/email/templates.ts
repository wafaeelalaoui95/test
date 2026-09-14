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
  // Reserved for the one thing in these emails that costs money if skimmed
  // past: the delivery code not reaching whoever actually collects the parcel.
  // Nothing else gets to be red, or this stops meaning anything.
  alert: '#C2372B',
  alertBg: '#FDF2F0',
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
// code — read out at the destination and entered by the traveller.
//
// WORDING: this says the code RECORDS the delivery. It used to say it releases
// the traveller's payment, which is true and was the wrong thing to tell this
// particular reader: it hands the sender a lever, and the sentence "without it
// their payment is never released" reads as an instruction to anyone looking
// for one. The traveller's own email still names the payment, because there it
// describes their money rather than their counterparty's.
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
      ${senderName}, it is confirmed. Here is your <strong>delivery code</strong>. Give it to the traveller <strong>at the destination</strong>, once the parcel has been handed over — to you, or to whoever collects it for you. It is how the delivery is recorded, so only share it after the parcel is in hand.
    </p>
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:${BRAND.alertBg};border-left:4px solid ${BRAND.alert};border-radius:8px;margin:0 0 24px;">
      <tr>
        <td style="padding:16px 18px;">
          <p style="margin:0 0 6px;font-size:15px;font-weight:700;color:${BRAND.alert};line-height:1.5;">
            If someone else is collecting the parcel, you must pass this code on to them.
          </p>
          <p style="margin:0;font-size:14px;color:${BRAND.inkSoft};line-height:1.6;">
            They read it to ${travelerName} at the moment the parcel changes hands — that is what records the delivery as done.
          </p>
        </td>
      </tr>
    </table>
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
    text: `${senderName},\n\n${travelerName} is carrying your parcel ${route}.\n\nYour delivery code: ${input.code}\nGive it to the traveller at the destination, once the parcel has been handed over — to you, or to whoever collects it for you. It is how the delivery is recorded, so only share it after the parcel is in hand.\n\nIf someone else is collecting the parcel, pass this code on to them. They read it to ${travelerName} at the moment the parcel changes hands.\n\nWhen you hand the parcel over at the start of the trip, ${travelerName} shows you a different code — theirs. You enter that one in the app.\n\nView my parcels: ${url}\n\n— The Jibly team`,
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
  itemLabel: string;
  pickupCity: string;
  destinationCity: string;
  budget: number;
}) {
  const name = input.senderFirstName || 'Hello';
  const route = `${input.pickupCity} → ${input.destinationCity}`;
  const url = `${BASE_URL}/me?tab=sends`;

  const content = `
    <p style="margin:0 0 8px;font-size:13px;color:${BRAND.lavender};font-weight:600;letter-spacing:0.05em;text-transform:uppercase;">Still looking?</p>
    <h1 style="margin:0 0 16px;font-size:24px;font-weight:700;color:${BRAND.ink};letter-spacing:-0.01em;line-height:1.3;">
      Nobody has taken your parcel yet
    </h1>
    <p style="margin:0 0 24px;font-size:15px;color:${BRAND.inkSoft};line-height:1.6;">
      ${name}, the date you set for ${escapeHtml(input.itemLabel)} has arrived and no traveller has taken it on.
      After today it stops appearing to travellers — so if you still need it carried, give it a new date and it goes back up.
    </p>
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:#FAF7F2;border-radius:12px;margin-bottom:24px;">
      <tr>
        <td style="padding:16px 20px;">
          <p style="margin:0 0 6px;font-size:13px;color:${BRAND.inkSoft};">Route</p>
          <p style="margin:0 0 12px;font-size:15px;font-weight:600;color:${BRAND.ink};">${route}</p>
          <p style="margin:0 0 6px;font-size:13px;color:${BRAND.inkSoft};">You were offering</p>
          <p style="margin:0;font-size:15px;font-weight:600;color:${BRAND.ink};">${formatEuros(input.budget)}</p>
        </td>
      </tr>
    </table>
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" align="center">
      <tr>
        <td style="background:${BRAND.ink};border-radius:999px;">
          <a href="${url}" style="display:inline-block;padding:14px 28px;font-size:15px;font-weight:600;color:#ffffff;text-decoration:none;">
            Change the date
          </a>
        </td>
      </tr>
    </table>
    <p style="margin:24px 0 0;font-size:13px;color:${BRAND.inkMuted};line-height:1.6;">
      Sorted it another way? Delete the request from the same screen and we will stop showing it. This is the only reminder we send about it.
    </p>
  `;

  return {
    subject: `Still need ${input.itemLabel} carried? · ${route}`,
    html: wrapHtml(content, `Your request ${route} reached its date with no traveller`),
    text: `${name},\n\nThe date you set for ${input.itemLabel} (${route}) has arrived and no traveller has taken it on. After today it stops appearing to travellers.\n\nIf you still need it carried, give it a new date: ${url}\nSorted it another way? Delete the request from the same screen.\n\nThis is the only reminder we send about it.\n\n— The Jibly team`,
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
// The delivery code is the one part of this that a sender can forget without
// noticing. It reaches them at booking, in an email they read once, days
// earlier — and if the parcel is being collected by someone else at the other
// end, that person needs it and has no way to get it themselves. The failure
// shows up at the worst possible moment: traveller and recipient standing
// together, parcel in hand, nobody able to close the delivery.
//
// So it is repeated on the eve of departure, when there is still an evening to
// send a message. The code is included rather than linked: a reminder that
// requires logging in to act on is a reminder half of people will not act on.
export function codeHandoverReminderEmail(input: {
  senderFirstName: string | null;
  travelerFirstName: string | null;
  pickupCity: string;
  destinationCity: string;
  departureDate: string;
  /** The DELIVERY code — the one read out at the destination. */
  code: string;
}) {
  const senderName = input.senderFirstName || 'Hello';
  const travelerName = input.travelerFirstName || 'Your traveller';
  const route = `${input.pickupCity} → ${input.destinationCity}`;
  const url = `${BASE_URL}/me`;

  const content = `
    <p style="margin:0 0 8px;font-size:13px;color:${BRAND.lavender};font-weight:600;letter-spacing:0.05em;text-transform:uppercase;">Tomorrow</p>
    <h1 style="margin:0 0 16px;font-size:24px;font-weight:700;color:${BRAND.ink};letter-spacing:-0.01em;line-height:1.3;">
      ${travelerName} leaves tomorrow
    </h1>
    <p style="margin:0 0 24px;font-size:15px;color:${BRAND.inkSoft};line-height:1.6;">
      ${senderName}, your parcel travels ${route} tomorrow. One thing to check tonight.
    </p>

    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:${BRAND.alertBg};border-left:4px solid ${BRAND.alert};border-radius:8px;margin:0 0 24px;">
      <tr>
        <td style="padding:16px 18px;">
          <p style="margin:0 0 6px;font-size:15px;font-weight:700;color:${BRAND.alert};line-height:1.5;">
            If someone else is collecting the parcel, make sure they have the delivery code.
          </p>
          <p style="margin:0;font-size:14px;color:${BRAND.inkSoft};line-height:1.6;">
            They read it to ${travelerName} once the parcel is in their hands — that is what records the delivery as done.
          </p>
        </td>
      </tr>
    </table>

    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:${BRAND.lavenderLight};border-radius:12px;margin-bottom:24px;">
      <tr>
        <td align="center" style="padding:24px;">
          <p style="margin:0 0 8px;font-size:12px;color:${BRAND.inkSoft};letter-spacing:0.08em;text-transform:uppercase;font-weight:600;">Delivery code</p>
          <p style="margin:0;font-size:36px;font-weight:700;color:${BRAND.ink};letter-spacing:0.2em;font-family:'SF Mono',Monaco,Consolas,monospace;">${input.code}</p>
        </td>
      </tr>
    </table>

    <p style="margin:0 0 24px;font-size:15px;color:${BRAND.inkSoft};line-height:1.6;">
      Only share it once the parcel is actually in hand: the code confirms receipt, so giving it early records a delivery that has not happened. If you are collecting it yourself, there is nothing to do.
    </p>

    <a href="${url}" style="display:inline-block;background:${BRAND.ink};color:#ffffff;text-decoration:none;padding:13px 26px;border-radius:999px;font-size:15px;font-weight:600;">View my parcels</a>
  `;

  return {
    subject: `Tomorrow · ${route} · is your delivery code passed on?`,
    html: wrapHtml(content, `${travelerName} leaves tomorrow — check the delivery code`),
    text: `${senderName},\n\nYour parcel travels ${route} tomorrow with ${travelerName}.\n\nIF SOMEONE ELSE IS COLLECTING THE PARCEL, MAKE SURE THEY HAVE THE DELIVERY CODE. They read it to ${travelerName} once the parcel is in their hands — that is what records the delivery as done.\n\nDelivery code: ${input.code}\n\nOnly share it once the parcel is actually in hand: the code confirms receipt, so giving it early records a delivery that has not happened. If you are collecting it yourself, there is nothing to do.\n\nView my parcels: ${url}\n\n— The Jibly team`,
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
  const name = input.senderFirstName || 'Hello';
  const travelerName = input.travelerFirstName || 'Your traveller';
  const route = `${input.pickupCity} → ${input.destinationCity}`;

  // Money first among the reassurances, because it is the question a sender
  // asks before they have finished reading the first line.
  const moneyBlock = !input.refund
    ? ''
    : input.refund.kind === 'released'
    ? `<p style="margin:0 0 8px;font-size:15px;color:${BRAND.inkSoft};line-height:1.6;">
         <strong style="color:${BRAND.ink};">You were never charged.</strong>
         The hold on your card has been released — if your bank still shows it, it drops off within a few days.
       </p>`
    : input.refund.kind === 'refunded'
    ? `<p style="margin:0 0 8px;font-size:15px;color:${BRAND.inkSoft};line-height:1.6;">
         <strong style="color:${BRAND.ink};">${formatEuros(input.refund.amountCents / 100)} is on its way back to you.</strong>
         It returns to the card you paid with, usually within 5 to 10 days depending on your bank.
       </p>`
    : `<p style="margin:0 0 8px;font-size:15px;color:${BRAND.inkSoft};line-height:1.6;">
         <strong style="color:${BRAND.ink};">Your ${formatEuros(input.refund.amountCents / 100)} is being refunded.</strong>
         Something went wrong sending it back automatically, so a human is finishing it by hand. You will get a confirmation once it is done.
       </p>`;

  const alternativesBlock = input.alternatives.length
    ? `
    <p style="margin:28px 0 12px;font-size:15px;font-weight:600;color:${BRAND.ink};">
      ${input.alternatives.length === 1 ? 'Another traveller on your route' : 'Other travellers on your route'}
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
                  ${escapeHtml(alt.travelerFirstName || 'A traveller')} · ${escapeHtml(alt.departureDate)} · from ${formatEuros(alt.compensationMin)}
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
      Nobody else is listed on ${escapeHtml(route)} right now. Travellers post new trips every day, and you can also publish your parcel as a request so the next one going that way finds you.
    </p>`;

  const content = `
    <p style="margin:0 0 8px;font-size:13px;color:${BRAND.lavender};font-weight:600;letter-spacing:0.05em;text-transform:uppercase;">Trip cancelled</p>
    <h1 style="margin:0 0 16px;font-size:24px;font-weight:700;color:${BRAND.ink};letter-spacing:-0.01em;line-height:1.3;">
      ${escapeHtml(travelerName)} can no longer carry ${escapeHtml(input.itemLabel)}
    </h1>
    <p style="margin:0 0 20px;font-size:15px;color:${BRAND.inkSoft};line-height:1.6;">
      ${escapeHtml(name)}, the trip ${escapeHtml(route)} on ${escapeHtml(input.departureDate)} has been cancelled, so your parcel is not being carried. ${escapeHtml(input.reasonLine)}
    </p>
    ${
      input.note
        ? `<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:#FAF7F2;border-radius:12px;margin-bottom:20px;">
      <tr><td style="padding:16px 20px;">
        <p style="margin:0 0 6px;font-size:13px;color:${BRAND.inkSoft};">What they said</p>
        <p style="margin:0;font-size:15px;color:${BRAND.ink};line-height:1.6;">&ldquo;${escapeHtml(input.note)}&rdquo;</p>
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
            Find another traveller
          </a>
        </td>
      </tr>
    </table>
    <p style="margin:24px 0 0;font-size:13px;color:${BRAND.inkMuted};line-height:1.6;">
      You do not need to do anything about the cancelled booking — it is already closed on your side. Nothing was charged for it beyond what is described above.
    </p>
  `;

  const altText = input.alternatives.length
    ? '\n\nOther travellers on your route:\n' +
      input.alternatives
        .map(
          (a) =>
            `- ${a.departureCity} -> ${a.arrivalCity}, ${a.departureDate}, ${
              a.travelerFirstName || 'a traveller'
            }, from ${formatEuros(a.compensationMin)}`
        )
        .join('\n')
    : `\n\nNobody else is listed on ${route} right now — travellers post new trips every day.`;

  const moneyText = !input.refund
    ? ''
    : input.refund.kind === 'released'
    ? '\n\nYou were never charged. The hold on your card has been released.'
    : input.refund.kind === 'refunded'
    ? `\n\n${formatEuros(input.refund.amountCents / 100)} is on its way back to the card you paid with, usually within 5 to 10 days.`
    : `\n\nYour ${formatEuros(input.refund.amountCents / 100)} is being refunded by hand; you will get a confirmation once it is done.`;

  return {
    subject: `${travelerName} cancelled · your parcel ${route} is not being carried`,
    html: wrapHtml(
      content,
      `The trip carrying ${input.itemLabel} was cancelled — here is what happens next`
    ),
    text: `${name},\n\nThe trip ${route} on ${input.departureDate} has been cancelled, so your parcel is not being carried. ${input.reasonLine}${
      input.note ? `\n\nWhat they said: "${input.note}"` : ''
    }${moneyText}${altText}\n\nFind another traveller: ${input.searchUrl}\n\n— The Jibly team`,
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
export function deliveryProvedEmail(input: {
  senderFirstName: string | null;
  travelerFirstName: string | null;
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
  const name = input.senderFirstName || 'Hello';
  const travelerName = input.travelerFirstName || 'Your traveller';
  const route = `${input.pickupCity} → ${input.destinationCity}`;
  const url = `${BASE_URL}/me?booking=${input.bookingId}`;

  const content = `
    <p style="margin:0 0 8px;font-size:13px;color:${BRAND.lavender};font-weight:600;letter-spacing:0.05em;text-transform:uppercase;">Delivered</p>
    <h1 style="margin:0 0 16px;font-size:24px;font-weight:700;color:${BRAND.ink};letter-spacing:-0.01em;line-height:1.3;">
      ${escapeHtml(travelerName)} has delivered ${escapeHtml(input.itemLabel)}
    </h1>
    <p style="margin:0 0 24px;font-size:15px;color:${BRAND.inkSoft};line-height:1.6;">
      ${escapeHtml(name)}, ${escapeHtml(travelerName)} has uploaded a photo of the parcel ${escapeHtml(route)}${
        input.receiverName
          ? ` and says it was handed to ${escapeHtml(input.receiverName)}`
          : ''
      }.
    </p>

    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:${BRAND.lavenderLight};border-radius:12px;margin-bottom:24px;">
      <tr>
        <td style="padding:18px 20px;">
          <p style="margin:0 0 8px;font-size:15px;font-weight:600;color:${BRAND.ink};">If the parcel arrived, nothing to do</p>
          <p style="margin:0;font-size:14px;color:${BRAND.inkSoft};line-height:1.6;">
            This delivery closes on its own on <strong style="color:${BRAND.ink};">${escapeHtml(input.deadline)}</strong> and ${escapeHtml(travelerName)} is paid then. You can also close it now from your account.
          </p>
        </td>
      </tr>
    </table>

    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:${BRAND.alertBg};border-left:4px solid ${BRAND.alert};border-radius:8px;margin:0 0 24px;">
      <tr>
        <td style="padding:16px 18px;">
          <p style="margin:0 0 6px;font-size:15px;font-weight:700;color:${BRAND.alert};line-height:1.5;">
            If something is wrong, tell us before ${escapeHtml(input.deadline)}
          </p>
          <p style="margin:0;font-size:14px;color:${BRAND.inkSoft};line-height:1.6;">
            Parcel never arrived, damaged, not what you sent — report a problem from the parcel in your account and nothing is paid out while we look into it.
          </p>
        </td>
      </tr>
    </table>

    <a href="${url}" style="display:inline-block;background:${BRAND.ink};color:#ffffff;text-decoration:none;padding:13px 26px;border-radius:999px;font-size:15px;font-weight:600;">See the photo</a>

    <p style="margin:24px 0 0;font-size:13px;color:${BRAND.inkMuted};line-height:1.6;">
      We wait ${input.days} days so that a traveller who has done the job is not left unpaid because a code never got read out. That wait is yours to use.
    </p>
  `;

  return {
    subject: `${travelerName} delivered ${input.itemLabel} · ${route}`,
    html: wrapHtml(content, `A photo of your parcel, and what happens by ${input.deadline}`),
    text: `${name},\n\n${travelerName} has uploaded a photo of your parcel ${route}${
      input.receiverName ? ` and says it was handed to ${input.receiverName}` : ''
    }.\n\nIF IT ARRIVED: nothing to do. The delivery closes on its own on ${input.deadline} and ${travelerName} is paid then. You can also close it now from your account.\n\nIF SOMETHING IS WRONG: report a problem before ${input.deadline} — from the parcel in your account. Nothing is paid out while we look into it.\n\nSee the photo: ${url}\n\nWe wait ${input.days} days so a traveller who has done the job is not left unpaid because a code never got read out.\n\n— The Jibly team`,
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
  itemLabel: string;
  pickupCity: string;
  destinationCity: string;
  days: number;
  bookingId: string;
}) {
  const name = input.senderFirstName || 'Hello';
  const travelerName = input.travelerFirstName || 'Your traveller';
  const route = `${input.pickupCity} → ${input.destinationCity}`;
  const url = `${BASE_URL}/me?booking=${input.bookingId}`;

  const content = `
    <p style="margin:0 0 8px;font-size:13px;color:${BRAND.lavender};font-weight:600;letter-spacing:0.05em;text-transform:uppercase;">Closed</p>
    <h1 style="margin:0 0 16px;font-size:24px;font-weight:700;color:${BRAND.ink};letter-spacing:-0.01em;line-height:1.3;">
      ${escapeHtml(input.itemLabel)} is marked delivered
    </h1>
    <p style="margin:0 0 24px;font-size:15px;color:${BRAND.inkSoft};line-height:1.6;">
      ${escapeHtml(name)}, ${escapeHtml(travelerName)} proved the delivery of your parcel ${escapeHtml(route)} ${input.days} days ago and nobody reported a problem, so it has closed on its own and ${escapeHtml(travelerName)} has been paid.
    </p>

    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:#FAF7F2;border-radius:12px;margin-bottom:24px;">
      <tr>
        <td style="padding:16px 20px;">
          <p style="margin:0 0 6px;font-size:14px;font-weight:600;color:${BRAND.ink};">Was this wrong?</p>
          <p style="margin:0;font-size:14px;color:${BRAND.inkSoft};line-height:1.6;">
            Tell us anyway. Report a problem from the parcel in your account — the money has gone out, but a parcel that never arrived is still something we need to hear about and act on.
          </p>
        </td>
      </tr>
    </table>

    <a href="${url}" style="display:inline-block;background:${BRAND.ink};color:#ffffff;text-decoration:none;padding:13px 26px;border-radius:999px;font-size:15px;font-weight:600;">See this parcel</a>

    <p style="margin:24px 0 0;font-size:13px;color:${BRAND.inkMuted};line-height:1.6;">
      You can now leave ${escapeHtml(travelerName)} a review, which is what the next sender on this route will read.
    </p>
  `;

  return {
    subject: `Closed · ${input.itemLabel} ${route}`,
    html: wrapHtml(content, `No problem was reported, so the delivery closed on its own`),
    text: `${name},\n\n${travelerName} proved the delivery of your parcel ${route} ${input.days} days ago and nobody reported a problem, so it has closed on its own and ${travelerName} has been paid.\n\nWAS THIS WRONG? Tell us anyway — report a problem from the parcel in your account. The money has gone out, but a parcel that never arrived is still something we need to hear about.\n\nSee this parcel: ${url}\n\nYou can now leave ${travelerName} a review.\n\n— The Jibly team`,
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
  const name = input.travelerFirstName || 'Hello';
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
                  From ${escapeHtml(p.senderName || 'the sender')} · collect in ${escapeHtml(p.pickupCity)}
                </p>
                ${
                  p.pickupCode
                    ? `<p style="margin:10px 0 0;font-size:13px;color:${BRAND.inkSoft};">
                         Your handover code:
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
    <p style="margin:0 0 8px;font-size:13px;color:${BRAND.lavender};font-weight:600;letter-spacing:0.05em;text-transform:uppercase;">Tomorrow</p>
    <h1 style="margin:0 0 16px;font-size:24px;font-weight:700;color:${BRAND.ink};letter-spacing:-0.01em;line-height:1.3;">
      ${n === 1 ? 'Do not forget the parcel' : `Do not forget the ${n} parcels`}
    </h1>
    <p style="margin:0 0 24px;font-size:15px;color:${BRAND.inkSoft};line-height:1.6;">
      ${escapeHtml(name)}, you fly ${escapeHtml(route)} on ${escapeHtml(input.departureDate)}${
        input.flightNumber ? ` (${escapeHtml(input.flightNumber)})` : ''
      }. ${n === 1 ? 'Someone is counting on you to collect this before you go.' : 'People are counting on you to collect these before you go.'}
    </p>

    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin-bottom:16px;">
      ${rows}
    </table>

    <p style="margin:0 0 24px;font-size:14px;color:${BRAND.inkSoft};line-height:1.6;">
      At the handover, show your code and the sender types it in — that is what records the parcel as collected. You are paid after the delivery is confirmed at the other end.
    </p>

    <a href="${url}" style="display:inline-block;background:${BRAND.ink};color:#ffffff;text-decoration:none;padding:13px 26px;border-radius:999px;font-size:15px;font-weight:600;">See my trip</a>

    <p style="margin:24px 0 0;font-size:13px;color:${BRAND.inkMuted};line-height:1.6;">
      Plans changed and you cannot carry ${n === 1 ? 'it' : 'them'}? Cancel the trip from your account tonight rather than tomorrow — ${n === 1 ? 'the sender is' : 'the senders are'} refunded straight away and we help ${n === 1 ? 'them' : 'them'} find someone else.
    </p>
  `;

  const parcelText = input.parcels
    .map(
      (p) =>
        `- ${p.itemLabel} — from ${p.senderName || 'the sender'}, collect in ${p.pickupCity}${
          p.pickupCode ? ` — your handover code: ${p.pickupCode}` : ''
        }`
    )
    .join('\n');

  return {
    subject:
      n === 1
        ? `Tomorrow · ${route} · do not forget the parcel`
        : `Tomorrow · ${route} · do not forget the ${n} parcels`,
    html: wrapHtml(
      content,
      `You fly ${route} tomorrow — ${n === 1 ? 'one parcel' : `${n} parcels`} to collect`
    ),
    text: `${name},\n\nYou fly ${route} on ${input.departureDate}${
      input.flightNumber ? ` (${input.flightNumber})` : ''
    }.\n\n${n === 1 ? 'PARCEL TO COLLECT:' : 'PARCELS TO COLLECT:'}\n${parcelText}\n\nAt the handover, show your code and the sender types it in — that is what records the parcel as collected. You are paid after the delivery is confirmed at the other end.\n\nSee my trip: ${url}\n\nPlans changed? Cancel the trip from your account tonight rather than tomorrow — the sender is refunded straight away and we help them find someone else.\n\n— The Jibly team`,
  };
}
