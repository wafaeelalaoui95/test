'use client';

import { useI18n } from '@/lib/i18n/context';
import { AdminRefund } from '@/components/AdminRefund';
import { AdminOverview } from '@/components/AdminOverview';
import { AdminDisputes } from '@/components/AdminDisputes';
import { AdminMatchAlerts } from '@/components/AdminMatchAlerts';
import { AdminChats } from '@/components/AdminChats';
import { AdminUsers } from '@/components/AdminUsers';
import { AdminOfferReminders } from '@/components/AdminOfferReminders';

/**
 * Operator console — only the tools that read and act on real data.
 *
 * This page used to open on six tabs of hard-coded demo rows (KPIs, requests,
 * trips, reports, users, matches) with Approve/Reject buttons wired to nothing,
 * left over from before there was a backend. With real users on the site they
 * read as real: an operator could not tell a demo sender from a live one. They
 * are gone; anything added here must come from the database.
 */
export function AdminPageClient() {
  const { t } = useI18n();

  return (
    <div className="min-h-screen py-12 lg:py-20">
      <div className="mx-auto max-w-7xl px-5 sm:px-8 lg:px-12">
        <div className="mb-10">
          <p className="eyebrow mb-3">{t.admin_badge}</p>
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-ink-600 tracking-[-0.03em]">
            {t.admin_title}
          </h1>
        </div>

        <div className="space-y-10">
          {/* First: the one thing that needs a decision most days. */}
          <AdminMatchAlerts />
          <AdminOfferReminders />
          {/* Above the refund tool on purpose: a dispute is usually the reason
              somebody came here to refund, and the decision comes first. */}
          <AdminDisputes />
          {/* Right after disputes: reading the chat is how a report gets judged. */}
          <AdminChats />
          <AdminUsers />
          <AdminOverview />
          <AdminRefund />
        </div>
      </div>
    </div>
  );
}
