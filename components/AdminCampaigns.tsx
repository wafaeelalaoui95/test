'use client';

import { Fragment, useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';

// =============================================================================
// AdminCampaigns — ce que chaque lien de campagne (utm_campaign) a apporté
// =============================================================================
// Reads /api/admin/users and groups the accounts by the campaign link they
// signed up from (lib/utm.ts). Visits are in Vercel Analytics; this is what
// happened after: accounts, senders who paid, travellers who carried.

type User = {
  id: string;
  name: string | null;
  email: string | null;
  createdAt: string;
  emailConfirmed: boolean;
  deleted: boolean;
  sentPaid: number;
  carriedPaid: number;
  spentEur: number;
  trips: number;
  requests: number;
  sourceCampaign: string | null;
  sourceName: string | null;
};

type Row = {
  campaign: string;
  source: string | null;
  users: User[];
  confirmed: number;
  published: number;
  senders: number;
  bookings: number;
  spentEur: number;
  carriers: number;
};

const eur = (n: number) =>
  n.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 });

export function AdminCampaigns() {
  const [rows, setRows] = useState<Row[] | null>(null);
  const [error, setError] = useState(false);
  const [open, setOpen] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/admin/users')
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then(({ users }: { users: User[] }) => {
        const map = new Map<string, Row>();
        for (const u of users) {
          if (!u.sourceCampaign && !u.sourceName) continue;
          const key = u.sourceCampaign ?? `(${u.sourceName})`;
          let row = map.get(key);
          if (!row) {
            row = { campaign: key, source: u.sourceName, users: [], confirmed: 0, published: 0, senders: 0, bookings: 0, spentEur: 0, carriers: 0 };
            map.set(key, row);
          }
          row.users.push(u);
          if (u.emailConfirmed) row.confirmed += 1;
          if (u.trips + u.requests > 0) row.published += 1;
          if (u.sentPaid > 0) row.senders += 1;
          row.bookings += u.sentPaid;
          row.spentEur += u.spentEur;
          if (u.carriedPaid > 0) row.carriers += 1;
        }
        setRows([...map.values()].sort((a, b) => b.users.length - a.users.length));
      })
      .catch(() => setError(true));
  }, []);

  if (error) return <p className="text-[14px] text-ink-400">Impossible de charger les campagnes. Réessayez.</p>;
  if (!rows) return <Loader2 className="w-5 h-5 animate-spin text-ink-300" />;

  return (
    <div className="space-y-6">
      <div className="rounded-2xl bg-white border border-ink-50 p-5 text-[14px] text-ink-500 leading-relaxed">
        Lien à donner : <code className="text-[13px] bg-cream-50 px-1.5 py-0.5 rounded">https://jibly.io/?utm_source=instagram&amp;utm_medium=influencer&amp;utm_campaign=<b>nom</b></code>
        <br />
        Les visites sont dans Vercel → Analytics. Ici : les comptes créés depuis ce lien et ce qu’ils ont fait.
      </div>

      {rows.length === 0 ? (
        <p className="text-[14px] text-ink-400">Aucun compte créé depuis un lien de campagne pour l’instant.</p>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-ink-50 bg-white">
          <table className="w-full text-[14px]">
            <thead className="text-start text-[12px] text-ink-300 uppercase tracking-wide">
              <tr>
                <th className="text-start px-4 py-3">Campagne</th>
                <th className="text-end px-4 py-3">Comptes</th>
                <th className="text-end px-4 py-3">E-mail confirmé</th>
                <th className="text-end px-4 py-3">Ont publié</th>
                <th className="text-end px-4 py-3">Expéditeurs payants</th>
                <th className="text-end px-4 py-3">Réservations</th>
                <th className="text-end px-4 py-3">Montant payé</th>
                <th className="text-end px-4 py-3">Voyageurs payés</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <Fragment key={r.campaign}>
                  <tr
                    onClick={() => setOpen(open === r.campaign ? null : r.campaign)}
                    className="border-t border-ink-50 cursor-pointer hover:bg-cream-50"
                  >
                    <td className="px-4 py-3 font-semibold text-ink-600">
                      {r.campaign}
                      {r.source && <span className="ms-2 text-[12px] font-normal text-ink-300">{r.source}</span>}
                    </td>
                    <td className="text-end px-4 py-3 font-semibold text-ink-600">{r.users.length}</td>
                    <td className="text-end px-4 py-3">{r.confirmed}</td>
                    <td className="text-end px-4 py-3">{r.published}</td>
                    <td className="text-end px-4 py-3">{r.senders}</td>
                    <td className="text-end px-4 py-3">{r.bookings}</td>
                    <td className="text-end px-4 py-3">{eur(r.spentEur)}</td>
                    <td className="text-end px-4 py-3">{r.carriers}</td>
                  </tr>
                  {open === r.campaign && (
                    <tr className="bg-cream-50">
                      <td colSpan={8} className="px-4 py-3">
                        <ul className="space-y-1 text-[13px]">
                          {r.users.map((u) => (
                            <li key={u.id}>
                              <span className="font-semibold text-ink-600">{u.name ?? '—'}</span>{' '}
                              <span className="text-ink-400">{u.email}</span>{' '}
                              <span className="text-ink-300">
                                · {new Date(u.createdAt).toLocaleDateString('fr-FR')}
                                {u.sentPaid > 0 && ` · ${u.sentPaid} réservation(s)`}
                                {u.carriedPaid > 0 && ` · a transporté ${u.carriedPaid}`}
                                {u.deleted && ' · supprimé'}
                              </span>
                            </li>
                          ))}
                        </ul>
                      </td>
                    </tr>
                  )}
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
