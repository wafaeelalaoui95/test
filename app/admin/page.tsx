'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  LayoutGrid,
  Package,
  Plane,
  Flag,
  Users,
  Link2,
  Clock,
  CheckCircle2,
} from 'lucide-react';
import { VerificationBadge } from '@/components/ui/Badge';
import { DEMO_TRAVELERS } from '@/lib/constants';
import { formatShortDate } from '@/lib/utils';
import { useI18n } from '@/lib/i18n/context';

const DEMO_REQUESTS = [
  { id: 'r1', sender: 'Lila M.', route: '🇫🇷 Paris → 🇲🇦 Rabat', category: 'Documents', date: '2026-06-05', status: 'pending' },
  { id: 'r2', sender: 'Yanis B.', route: '🇧🇪 Bruxelles → 🇲🇦 Casablanca', category: 'Médicaments', date: '2026-06-08', status: 'pending' },
  { id: 'r3', sender: 'Rachid O.', route: '🇪🇸 Madrid → 🇲🇦 Tanger', category: 'Clés', date: '2026-06-03', status: 'pending' },
];

const DEMO_REPORTS = [
  { id: 'rp1', reporter: 'Sophie L.', target: 'utilisateur Khalid V.', reason: 'Communication suspecte', severity: 'medium' as const },
  { id: 'rp2', reporter: 'Anonyme', target: 'demande #4821', reason: 'Objet potentiellement interdit', severity: 'high' as const },
];

export default function AdminPage() {
  const { t } = useI18n();
  const [tab, setTab] = useState('overview');

  const TABS = [
    { id: 'overview', label: t.admin_tab_overview, icon: LayoutGrid },
    { id: 'requests', label: t.admin_tab_requests, icon: Package },
    { id: 'trips', label: t.admin_tab_trips, icon: Plane },
    { id: 'reports', label: t.admin_tab_reports, icon: Flag },
    { id: 'users', label: t.admin_tab_users, icon: Users },
    { id: 'matches', label: t.admin_tab_matches, icon: Link2 },
  ];

  const KPIs = [
    { label: t.admin_kpi_active_requests, value: '128', delta: '+12%' },
    { label: t.admin_kpi_weekly_trips, value: '67', delta: '+8%' },
    { label: t.admin_kpi_matches, value: '341', delta: '+24%' },
    { label: t.admin_kpi_open_reports, value: '3', delta: '-2' },
  ];

  const RECENT_ACTIVITY = [
    { icon: CheckCircle2, text: t.admin_activity_trip_validated, time: t.admin_ago_min.replace('{n}', '5') },
    { icon: Package, text: t.admin_activity_new_request, time: t.admin_ago_min.replace('{n}', '12') },
    { icon: Flag, text: t.admin_activity_report, time: t.admin_ago_hour.replace('{n}', '1') },
    { icon: Users, text: t.admin_activity_id_verified, time: t.admin_ago_hour.replace('{n}', '2') },
  ];

  const MATCHES = [
    { s: 'Lila M.', tr: 'Yasmine B.', route: '🇫🇷 Paris → 🇲🇦 Casa', amount: '25€', status: t.admin_status_accepted },
    { s: 'Yanis B.', tr: 'Mehdi A.', route: '🇧🇪 Brux → 🇲🇦 Rabat', amount: '30€', status: t.admin_status_in_progress },
    { s: 'Rachid O.', tr: 'Karim T.', route: '🇪🇸 Madrid → 🇲🇦 Tanger', amount: '20€', status: t.admin_status_delivered },
  ];

  return (
    <div className="min-h-screen py-12 lg:py-20">
      <div className="mx-auto max-w-7xl px-5 sm:px-8 lg:px-12">
        <div className="mb-10">
          <p className="eyebrow mb-3">{t.admin_badge}</p>
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-ink-600 tracking-[-0.03em]">
            {t.admin_title}
          </h1>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-12 overflow-x-auto scrollbar-hide -mx-5 px-5 sm:mx-0 sm:px-0 border-b border-ink-100">
          {TABS.map((tabItem) => (
            <button
              key={tabItem.id}
              onClick={() => setTab(tabItem.id)}
              className={`flex items-center gap-2 px-5 py-3.5 text-[14px] font-medium whitespace-nowrap transition-colors -mb-px ${
                tab === tabItem.id
                  ? 'text-ink-600 border-b-2 border-ink-500'
                  : 'text-ink-300 hover:text-ink-500 border-b-2 border-transparent'
              }`}
            >
              <tabItem.icon className="w-4 h-4" strokeWidth={2} />
              {tabItem.label}
            </button>
          ))}
        </div>

        {/* Content */}
        {tab === 'overview' && (
          <div className="space-y-12">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-x-8 gap-y-10 lg:gap-x-12">
              {KPIs.map((kpi, i) => (
                <motion.div
                  key={kpi.label}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.04 }}
                >
                  <div className="text-[12px] font-semibold text-ink-300 uppercase tracking-[0.1em] mb-3">{kpi.label}</div>
                  <div className="flex items-baseline gap-3">
                    <div className="text-4xl lg:text-5xl font-extrabold text-ink-600 num-display tracking-[-0.03em]">{kpi.value}</div>
                    <div className={`text-[13px] font-semibold ${kpi.delta.startsWith('-') ? 'text-ink-400' : 'text-mint-500'}`}>
                      {kpi.delta}
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>

            <div className="h-px bg-ink-50" />

            <div className="grid lg:grid-cols-2 gap-10 lg:gap-16">
              <div>
                <h3 className="text-lg font-bold text-ink-600 mb-6 tracking-[-0.015em]">{t.admin_recent_activity}</h3>
                <ul className="space-y-4">
                  {RECENT_ACTIVITY.map((a, i) => (
                    <li key={i} className="flex items-center gap-4">
                      <a.icon className="w-4 h-4 text-ink-400 flex-shrink-0" strokeWidth={1.75} />
                      <div className="flex-1 min-w-0">
                        <div className="text-[14px] text-ink-600">{a.text}</div>
                      </div>
                      <div className="text-[13px] text-ink-300">{a.time}</div>
                    </li>
                  ))}
                </ul>
              </div>

              <div>
                <h3 className="text-lg font-bold text-ink-600 mb-6 tracking-[-0.015em]">{t.admin_queue}</h3>
                <ul className="space-y-4">
                  {DEMO_REQUESTS.map((r) => (
                    <li key={r.id} className="flex items-center justify-between py-2 border-b border-ink-50 last:border-0">
                      <div>
                        <div className="text-[14px] font-semibold text-ink-600">{r.sender}</div>
                        <div className="text-[13px] text-ink-400 mt-0.5">{r.route}</div>
                      </div>
                      <div className="flex items-center gap-1.5 text-[13px] text-ink-300">
                        <Clock className="w-3 h-3" />
                        {formatShortDate(r.date)}
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        )}

        {tab === 'requests' && (
          <div className="bg-white rounded-2xl border border-ink-50 overflow-hidden">
            <div className="grid grid-cols-12 gap-4 px-6 py-4 bg-cream-100 text-[12px] font-semibold text-ink-400 uppercase tracking-[0.08em]">
              <div className="col-span-3">{t.admin_col_sender}</div>
              <div className="col-span-4">{t.admin_col_route}</div>
              <div className="col-span-2">{t.admin_col_category}</div>
              <div className="col-span-1">{t.admin_col_date}</div>
              <div className="col-span-2 text-end">{t.admin_col_action}</div>
            </div>
            {DEMO_REQUESTS.map((r) => (
              <div key={r.id} className="grid grid-cols-12 gap-4 px-6 py-5 border-t border-ink-50 items-center">
                <div className="col-span-3 text-[14px] font-semibold text-ink-600">{r.sender}</div>
                <div className="col-span-4 text-[14px] text-ink-500">{r.route}</div>
                <div className="col-span-2 text-[14px] text-ink-400">{r.category}</div>
                <div className="col-span-1 text-[13px] text-ink-400">{formatShortDate(r.date)}</div>
                <div className="col-span-2 flex gap-2 justify-end">
                  <button className="px-3 py-1.5 rounded-full bg-mint-50 text-mint-500 text-[13px] font-semibold hover:bg-mint-100 transition-colors">{t.admin_action_approve}</button>
                  <button className="px-3 py-1.5 rounded-full bg-blush-50 text-blush-500 text-[13px] font-semibold hover:bg-blush-100 transition-colors">{t.admin_action_reject}</button>
                </div>
              </div>
            ))}
          </div>
        )}

        {tab === 'trips' && (
          <div className="bg-white rounded-2xl border border-ink-50 overflow-hidden">
            <div className="grid grid-cols-12 gap-4 px-6 py-4 bg-cream-100 text-[12px] font-semibold text-ink-400 uppercase tracking-[0.08em]">
              <div className="col-span-3">{t.admin_col_traveler}</div>
              <div className="col-span-4">{t.admin_col_route}</div>
              <div className="col-span-2">{t.admin_col_space}</div>
              <div className="col-span-2">{t.admin_col_compensation}</div>
              <div className="col-span-1">{t.admin_col_status}</div>
            </div>
            {DEMO_TRAVELERS.map((tr) => (
              <div key={tr.id} className="grid grid-cols-12 gap-4 px-6 py-5 border-t border-ink-50 items-center">
                <div className="col-span-3 text-[14px] font-semibold text-ink-600">{tr.name}</div>
                <div className="col-span-4 text-[14px] text-ink-500">{tr.departure_flag} {tr.departure_city} → {tr.arrival_flag} {tr.arrival_city}</div>
                <div className="col-span-2 text-[14px] text-ink-400 capitalize">{tr.available_space}</div>
                <div className="col-span-2 text-[14px] font-semibold text-ink-600">{t.admin_starts_at} {tr.compensation_min}€</div>
                <div className="col-span-1"><VerificationBadge level={tr.verification_level} /></div>
              </div>
            ))}
          </div>
        )}

        {tab === 'reports' && (
          <div className="space-y-3">
            {DEMO_REPORTS.map((r) => (
              <div key={r.id} className="bg-white rounded-2xl p-6 border border-ink-50">
                <div className="flex items-start justify-between gap-4 mb-3">
                  <div className="flex items-center gap-2.5">
                    <Flag className={`w-4 h-4 ${r.severity === 'high' ? 'text-blush-500' : 'text-butter-500'}`} strokeWidth={2} />
                    <span className="font-semibold text-ink-600 text-[15px]">{r.reason}</span>
                  </div>
                  <span className={`text-[12px] font-semibold uppercase tracking-[0.08em] ${r.severity === 'high' ? 'text-blush-500' : 'text-butter-600'}`}>
                    {r.severity === 'high' ? t.admin_severity_high : t.admin_severity_medium}
                  </span>
                </div>
                <div className="text-[14px] text-ink-400">
                  {t.admin_report_by} {r.reporter} · {t.admin_report_concerns} {r.target}
                </div>
                <div className="flex gap-2 mt-5">
                  <button className="px-4 py-2 rounded-full bg-ink-500 text-cream-50 text-[13px] font-semibold hover:bg-ink-600 transition-colors">{t.admin_action_review}</button>
                  <button className="px-4 py-2 rounded-full text-ink-500 text-[13px] font-semibold hover:bg-ink-50 transition-colors">{t.admin_action_ignore}</button>
                </div>
              </div>
            ))}
          </div>
        )}

        {tab === 'users' && (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {DEMO_TRAVELERS.map((u) => (
              <div key={u.id} className="bg-white rounded-2xl p-6 border border-ink-50">
                <div className="flex items-center gap-3 mb-4">
                  <div className={`w-11 h-11 rounded-full bg-${u.avatar_color}-200 flex items-center justify-center font-bold text-${u.avatar_color}-700`}>
                    {u.avatar}
                  </div>
                  <div>
                    <div className="font-semibold text-ink-600 text-[15px]">{u.name}</div>
                    <div className="text-[13px] text-ink-400 mt-0.5">{u.trips_completed} {t.admin_trips_count}</div>
                  </div>
                </div>
                <VerificationBadge level={u.verification_level} />
              </div>
            ))}
          </div>
        )}

        {tab === 'matches' && (
          <div className="bg-white rounded-2xl border border-ink-50 overflow-hidden">
            <div className="grid grid-cols-12 gap-4 px-6 py-4 bg-cream-100 text-[12px] font-semibold text-ink-400 uppercase tracking-[0.08em]">
              <div className="col-span-3">{t.admin_col_sender}</div>
              <div className="col-span-3">{t.admin_col_traveler}</div>
              <div className="col-span-3">{t.admin_col_route}</div>
              <div className="col-span-2">{t.admin_col_amount}</div>
              <div className="col-span-1">{t.admin_col_status}</div>
            </div>
            {MATCHES.map((m, i) => (
              <div key={i} className="grid grid-cols-12 gap-4 px-6 py-5 border-t border-ink-50 items-center">
                <div className="col-span-3 text-[14px] font-semibold text-ink-600">{m.s}</div>
                <div className="col-span-3 text-[14px] text-ink-500">{m.tr}</div>
                <div className="col-span-3 text-[14px] text-ink-500">{m.route}</div>
                <div className="col-span-2 text-[14px] font-semibold text-ink-600 num-display">{m.amount}</div>
                <div className="col-span-1 text-[13px] text-ink-400">{m.status}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
