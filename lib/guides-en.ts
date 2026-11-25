// English shipping guides, under /en/. Same rules as lib/guides.ts: Jibly is
// one option among others, every guide says when it is NOT the right choice,
// and nothing is invented (no prices, delivery times, guarantees, reviews or
// statistics). Each guide's `alt` is its French version (hreflang).

import type { Guide, GuideOption } from '@/lib/guides';

const POST: GuideOption = {
  name: 'National post (La Poste, Royal Mail, USPS…)',
  bestFor: 'Non-urgent shipments, parcels of several kilos',
  speed: 'Usually several days, depending on the service',
  tracking: 'Depends on the service',
  price: 'Rates by weight and destination, on the post office’s website',
  limits: 'Customs declaration for goods outside the EU',
};
const EXPRESS: GuideOption = {
  name: 'Express courier (DHL, FedEx, UPS…)',
  bestFor: 'Urgent, business or valuable shipments',
  speed: 'Among the fastest options, with pickup available',
  tracking: 'Yes, end to end',
  price: 'Quote on the courier’s website',
  limits: 'The courier handles customs formalities',
};
const COMPARATOR: GuideOption = {
  name: 'Comparison site (Eurosender, Packlink…)',
  bestFor: 'Comparing several couriers at once',
  speed: 'Depends on the courier you pick',
  tracking: 'Depends on the courier you pick',
  price: 'Instant online quote',
  limits: 'The chosen courier’s rules apply',
};
const TRAVELLER: GuideOption = {
  name: 'A traveller making the trip (Jibly)',
  bestFor: 'Documents, keys, clothes, small personal items',
  speed: 'Depends on the traveller’s flight date',
  tracking: 'Hand-to-hand, confirmed with a code',
  price: 'Set by the traveller; you can offer less',
  limits: 'Allowed categories only, on the routes travellers post',
  jibly: true,
};

const NOT_JIBLY = [
  'A heavy or bulky parcel: a traveller carries your item in their luggage.',
  'Commercial or recurring shipments: Jibly is for personal items.',
  'Cash, jewellery, valuables or prescription medicines: forbidden on Jibly.',
  'No traveller is making the trip before your deadline: a courier is safer.',
];

export const GUIDES_EN: Guide[] = [
  {
    path: '/en/send-small-parcel-abroad',
    lang: 'en',
    alt: '/envoyer-petit-colis-etranger',
    label: 'Send a small parcel abroad',
    title: 'How to send a small parcel abroad: your options',
    description:
      'How to send a small parcel abroad: national post, express couriers (DHL, FedEx, UPS), comparison sites or a traveller already making the trip. Pros, limits and how to choose.',
    h1: 'How to send a small parcel abroad',
    answer:
      'To send a small parcel abroad, you can use the national post (often the cheapest when there is no rush), an express courier such as DHL, FedEx or UPS (fast, with full tracking), a comparison site that quotes several couriers, or a traveller who is already making the trip. A traveller suits documents, keys, clothes and small personal items: they hand the item over in person, at a price you agree together.',
    optionsHeading: 'Small parcel abroad: compare',
    options: [POST, EXPRESS, COMPARATOR, TRAVELLER],
    sections: [
      {
        heading: 'Choose with three questions',
        bullets: [
          'What is your deadline? The more urgent, the more an express courier — or a traveller leaving soon — makes sense.',
          'How heavy and how big is it? Beyond a few kilos, use the post or a courier.',
          'What is it? Goods or valuables: a courier. An allowed personal item: a traveller is an option.',
        ],
      },
      {
        heading: 'With a traveller, step by step',
        bullets: [
          'Look for a trip to your recipient’s city, or post a request with your deadline.',
          'The traveller sets a price; you can offer less. Jibly’s fee is shown before you pay.',
          'Hand the item over in person, unsealed: the traveller always checks what they carry.',
          'On arrival, your recipient gives the traveller the delivery code.',
        ],
      },
    ],
    notJibly: NOT_JIBLY,
    faq: [
      {
        q: 'What is the cheapest way to send a small parcel abroad?',
        a: 'It depends on weight, destination and urgency. Compare the post, a comparison site and — for a personal item — a traveller, always on the total price.',
      },
      {
        q: 'Can I track an item carried by a traveller?',
        a: 'On Jibly, the pickup and the delivery are each confirmed with a code, so you know when the traveller has the item and when it was handed over.',
      },
      {
        q: 'Which countries does Jibly work in?',
        a: 'Anywhere a traveller posts a trip. The first routes are between Morocco and France, but the platform is not limited to one region.',
      },
    ],
    related: ['/en/send-parcel-within-europe', '/en/traveller-vs-courier-vs-post', '/en/dhl-alternatives', '/en/forgotten-keys-abroad'],
    group: 'besoin',
    card: {
      fr: { title: 'Un petit colis à l’étranger', text: 'Poste, express ou voyageur : comparer.' },
      en: { title: 'A small parcel abroad', text: 'Post, express or traveller: compare.' },
    },
  },

  {
    path: '/en/send-urgent-document-abroad',
    lang: 'en',
    alt: '/envoi-document-urgent-etranger',
    label: 'Urgent document abroad',
    title: 'How to send a document abroad urgently',
    description:
      'Need to send a document abroad urgently? Express couriers (DHL, FedEx, UPS) or a traveller leaving in the next few days: your options, their limits and a checklist.',
    h1: 'How to send a document abroad urgently',
    answer:
      'To send a document abroad urgently, the two fastest options are an express courier (DHL, FedEx, UPS, often with pickup at your door) and a traveller leaving in the next few days for your recipient’s city. Express works to almost any destination and can be booked straight away. A traveller depends on the trips posted, but hands the document over in person, at a price you agree together.',
    optionsHeading: 'Options for an urgent document',
    options: [
      EXPRESS,
      { ...TRAVELLER, bestFor: 'A traveller leaves soon for your recipient’s city' },
      { ...POST, bestFor: 'When the deadline leaves a few days of margin' },
    ],
    sections: [
      {
        heading: 'First: would a scan do?',
        body:
          'Many organisations accept a scanned document or an electronic signature. Ask before sending an original: it is often the fastest solution.',
      },
      {
        heading: 'Finding a traveller who leaves soon',
        bullets: [
          'Search your route on Jibly: travellers post their date and arrival city.',
          'If nobody is listed, post your request with your deadline: travellers making the trip can offer to carry it.',
          'Book, then hand the document over in person before departure; the pickup is confirmed with a code.',
        ],
      },
      {
        heading: 'Checklist for an urgent shipment',
        bullets: [
          'Keep a digital copy of the document.',
          'Have your recipient’s name and phone number ready.',
          'Check the courier’s pickup cut-off time, or the traveller’s flight date.',
          'Compare at least two options before paying.',
        ],
      },
    ],
    notJibly: [
      'You need a guaranteed delivery time.',
      'No traveller is going to the destination before your deadline.',
      'The procedure requires proof of postage or a courier shipment.',
    ],
    faq: [
      {
        q: 'What is the fastest way to send a document abroad?',
        a: 'An express courier (DHL, FedEx, UPS) or a traveller leaving in the next few days for the same city. Express is available everywhere; a traveller depends on the trips posted.',
      },
      {
        q: 'Does Jibly guarantee a delivery time?',
        a: 'No. The document travels with the traveller, on their flight date. Jibly does not guarantee delivery times: if your deadline is strict, an express courier is a better fit.',
      },
    ],
    related: ['/en/dhl-alternatives', '/en/traveller-vs-courier-vs-post', '/en/send-small-parcel-abroad'],
    group: 'besoin',
    card: {
      fr: { title: 'Un document urgent', text: 'Express ou voyageur qui part bientôt.' },
      en: { title: 'An urgent document', text: 'Express courier or a traveller leaving soon.' },
    },
  },

  {
    path: '/en/dhl-alternatives',
    lang: 'en',
    alt: '/alternatives-dhl',
    label: 'Alternatives to DHL',
    title: 'Alternatives to DHL for documents and small parcels',
    description:
      'FedEx, UPS, national post, comparison sites or a traveller: the alternatives to DHL for sending a document or small parcel abroad, and how to choose.',
    h1: 'Alternatives to DHL for sending abroad',
    answer:
      'The main alternatives to DHL are the other express couriers (FedEx, UPS), national postal services (La Poste, Royal Mail, USPS and others), comparison sites that offer several couriers (Eurosender, Packlink…) and — for a small personal item — a traveller who is already making the trip, through a platform such as Jibly. Each has its strengths depending on urgency, weight and contents.',
    optionsHeading: 'DHL and its alternatives',
    options: [{ ...EXPRESS, name: 'DHL, FedEx, UPS' }, POST, COMPARATOR, TRAVELLER],
    sections: [
      {
        heading: 'Choose with three questions',
        bullets: [
          'Is it urgent, with a strict deadline? An express courier.',
          'Is it heavy, or is it goods? The post or a comparison site.',
          'Is it a document, keys or a small personal item, and is someone making the trip? A traveller may be simpler.',
        ],
      },
      {
        heading: 'When a traveller is a good alternative',
        body:
          'For a small personal item, a traveller already heading to your recipient’s city hands it over in person. You know who is carrying it: every traveller verifies their identity before they can be booked, and the price is agreed between you.',
      },
    ],
    notJibly: NOT_JIBLY,
    faq: [
      {
        q: 'What is the best alternative to DHL?',
        a: 'It depends on your shipment. FedEx and UPS are the closest express equivalents; the post is often cheaper if you have time; a traveller suits documents and small personal items.',
      },
      {
        q: 'Is Jibly a courier like DHL?',
        a: 'No. Jibly is a platform that connects senders with verified travellers for small personal items. The travellers carry the items, in their luggage.',
      },
      {
        q: 'Is Jibly affiliated with DHL, FedEx, UPS or any postal service?',
        a: 'No. They are mentioned for comparison only; check their current prices and delivery times on their websites.',
      },
    ],
    related: ['/en/traveller-vs-courier-vs-post', '/en/send-urgent-document-abroad', '/en/send-small-parcel-abroad'],
    group: 'regles',
    card: {
      fr: { title: 'Alternatives à DHL', text: 'Express, poste, comparateurs ou voyageur.' },
      en: { title: 'Alternatives to DHL', text: 'Express, post, comparison sites or traveller.' },
    },
  },

  {
    path: '/en/forgotten-keys-abroad',
    lang: 'en',
    alt: '/cles-oubliees-autre-pays',
    label: 'Forgotten keys abroad',
    title: 'Left your keys in another country? How to get them back',
    description:
      'Forgot your keys abroad, or at home before leaving? The options: post, express courier, a traveller making the trip, or a locksmith. Pros and limits.',
    h1: 'Left your keys in another country? How to get them back',
    answer:
      'To get back keys left in another country, the person who has them can send them by post (tracked, in a padded envelope) or by express courier. Another option is to hand them to a traveller heading to your city, who gives them to you in person. If that is too slow or too expensive, a locksmith or a spare set with someone close may be quicker.',
    optionsHeading: 'Getting your keys back: options',
    options: [
      { ...POST, name: 'Post (tracked, padded envelope)', bestFor: 'When you can wait a few days' },
      { ...EXPRESS, bestFor: 'Keys needed quickly, with tracking' },
      { ...TRAVELLER, bestFor: 'A traveller is leaving soon for your city' },
    ],
    sections: [
      {
        heading: 'Before sending',
        bullets: [
          'Never put the home address together with the keys: a label with both is a risk.',
          'Use a padded envelope so the keys don’t tear through the packaging.',
          'Think about a spare: someone close who has one, or a locksmith, is sometimes the fastest fix.',
        ],
      },
      {
        heading: 'With a traveller',
        body:
          'Keys are an allowed category on Jibly. The person who has them hands them to the traveller before departure; on arrival, you collect them at the agreed meeting point and give the traveller the delivery code.',
      },
    ],
    notJibly: [
      'No traveller is making the trip before you need the keys.',
      'They are keys to a safe or to valuables: use an insured courier.',
    ],
    faq: [
      {
        q: 'Can you send keys abroad by post?',
        a: 'Usually yes, in a padded envelope, ideally tracked. Check your postal service’s conditions for small items.',
      },
      {
        q: 'Can I give keys to a traveller on Jibly?',
        a: 'Yes, keys are an allowed category. The traveller sees what they carry and the handover is confirmed with a code.',
      },
    ],
    related: ['/en/send-urgent-document-abroad', '/en/send-small-parcel-abroad'],
    group: 'objet',
    card: {
      fr: { title: 'Des clés oubliées', text: 'Poste, express, voyageur ou serrurier.' },
      en: { title: 'Forgotten keys', text: 'Post, express, traveller or locksmith.' },
    },
  },

  {
    path: '/en/send-parcel-to-morocco',
    lang: 'en',
    alt: '/envoyer-colis-maroc',
    label: 'Send a parcel to Morocco',
    title: 'Sending a parcel to Morocco: post, express or traveller',
    description:
      'How to send a parcel to Morocco: national post, DHL / FedEx / UPS, comparison sites or a traveller already making the trip. Pros, limits and how to choose.',
    h1: 'Sending a parcel to Morocco: which option?',
    answer:
      'To send a parcel to Morocco, there are three main options: the post (for example Colissimo International from France), an express courier such as DHL, FedEx or UPS, or a traveller who is already making the trip. The right choice depends on weight, urgency and contents. For a heavy or commercial parcel, use the post or a courier. For a document, keys or a small personal item, a traveller can hand it to your recipient in person, at a price you agree together.',
    optionsHeading: 'Options for sending to Morocco',
    options: [POST, EXPRESS, COMPARATOR, TRAVELLER],
    trips: { heading: 'Travellers heading to Morocco', match: { kind: 'country', from: '*', to: 'MA' } },
    sections: [
      {
        heading: 'How it works with a traveller',
        bullets: [
          'Find a traveller heading to your recipient’s city, or post a request with your deadline.',
          'The traveller sets a price; you can offer less. Fees are shown before payment.',
          'You pay on Jibly, then hand the item over in person. The traveller checks the contents: never a sealed parcel.',
          'The handover is confirmed with a code, at pickup and again at delivery.',
        ],
      },
      {
        heading: 'Customs and rules',
        body:
          'An item carried by a traveller travels in their luggage: it must follow the airline’s rules and the customs rules of both countries. A parcel of goods sent by post or courier needs a customs declaration. If in doubt, check with customs before sending.',
      },
    ],
    notJibly: NOT_JIBLY,
    faq: [
      {
        q: 'What is the simplest way to send a small parcel to Morocco?',
        a: 'For a small personal item, a traveller heading to your recipient’s city is often the most direct: you hand it over, they deliver it in person. For heavier parcels, the post or an express courier is a better fit.',
      },
      {
        q: 'Is Jibly a courier?',
        a: 'No. Jibly is a platform that connects senders with verified travellers. The travellers carry the items, in their luggage.',
      },
    ],
    related: ['/en/send-parcel-from-morocco-to-europe', '/en/send-small-parcel-abroad', '/en/dhl-alternatives'],
    group: 'destination',
    card: {
      fr: { title: 'Un colis au Maroc', text: 'Poste, express ou voyageur : comment choisir.' },
      en: { title: 'A parcel to Morocco', text: 'Post, express courier or traveller: how to choose.' },
    },
  },

  {
    path: '/en/send-parcel-from-morocco-to-europe',
    lang: 'en',
    alt: '/envoyer-colis-maroc-france',
    label: 'From Morocco to Europe',
    title: 'Sending a parcel from Morocco to France and Europe',
    description:
      'Send a document or small parcel from Morocco to France, Belgium, Spain or elsewhere in Europe: post, express courier or traveller, and the rules for entering the EU.',
    h1: 'Sending a parcel from Morocco to France and Europe',
    answer:
      'To send a parcel from Morocco to France or another European country, you can use the Moroccan post (Barid Al-Maghrib), an express courier (DHL, FedEx, UPS) or a traveller who is already making the trip. For a heavy parcel or goods, the post or a courier is a better fit. For a document, keys or a small personal item, a traveller can hand it to your recipient in person, in France, Belgium, Spain or elsewhere in Europe.',
    optionsHeading: 'Options from Morocco',
    options: [
      { ...POST, name: 'Moroccan post (Barid Al-Maghrib)', price: 'Rates by weight and destination, at the post office or on its website' },
      EXPRESS,
      TRAVELLER,
    ],
    trips: { heading: 'Travellers from Morocco to Europe', match: { kind: 'country', from: 'MA', to: 'EUROPE' } },
    sections: [
      {
        heading: 'Entering the European Union',
        bullets: [
          'A parcel of goods sent by post or courier goes through customs: a declaration is required and taxes may apply depending on its value.',
          'Animal products (meat, dairy…) are tightly controlled when entering the EU, including in luggage.',
          'The United Kingdom is no longer in the EU and has its own customs rules.',
          'If in doubt, check the customs website of the destination country before sending.',
        ],
      },
      {
        heading: 'What a traveller can carry',
        body:
          'On Jibly: documents, keys, personal items, clothes, light electronics and over-the-counter medicines (under conditions). Food, cash, jewellery and prescription medicines are not accepted.',
      },
    ],
    notJibly: NOT_JIBLY,
    faq: [
      {
        q: 'Can I send food from Morocco to France with a traveller?',
        a: 'Not on Jibly: food is not an allowed category. Animal products are tightly controlled when entering the EU anyway.',
      },
      {
        q: 'Does Jibly work to countries other than France?',
        a: 'Yes. A traveller can post any route, across Europe and beyond. Morocco and France are simply the first routes.',
      },
    ],
    related: ['/en/send-parcel-within-europe', '/en/send-parcel-to-morocco', '/en/send-small-parcel-abroad'],
    group: 'destination',
    card: {
      fr: { title: 'Du Maroc vers l’Europe', text: 'France, Belgique, Espagne… : les options.' },
      en: { title: 'From Morocco to Europe', text: 'France, Belgium, Spain…: your options.' },
    },
  },

  {
    path: '/en/send-parcel-within-europe',
    lang: 'en',
    alt: '/envoyer-colis-europe',
    label: 'Send a parcel within Europe',
    title: 'Sending a parcel within Europe: post, express or traveller',
    description:
      'Send a document or small parcel within Europe (France, Belgium, Spain, Italy, Germany, UK…): options, customs inside and outside the EU, and when a traveller helps.',
    h1: 'Sending a document or small parcel within Europe',
    answer:
      'To send a parcel within Europe, the usual options are the post (La Poste, bpost, Correos, Deutsche Post, Royal Mail…), express couriers (DHL, FedEx, UPS) and comparison sites that offer several couriers. For a document, keys or a small personal item, a traveller already making the trip can also hand it over in person, at a price you agree together. Between EU countries there are no customs duties; to or from the UK, Switzerland or Norway, formalities apply.',
    optionsHeading: 'Sending within Europe: options',
    options: [POST, EXPRESS, COMPARATOR, TRAVELLER],
    trips: { heading: 'Travellers between European countries', match: { kind: 'country', from: 'EUROPE', to: 'EUROPE' } },
    sections: [
      {
        heading: 'Inside or outside the EU?',
        bullets: [
          'Between two EU countries (France, Belgium, Spain, Italy, Germany, the Netherlands, Portugal…), goods move without customs duties.',
          'To the UK, Switzerland or Norway, which are not in the EU, a parcel of goods needs a customs declaration.',
          'Some territories (Canary Islands, French overseas departments…) have special tax rules: check before sending.',
        ],
      },
      {
        heading: 'When a traveller is a good idea',
        body:
          'For a forgotten item, keys, an original document or a small gift, a traveller already heading to the same city saves the packaging, label and drop-off: you meet them, they hand it to your recipient. The price is agreed between you and Jibly’s fee is shown before you pay.',
      },
    ],
    notJibly: NOT_JIBLY,
    faq: [
      {
        q: 'Do I need a customs declaration to send a parcel to the UK?',
        a: 'Yes, for goods: since Brexit the UK is outside the EU and a declaration is required. Documents are usually exempt; check with your courier.',
      },
      {
        q: 'Are there Jibly travellers between European countries?',
        a: 'Travellers post their own trips. Available trips appear on this page; if there are none for your dates, post your request.',
      },
    ],
    related: ['/en/send-small-parcel-abroad', '/en/send-parcel-from-morocco-to-europe', '/en/traveller-vs-courier-vs-post'],
    group: 'destination',
    card: {
      fr: { title: 'Un colis en Europe', text: 'Dans l’UE, hors UE : options et règles.' },
      en: { title: 'A parcel within Europe', text: 'In or outside the EU: options and rules.' },
    },
  },

  {
    path: '/en/traveller-vs-courier-vs-post',
    lang: 'en',
    alt: '/comparatif-voyageur-express-poste',
    label: 'Traveller, courier or post',
    title: 'Traveller, express courier or post: which to choose to send abroad',
    description:
      'An honest comparison for sending a document or small parcel abroad: express courier (DHL, FedEx, UPS), national post, comparison sites or a traveller. Strengths and limits.',
    h1: 'Traveller, express courier or post: which to choose?',
    answer:
      'An express courier (DHL, FedEx, UPS) is the most reliable choice when you need a short delivery time and end-to-end tracking, anywhere in the world. The post is often the cheapest when there is no rush. A comparison site helps you find the right courier. A traveller already making the trip is an alternative for documents and small personal items: in-person handover and a price agreed between you — but only if someone is making the trip on your dates.',
    optionsHeading: 'The comparison',
    options: [EXPRESS, POST, COMPARATOR, TRAVELLER],
    sections: [
      {
        heading: 'Strengths',
        bullets: [
          'Express: speed, pickup at your door, full tracking, customs handled.',
          'Post: network everywhere, often lower prices for non-urgent shipments.',
          'Comparison site: several quotes at once.',
          'Traveller: in-person handover, you know who carries it, price agreed between you.',
        ],
      },
      {
        heading: 'Limits',
        bullets: [
          'Express: often the most expensive for a small personal item.',
          'Post: longer delivery times, tracking varies by service.',
          'Comparison site: you still depend on the chosen courier’s rules.',
          'Traveller: depends on the trips posted, allowed small items only, no guaranteed delivery time.',
        ],
      },
    ],
    notJibly: NOT_JIBLY,
    faq: [
      {
        q: 'Is it safe to give an item to a traveller?',
        a: 'On Jibly, every traveller verifies their identity before they can be booked, payment goes through the platform and the handover is confirmed with a code. Valuables remain forbidden: an insured courier is a better fit for them.',
      },
      {
        q: 'Is a traveller faster than express?',
        a: 'Sometimes, if a traveller is leaving the same day for the same city. But nothing is guaranteed: it depends on the trips posted. Express can be booked straight away.',
      },
    ],
    related: ['/en/dhl-alternatives', '/en/send-urgent-document-abroad', '/en/send-small-parcel-abroad'],
    group: 'regles',
    card: {
      fr: { title: 'Voyageur, express ou poste', text: 'Le comparatif, points forts et limites.' },
      en: { title: 'Traveller, express or post', text: 'Side by side: strengths and limits.' },
    },
  },
];
