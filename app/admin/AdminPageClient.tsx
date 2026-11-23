'use client';

import { useEffect, useState, type ComponentType } from 'react';
import { useI18n } from '@/lib/i18n/context';
import { AdminRefund } from '@/components/AdminRefund';
import { AdminOverview } from '@/components/AdminOverview';
import { AdminDisputes } from '@/components/AdminDisputes';
import { AdminMatchAlerts } from '@/components/AdminMatchAlerts';
import { AdminChats } from '@/components/AdminChats';
import { AdminUsers } from '@/components/AdminUsers';
import { AdminOfferReminders } from '@/components/AdminOfferReminders';
import { AdminTransactions } from '@/components/AdminTransactions';
import { AdminBroadcast } from '@/components/AdminBroadcast';

/**
 * Operator console — only the tools that read and act on real data.
 *
 * One section at a time. Each tool fetches its data when it mounts, so
 * rendering them all at once meant every admin visit fired every query (all
 * users, all chats, all money) whether or not the operator wanted them. Now a
 * section is only mounted — and only loads — when it is picked.
 *
 * The last section picked is remembered per browser, as a convenience only.
 */

type SectionId = 'transactions' | 'alerts' | 'offers' | 'disputes' | 'chats' | 'users' | 'money' | 'refund' | 'broadcast';

const SECTIONS: { id: SectionId; label: string; hint: string; Component: ComponentType }[] = [
  { id: 'transactions', label: 'Transactions', hint: 'Tout, photos et statut', Component: AdminTransactions },
  { id: 'alerts', label: 'Alertes trajet', hint: 'Alertes à valider', Component: AdminMatchAlerts },
  { id: 'offers', label: 'Offres sans réponse', hint: 'Date limite aujourd’hui', Component: AdminOfferReminders },
  { id: 'disputes', label: 'Signalements', hint: 'Litiges à trancher', Component: AdminDisputes },
  { id: 'chats', label: 'Conversations', hint: 'Lire les chats', Component: AdminChats },
  { id: 'users', label: 'Utilisateurs', hint: 'Tous les comptes', Component: AdminUsers },
  { id: 'money', label: 'Argent & avis', hint: 'Fonds détenus, avis', Component: AdminOverview },
  { id: 'refund', label: 'Rembourser', hint: 'Une réservation', Component: AdminRefund },
  { id: 'broadcast', label: 'E-mail à tous', hint: 'Rappel : vos vols', Component: AdminBroadcast },
];

const STORAGE_KEY = 'jibly_admin_section';

export function AdminPageClient() {
  const { t } = useI18n();
  const [active, setActive] = useState<SectionId | null>(null);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY) as SectionId | null;
      if (saved && SECTIONS.some((s) => s.id === saved)) setActive(saved);
    } catch {}
  }, []);

  function pick(id: SectionId) {
    const next = active === id ? null : id;
    setActive(next);
    try {
      if (next) localStorage.setItem(STORAGE_KEY, next);
      else localStorage.removeItem(STORAGE_KEY);
    } catch {}
  }

  const current = SECTIONS.find((s) => s.id === active);

  return (
    <div className="min-h-screen py-12 lg:py-20">
      <div className="mx-auto max-w-7xl px-5 sm:px-8 lg:px-12">
        <div className="mb-8">
          <p className="eyebrow mb-3">{t.admin_badge}</p>
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-ink-600 tracking-[-0.03em]">
            {t.admin_title}
          </h1>
        </div>

        <nav className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-9 gap-2 mb-10">
          {SECTIONS.map((s) => {
            const on = s.id === active;
            return (
              <button
                key={s.id}
                onClick={() => pick(s.id)}
                aria-pressed={on}
                className={`text-start rounded-2xl border px-4 py-3 transition-colors ${
                  on
                    ? 'bg-ink-600 border-ink-600 text-white'
                    : 'bg-white border-ink-50 text-ink-600 hover:bg-cream-50'
                }`}
              >
                <div className="text-[14px] font-semibold">{s.label}</div>
                <div className={`text-[12px] mt-0.5 ${on ? 'text-white/60' : 'text-ink-300'}`}>{s.hint}</div>
              </button>
            );
          })}
        </nav>

        {current ? (
          // key: switching sections remounts, so each one loads fresh data.
          <current.Component key={current.id} />
        ) : (
          <p className="text-[14px] text-ink-400">Choisissez une section ci-dessus. Rien n’est chargé avant.</p>
        )}
      </div>
    </div>
  );
}
