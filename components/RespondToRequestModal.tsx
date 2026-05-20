'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { ArrowRight, Loader2, X, AlertCircle, MapPin, Calendar, ShieldCheck } from 'lucide-react';
import { formatShortDate, formatEuros, nameInitial, displayName } from '@/lib/utils';
import { browser } from '@/lib/supabase/queries';
import { useAuth } from '@/lib/supabase/auth-provider';
import { ITEM_CATEGORIES } from '@/lib/constants';
import { useI18n } from '@/lib/i18n/context';
import type { ShippingRequestRow, Profile } from '@/lib/supabase/types';

type RequestWithProfile = ShippingRequestRow & {
  profile: Pick<
    Profile,
    'id' | 'full_name' | 'avatar_url' | 'verification_level' | 'rating' | 'trips_completed'
  > | null;
};

type Props = {
  request: RequestWithProfile;
  onClose: () => void;
  onSuccess: () => void;
};

/**
 * Traveler-side modal: confirm responding to a shipping request.
 *
 * Creates a booking_intent with shipping_request_id set, status='pending',
 * initiated_by='traveler', and no payment yet. The sender will see this
 * in their /me → Matches and will pay when they accept.
 *
 * Note we do NOT require the traveler to have a matching trip — per the
 * product decision, the sender decides at acceptance, and the traveler can
 * sort out which trip to use later (via /me).
 */
export function RespondToRequestModal({ request, onClose, onSuccess }: Props) {
  const router = useRouter();
  const { user } = useAuth();
  const { t } = useI18n();
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const senderName = displayName(request.profile?.full_name) || 'L\'expéditeur';
  const initial = nameInitial(request.profile?.full_name);
  const category = ITEM_CATEGORIES.find((c) => c.value === request.item_category);

  // Pricing model:
  //   - sender's budget is the TOTAL TTC (what they'll pay)
  //   - traveler receives ~ budget / 1.15 (because 15% goes to Jibly)
  // We compute both for display. Storage uses budget as proposed_price
  // (matches the sender→traveler flow which stores the TTC amount too).
  const netTraveler = Math.round((request.budget / 1.15) * 100) / 100;
  const jiblyFee = Math.round((request.budget - netTraveler) * 100) / 100;

  async function handleSubmit() {
    if (!user) {
      router.push(`/login?next=/`);
      return;
    }
    setSubmitting(true);
    setErr(null);

    try {
      await browser.createBookingIntent({
        sender_id: request.user_id,
        // No trip linked yet — the traveler can attach one later
        traveler_trip_id: null,
        item_category: request.item_category,
        item_description: request.item_description,
        proposed_price: request.budget, // TTC, what sender will pay
        pickup_city: request.pickup_city,
        destination_city: request.destination_city,
        // No payment yet — sender pays at acceptance (different from
        // sender→traveler flow where payment is captured upfront)
        payment_status: 'unpaid',
        payment_intent_id: null,
        payment_amount: Math.round(request.budget * 100),
        // Mark this as a traveler→sender response
        shipping_request_id: request.id,
        traveler_message: message.trim() || null,
        initiated_by: 'traveler',
        traveler_user_id: user.id,
      });
      onSuccess();
      // Send the traveler to their own page so they see what they just did
      router.push('/me?tab=matches');
    } catch (e: any) {
      setErr(e?.message ?? 'Échec de la proposition. Réessayez.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.15 }}
      className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-4 bg-ink-600/40 backdrop-blur-sm"
      onClick={() => !submitting && onClose()}
    >
      <motion.div
        initial={{ y: 20, opacity: 0, scale: 0.98 }}
        animate={{ y: 0, opacity: 1, scale: 1 }}
        exit={{ y: 20, opacity: 0, scale: 0.98 }}
        transition={{ duration: 0.2 }}
        onClick={(e) => e.stopPropagation()}
        className="bg-cream-50 rounded-3xl p-6 sm:p-7 max-w-md w-full shadow-xl max-h-[90vh] overflow-y-auto"
      >
        <div className="flex items-start justify-between mb-5">
          <div>
            <div className="text-[11px] font-semibold text-lavender-500 tracking-[0.12em] uppercase mb-2">
              Proposer mon aide
            </div>
            <h2 className="text-2xl font-extrabold text-ink-600 tracking-[-0.02em]">
              {request.pickup_city} → {request.destination_city}
            </h2>
          </div>
          <button
            onClick={onClose}
            disabled={submitting}
            className="p-1.5 -mr-1 -mt-1 rounded-full hover:bg-ink-50 text-ink-400 disabled:opacity-50"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Request recap */}
        <div className="rounded-2xl bg-white border border-ink-100 p-4 mb-5 space-y-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-full bg-cream-100 flex items-center justify-center font-bold text-[13px] text-ink-500">
              {initial}
            </div>
            <div>
              <div className="text-[14px] font-semibold text-ink-600">{senderName}</div>
              <div className="text-[12px] text-ink-400">Expéditeur</div>
            </div>
          </div>

          <div className="h-px bg-ink-50" />

          <div className="grid grid-cols-2 gap-3 text-[13px]">
            <div>
              <div className="text-[11px] text-ink-300 uppercase tracking-[0.06em] mb-1">Catégorie</div>
              <div className="text-ink-600 font-medium flex items-center gap-1.5">
                <span>{category?.icon}</span>
                <span>{category ? t[category.labelKey] : request.item_category}</span>
              </div>
            </div>
            <div>
              <div className="text-[11px] text-ink-300 uppercase tracking-[0.06em] mb-1">Avant le</div>
              <div className="text-ink-600 font-medium num-display">
                {formatShortDate(request.desired_delivery_date)}
              </div>
            </div>
          </div>

          {request.item_description && (
            <>
              <div className="h-px bg-ink-50" />
              <div>
                <div className="text-[11px] text-ink-300 uppercase tracking-[0.06em] mb-1">Description</div>
                <p className="text-[13px] text-ink-500 leading-relaxed">
                  « {request.item_description} »
                </p>
              </div>
            </>
          )}
        </div>

        {/* Price breakdown */}
        <div className="rounded-2xl bg-mint-50 border border-mint-200/60 p-4 mb-5 space-y-2">
          <div className="text-[11px] font-semibold text-mint-700 tracking-[0.06em] uppercase">
            Si l'expéditeur accepte
          </div>
          <div className="flex items-center justify-between text-[14px]">
            <span className="text-ink-500">Vous recevrez</span>
            <span className="font-bold text-mint-600 text-[18px] num-display">
              {formatEuros(netTraveler)}
            </span>
          </div>
          <div className="flex items-center justify-between text-[12px] text-ink-400">
            <span>Protection Jibly (15%)</span>
            <span className="num-display">{formatEuros(jiblyFee)}</span>
          </div>
          <div className="h-px bg-mint-200/40" />
          <div className="flex items-center justify-between text-[12px] text-ink-400">
            <span>L'expéditeur paiera</span>
            <span className="num-display font-medium text-ink-500">
              {formatEuros(request.budget)}
            </span>
          </div>
        </div>

        {/* Optional message */}
        <div className="mb-5">
          <label className="block text-[13px] font-semibold text-ink-500 mb-2">
            Message à l'expéditeur (optionnel)
          </label>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Ex: Je voyage le 18 mai, je peux passer chercher l'item à votre adresse."
            rows={3}
            maxLength={500}
            className="w-full px-4 py-3 rounded-xl bg-white border border-ink-100 text-[14px] focus:outline-none focus:ring-2 focus:ring-lavender-200 focus:border-lavender-300 resize-none"
          />
          <p className="text-[11px] text-ink-300 mt-1.5">
            Précisez votre date de voyage ou tout détail utile.
          </p>
        </div>

        {/* Reassurance */}
        <div className="rounded-xl bg-cream-100 px-4 py-3 mb-5 text-[12px] text-ink-500 leading-relaxed">
          <ShieldCheck className="w-3.5 h-3.5 inline mr-1 text-ink-400" />
          Aucune carte n'est demandée à ce stade. L'expéditeur recevra votre proposition et décidera. S'il accepte, vous serez notifié·e et pourrez convenir des détails.
        </div>

        {err && (
          <div className="rounded-xl bg-blush-50 px-4 py-3 mb-4 text-[13px] text-blush-500 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <span>{err}</span>
          </div>
        )}

        <div className="flex flex-col sm:flex-row gap-2.5">
          <button
            onClick={onClose}
            disabled={submitting}
            className="flex-1 px-5 py-3 text-[14px] font-medium text-ink-500 hover:text-ink-600 bg-cream-100 hover:bg-cream-200 rounded-full transition-colors disabled:opacity-50"
          >
            Annuler
          </button>
          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="flex-1 inline-flex items-center justify-center gap-2 px-5 py-3 text-[14px] font-semibold text-cream-50 bg-ink-500 hover:bg-ink-600 disabled:bg-ink-200 disabled:cursor-not-allowed rounded-full transition-colors"
          >
            {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4" />}
            {submitting ? 'Envoi…' : 'Envoyer ma proposition'}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}
