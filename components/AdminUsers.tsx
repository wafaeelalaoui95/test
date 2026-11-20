'use client';

import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { Loader2, Search, ChevronDown } from 'lucide-react';

// =============================================================================
// AdminUsers — tous les comptes, avec ce qu'ils ont fait sur Jibly
// =============================================================================
// Reads /api/admin/users. Search by name, email, phone or city; filter by what
// the person has done; open a row for the details.

type User = {
  id: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  city: string | null;
  country: string | null;
  createdAt: string;
  lastSignInAt: string | null;
  emailConfirmed: boolean;
  verification: string | null;
  identityStatus: string | null;
  payoutsEnabled: boolean;
  deleted: boolean;
  rating: number;
  trips: number;
  tripsOpen: number;
  requests: number;
  requestsOpen: number;
  sentPaid: number;
  carriedPaid: number;
  spentEur: number;
};

type Filter = 'all' | 'travelers' | 'senders' | 'inactive';

const FILTERS: { id: Filter; label: string }[] = [
  { id: 'all', label: 'Tous' },
  { id: 'travelers', label: 'Voyageurs' },
  { id: 'senders', label: 'Expéditeurs' },
  { id: 'inactive', label: 'Rien publié' },
];

function fmtDate(iso: string | null) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' });
}

function ago(iso: string | null) {
  if (!iso) return 'jamais';
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);
  if (days <= 0) return "aujourd'hui";
  if (days === 1) return 'hier';
  return `il y a ${days} j`;
}

function identityLabel(u: User) {
  if (u.verification === 'id_verified' || u.verification === 'trusted') return 'Identité vérifiée';
  if (u.identityStatus) return `Identité : ${u.identityStatus}`;
  return 'Identité non vérifiée';
}

export function AdminUsers() {
  const [users, setUsers] = useState<User[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [q, setQ] = useState('');
  const [filter, setFilter] = useState<Filter>('all');
  const [openId, setOpenId] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/admin/users')
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then((d) => setUsers(d.users ?? []))
      .catch((e) => setError(e.message));
  }, []);

  const shown = useMemo(() => {
    if (!users) return [];
    const needle = q.trim().toLowerCase();
    return users.filter((u) => {
      if (filter === 'travelers' && u.trips === 0) return false;
      if (filter === 'senders' && u.requests === 0 && u.sentPaid === 0) return false;
      if (filter === 'inactive' && (u.trips > 0 || u.requests > 0 || u.sentPaid > 0)) return false;
      if (!needle) return true;
      return [u.name, u.email, u.phone, u.city, u.country]
        .some((v) => (v ?? '').toLowerCase().includes(needle));
    });
  }, [users, q, filter]);

  if (error) return <p className="text-[13px] text-blush-500 font-mono">/api/admin/users: {error}</p>;
  if (!users) return <Loader2 className="w-4 h-4 animate-spin text-ink-300" />;

  const live = users.filter((u) => !u.deleted);
  const weekAgo = Date.now() - 7 * 86_400_000;
  const stats = [
    { label: 'Comptes', value: live.length },
    { label: 'Inscrits cette semaine', value: live.filter((u) => new Date(u.createdAt).getTime() > weekAgo).length },
    { label: 'Ont publié un trajet', value: live.filter((u) => u.trips > 0).length },
    { label: 'Ont publié une demande', value: live.filter((u) => u.requests > 0).length },
    { label: 'Ont payé une réservation', value: live.filter((u) => u.sentPaid > 0).length },
  ];

  return (
    <div>
      <h3 className="text-[15px] font-semibold text-ink-600 mb-1">Utilisateurs ({live.length})</h3>
      <p className="text-[13px] text-ink-400 leading-relaxed mb-4">
        Tous les comptes, du plus récent au plus ancien. Cliquez sur une ligne pour le détail.
      </p>

      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-5">
        {stats.map((s) => (
          <div key={s.label} className="bg-white rounded-2xl border border-ink-50 px-4 py-3">
            <div className="text-2xl font-extrabold text-ink-600 num-display">{s.value}</div>
            <div className="text-[12px] text-ink-400 mt-0.5">{s.label}</div>
          </div>
        ))}
      </div>

      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <label className="relative flex-1">
          <Search className="w-4 h-4 text-ink-300 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Nom, e-mail, téléphone, ville…"
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

      {!shown.length && <p className="text-[13px] text-ink-300">Aucun utilisateur ne correspond.</p>}

      <ul className="bg-white rounded-2xl border border-ink-50 divide-y divide-ink-50 overflow-hidden">
        {shown.map((u) => {
          const open = openId === u.id;
          return (
            <li key={u.id}>
              <button
                onClick={() => setOpenId(open ? null : u.id)}
                className="w-full text-start px-5 py-4 hover:bg-cream-50 flex items-center gap-4"
              >
                <div className="min-w-0 flex-1">
                  <div className="text-[14px] font-semibold text-ink-600 truncate">
                    {u.deleted ? 'Compte supprimé' : u.name ?? '(sans nom)'}
                  </div>
                  <div className="text-[13px] text-ink-400 truncate">{u.email ?? '—'}</div>
                </div>
                <div className="hidden sm:block text-[13px] text-ink-400 w-40 flex-shrink-0">
                  {u.trips} trajet{u.trips > 1 ? 's' : ''} · {u.requests} demande{u.requests > 1 ? 's' : ''}
                </div>
                <div className="hidden md:block text-[13px] text-ink-400 w-32 flex-shrink-0">
                  Inscrit {ago(u.createdAt)}
                </div>
                <ChevronDown className={`w-4 h-4 text-ink-300 flex-shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} />
              </button>
              {open && (
                <dl className="px-5 pb-5 grid sm:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-3 text-[13px]">
                  <Item k="Téléphone" v={u.phone ?? '—'} />
                  <Item k="Ville" v={[u.city, u.country].filter(Boolean).join(', ') || '—'} />
                  <Item k="Inscription" v={fmtDate(u.createdAt)} />
                  <Item k="Dernière connexion" v={ago(u.lastSignInAt)} />
                  <Item k="E-mail confirmé" v={u.emailConfirmed ? 'Oui' : 'Non'} />
                  <Item k="Identité" v={identityLabel(u)} />
                  <Item k="Peut être payé (Stripe)" v={u.payoutsEnabled ? 'Oui' : 'Non'} />
                  <Item k="Note" v={u.rating ? `${u.rating.toFixed(1)} / 5` : '—'} />
                  <Item k="Trajets publiés" v={`${u.trips} (${u.tripsOpen} ouverts)`} />
                  <Item k="Demandes publiées" v={`${u.requests} (${u.requestsOpen} en attente)`} />
                  <Item k="Colis envoyés (payés)" v={`${u.sentPaid} · ${u.spentEur.toFixed(2)} €`} />
                  <Item k="Colis transportés (payés)" v={String(u.carriedPaid)} />
                  <Item k="Profil public" v={<a href={`/u/${u.id}`} className="underline text-ink-600">Voir</a>} />
                </dl>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function Item({ k, v }: { k: string; v: ReactNode }) {
  return (
    <div>
      <dt className="text-ink-300">{k}</dt>
      <dd className="text-ink-600 font-medium">{v}</dd>
    </div>
  );
}
