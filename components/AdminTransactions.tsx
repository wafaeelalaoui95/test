'use client';

import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { ChevronDown, Loader2, Search, Image as ImageIcon, ExternalLink } from 'lucide-react';

// =============================================================================
// AdminTransactions — every booking, with everything people entered into it
// =============================================================================
// The list gives one status per booking. Opening a row loads the whole record:
// the booking, the request and the trip behind it, both people, declarations,
// disputes, reviews, price offers, the chat and every photo. Columns this file
// has a French label for are shown under that label; any other column is
// shown under its raw name, so nothing stored is ever left off the screen.

type Status = { code: string; label: string };
type Row = {
  id: string;
  createdAt: string;
  route: string;
  item: string | null;
  euros: number | null;
  paid: boolean;
  senderName: string | null;
  travelerName: string | null;
  hasPhoto: boolean;
  status: Status;
};
type Detail = {
  booking: Record<string, any>;
  status: Status;
  sender: Record<string, any> | null;
  traveler: Record<string, any> | null;
  trip: Record<string, any> | null;
  request: Record<string, any> | null;
  attestations: Record<string, any>[];
  disputes: Record<string, any>[];
  reviews: Record<string, any>[];
  offers: Record<string, any>[];
  messages: Record<string, any>[];
  signed: Record<string, string>;
};

const LABELS: Record<string, string> = {
  id: 'Identifiant',
  created_at: 'Créée le',
  updated_at: 'Modifiée le',
  status: 'Statut (base)',
  sender_id: 'Expéditeur (id)',
  traveler_user_id: 'Voyageur (id)',
  traveler_trip_id: 'Trajet (id)',
  shipping_request_id: 'Demande (id)',
  user_id: 'Utilisateur (id)',
  item_category: 'Catégorie',
  item_title: 'Objet',
  item_description: 'Description',
  photo_url: 'Photo du colis',
  proposed_price: 'Rémunération voyageur (€)',
  original_price: 'Prix initial (€)',
  price_pending_by: 'Contre-offre en attente de',
  price_updated_at: 'Prix modifié le',
  sender_countered: 'Contre-offre de l’expéditeur',
  traveler_countered: 'Contre-offre du voyageur',
  pickup_city: 'Départ',
  destination_city: 'Arrivée',
  initiated_by: 'Initiée par',
  traveler_message: 'Message du voyageur',
  payment_intent_id: 'Paiement Stripe',
  payment_status: 'Statut du paiement',
  payment_amount: 'Montant payé',
  refunded_amount: 'Montant remboursé',
  transfer_id: 'Virement au voyageur (Stripe)',
  pickup_code: 'Code de remise',
  delivery_code: 'Code de livraison',
  pickup_confirmed_at: 'Remise confirmée le',
  pickup_confirmed_by: 'Remise confirmée par (id)',
  received_confirmed_at: 'Livraison confirmée le',
  auto_released_at: 'Libérée automatiquement le',
  delivery_proof_url: 'Preuve de livraison',
  delivery_proof_uploaded_at: 'Preuve envoyée le',
  delivery_proof_receiver_name: 'Nom de la personne qui a reçu',
  delivery_proof_notes: 'Note de livraison',
  cancelled_at: 'Annulée le',
  cancellation_reason: 'Raison de l’annulation',
  cancellation_note: 'Précision sur l’annulation',
  cancelled_by: 'Annulée par (id)',
  departure_date: 'Date de départ',
  arrival_date: 'Date d’arrivée',
  desired_delivery_date: 'Date souhaitée',
  departure_city: 'Ville de départ',
  arrival_city: 'Ville d’arrivée',
  departure_country: 'Pays de départ',
  arrival_country: 'Pays d’arrivée',
  available_space: 'Espace disponible',
  space: 'Espace',
  size: 'Taille',
  parcel_size: 'Taille du colis',
  weight_kg: 'Poids (kg)',
  declared_value: 'Valeur déclarée (€)',
  urgency: 'Urgence',
  accepted_categories: 'Catégories acceptées',
  notes: 'Notes',
  description: 'Description',
  full_name: 'Nom',
  email: 'E-mail',
  phone: 'Téléphone',
  city: 'Ville',
  country: 'Pays',
  bio: 'Bio',
  avatar_url: 'Photo de profil',
  verification_level: 'Niveau de vérification',
  identity_verified_at: 'Identité vérifiée le',
  rating: 'Note',
  trips_completed: 'Trajets terminés',
  stripe_account_id: 'Compte Stripe Connect',
  stripe_customer_id: 'Client Stripe',
  kind: 'Type',
  statement: 'Texte déclaré',
  locale: 'Langue',
  policy_version: 'Version des conditions',
  reason: 'Raison',
  details: 'Détails',
  reporter_id: 'Signalé par (id)',
  reported_user_id: 'Contre (id)',
  resolution: 'Décision',
  resolved_at: 'Tranché le',
  reviewer_id: 'Auteur (id)',
  reviewed_user_id: 'Concerne (id)',
  comment: 'Commentaire',
  amount: 'Montant',
  proposed_by: 'Proposé par',
  message: 'Message',
  booking_intent_id: 'Réservation (id)',
};

const TONE: Record<string, string> = {
  dispute: 'bg-blush-50 text-blush-500 border-blush-100',
  cancelled_owed: 'bg-blush-50 text-blush-500 border-blush-100',
  failed: 'bg-blush-50 text-blush-500 border-blush-100',
  paid_out: 'bg-mint-50 text-mint-600 border-mint-200',
  cancelled: 'bg-cream-100 text-ink-400 border-ink-100',
  cancelled_refunded: 'bg-cream-100 text-ink-400 border-ink-100',
};
const toneOf = (c: string) => TONE[c] ?? 'bg-lavender-50 text-ink-600 border-lavender-200';

const FILTERS: { id: string; label: string; match: (c: string) => boolean }[] = [
  { id: 'all', label: 'Toutes', match: () => true },
  { id: 'live', label: 'En cours', match: (c) => !['paid_out', 'cancelled', 'cancelled_refunded', 'cancelled_owed'].includes(c) },
  { id: 'attention', label: 'À traiter', match: (c) => ['dispute', 'cancelled_owed', 'failed', 'proof'].includes(c) },
  { id: 'done', label: 'Terminées', match: (c) => c === 'paid_out' },
  { id: 'cancelled', label: 'Annulées', match: (c) => c.startsWith('cancelled') },
];

const CENTS = new Set(['payment_amount', 'refunded_amount', 'amount_cents']);
const ISO = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/;

function fmtDateTime(s: string) {
  return new Date(s).toLocaleString('fr-FR', { dateStyle: 'medium', timeStyle: 'short' });
}

export function AdminTransactions() {
  const [rows, setRows] = useState<Row[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [q, setQ] = useState('');
  const [filter, setFilter] = useState('all');
  const [openId, setOpenId] = useState<string | null>(null);

  useEffect(() => {
    let off = false;
    fetch('/api/admin/transactions')
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then((d) => !off && setRows(d.transactions))
      .catch(() => !off && setError('Impossible de charger les transactions. Rechargez la page.'));
    return () => {
      off = true;
    };
  }, []);

  const shown = useMemo(() => {
    if (!rows) return [];
    const f = FILTERS.find((x) => x.id === filter)!;
    const needle = q.trim().toLowerCase();
    return rows.filter(
      (r) =>
        f.match(r.status.code) &&
        (!needle ||
          [r.id, r.route, r.item, r.senderName, r.travelerName, r.status.label]
            .filter(Boolean)
            .join(' ')
            .toLowerCase()
            .includes(needle))
    );
  }, [rows, q, filter]);

  if (error) return <p className="text-[14px] text-blush-500">{error}</p>;
  if (!rows)
    return (
      <div className="flex items-center gap-2 text-[14px] text-ink-400">
        <Loader2 className="w-4 h-4 animate-spin" /> Chargement…
      </div>
    );

  return (
    <div>
      <h3 className="text-[15px] font-semibold text-ink-600 mb-1">Transactions ({rows.length})</h3>
      <p className="text-[13px] text-ink-400 leading-relaxed mb-4">
        Toutes les réservations, de la plus récente à la plus ancienne. Cliquez sur une ligne pour voir tout ce que
        l’expéditeur et le voyageur ont saisi, les photos, les déclarations, les litiges et le chat.
      </p>

      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <label className="relative flex-1">
          <Search className="w-4 h-4 text-ink-300 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            id="admin-tx-search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Nom, ville, objet, identifiant…"
            className="w-full pl-10 pr-4 py-2.5 rounded-full border border-ink-100 bg-white text-[14px] text-ink-600 outline-none focus:border-ink-300"
          />
        </label>
        <div className="flex gap-1.5 flex-wrap">
          {FILTERS.map((f) => (
            <button
              key={f.id}
              onClick={() => setFilter(f.id)}
              className={`px-3.5 py-2 rounded-full text-[13px] font-medium border ${
                filter === f.id ? 'bg-ink-600 text-white border-ink-600' : 'border-ink-100 text-ink-500 hover:bg-cream-100'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {!shown.length && <p className="text-[13px] text-ink-300">Aucune transaction ne correspond.</p>}

      <ul className="bg-white rounded-2xl border border-ink-50 divide-y divide-ink-50 overflow-hidden">
        {shown.map((r) => {
          const open = openId === r.id;
          return (
            <li key={r.id}>
              <button
                onClick={() => setOpenId(open ? null : r.id)}
                className="w-full text-start px-5 py-4 hover:bg-cream-50 flex items-center gap-4"
              >
                <div className="min-w-0 flex-1">
                  <div className="text-[14px] font-semibold text-ink-600 truncate flex items-center gap-1.5">
                    {r.item ?? '(sans objet)'} · {r.route}
                    {r.hasPhoto && <ImageIcon className="w-3.5 h-3.5 text-ink-300 flex-shrink-0" />}
                  </div>
                  <div className="text-[13px] text-ink-400 truncate">
                    {r.senderName ?? '?'} → {r.travelerName ?? '?'} · {fmtDateTime(r.createdAt)}
                  </div>
                </div>
                <div className="hidden sm:block text-[13px] text-ink-500 w-24 text-end flex-shrink-0 tabular-nums">
                  {r.euros != null ? `${r.euros.toFixed(2)} €` : '—'}
                  {!r.paid && r.euros != null && <div className="text-[11px] text-ink-300">non payé</div>}
                </div>
                <span
                  className={`text-[12px] font-medium px-2.5 py-1 rounded-full border flex-shrink-0 ${toneOf(r.status.code)}`}
                >
                  {r.status.label}
                </span>
                <ChevronDown
                  className={`w-4 h-4 text-ink-300 flex-shrink-0 transition-transform ${open ? 'rotate-180' : ''}`}
                />
              </button>
              {open && <TransactionDetail id={r.id} />}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function TransactionDetail({ id }: { id: string }) {
  const [d, setD] = useState<Detail | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let off = false;
    fetch(`/api/admin/transactions?id=${encodeURIComponent(id)}`)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then((x) => !off && setD(x))
      .catch(() => !off && setError('Impossible de charger le détail. Réessayez.'));
    return () => {
      off = true;
    };
  }, [id]);

  if (error) return <p className="px-5 pb-5 text-[13px] text-blush-500">{error}</p>;
  if (!d)
    return (
      <div className="px-5 pb-5 flex items-center gap-2 text-[13px] text-ink-400">
        <Loader2 className="w-4 h-4 animate-spin" /> Chargement du détail…
      </div>
    );

  const b = d.booking;
  const nameOf = (uid: string | null | undefined) =>
    uid && uid === d.sender?.id
      ? `${d.sender?.full_name ?? 'Expéditeur'} (expéditeur)`
      : uid && uid === d.traveler?.id
      ? `${d.traveler?.full_name ?? 'Voyageur'} (voyageur)`
      : uid ?? '—';

  // Every photo found anywhere in the record, labelled by where it came from.
  const photos: { label: string; src: string }[] = [];
  const walk = (v: any, where: string, key = '') => {
    if (typeof v === 'string' && d.signed[v]) photos.push({ label: `${where} · ${LABELS[key] ?? key}`, src: d.signed[v] });
    else if (Array.isArray(v)) v.forEach((x) => walk(x, where, key));
    else if (v && typeof v === 'object') Object.entries(v).forEach(([k, x]) => walk(x, where, k));
  };
  walk(b, 'Réservation');
  walk(d.request, 'Demande');
  walk(d.trip, 'Trajet');
  walk(d.disputes, 'Litige');
  walk(d.attestations, 'Déclaration');
  walk(d.sender, 'Expéditeur');
  walk(d.traveler, 'Voyageur');

  const timeline: [string, string | null | undefined][] = [
    ['Réservation créée', b.created_at],
    ['Contre-offre / prix modifié', b.price_updated_at],
    ['Remise du colis', b.pickup_confirmed_at],
    ['Preuve de livraison envoyée', b.delivery_proof_uploaded_at],
    ['Livraison confirmée (code)', b.received_confirmed_at],
    ['Libération automatique', b.auto_released_at],
    ['Annulation', b.cancelled_at],
  ];

  return (
    <div className="px-5 pb-6 flex flex-col gap-5 text-[13px]">
      <div className="flex flex-wrap items-center gap-2">
        <span className={`text-[13px] font-semibold px-3 py-1 rounded-full border ${toneOf(d.status.code)}`}>
          {d.status.label}
        </span>
        <span className="text-ink-400">
          Paiement : {b.payment_status ?? '—'}
          {b.payment_amount != null && ` · ${(b.payment_amount / 100).toFixed(2)} €`}
          {(b.refunded_amount ?? 0) > 0 && ` · remboursé ${(b.refunded_amount / 100).toFixed(2)} €`}
        </span>
        {b.payment_intent_id && (
          <a
            href={`https://dashboard.stripe.com/payments/${b.payment_intent_id}`}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 underline text-ink-600"
          >
            Ouvrir dans Stripe <ExternalLink className="w-3 h-3" />
          </a>
        )}
      </div>

      <ol className="flex flex-wrap gap-x-6 gap-y-2">
        {timeline.map(([k, v]) => (
          <li key={k} className={v ? 'text-ink-600' : 'text-ink-200'}>
            <div className="text-[11px] uppercase tracking-wide">{k}</div>
            <div className="font-medium tabular-nums">{v ? fmtDateTime(v) : '—'}</div>
          </li>
        ))}
      </ol>

      <Block title={`Photos (${photos.length})`} open>
        {photos.length ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {photos.map((p) => (
              <a key={p.src} href={p.src} target="_blank" rel="noreferrer" className="block">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={p.src} alt={p.label} className="w-full aspect-square object-cover rounded-xl border border-ink-50" />
                <div className="text-[12px] text-ink-400 mt-1">{p.label}</div>
              </a>
            ))}
          </div>
        ) : (
          <p className="text-ink-300">Aucune photo pour cette transaction.</p>
        )}
      </Block>

      <Block title="Réservation" open>
        <Fields obj={b} signed={d.signed} nameOf={nameOf} />
      </Block>

      <div className="grid lg:grid-cols-2 gap-5">
        <Block title={`Expéditeur · ${d.sender?.full_name ?? '—'}`} open>
          {d.sender ? <Fields obj={d.sender} signed={d.signed} nameOf={nameOf} /> : <Empty />}
        </Block>
        <Block title={`Voyageur · ${d.traveler?.full_name ?? '—'}`} open>
          {d.traveler ? <Fields obj={d.traveler} signed={d.signed} nameOf={nameOf} /> : <Empty />}
        </Block>
      </div>

      <div className="grid lg:grid-cols-2 gap-5">
        <Block title="Demande d’envoi publiée">
          {d.request ? <Fields obj={d.request} signed={d.signed} nameOf={nameOf} /> : <Empty text="Réservation directe, sans demande publiée." />}
        </Block>
        <Block title="Trajet du voyageur">
          {d.trip ? <Fields obj={d.trip} signed={d.signed} nameOf={nameOf} /> : <Empty />}
        </Block>
      </div>

      <List title="Déclarations signées" rows={d.attestations} signed={d.signed} nameOf={nameOf} />
      <List title="Litiges et signalements" rows={d.disputes} signed={d.signed} nameOf={nameOf} open={d.disputes.length > 0} />
      <List title="Offres de prix" rows={d.offers} signed={d.signed} nameOf={nameOf} />
      <List title="Avis" rows={d.reviews} signed={d.signed} nameOf={nameOf} />

      <Block title={`Chat (${d.messages.length} messages)`}>
        {d.messages.length ? (
          <ul className="flex flex-col gap-2">
            {d.messages.map((m) => (
              <li key={m.id} className="bg-cream-50 rounded-xl px-3 py-2">
                <div className="text-[11px] text-ink-300">
                  {nameOf(m.sender_id)} · {m.created_at ? fmtDateTime(m.created_at) : ''}
                </div>
                <div className="text-ink-600 whitespace-pre-wrap break-words">{m.body ?? m.message ?? ''}</div>
              </li>
            ))}
          </ul>
        ) : (
          <Empty text="Aucun message." />
        )}
      </Block>
    </div>
  );
}

function Block({ title, open, children }: { title: string; open?: boolean; children: ReactNode }) {
  return (
    <details open={open} className="rounded-2xl border border-ink-50 bg-white min-w-0">
      <summary className="cursor-pointer px-4 py-3 font-semibold text-ink-600 text-[14px]">{title}</summary>
      <div className="px-4 pb-4 min-w-0">{children}</div>
    </details>
  );
}

function List({
  title,
  rows,
  signed,
  nameOf,
  open,
}: {
  title: string;
  rows: Record<string, any>[];
  signed: Record<string, string>;
  nameOf: (id: string) => string;
  open?: boolean;
}) {
  return (
    <Block title={`${title} (${rows.length})`} open={open}>
      {rows.length ? (
        <div className="flex flex-col gap-4">
          {rows.map((r, i) => (
            <div key={r.id ?? i} className="border-t border-ink-50 pt-3 first:border-0 first:pt-0">
              <Fields obj={r} signed={signed} nameOf={nameOf} />
            </div>
          ))}
        </div>
      ) : (
        <Empty text="Aucun." />
      )}
    </Block>
  );
}

function Empty({ text = 'Aucune donnée.' }: { text?: string }) {
  return <p className="text-ink-300">{text}</p>;
}

/** Every column of a row: labelled when known, raw name otherwise. */
function Fields({
  obj,
  signed,
  nameOf,
}: {
  obj: Record<string, any>;
  signed: Record<string, string>;
  nameOf: (id: string) => string;
}) {
  const entries = Object.entries(obj).sort(([a], [b]) => {
    const ka = a in LABELS ? 0 : 1;
    const kb = b in LABELS ? 0 : 1;
    return ka - kb;
  });
  return (
    <dl className="grid sm:grid-cols-2 gap-x-6 gap-y-2.5">
      {entries.map(([k, v]) => (
        <div key={k} className="min-w-0">
          <dt className="text-ink-300 text-[12px]">{LABELS[k] ?? k}</dt>
          <dd className="text-ink-600 font-medium break-words">{fmt(k, v, signed, nameOf)}</dd>
        </div>
      ))}
    </dl>
  );
}

function fmt(k: string, v: any, signed: Record<string, string>, nameOf: (id: string) => string): ReactNode {
  if (v === null || v === undefined || v === '') return <span className="text-ink-200">—</span>;
  if (typeof v === 'boolean') return v ? 'Oui' : 'Non';
  if (typeof v === 'number' && CENTS.has(k)) return `${(v / 100).toFixed(2)} €`;
  if (typeof v === 'string' && signed[v])
    return (
      <a href={signed[v]} target="_blank" rel="noreferrer" className="underline">
        Voir la photo
      </a>
    );
  if (typeof v === 'string' && ISO.test(v)) return fmtDateTime(v);
  if (typeof v === 'string' && /_id$|_by$/.test(k) && /^[0-9a-f-]{36}$/i.test(v)) return nameOf(v);
  if (typeof v === 'object')
    return <pre className="text-[12px] whitespace-pre-wrap break-words font-mono">{JSON.stringify(v, null, 2)}</pre>;
  return <span className="whitespace-pre-wrap">{String(v)}</span>;
}
