/**
 * Jibly i18n — French / English
 *
 * Translations are hand-crafted, not Google-translated.
 */

export type Locale = 'fr' | 'en';

export const LOCALES: { code: Locale; label: string; flag: string; rtl: boolean }[] = [
  { code: 'fr', label: 'Français', flag: '🇫🇷', rtl: false },
  { code: 'en', label: 'English', flag: '🇬🇧', rtl: false },
];

export type Translations = {
  // Navbar
  nav_send: string;
  nav_travel: string;
  nav_discover: string;
  nav_trust: string;
  nav_my_space: string;
  nav_start: string;
  nav_wallet_title: string;
  nav_wallet_label: string;
  nav_notifications: string;
  nav_menu: string;

  // Hero / Landing
  hero_badge: string;
  hero_title_1: string;
  hero_title_2: string;
  hero_subtitle: string;
  hero_search_from: string;
  hero_search_to: string;
  hero_search_button: string;
  hero_social_proof: string;
  search_label_from: string;
  search_label_to: string;
  search_label_before: string;
  search_button: string;
  search_filters_show: string;
  search_filters_hide: string;
  search_label_flight_date: string;
  login_session_reset_title: string;
  login_session_reset_text: string;
  login_submit: string;
  login_reset_link: string;
  signup_name_placeholder: string;
  sec_wallet_withdraw_subject: string;
  footer_allowed_items: string;
  footer_terms: string;
  pay_security_note: string;
  pay_submitting: string;
  pay_submit: string;
  bt_step_booked_short: string;
  bt_step_handover_short: string;
  bt_step_transit_short: string;
  bt_step_delivered_short: string;
  bt_step_paid_short: string;
  bt_payment_safety: string;
  disc_clear: string;
  disc_filter_budget: string;
  disc_filter_trust: string;
  disc_filter_verified_only: string;
  disc_tab_travelers: string;
  disc_tab_requests: string;
  disc_heading_travelers: string;
  disc_heading_requests: string;
  disc_publish_request: string;
  disc_publish_trip: string;
  disc_trips_count: string;
  disc_price_from: string;
  disc_protection_included: string;
  disc_empty_travelers_route: string;
  disc_empty_requests_route: string;
  disc_empty_travelers: string;
  disc_empty_requests: string;
  disc_empty_hint_search: string;
  disc_empty_hint_travelers: string;
  disc_empty_hint_requests: string;
  disc_clear_search: string;
  disc_age_today: string;
  disc_age_yesterday: string;
  disc_age_days_ago: string;
  disc_you_receive: string;
  disc_on_paid: string;
  disc_i_can_do_it: string;

  // How it works
  how_title: string;
  how_subtitle: string;
  how_step1_title: string;
  how_step1_text: string;
  how_step2_title: string;
  how_step2_text: string;
  how_step3_title: string;
  how_step3_text: string;

  // Travelers preview
  travelers_title: string;
  travelers_subtitle: string;
  travelers_see_all: string;
  travelers_trips: string;

  // Trust pillars (landing)
  home_trust_title: string;
  trust_identity: string;
  trust_data: string;
  trust_messaging: string;
  trust_support: string;

  // Testimonial
  testimonial_quote: string;
  testimonial_author: string;

  // Final CTA
  cta_ready: string;
  cta_subtitle: string;
  cta_send_btn: string;
  cta_travel_btn: string;

  // Sender flow
  send_title: string;
  send_subtitle: string;
  send_step_route: string;
  send_step_item: string;
  send_step_details: string;
  send_step_confirm: string;
  send_route_title: string;
  send_label_from: string;
  send_label_to: string;
  send_placeholder_from: string;
  send_placeholder_to: string;
  send_label_date: string;
  send_item_title: string;
  send_label_description: string;
  send_placeholder_description: string;
  send_prescription_required: string;
  send_upload_prescription: string;
  send_forbidden_title: string;
  send_details_title: string;
  send_label_urgency: string;
  send_label_budget: string;
  send_confirm_title: string;
  send_recap_route: string;
  send_recap_date: string;
  send_recap_item: string;
  send_recap_urgency: string;
  send_recap_budget: string;
  send_terms: string;
  send_publish: string;
  send_success_title: string;
  send_success_text: string;
  send_success_see_travelers: string;
  send_success_back: string;

  // Traveler flow
  trip_title: string;
  trip_subtitle: string;
  trip_step_route: string;
  trip_step_space: string;
  trip_step_identity: string;
  trip_step_validation: string;
  trip_route_title: string;
  trip_label_time: string;
  trip_space_title: string;
  trip_label_min_comp: string;
  trip_min_comp_hint: string;
  trip_accepted_categories_label: string;
  trip_accepted_categories_hint: string;
  trip_identity_title: string;
  trip_identity_subtitle: string;
  trip_identity_benefit_1: string;
  trip_identity_benefit_2: string;
  trip_identity_benefit_3: string;
  trip_upload_id: string;
  trip_validation_title: string;
  trip_engagement_1: string;
  trip_engagement_2: string;
  trip_engagement_3: string;
  trip_engagement_4: string;
  trip_engagement_terms: string;
  trip_publish: string;
  trip_success_title: string;
  trip_success_text: string;

  // Matches page
  matches_title: string;
  matches_subtitle: string;
  matches_empty_title: string;
  matches_empty_text: string;
  matches_empty_filtered: string;
  matches_total: string;
  matches_filters: string;
  matches_filter_from: string;
  matches_filter_to: string;
  matches_filter_before: string;
  matches_filter_max_price: string;
  matches_filter_verified: string;
  matches_filter_clear: string;
  matches_publish_btn: string;
  matches_from: string;
  matches_to: string;
  matches_contact: string;
  matches_min: string;

  // Trust page (Safety & Trust FAQ)
  trust_eyebrow: string;
  trust_hero_title: string;
  trust_hero_subtitle: string;
  trust_intent_title: string;
  trust_intent_text: string;
  trust_faq_title: string;

  trust_q1_question: string;
  trust_q1_intro: string;
  trust_q1_item_1: string;
  trust_q1_item_2: string;
  trust_q1_item_3: string;
  trust_q1_item_4: string;
  trust_q1_note: string;

  trust_q2_question: string;
  trust_q2_text: string;

  trust_q3_question: string;
  trust_q3_text: string;

  trust_q4_question: string;
  trust_q4_text: string;

  trust_q5_question: string;
  trust_q5_intro: string;
  trust_q5_item_1: string;
  trust_q5_item_2: string;
  trust_q5_item_3: string;
  trust_q5_item_4: string;

  trust_q6_question: string;
  trust_q6_intro: string;
  trust_q6_item_1: string;
  trust_q6_item_2: string;
  trust_q6_item_3: string;
  trust_q6_item_4: string;
  trust_q6_item_5: string;
  trust_q6_item_6: string;

  trust_footer_title: string;
  trust_footer_text: string;
  trust_footer_cta: string;

  // My Space (dashboard)
  me_title: string;
  me_tab_overview: string;
  me_tab_requests: string;
  me_tab_trips: string;
  me_tab_matches: string;
  me_tab_profile: string;
  me_stats_active: string;
  me_stats_pending: string;
  me_stats_earned: string;
  me_stats_completed: string;
  me_section_my_requests: string;
  me_section_my_trips: string;
  me_section_pending_matches: string;
  me_section_active: string;
  me_section_completed: string;
  me_section_profile: string;
  me_empty_requests: string;
  me_empty_trips: string;
  me_empty_matches: string;
  me_new_request: string;
  me_new_trip: string;
  me_status_pending: string;
  me_status_open: string;
  me_status_matched: string;
  me_status_in_transit: string;
  me_status_completed: string;
  me_status_cancelled: string;
  me_payment_pending: string;
  me_payment_held: string;
  me_payment_released: string;
  me_profile_name: string;
  me_profile_email: string;
  me_profile_phone: string;
  me_profile_verification: string;
  me_profile_verify_now: string;

  // Common
  common_back: string;
  common_next: string;
  common_cancel: string;
  common_close: string;
  gate_identity_required: string;
  common_save: string;
  common_loading: string;
  common_optional: string;
  common_eur: string;
  common_message: string;
  common_search_placeholder: string;
  common_no_results: string;
  common_clear: string;

  // Country/city picker
  picker_country_placeholder: string;
  picker_city_placeholder: string;
  picker_country_input_placeholder: string;
  picker_city_input_placeholder: string;
  picker_search_country: string;
  picker_search_city: string;
  picker_locate: string;
  picker_locating: string;
  picker_other_country: string;
  picker_other_city: string;
  picker_geo_unavailable: string;
  picker_geo_denied: string;
  picker_back_countries: string;
  picker_back_cities: string;
  error_same_route: string;

 // Item categories (whitelist MVP)
  cat_documents: string;
  cat_documents_desc: string;
  cat_keys: string;
  cat_keys_desc: string;
  cat_small: string;
  cat_small_desc: string;
  cat_clothes: string;
  cat_clothes_desc: string;
  cat_electronics: string;
  cat_electronics_desc: string;
  cat_otc: string;
  cat_otc_desc: string;
  // Sender/traveler content declarations
  send_certify_label: string;
  send_certify_otc_disclaimer: string;
  trip_verify_content_label: string;
  
  // Urgency
  urgency_standard: string;
  urgency_standard_hint: string;
  urgency_fast: string;
  urgency_fast_hint: string;
  urgency_urgent: string;
  urgency_urgent_hint: string;

  // Space
  space_envelope: string;
  space_envelope_size: string;
  space_pouch: string;
  space_pouch_size: string;
  space_bag: string;
  space_bag_size: string;

  // Verification
  verif_trusted: string;
  verif_id: string;
  verif_email: string;
  verif_none: string;

  // Footer
  footer_tagline: string;
  footer_platform: string;
  footer_trust: string;
  footer_community: string;
  footer_made_with: string;

  // Admin
  admin_badge: string;
  admin_title: string;
  admin_tab_overview: string;
  admin_tab_requests: string;
  admin_tab_trips: string;
  admin_tab_reports: string;
  admin_tab_users: string;
  admin_tab_matches: string;
  admin_kpi_active_requests: string;
  admin_kpi_weekly_trips: string;
  admin_kpi_matches: string;
  admin_kpi_open_reports: string;
  admin_recent_activity: string;
  admin_queue: string;
  admin_col_sender: string;
  admin_col_traveler: string;
  admin_col_route: string;
  admin_col_category: string;
  admin_col_date: string;
  admin_col_action: string;
  admin_col_space: string;
  admin_col_compensation: string;
  admin_col_status: string;
  admin_col_amount: string;
  admin_action_approve: string;
  admin_action_reject: string;
  admin_action_review: string;
  admin_action_ignore: string;
  admin_status_accepted: string;
  admin_status_in_progress: string;
  admin_status_delivered: string;
  admin_report_by: string;
  admin_report_concerns: string;
  admin_severity_high: string;
  admin_severity_medium: string;
  admin_trips_count: string;
  admin_starts_at: string;
  admin_ago_min: string;
  admin_ago_hour: string;
  admin_activity_trip_validated: string;
  admin_activity_new_request: string;
  admin_activity_report: string;
  admin_activity_id_verified: string;

  // Auth
  auth_login_title: string;
  auth_login_subtitle: string;
  auth_signup_title: string;
  auth_signup_subtitle: string;
  auth_email: string;
  auth_password: string;
  auth_password_hint: string;
  auth_full_name: string;
  auth_login_btn: string;
  auth_signup_btn: string;
  auth_send_magic: string;
  auth_tab_password: string;
  auth_tab_magic: string;
  auth_magic_sent_title: string;
  auth_magic_sent_text: string;
  auth_check_email_title: string;
  auth_check_email_text: string;
  auth_no_account: string;
  auth_has_account: string;
  auth_signup_link: string;
  auth_login_link: string;
  auth_logout: string;
  account_danger_zone: string;
  account_delete_title: string;
  account_delete_text: string;
  account_delete_btn: string;
  account_delete_confirm_title: string;
  account_delete_confirm_text: string;
  account_delete_confirm_btn: string;
  account_delete_cancel: string;
  account_delete_typing_label: string;
  account_delete_typing_placeholder: string;
  auth_error_generic: string;
  auth_login_required: string;
  loading: string;
  empty_my_requests: string;
  empty_my_trips: string;
  empty_open_trips: string;

  // Notifications dropdown
  notif_mark_all_read: string;
  notif_empty: string;
  notif_see_all: string;
  notif_my_messages: string;
  notif_time_now: string;
  notif_time_min: string;
  notif_time_hour: string;
  notif_time_day: string;

  // Chat
  chat_qr_address_label: string;
  chat_qr_address_text: string;
  chat_qr_parcel_label: string;
  chat_qr_parcel_text: string;
  chat_qr_arriving_label: string;
  chat_qr_arriving_text: string;
  chat_qr_code_label: string;
  chat_qr_code_text: string;
  chat_traceability_notice: string;
  chat_empty_line1: string;
  chat_empty_line2: string;
  chat_input_placeholder: string;
  chat_load_error: string;
  chat_send_error: string;
  chat_send_error_retry: string;
  chat_close: string;
  chat_send: string;
  chat_hide: string;

  // Trust / FAQ page
  tp_hero_badge: string;
  tp_hero_title: string;
  tp_hero_title_accent: string;
  tp_hero_subtitle: string;
  tp_how_eyebrow: string;
  tp_how_title: string;
  tp_how_step1_title: string;
  tp_how_step1_body: string;
  tp_how_step2_title: string;
  tp_how_step2_body: string;
  tp_how_step3_title: string;
  tp_how_step3_body: string;
  tp_pay_eyebrow: string;
  tp_pay_title: string;
  tp_pay_title_line2: string;
  tp_pay_body: string;
  tp_pay_stripe_badge: string;
  tp_pay_step1: string;
  tp_pay_step2: string;
  tp_pay_step3: string;
  tp_pay_step4: string;
  tp_pay_step5: string;
  tp_pay_footnote: string;
  tp_pillars_eyebrow: string;
  tp_pillars_title: string;
  tp_pillar1_title: string;
  tp_pillar1_body: string;
  tp_pillar2_title: string;
  tp_pillar2_body: string;
  tp_pillar3_title: string;
  tp_pillar3_body: string;
  tp_pillar4_title: string;
  tp_pillar4_body: string;
  tp_allowed_title: string;
  tp_allowed_body: string;
  tp_allowed_cta: string;
  tp_faq_eyebrow: string;
  tp_faq_title: string;
  tp_faq_q1: string;
  tp_faq_a1: string;
  tp_faq_q2: string;
  tp_faq_a2: string;
  tp_faq_q3: string;
  tp_faq_a3: string;
  tp_faq_q4: string;
  tp_faq_a4: string;
  tp_faq_q5: string;
  tp_faq_a5: string;
  tp_contact_title: string;
  tp_contact_body_before: string;
  tp_contact_body_after: string;
  tp_cta_title: string;
  tp_cta_body: string;
  tp_cta_send: string;
  tp_cta_travel: string;

  // CGU (terms) + objets-autorises pages
  cgu_back_home: string;
  cgu_badge: string;
  cgu_title: string;
  cgu_last_updated: string;
  cgu_review_note: string;
  cgu_intro: string;
  cgu_s1_title: string;
  cgu_s1_p1: string;
  cgu_s1_p2: string;
  cgu_s2_title: string;
  cgu_s2_p1: string;
  cgu_s2_p2: string;
  cgu_s3_title: string;
  cgu_s3_p1: string;
  cgu_s3_p2: string;
  cgu_s3_p3: string;
  cgu_s3_p4_pre: string;
  cgu_s3_p4_link: string;
  cgu_s3_p4_post: string;
  cgu_s4_title: string;
  cgu_s4_p1: string;
  cgu_s4_li1: string;
  cgu_s4_li2: string;
  cgu_s4_p2: string;
  cgu_s5_title: string;
  cgu_s5_p1: string;
  cgu_s5_p2: string;
  cgu_s6_title: string;
  cgu_s6_p1: string;
  cgu_s7_title: string;
  cgu_s7_p1: string;
  cgu_s7_li1: string;
  cgu_s7_li2: string;
  cgu_s7_li3: string;
  cgu_s7_li4: string;
  cgu_s7_li5: string;
  cgu_s7_li6: string;
  cgu_s7_p2: string;
  cgu_s7_li7: string;
  cgu_s7_li8: string;
  cgu_s7_li9: string;
  cgu_s7_li10: string;
  cgu_s8_title: string;
  cgu_s8_p1: string;
  cgu_s9_title: string;
  cgu_s9_p1: string;
  cgu_s9_p2: string;
  cgu_s10_title: string;
  cgu_s10_p1: string;
  cgu_s11_title: string;
  cgu_s11_p1: string;
  cgu_s12_title: string;
  cgu_s12_p1: string;
  cgu_callouts_title: string;
  cgu_callout1_title: string;
  cgu_callout1_body: string;
  cgu_callout2_title: string;
  cgu_callout2_body: string;
  cgu_callout3_title: string;
  cgu_callout3_body: string;
  cgu_callout4_title: string;
  cgu_callout4_body: string;
  cgu_cta_text: string;
  cgu_cta_button: string;
  oa_badge: string;
  oa_hero_title: string;
  oa_hero_subtitle: string;
  oa_allowed_eyebrow: string;
  oa_allowed_heading: string;
  oa_allowed1_label: string;
  oa_allowed1_examples: string;
  oa_allowed2_label: string;
  oa_allowed2_examples: string;
  oa_allowed3_label: string;
  oa_allowed3_examples: string;
  oa_allowed4_label: string;
  oa_allowed4_examples: string;
  oa_allowed5_label: string;
  oa_allowed5_examples: string;
  oa_allowed6_label: string;
  oa_allowed6_examples: string;
  oa_otc_title: string;
  oa_otc_p1: string;
  oa_otc_p2: string;
  oa_otc_p2_emphasis: string;
  oa_forbidden_eyebrow: string;
  oa_forbidden_heading: string;
  oa_forbidden_subtitle: string;
  oa_forbidden_tag: string;
  oa_forbidden1_label: string;
  oa_forbidden1_reason: string;
  oa_forbidden2_label: string;
  oa_forbidden2_reason: string;
  oa_forbidden3_label: string;
  oa_forbidden3_reason: string;
  oa_forbidden4_label: string;
  oa_forbidden4_reason: string;
  oa_forbidden5_label: string;
  oa_forbidden5_reason: string;
  oa_forbidden6_label: string;
  oa_forbidden6_reason: string;
  oa_forbidden7_label: string;
  oa_forbidden7_reason: string;
  oa_forbidden8_label: string;
  oa_forbidden8_reason: string;
  oa_consequences_title: string;
  oa_consequences_p1: string;
  oa_consequences_strong1: string;
  oa_consequences_p2: string;
  oa_consequences_strong2: string;
  oa_consequences_p3: string;
  oa_consequences_strong3: string;
  oa_consequences_p4: string;
  oa_dd_eyebrow: string;
  oa_dd_title: string;
  oa_dd_subtitle: string;
  oa_dd_card1_title: string;
  oa_dd_card1_quote: string;
  oa_dd_card2_title: string;
  oa_dd_card2_quote: string;
  oa_dd_card3_title: string;
  oa_dd_card3_body: string;
  oa_cta_title: string;
  oa_cta_subtitle: string;
  oa_cta_button: string;

  // My Space dashboard (MePageClient)
  me2_role_sender: string;
  me2_role_sender_lc: string;
  me2_role_traveler: string;
  me2_role_traveler_lc: string;
  me2_role_someone: string;
  me2_tab_trips: string;
  me2_tab_sends: string;
  me2_delivery_code_unavailable: string;
  me2_pickup_code_unavailable: string;
  me2_receipt_recorded_transfer_pending: string;
  me2_wallet_label: string;
  me2_wallet_total_received: string;
  me2_wallet_empty_hint: string;
  me2_withdraw_earnings: string;
  me2_coming_soon: string;
  me2_withdraw_modal_title: string;
  me2_withdraw_modal_text: string;
  me2_your_balance: string;
  me2_withdraw_question: string;
  me2_got_it: string;
  me2_my_reservations: string;
  me2_my_reservations_subtitle: string;
  me2_delivered_confirmed: string;
  me2_delivered_to_confirm: string;
  me2_view_proof: string;
  me2_i_received: string;
  me2_rate: string;
  me2_you_rated: string;
  me2_x_rated_you: string;
  me2_x_accepted: string;
  me2_arrange_transport_details: string;
  me2_delivery_proof: string;
  me2_handed_to: string;
  me2_note_label: string;
  me2_uploaded_on: string;
  me2_how_to_contact: string;
  me2_message: string;
  me2_call: string;
  me2_whatsapp_not_provided: string;
  me2_handoff_code_title: string;
  me2_handoff_code_desc: string;
  me2_view_code: string;
  me2_package_handed_to: string;
  me2_report_problem: string;
  me2_status_new: string;
  me2_status_pending: string;
  me2_status_declined: string;
  me2_decline: string;
  me2_pay: string;
  me2_cancel_failed: string;
  me2_from_price: string;
  me2_cancel_trip: string;
  me2_cancel_trip_q: string;
  me2_checking_bookings: string;
  me2_one_booking_in_progress: string;
  me2_n_bookings_in_progress: string;
  me2_bookings_auto_cancel_before: string;
  me2_bookings_auto_cancel_bold: string;
  me2_bookings_auto_cancel_after: string;
  me2_cancel_trip_final: string;
  me2_keep_trip: string;
  me2_cancelling: string;
  me2_confirm_cancel: string;
  me2_my_proposals_sent: string;
  me2_my_proposals_sent_subtitle: string;
  me2_requests_received: string;
  me2_requests_received_subtitle: string;
  me2_no_pending_requests: string;
  me2_to_deliver: string;
  me2_history: string;
  me2_status_cashed_in: string;
  me2_status_delivered: string;
  me2_status_accepted: string;
  me2_accept: string;
  me2_open_conversation: string;
  me2_messages: string;
  me2_i_delivered: string;
  me2_phone_hint: string;
  me2_city: string;
  me2_country: string;
  me2_saved: string;
  me2_verify_identity_title: string;
  me2_mandatory: string;
  me2_verify_identity_desc: string;
  me2_id_verified_label: string;
  me2_identity_verified: string;
  me2_verify_start_failed: string;
  me2_error_retry: string;
  me2_verify_my_identity: string;
  me2_update_failed: string;
  me2_confirm_and_pay: string;
  me2_with_traveler: string;
  me2_back: string;
  me2_my_packages: string;
  me2_publish_request: string;
  me2_no_sends: string;
  me2_bucket_todo: string;
  me2_bucket_in_progress: string;
  me2_bucket_searching: string;
  me2_bucket_delivered: string;
  me2_bucket_cancelled: string;
  me2_select_send: string;
  me2_sub_proposes: string;
  me2_sub_delivered_by: string;
  me2_sub_to_confirm: string;
  me2_sub_in_transit: string;
  me2_sub_waiting_for: string;
  me2_sub_cancelled: string;
  me2_before_date: string;
  me2_description: string;
  me2_searching_traveler_title: string;
  me2_searching_traveler_text: string;
  me2_my_trips: string;
  me2_publish_trip: string;
  me2_no_trips: string;
  me2_past_trips: string;
  me2_select_trip: string;
  me2_packages_unit: string;
  me2_flight: string;
  me2_departure: string;
  me2_packages_unit_caps: string;
  me2_earnings_on_flight: string;
  me2_no_packages_on_flight: string;
  me2_find_packages_on_route: string;
  me2_pill_new_request: string;
  me2_pill_delivery_confirmed: string;
  me2_pill_delivered_give_code: string;
  me2_pill_picked_up_to_deliver: string;
  me2_pill_payment_held_to_pickup: string;
  me2_pill_to_deliver: string;
  me2_i_picked_up: string;
  me2_view_delivery_code: string;
  me2_history_empty: string;
  me2_history_missions: string;
  me2_history_sends: string;
  me2_history_proposals: string;
  me2_history_cancelled_trips: string;
  me2_cancelled_label: string;

  // Pickup / delivery code & proof modals
  pickup_close: string;
  pickup_show_title_delivery: string;
  pickup_show_title_pickup: string;
  pickup_show_body_delivery: string;
  pickup_show_body_pickup: string;
  pickup_show_code_label_delivery: string;
  pickup_show_code_label_pickup: string;
  pickup_show_copied: string;
  pickup_show_copy: string;
  pickup_show_warning_delivery: string;
  pickup_show_warning_pickup: string;
  pickup_enter_title_delivery: string;
  pickup_enter_title_pickup: string;
  pickup_enter_err_too_many: string;
  pickup_enter_err_invalid_delivery: string;
  pickup_enter_err_invalid_pickup: string;
  pickup_enter_err_already_delivery: string;
  pickup_enter_err_already_pickup: string;
  pickup_enter_err_not_traveler: string;
  pickup_enter_err_not_sender: string;
  pickup_enter_err_no_proof: string;
  pickup_enter_err_generic: string;
  pickup_enter_err_unexpected: string;
  pickup_enter_body_delivery: string;
  pickup_enter_body_pickup: string;
  pickup_enter_verifying: string;
  pickup_enter_auto_validate: string;
  pickup_enter_footer_delivery: string;
  pickup_enter_footer_pickup: string;
  pickup_enter_footer_pickup_article: string;
  pickup_proof_err_photo_too_large: string;
  pickup_proof_err_no_photo: string;
  pickup_proof_err_no_name: string;
  pickup_proof_err_upload_failed: string;
  pickup_proof_err_generic: string;
  pickup_proof_eyebrow: string;
  pickup_proof_title: string;
  pickup_proof_intro: string;
  pickup_proof_photo_label: string;
  pickup_proof_preview_alt: string;
  pickup_proof_remove_photo: string;
  pickup_proof_photo_cta: string;
  pickup_proof_receiver_label: string;
  pickup_proof_receiver_placeholder: string;
  pickup_proof_receiver_hint: string;
  pickup_proof_note_label: string;
  pickup_proof_note_placeholder: string;
  pickup_proof_cancel: string;
  pickup_proof_submitting: string;
  pickup_proof_submit: string;

  // Review / dispute / respond modals
  rev_close: string;
  rev_cancel: string;
  rev_sending: string;
  rev_review_eyebrow: string;
  rev_review_title: string;
  rev_review_subtitle_traveler: string;
  rev_review_subtitle_sender: string;
  rev_review_placeholder_traveler: string;
  rev_review_placeholder_sender: string;
  rev_rating_1: string;
  rev_rating_2: string;
  rev_rating_3: string;
  rev_rating_4: string;
  rev_rating_5: string;
  rev_select_rating: string;
  rev_stars_singular: string;
  rev_stars_plural: string;
  rev_comment_label: string;
  rev_submit_review: string;
  rev_err_already_reviewed: string;
  rev_err_cannot_review_yet: string;
  rev_err_save_failed: string;
  rev_dispute_title: string;
  rev_dispute_intro_before: string;
  rev_dispute_intro_after: string;
  rev_dispute_cat_not_delivered: string;
  rev_dispute_cat_not_delivered_desc: string;
  rev_dispute_cat_damaged: string;
  rev_dispute_cat_damaged_desc: string;
  rev_dispute_cat_wrong_item: string;
  rev_dispute_cat_wrong_item_desc: string;
  rev_dispute_cat_late: string;
  rev_dispute_cat_late_desc: string;
  rev_dispute_cat_other: string;
  rev_dispute_cat_other_desc: string;
  rev_dispute_cat_mismatch: string;
  rev_dispute_cat_mismatch_desc: string;
  rev_dispute_cat_no_confirm: string;
  rev_dispute_cat_no_confirm_desc: string;
  rev_dispute_desc_label: string;
  rev_dispute_desc_placeholder: string;
  rev_dispute_submit: string;
  rev_dispute_abuse_warning: string;
  rev_dispute_err_no_category: string;
  rev_dispute_err_short_desc: string;
  rev_dispute_err_submit_failed: string;
  rev_respond_sender_fallback: string;
  rev_respond_err_failed: string;
  rev_respond_eyebrow: string;
  rev_respond_sender_role: string;
  rev_respond_category: string;
  rev_respond_before_date: string;
  rev_respond_which_flight: string;
  rev_respond_loading_flights: string;
  rev_respond_new_flight: string;
  rev_respond_flight_date: string;
  rev_respond_flight_saved_note: string;
  rev_respond_if_accepted: string;
  rev_respond_you_receive: string;
  rev_respond_jibly_protection: string;
  rev_respond_message_label: string;
  rev_respond_message_placeholder: string;
  rev_respond_reassurance: string;
  rev_respond_submit: string;

  // Secondary pages (notifications, messages, history, wallet)
  sec_back_to_space: string;
  sec_login: string;
  sec_loading: string;
  sec_load_more: string;
  sec_load_error: string;
  sec_user_fallback: string;
  sec_notif_title: string;
  sec_notif_subtitle: string;
  sec_notif_mark_all_read: string;
  sec_notif_empty_title: string;
  sec_notif_empty_body: string;
  sec_msg_title: string;
  sec_msg_subtitle: string;
  sec_msg_login_prompt: string;
  sec_msg_empty_title: string;
  sec_msg_empty_body: string;
  sec_msg_you_prefix: string;
  sec_msg_no_message: string;
  sec_hist_title: string;
  sec_hist_subtitle: string;
  sec_hist_login_prompt: string;
  sec_hist_tab_transports: string;
  sec_hist_tab_envois: string;
  sec_hist_empty_title: string;
  sec_hist_empty_transports: string;
  sec_hist_empty_envois: string;
  sec_hist_status_cancelled_trip: string;
  sec_hist_status_declined: string;
  sec_hist_status_delivered: string;
  sec_hist_status_confirmed: string;
  sec_hist_view_proof: string;
  sec_wallet_title: string;
  sec_wallet_subtitle: string;
  sec_wallet_available: string;
  sec_wallet_balance_label: string;
  sec_wallet_tx_count_singular: string;
  sec_wallet_tx_count_plural: string;
  sec_wallet_withdraw: string;
  sec_wallet_coming_soon: string;
  sec_wallet_account_holder: string;
  sec_wallet_account_holder_placeholder: string;
  sec_wallet_withdraw_note_before: string;
  sec_wallet_withdraw_note_after: string;
  sec_wallet_pending: string;
  sec_wallet_no_pending: string;
  sec_wallet_to_receive: string;
  sec_wallet_history: string;
  sec_wallet_empty_title: string;
  sec_wallet_empty_body: string;
  sec_wallet_publish_trip: string;
  sec_wallet_sender_fallback: string;
  sec_wallet_status_captured: string;
  sec_wallet_status_pending: string;
  sec_wallet_status_cancelled: string;
};

export const translations: Record<Locale, Translations> = {
  fr: {
    nav_send: 'Je cherche un voyageur',
    nav_travel: 'Je peux transporter',
    nav_discover: 'Découvrir',
    nav_trust: 'FAQ - Sérénité',
    nav_my_space: 'Mon espace',
    nav_start: 'S\'inscrire',
    nav_wallet_title: 'Mon portefeuille',
    nav_wallet_label: 'Portefeuille',
    nav_notifications: 'Notifications',
    nav_menu: 'Menu',

    hero_badge: 'Communauté de voyageurs vérifiés',
    hero_title_1: 'Quelqu\'un voyage déjà',
    hero_title_2: 'dans votre direction.',
    hero_subtitle: 'Envoyez vos affaires avec un voyageur. Simple, humain, partout dans le monde.',
    hero_search_from: 'Ville de départ',
    hero_search_to: 'Ville d\'arrivée',
    hero_search_button: 'Trouver un voyageur',
    hero_social_proof: '+2 000 voyageurs',
    search_label_from: 'Départ',
    search_label_to: 'Arrivée',
    search_label_before: 'Avant le',
    search_button: 'Rechercher',
    search_filters_show: 'Filtres avancés',
    search_filters_hide: 'Masquer les filtres',
    search_label_flight_date: 'Date du vol',
    login_session_reset_title: 'Votre session a été réinitialisée.',
    login_session_reset_text: 'Reconnectez-vous pour continuer.',
    login_submit: 'Se connecter',
    login_reset_link: 'Problème de connexion ? Réinitialiser',
    signup_name_placeholder: 'Salma El Amrani',
    sec_wallet_withdraw_subject: 'Retrait de mes gains',
    footer_allowed_items: 'Objets autorisés',
    footer_terms: 'CGU',
    pay_security_note: 'Paiement sécurisé par Stripe. Votre carte est autorisée mais pas débitée. Le montant ne sera prélevé que si le voyageur accepte. En cas de refus, l’autorisation est libérée.',
    pay_submitting: 'Confirmation…',
    pay_submit: 'Confirmer le paiement',
    bt_step_booked_short: 'Réservé',
    bt_step_handover_short: 'Remis',
    bt_step_transit_short: 'Transport',
    bt_step_delivered_short: 'Livré',
    bt_step_paid_short: 'Payé',
    bt_payment_safety: '🔒 Votre paiement est conservé en sécurité jusqu’à la confirmation de la livraison.',
    disc_clear: 'Effacer',
    disc_filter_budget: 'Budget maximum',
    disc_filter_trust: 'Confiance',
    disc_filter_verified_only: 'Identité vérifiée uniquement',
    disc_tab_travelers: 'Voyageurs',
    disc_tab_requests: 'Demandes',
    disc_heading_travelers: 'Voyageurs disponibles',
    disc_heading_requests: 'Demandes de transport',
    disc_publish_request: 'Publier ma demande',
    disc_publish_trip: 'Publier mon trajet',
    disc_trips_count: 'trajets',
    disc_price_from: 'À partir de',
    disc_protection_included: 'protection Jibly incluse',
    disc_empty_travelers_route: 'Aucun voyageur sur cette route',
    disc_empty_requests_route: 'Aucune demande sur cette route',
    disc_empty_travelers: 'Aucun voyageur pour le moment',
    disc_empty_requests: 'Aucune demande pour le moment',
    disc_empty_hint_search: 'Essayez d’élargir vos critères.',
    disc_empty_hint_travelers: 'Publiez votre demande, on vous prévient dès qu’un voyageur passe par chez vous.',
    disc_empty_hint_requests: 'Publiez votre trajet — les expéditeurs vous trouveront.',
    disc_clear_search: 'Effacer la recherche',
    disc_age_today: 'Aujourd’hui',
    disc_age_yesterday: 'Hier',
    disc_age_days_ago: 'Il y a {n} jours',
    disc_you_receive: 'Vous recevrez',
    disc_on_paid: 'sur {total} payés',
    disc_i_can_do_it: 'Je peux le faire',

    how_title: 'Comment ça marche',
    how_subtitle: 'Trois étapes, c\'est tout.',
    how_step1_title: 'Publiez',
    how_step1_text: 'Décrivez ce que vous voulez envoyer.',
    how_step2_title: 'Matchez',
    how_step2_text: 'Choisissez un voyageur vérifié.',
    how_step3_title: 'Recevez',
    how_step3_text: 'Suivez votre envoi de bout en bout.',

    travelers_title: 'Des voyageurs prêts à aider',
    travelers_subtitle: 'Réels, vérifiés, bien notés.',
    travelers_see_all: 'Tout voir',
    travelers_trips: 'trajets',

    trust_identity: 'Identité vérifiée',
    trust_data: 'Données protégées',
    trust_messaging: 'Messagerie sécurisée',
    trust_support: 'Support 7/7',
    home_trust_title: 'Quatre piliers, une promesse simple.',

    testimonial_quote: 'J\'ai envoyé les papiers de ma mère depuis Bruxelles. Reçus en 36h. Une magie.',
    testimonial_author: 'Salma — Casablanca',

    cta_ready: 'Prêt à commencer ?',
    cta_subtitle: 'Publiez votre demande en 2 minutes.',
    cta_send_btn: 'Envoyer quelque chose',
    cta_travel_btn: 'Je voyage bientôt',

    send_title: 'Envoyer quelque chose',
    send_subtitle: 'Cela prend 2 minutes.',
    send_step_route: 'Trajet',
    send_step_item: 'Objet',
    send_step_details: 'Détails',
    send_step_confirm: 'Confirmation',
    send_route_title: 'D\'où vers où ?',
    send_label_from: 'Départ',
    send_label_to: 'Arrivée',
    send_placeholder_from: 'Choisir la ville de départ',
    send_placeholder_to: 'Choisir la ville d\'arrivée',
    send_label_date: 'Date souhaitée',
    send_item_title: 'Qu\'envoyez-vous ?',
    send_label_description: 'Description',
    send_placeholder_description: 'Ex: acte de naissance, dans une enveloppe scellée',
    send_prescription_required: 'Ordonnance obligatoire',
    send_upload_prescription: 'Téléverser l\'ordonnance',
    send_forbidden_title: 'Objets interdits',
    send_details_title: 'Quand et combien ?',
    send_label_urgency: 'Urgence',
    send_label_budget: 'Budget proposé',
    send_confirm_title: 'Tout est bon ?',
    send_recap_route: 'Trajet',
    send_recap_date: 'Date',
    send_recap_item: 'Objet',
    send_recap_urgency: 'Urgence',
    send_recap_budget: 'Budget',
    send_terms: 'J\'accepte que Jibly est une plateforme de mise en relation. Je suis responsable de vérifier que mon objet est autorisé.',
    send_publish: 'Publier',
    send_success_title: 'C\'est publié !',
    send_success_text: 'On vous prévient dès qu\'un voyageur correspond à votre trajet.',
    send_success_see_travelers: 'Voir les voyageurs',
    send_success_back: 'Retour à l\'accueil',

    trip_title: 'Je voyage bientôt',
    trip_subtitle: 'Aidez quelqu\'un, gagnez un peu en chemin.',
    trip_step_route: 'Trajet',
    trip_step_space: 'Espace',
    trip_step_identity: 'Identité',
    trip_step_validation: 'Validation',
    trip_route_title: 'Votre trajet',
    trip_label_time: 'Heure (optionnel)',
    trip_space_title: 'Que pouvez-vous transporter ?',
    trip_label_min_comp: 'Compensation minimum acceptée',
    trip_min_comp_hint: 'La plupart des voyageurs fixent leur prix autour de 50€. Vous recevrez ce montant exactement.',
    trip_accepted_categories_label: 'Ce que vous acceptez de transporter',
    trip_accepted_categories_hint: 'Sélectionnez ce avec quoi vous êtes à l\'aise. Vous pourrez toujours refuser à la livraison.',
    trip_identity_title: 'Vérifier votre identité',
    trip_identity_subtitle: 'Optionnel mais recommandé. Les profils vérifiés reçoivent 3× plus de demandes.',
    trip_identity_benefit_1: 'Badge "Identité vérifiée" sur votre profil',
    trip_identity_benefit_2: 'Plus de visibilité',
    trip_identity_benefit_3: 'Communauté plus rassurée',
    trip_upload_id: 'Téléverser une pièce d\'identité',
    trip_validation_title: 'Vos engagements',
    trip_engagement_1: 'Je transporte uniquement des objets autorisés',
    trip_engagement_2: 'Je vérifie le contenu avant le départ',
    trip_engagement_3: 'Je traite les envois avec soin et confidentialité',
    trip_engagement_4: 'Je remets l\'objet à la bonne personne',
    trip_engagement_terms: 'Je m\'engage à respecter ces règles et j\'accepte les conditions d\'utilisation de Jibly.',
    trip_publish: 'Publier mon trajet',
    trip_success_title: 'Bon voyage ✈️',
    trip_success_text: 'Votre trajet est publié. On vous prévient si quelqu\'un veut envoyer quelque chose.',

    matches_title: 'Voyageurs disponibles',
    matches_subtitle: 'personnes prêtes à aider.',
    matches_empty_title: 'Aucun voyageur pour le moment',
    matches_empty_text: 'Publiez votre demande, on vous prévient dès qu\'un voyageur passe.',
    matches_empty_filtered: 'Aucun voyageur ne correspond à ces filtres. Essayez d\'élargir.',
    matches_total: 'au total',
    matches_filters: 'Filtres',
    matches_filter_from: 'Départ',
    matches_filter_to: 'Arrivée',
    matches_filter_before: 'Avant le',
    matches_filter_max_price: 'Budget max',
    matches_filter_verified: 'Identité vérifiée',
    matches_filter_clear: 'Effacer les filtres',
    matches_publish_btn: 'Publier ma demande',
    matches_from: 'Départ',
    matches_to: 'Arrivée',
    matches_contact: 'Contacter',
    matches_min: 'À partir de',

    trust_eyebrow: 'Sécurité & confiance',
    trust_hero_title: 'Voyagez serein, envoyez en confiance',
    trust_hero_subtitle: 'Jibly met en relation des voyageurs et des expéditeurs vérifiés pour de petits envois personnels.',
    trust_intent_title: 'Une plateforme, pas un transporteur',
    trust_intent_text: 'Jibly n\'achemine rien physiquement. Nous facilitons la rencontre. Ce sont les voyageurs qui décident, en conscience, ce qu\'ils acceptent de transporter.',
    trust_faq_title: 'Vos questions, nos réponses',

    trust_q1_question: 'Que puis-je envoyer ?',
    trust_q1_intro: 'Jibly est pensé pour les petits objets personnels :',
    trust_q1_item_1: 'Documents administratifs',
    trust_q1_item_2: 'Clés oubliées',
    trust_q1_item_3: 'Affaires personnelles laissées derrière soi',
    trust_q1_item_4: 'Petits objets du quotidien',
    trust_q1_note: 'Tout objet illégal, dangereux, suspect ou interdit par la loi est strictement exclu.',

    trust_q2_question: 'Le voyageur vérifie-t-il l\'objet ?',
    trust_q2_text: 'Oui, toujours. Avant d\'accepter un envoi, le voyageur doit pouvoir voir et inspecter ce qu\'il va transporter. Aucun voyageur ne devrait accepter un paquet scellé ou dont le contenu n\'est pas clair.',

    trust_q3_question: 'Qui est responsable de l\'objet transporté ?',
    trust_q3_text: 'L\'expéditeur et le voyageur sont co-responsables de l\'échange. Ils doivent respecter les règles des compagnies aériennes, des aéroports, des douanes et des lois locales. Jibly est une plateforme de mise en relation, et ne transporte aucun objet.',

    trust_q4_question: 'Puis-je transporter des médicaments ?',
    trust_q4_text: 'Certains médicaments sont réglementés selon les pays. Un voyageur ne devrait accepter des médicaments que s\'ils sont légalement autorisés, accompagnés d\'une ordonnance valide ou des documents adéquats.',

    trust_q5_question: 'Comment Jibly construit la confiance ?',
    trust_q5_intro: 'Plusieurs garde-fous, pensés pour vous rassurer :',
    trust_q5_item_1: 'Profils vérifiés (email, identité)',
    trust_q5_item_2: 'Historique des trajets effectués',
    trust_q5_item_3: 'Notes et avis après chaque échange',
    trust_q5_item_4: 'Une communauté responsable et solidaire',

    trust_q6_question: 'Quels objets sont interdits ?',
    trust_q6_intro: 'Pour la sécurité de tous, les objets suivants n\'ont pas leur place sur Jibly :',
    trust_q6_item_1: 'Substances illégales',
    trust_q6_item_2: 'Armes ou objets dangereux',
    trust_q6_item_3: 'Produits inflammables ou toxiques',
    trust_q6_item_4: 'Colis non identifiés ou scellés sans explication',
    trust_q6_item_5: 'Contrefaçons',
    trust_q6_item_6: 'Tout objet interdit par les douanes ou les compagnies aériennes',

    trust_footer_title: 'Une question avant de vous lancer ?',
    trust_footer_text: 'Notre équipe répond sous 24h. Et vous pouvez signaler un comportement à tout moment.',
    trust_footer_cta: 'Publier une demande',

    me_title: 'Mon espace',
    me_tab_overview: 'Aperçu',
    me_tab_requests: 'Mes envois',
    me_tab_trips: 'Mes trajets',
    me_tab_matches: 'Mises en relation',
    me_tab_profile: 'Profil',
    me_stats_active: 'Demandes actives',
    me_stats_pending: 'En attente',
    me_stats_earned: 'Gagné',
    me_stats_completed: 'Livraisons',
    me_section_my_requests: 'Mes envois publiés',
    me_section_my_trips: 'Mes trajets publiés',
    me_section_pending_matches: 'Demandes en attente',
    me_section_active: 'Livraisons en cours',
    me_section_completed: 'Livraisons terminées',
    me_section_profile: 'Mon profil',
    me_empty_requests: 'Aucun envoi pour le moment.',
    me_empty_trips: 'Aucun trajet pour le moment.',
    me_empty_matches: 'Aucune mise en relation en attente.',
    me_new_request: 'Nouveau envoi',
    me_new_trip: 'Nouveau trajet',
    me_status_pending: 'En attente',
    me_status_open: 'Ouvert',
    me_status_matched: 'Matché',
    me_status_in_transit: 'En cours',
    me_status_completed: 'Terminé',
    me_status_cancelled: 'Annulé',
    me_payment_pending: 'Paiement en attente',
    me_payment_held: 'Bloqué',
    me_payment_released: 'Versé',
    me_profile_name: 'Nom complet',
    me_profile_email: 'Email',
    me_profile_phone: 'Téléphone',
    me_profile_verification: 'Vérification',
    me_profile_verify_now: 'Vérifier mon identité',

    common_back: 'Précédent',
    common_next: 'Suivant',
    common_cancel: 'Annuler',
    common_close: 'Fermer',
    gate_identity_required:
      'Vérifiez votre identité pour continuer. Obligatoire avant de publier un trajet, réserver ou proposer votre aide. Vérification gratuite et chiffrée par Stripe.',
    common_save: 'Enregistrer',
    common_loading: 'Chargement...',
    common_optional: 'optionnel',
    common_eur: '€',
    common_message: 'Message',
    common_search_placeholder: 'Rechercher une ville ou un pays...',
    common_no_results: 'Aucune ville trouvée',
    common_clear: 'Effacer',

    picker_country_placeholder: 'Pays',
    picker_city_placeholder: 'Ville',
    picker_country_input_placeholder: 'Tapez le pays…',
    picker_city_input_placeholder: 'Tapez la ville…',
    picker_search_country: 'Rechercher un pays…',
    picker_search_city: 'Rechercher une ville…',
    picker_locate: 'Me localiser',
    picker_locating: 'Localisation…',
    picker_other_country: 'Autre pays — saisir manuellement',
    picker_other_city: 'Autre ville — saisir manuellement',
    picker_geo_unavailable: 'Géolocalisation indisponible.',
    picker_geo_denied: 'Position refusée. Choisis ton pays manuellement.',
    picker_back_countries: 'Revenir à la liste des pays',
    picker_back_cities: 'Revenir à la liste des villes',
    error_same_route: 'Le départ et l’arrivée doivent être différents.',

   cat_documents: 'Documents',
    cat_documents_desc: 'Papiers, contrats, attestations',
    cat_keys: 'Clés',
    cat_keys_desc: 'Logement, voiture',
    cat_small: 'Petits objets',
    cat_small_desc: 'Lunettes, livre, souvenirs',
    cat_clothes: 'Vêtements',
    cat_clothes_desc: 'Habits, accessoires, chaussures',
    cat_electronics: 'Électronique légère',
    cat_electronics_desc: 'Chargeurs, câbles, écouteurs',
    cat_otc: 'Médicaments en vente libre',
    cat_otc_desc: 'Doliprane, vitamines (sans ordonnance)',
    send_certify_label: 'Je certifie que le contenu décrit est exact et qu\'il ne contient aucun produit interdit.',
    send_certify_otc_disclaimer: 'Les médicaments doivent être SANS ordonnance, dans leur emballage d\'origine fermé, max 2 unités. J\'assume la responsabilité légale du contenu.',
    trip_verify_content_label: 'J\'ai vérifié le contenu avant d\'accepter de le transporter.',
    urgency_standard: 'Standard',
    urgency_standard_hint: '2 semaines',
    urgency_fast: 'Rapide',
    urgency_fast_hint: '7 jours',
    urgency_urgent: 'Urgent',
    urgency_urgent_hint: '48-72h',

    space_envelope: 'Enveloppe',
    space_envelope_size: 'jusqu\'à 200g',
    space_pouch: 'Pochette',
    space_pouch_size: 'jusqu\'à 500g',
    space_bag: 'Petit sac',
    space_bag_size: 'jusqu\'à 1,5 kg',

    verif_trusted: 'Membre de confiance',
    verif_id: 'Identité vérifiée',
    verif_email: 'Email confirmé',
    verif_none: 'Non vérifié',

    footer_tagline: 'Une communauté de voyageurs vérifiés, partout dans le monde.',
    footer_platform: 'Plateforme',
    footer_trust: 'FAQ - Sérénité',
    footer_community: 'Communauté',
    footer_made_with: 'Fait avec',

    admin_badge: 'Admin',
    admin_title: 'Modération',
    admin_tab_overview: 'Vue d\'ensemble',
    admin_tab_requests: 'Demandes',
    admin_tab_trips: 'Trajets',
    admin_tab_reports: 'Signalements',
    admin_tab_users: 'Utilisateurs',
    admin_tab_matches: 'Mises en relation',
    admin_kpi_active_requests: 'Demandes actives',
    admin_kpi_weekly_trips: 'Trajets cette semaine',
    admin_kpi_matches: 'Matches réussis',
    admin_kpi_open_reports: 'Signalements ouverts',
    admin_recent_activity: 'Activité récente',
    admin_queue: 'File d\'attente',
    admin_col_sender: 'Expéditeur',
    admin_col_traveler: 'Voyageur',
    admin_col_route: 'Trajet',
    admin_col_category: 'Catégorie',
    admin_col_date: 'Date',
    admin_col_action: 'Action',
    admin_col_space: 'Espace',
    admin_col_compensation: 'Compensation',
    admin_col_status: 'Statut',
    admin_col_amount: 'Montant',
    admin_action_approve: 'Approuver',
    admin_action_reject: 'Rejeter',
    admin_action_review: 'Examiner',
    admin_action_ignore: 'Ignorer',
    admin_status_accepted: 'accepté',
    admin_status_in_progress: 'en cours',
    admin_status_delivered: 'livré',
    admin_report_by: 'Par',
    admin_report_concerns: 'concerne',
    admin_severity_high: 'élevée',
    admin_severity_medium: 'moyenne',
    admin_trips_count: 'trajets',
    admin_starts_at: 'à partir de',
    admin_ago_min: 'il y a {n} min',
    admin_ago_hour: 'il y a {n}h',
    admin_activity_trip_validated: 'Yasmine B. — trajet validé',
    admin_activity_new_request: 'Nouvelle demande de Lila M.',
    admin_activity_report: 'Signalement #4821',
    admin_activity_id_verified: 'Karim T. — ID vérifié',

    auth_login_title: 'Bon retour.',
    auth_login_subtitle: 'Connectez-vous pour gérer vos trajets et envois.',
    auth_signup_title: 'Créez votre compte.',
    auth_signup_subtitle: 'Quelques secondes, et vous y êtes.',
    auth_email: 'Email',
    auth_password: 'Mot de passe',
    auth_password_hint: '8 caractères minimum.',
    auth_full_name: 'Nom complet',
    auth_login_btn: 'Se connecter',
    auth_signup_btn: 'Créer un compte',
    auth_send_magic: 'Envoyer le lien magique',
    auth_tab_password: 'Mot de passe',
    auth_tab_magic: 'Lien magique',
    auth_magic_sent_title: 'Lien envoyé.',
    auth_magic_sent_text: 'Ouvrez votre boîte mail. Lien envoyé à',
    auth_check_email_title: 'Confirmez votre email.',
    auth_check_email_text: 'Un email de confirmation a été envoyé à',
    auth_no_account: 'Pas encore de compte ?',
    auth_has_account: 'Déjà inscrit ?',
    auth_signup_link: 'Créer un compte',
    auth_login_link: 'Se connecter',
    auth_logout: 'Se déconnecter',
    account_danger_zone: 'Zone sensible',
    account_delete_title: 'Supprimer mon compte',
    account_delete_text: 'Cette action est définitive. Vos trajets, demandes et messages seront supprimés.',
    account_delete_btn: 'Supprimer mon compte',
    account_delete_confirm_title: 'Vraiment supprimer votre compte ?',
    account_delete_confirm_text: 'Pour confirmer, tapez',
    account_delete_confirm_btn: 'Oui, supprimer définitivement',
    account_delete_cancel: 'Annuler',
    account_delete_typing_label: 'Tapez le mot ci-dessus pour confirmer',
    account_delete_typing_placeholder: 'supprimer',
    auth_error_generic: 'Une erreur est survenue. Réessayez.',
    auth_login_required: 'Connectez-vous pour accéder à cette page.',
    loading: 'Chargement…',
    empty_my_requests: 'Aucun envoi pour le moment.',
    empty_my_trips: 'Aucun trajet pour le moment.',
    empty_open_trips: 'Aucun voyageur disponible pour cet itinéraire.',

    // Notifications dropdown
    notif_mark_all_read: 'Tout marquer lu',
    notif_empty: 'Aucune notification pour le moment.',
    notif_see_all: 'Voir toutes les notifications',
    notif_my_messages: 'Mes messages',
    notif_time_now: 'à l\'instant',
    notif_time_min: 'il y a {n} min',
    notif_time_hour: 'il y a {n} h',
    notif_time_day: 'il y a {n} j',

    // Chat
    chat_qr_address_label: '📍 Adresse',
    chat_qr_address_text: 'Voici l\'adresse : ',
    chat_qr_parcel_label: '📦 Le colis',
    chat_qr_parcel_text: 'À propos du colis : ',
    chat_qr_arriving_label: '🕐 J\'arrive bientôt',
    chat_qr_arriving_text: 'J\'arrive bientôt 🙂',
    chat_qr_code_label: '🔑 Code de récupération',
    chat_qr_code_text: 'Quel est le code de récupération ?',
    chat_traceability_notice:
      'Gardez vos échanges sur Jibly : c\'est ce qui nous permet d\'assurer le suivi du colis et de vous protéger en cas de litige.',
    chat_empty_line1: 'Pas encore de message.',
    chat_empty_line2: 'Dites bonjour à {name} 👋',
    chat_input_placeholder: 'Écrire à {name}…',
    chat_load_error: 'Échec du chargement',
    chat_send_error: 'Échec de l\'envoi',
    chat_send_error_retry: 'Échec de l\'envoi. Réessayez.',
    chat_close: 'Fermer',
    chat_send: 'Envoyer',
    chat_hide: 'Masquer',

    // Trust / FAQ page
    tp_hero_badge: 'Sérénité Jibly',
    tp_hero_title: 'Voyagez et envoyez',
    tp_hero_title_accent: 'en toute confiance.',
    tp_hero_subtitle: 'Jibly n\'est pas un transporteur comme DHL. C\'est une plateforme qui met en relation des particuliers — avec toutes les garanties d\'une vraie marketplace.',
    tp_how_eyebrow: 'Comment ça marche',
    tp_how_title: 'Trois étapes simples',
    tp_how_step1_title: 'Trouvez un voyageur',
    tp_how_step1_body: 'Publiez votre demande ou contactez directement un voyageur dont le trajet correspond à vos besoins.',
    tp_how_step2_title: 'Réservez en sécurité',
    tp_how_step2_body: 'Votre paiement est bloqué sur la plateforme. Le voyageur ne reçoit l\'argent qu\'une fois la livraison confirmée.',
    tp_how_step3_title: 'Recevez votre colis',
    tp_how_step3_body: 'Le voyageur livre en main propre. Vous confirmez la réception via un code unique — c\'est cela qui libère le paiement.',
    tp_pay_eyebrow: 'Paiement sécurisé',
    tp_pay_title: 'Votre argent reste',
    tp_pay_title_line2: 'en sécurité.',
    tp_pay_body: 'Votre paiement est bloqué sur la plateforme dès la réservation. Le voyageur ne reçoit l\'argent qu\'une fois la livraison confirmée par vous-même via un code unique à 6 chiffres.',
    tp_pay_stripe_badge: 'Géré par Stripe — leader mondial des paiements',
    tp_pay_step1: 'Réservation confirmée',
    tp_pay_step2: 'Remise en main propre',
    tp_pay_step3: 'En transport',
    tp_pay_step4: 'Livraison confirmée',
    tp_pay_step5: 'Paiement versé',
    tp_pay_footnote: '🔒 Votre paiement est conservé en sécurité jusqu\'à la confirmation de la livraison.',
    tp_pillars_eyebrow: 'Nos garanties',
    tp_pillars_title: 'Quatre piliers de sécurité',
    tp_pillar1_title: 'Identités vérifiées',
    tp_pillar1_body: 'Pièce d\'identité et selfie biométrique via Stripe Identity. Chaque voyageur est tracé.',
    tp_pillar2_title: 'Paiement bloqué',
    tp_pillar2_body: 'Votre argent reste en escrow chez Stripe jusqu\'à confirmation de la livraison.',
    tp_pillar3_title: 'Double validation',
    tp_pillar3_body: 'Codes uniques à 6 chiffres pour la remise et la livraison. Pas d\'ambiguïté possible.',
    tp_pillar4_title: 'Litiges traités sous 48h',
    tp_pillar4_body: 'Notre équipe intervient en cas de problème. Suspension automatique en cas d\'abus avéré.',
    tp_allowed_title: 'Tous les objets ne sont pas autorisés.',
    tp_allowed_body: 'Pour protéger nos voyageurs et garantir la conformité aux lois, certaines catégories d\'objets sont strictement interdites (argent liquide, armes, objets de valeur, etc.).',
    tp_allowed_cta: 'Voir la liste complète',
    tp_faq_eyebrow: 'Questions fréquentes',
    tp_faq_title: 'Vos questions, nos réponses',
    tp_faq_q1: 'Jibly transporte-t-il les colis ?',
    tp_faq_a1: 'Non. Jibly est une plateforme qui met en relation des particuliers. Nous ne transportons rien nous-mêmes — ce sont les voyageurs qui effectuent déjà le trajet et qui acceptent de transporter votre colis.',
    tp_faq_q2: 'Comment suis-je protégé ?',
    tp_faq_a2: 'Votre paiement est conservé en sécurité par notre prestataire bancaire (Stripe) jusqu\'à ce que vous confirmiez la réception du colis. Le voyageur ne reçoit l\'argent qu\'à ce moment-là. En cas de problème, vous pouvez ouvrir un litige directement depuis votre espace.',
    tp_faq_q3: 'Que se passe-t-il si quelqu\'un ne respecte pas son engagement ?',
    tp_faq_a3: 'Les comptes qui ne respectent pas leurs engagements sont automatiquement restreints, puis suspendus en cas de récidive. L\'identité de tous nos utilisateurs est vérifiée via Stripe Identity (pièce d\'identité + selfie), ce qui permet de poursuivre les comportements abusifs.',
    tp_faq_q4: 'Puis-je envoyer n\'importe quel objet ?',
    tp_faq_a4: 'Non. Pour la sécurité de tous, certaines catégories d\'objets sont interdites (argent liquide, bijoux, armes, produits dangereux…). Consultez notre page "Objets autorisés" pour la liste complète.',
    tp_faq_q5: 'Puis-je envoyer un objet de grande valeur ?',
    tp_faq_a5: 'Jibly est conçu pour transporter des objets du quotidien : documents, clés, médicaments sur ordonnance, petits effets personnels. Les objets d\'une valeur supérieure à 500€ ne sont pas autorisés sur la plateforme.',
    tp_contact_title: 'Une autre question ?',
    tp_contact_body_before: 'Écrivez-nous à',
    tp_contact_body_after: '— nous répondons sous 24h en semaine.',
    tp_cta_title: 'Prêt à essayer ?',
    tp_cta_body: 'Rejoignez la communauté de voyageurs et d\'expéditeurs Jibly. Premier envoi gratuit pour vous donner une chance d\'essayer.',
    tp_cta_send: 'Envoyer un colis',
    tp_cta_travel: 'Proposer un trajet',

    // CGU + objets-autorises
    cgu_back_home: 'Retour à l\'accueil',
    cgu_badge: 'Conditions Générales d\'Utilisation',
    cgu_title: 'CGU de Jibly',
    cgu_last_updated: 'Dernière mise à jour : {date}',
    cgu_review_note: 'Traduction anglaise fournie à titre indicatif. À faire relire par un professionnel du droit avant tout usage légal.',
    cgu_intro: 'Bienvenue sur Jibly. En utilisant notre plateforme, vous acceptez les conditions décrites ci-dessous. Nous les avons voulues aussi courtes et claires que possible, mais leur lecture est importante pour comprendre vos droits et vos responsabilités.',
    cgu_s1_title: 'Nature de la plateforme',
    cgu_s1_p1: 'Jibly est une plateforme de mise en relation entre des voyageurs (transporteurs occasionnels) et des expéditeurs souhaitant envoyer un objet personnel. Jibly n\'est pas un transporteur, ne manipule physiquement aucun colis, et n\'assume pas la responsabilité du transport lui-même.',
    cgu_s1_p2: 'Le contrat de transport est conclu directement entre l\'expéditeur et le voyageur. Jibly facilite leur rencontre, sécurise le paiement et fournit les outils de communication, mais n\'est pas partie au contrat de transport.',
    cgu_s2_title: 'Inscription et compte',
    cgu_s2_p1: 'L\'inscription est gratuite et réservée aux personnes majeures. Vous vous engagez à fournir des informations exactes (nom, email, téléphone). La vérification d\'identité peut être requise pour certaines fonctionnalités.',
    cgu_s2_p2: 'Vous êtes responsable de la confidentialité de vos identifiants. Tout usage de votre compte est présumé fait par vous.',
    cgu_s3_title: 'Objets autorisés et interdits',
    cgu_s3_p1: 'Jibly fonctionne sur le principe d\'une liste positive : seules les catégories d\'objets explicitement autorisées peuvent être transportées. Tout autre objet est interdit par défaut.',
    cgu_s3_p2: 'Les catégories autorisées sont : documents, clés, objets personnels, vêtements, électronique légère, médicaments en vente libre (sans ordonnance, dans leur emballage d\'origine fermé, max. 2 unités).',
    cgu_s3_p3: 'Sont strictement interdits, sans exception et sans liste exhaustive : espèces, médicaments sur ordonnance, drogues et stupéfiants, armes, contrefaçons, bijoux et objets de luxe (valeur > 500 €), produits dangereux, alcool, tabac et produits réglementés, et tout objet interdit par les douanes ou la législation du pays de départ ou d\'arrivée.',
    cgu_s3_p4_pre: 'La liste complète et illustrée est disponible sur',
    cgu_s3_p4_link: 'la page Objets autorisés',
    cgu_s3_p4_post: '.',
    cgu_s4_title: 'Double déclaration du contenu',
    cgu_s4_p1: 'Avant tout transport, l\'expéditeur et le voyageur doivent chacun certifier le contenu du colis :',
    cgu_s4_li1: 'L\'expéditeur certifie que le contenu décrit est exact et ne contient aucun produit interdit.',
    cgu_s4_li2: 'Le voyageur vérifie le contenu avant d\'accepter de le transporter et reste libre de refuser à tout moment.',
    cgu_s4_p2: 'Toute fausse déclaration engage la responsabilité personnelle de son auteur, y compris sur le plan pénal et douanier.',
    cgu_s5_title: 'Paiement et compensation',
    cgu_s5_p1: 'Le paiement est effectué via Stripe au moment de la réservation et conservé en séquestre par Jibly. Le voyageur reçoit sa compensation uniquement après confirmation de la livraison par l\'expéditeur via le code de livraison.',
    cgu_s5_p2: 'Jibly prélève une commission sur chaque transaction réussie. Le détail du prix est affiché avant validation par chaque partie.',
    cgu_s6_title: 'Codes de remise et de livraison',
    cgu_s6_p1: 'Chaque réservation génère deux codes confidentiels à 6 chiffres : un code de remise (détenu par l\'expéditeur) et un code de livraison (détenu par le voyageur). Ces codes ne doivent jamais être partagés en dehors du moment du rendez-vous physique. Le déblocage du paiement dépend de leur saisie correcte par la partie destinataire.',
    cgu_s7_title: 'Comportements interdits et exclusion',
    cgu_s7_p1: 'Les comportements suivants entraînent la suspension permanente du compte, sans préavis ni remboursement :',
    cgu_s7_li1: 'Transport d\'un objet interdit (cf. article 3)',
    cgu_s7_li2: 'Fausse déclaration de contenu',
    cgu_s7_li3: 'Tentative de paiement en dehors de la plateforme',
    cgu_s7_li4: 'Usurpation d\'identité ou compte multiple frauduleux',
    cgu_s7_li5: 'Harcèlement, menaces, discrimination envers un autre utilisateur',
    cgu_s7_li6: 'Tentative de contournement des codes de remise / livraison',
    cgu_s7_p2: 'En cas d\'infraction, Jibly se réserve le droit de :',
    cgu_s7_li7: 'Suspendre le compte de manière définitive',
    cgu_s7_li8: 'Conserver les preuves (messages, photos, données de compte) à des fins légales',
    cgu_s7_li9: 'Transmettre les informations aux autorités compétentes (police, douanes, justice)',
    cgu_s7_li10: 'Refuser tout remboursement des sommes engagées',
    cgu_s8_title: 'Signalement',
    cgu_s8_p1: 'Tout utilisateur peut signaler un comportement suspect, un colis non conforme, ou une violation de ces conditions via le bouton « Signaler » présent dans l\'application. Les signalements sont traités dans les meilleurs délais et de manière confidentielle.',
    cgu_s9_title: 'Limitation de responsabilité',
    cgu_s9_p1: 'Jibly fait ses meilleurs efforts pour faciliter une expérience sûre, mais ne peut garantir le résultat de chaque transport. La responsabilité de Jibly est limitée aux services qu\'elle fournit directement (mise en relation, séquestre, messagerie).',
    cgu_s9_p2: 'En cas de litige entre un expéditeur et un voyageur, Jibly peut intervenir comme médiateur via la fonction Litige, mais ne se substitue pas à un tribunal. La responsabilité finale du transport, des objets transportés et du respect des lois locales incombe aux utilisateurs.',
    cgu_s10_title: 'Données personnelles',
    cgu_s10_p1: 'Vos données sont traitées conformément au RGPD. Vous pouvez à tout moment exporter ou supprimer vos données via votre espace personnel. Les conversations, transactions et signalements peuvent être conservés jusqu\'à 5 ans pour des raisons légales et de sécurité.',
    cgu_s11_title: 'Modification des conditions',
    cgu_s11_p1: 'Jibly peut faire évoluer ces CGU. Les utilisateurs seront notifiés par email en cas de modification substantielle. La poursuite de l\'utilisation après notification vaut acceptation.',
    cgu_s12_title: 'Droit applicable et juridiction',
    cgu_s12_p1: 'Ces conditions sont soumises au droit français. En cas de litige et à défaut d\'accord amiable, les tribunaux français sont seuls compétents, sous réserve des dispositions impératives applicables au consommateur.',
    cgu_callouts_title: 'Les 4 points à retenir',
    cgu_callout1_title: 'Double déclaration',
    cgu_callout1_body: 'Expéditeur et voyageur certifient chacun le contenu avant transport.',
    cgu_callout2_title: 'Suspension permanente',
    cgu_callout2_body: 'Toute fausse déclaration ou objet interdit entraîne l\'exclusion définitive.',
    cgu_callout3_title: 'Coopération autorités',
    cgu_callout3_body: 'Jibly conserve les preuves et coopère avec la police et les douanes.',
    cgu_callout4_title: 'Signalement',
    cgu_callout4_body: 'Tout utilisateur peut signaler un comportement suspect à tout moment.',
    cgu_cta_text: 'Une question avant de vous lancer ?',
    cgu_cta_button: 'Consulter notre FAQ Sérénité',
    oa_badge: 'Politique d\'utilisation',
    oa_hero_title: 'Que peut-on transporter sur Jibly ?',
    oa_hero_subtitle: 'Pour la sécurité de tous, Jibly limite les envois à une liste précise de catégories. Tout autre type d\'objet est interdit.',
    oa_allowed_eyebrow: 'Autorisés — Liste exhaustive',
    oa_allowed_heading: 'Les seules catégories transportables',
    oa_allowed1_label: 'Documents',
    oa_allowed1_examples: 'Papiers administratifs, courriers, certificats, contrats',
    oa_allowed2_label: 'Clés',
    oa_allowed2_examples: 'Clés oubliées, doubles, clés professionnelles',
    oa_allowed3_label: 'Objets personnels',
    oa_allowed3_examples: 'Souvenirs, livres, petits cadeaux non précieux',
    oa_allowed4_label: 'Vêtements',
    oa_allowed4_examples: 'Habits, accessoires textiles, chaussures',
    oa_allowed5_label: 'Électronique légère',
    oa_allowed5_examples: 'Chargeurs, câbles, écouteurs, petits accessoires',
    oa_allowed6_label: 'Médicaments en vente libre',
    oa_allowed6_examples: 'Doliprane, vitamines, parapharmacie — voir conditions ci-dessous',
    oa_otc_title: 'Médicaments en vente libre — conditions strictes',
    oa_otc_p1: 'Seuls les médicaments sans ordonnance légalement disponibles dans les deux pays sont acceptés (Doliprane, Efferalgan, vitamines, parapharmacie).',
    oa_otc_p2: 'Quantité maximum : 2 unités par produit, dans leur emballage d\'origine fermé. L\'expéditeur déclare et assume la responsabilité légale du contenu.',
    oa_otc_p2_emphasis: 'Les médicaments sur ordonnance restent strictement interdits.',
    oa_forbidden_eyebrow: 'Interdits',
    oa_forbidden_heading: 'Exemples d\'objets interdits',
    oa_forbidden_subtitle: 'Liste non exhaustive. Par défaut, tout ce qui n\'est pas dans la liste des catégories autorisées est interdit.',
    oa_forbidden_tag: 'Interdit',
    oa_forbidden1_label: 'Espèces',
    oa_forbidden1_reason: 'Aucun montant, en aucune devise.',
    oa_forbidden2_label: 'Médicaments sur ordonnance',
    oa_forbidden2_reason: 'Une ordonnance est nominative. Transport interdit par la loi.',
    oa_forbidden3_label: 'Drogues et stupéfiants',
    oa_forbidden3_reason: 'Toute substance illicite, sans exception.',
    oa_forbidden4_label: 'Armes',
    oa_forbidden4_reason: 'Toutes catégories, y compris répliques et armes blanches.',
    oa_forbidden5_label: 'Contrefaçons',
    oa_forbidden5_reason: 'Produits portant atteinte à des droits de propriété intellectuelle.',
    oa_forbidden6_label: 'Bijoux et objets de luxe',
    oa_forbidden6_reason: 'Bijoux, montres, sacs de marque, objets > 500 €.',
    oa_forbidden7_label: 'Produits dangereux',
    oa_forbidden7_reason: 'Liquides inflammables, gaz, batteries lithium non protégées.',
    oa_forbidden8_label: 'Produits réglementés',
    oa_forbidden8_reason: 'Alcool, tabac, denrées soumises à restriction douanière.',
    oa_consequences_title: 'Conséquences en cas d\'infraction',
    oa_consequences_p1: 'Tout colis contenant un objet interdit entraîne la',
    oa_consequences_strong1: 'suspension permanente',
    oa_consequences_p2: 'du compte de l\'expéditeur et du voyageur, la',
    oa_consequences_strong2: 'conservation des preuves',
    oa_consequences_p3: 'à des fins légales, et la',
    oa_consequences_strong3: 'transmission aux autorités',
    oa_consequences_p4: 'compétentes si nécessaire.',
    oa_dd_eyebrow: 'Double déclaration',
    oa_dd_title: 'Une vérification en deux temps',
    oa_dd_subtitle: 'Pour qu\'un envoi soit accepté, l\'expéditeur et le voyageur doivent chacun confirmer le contenu.',
    oa_dd_card1_title: 'L\'expéditeur certifie le contenu',
    oa_dd_card1_quote: '« Je certifie que le contenu décrit est exact et qu\'il ne contient aucun produit interdit. »',
    oa_dd_card2_title: 'Le voyageur vérifie avant d\'accepter',
    oa_dd_card2_quote: '« J\'ai vérifié le contenu avant d\'accepter de le transporter. »',
    oa_dd_card3_title: 'Signalement et droit d\'exclusion',
    oa_dd_card3_body: 'Tout utilisateur peut signaler un colis suspect. Le voyageur peut refuser sans pénalité. Jibly se réserve le droit de suspendre tout compte en cas d\'infraction.',
    oa_cta_title: 'En savoir plus sur la sécurité Jibly',
    oa_cta_subtitle: 'Découvrez comment nous protégeons votre paiement, vérifions les identités et gérons les litiges.',
    oa_cta_button: 'Lire notre politique de confiance',

    // My Space dashboard
    me2_role_sender: 'Expéditeur',
    me2_role_sender_lc: 'l\'expéditeur',
    me2_role_traveler: 'Voyageur',
    me2_role_traveler_lc: 'le voyageur',
    me2_role_someone: 'Quelqu\'un',
    me2_tab_trips: 'Mes voyages',
    me2_tab_sends: 'Mes envois',
    me2_delivery_code_unavailable: 'Code de livraison indisponible. Rechargez la page ou contactez le support.',
    me2_pickup_code_unavailable: 'Code indisponible. Rechargez la page ou contactez le support.',
    me2_receipt_recorded_transfer_pending: 'La réception a été enregistrée mais le transfert au voyageur est en attente. Nous nous en occupons.',
    me2_wallet_label: 'Mon portefeuille',
    me2_wallet_total_received: 'Total des paiements reçus pour les colis acheminés.',
    me2_wallet_empty_hint: 'Vos gains s\'afficheront ici dès que vous accepterez votre première demande.',
    me2_withdraw_earnings: 'Retirer mes gains',
    me2_coming_soon: 'Bientôt disponible',
    me2_withdraw_modal_title: 'Le retrait arrive bientôt',
    me2_withdraw_modal_text: 'Nous mettons en place les virements bancaires sécurisés. En attendant, vos gains sont conservés sur Jibly et nous vous contactons directement pour vous les transmettre.',
    me2_your_balance: 'Votre solde',
    me2_withdraw_question: 'Une question ? Écrivez-nous à',
    me2_got_it: 'Compris',
    me2_my_reservations: 'Mes réservations',
    me2_my_reservations_subtitle: 'Trajets que vous avez réservés directement avec un voyageur.',
    me2_delivered_confirmed: 'livré et confirmé',
    me2_delivered_to_confirm: 'livré · à confirmer',
    me2_view_proof: 'Voir la preuve',
    me2_i_received: 'J\'ai bien reçu',
    me2_rate: 'Noter',
    me2_you_rated: 'Vous avez noté',
    me2_x_rated_you: '{name} vous a noté',
    me2_x_accepted: '{name} a accepté !',
    me2_arrange_transport_details: 'Vous pouvez maintenant convenir des détails du transport.',
    me2_delivery_proof: 'Preuve de livraison',
    me2_handed_to: 'Remis à :',
    me2_note_label: 'Note :',
    me2_uploaded_on: 'Téléversée le {date}',
    me2_how_to_contact: 'Comment le contacter',
    me2_message: 'Message',
    me2_call: 'Appeler',
    me2_whatsapp_not_provided: 'WhatsApp non renseigné',
    me2_handoff_code_title: 'Code de remise du colis',
    me2_handoff_code_desc: 'À donner à {name} sur place. Il l\'entrera dans son application pour confirmer la remise.',
    me2_view_code: 'Voir le code',
    me2_package_handed_to: 'Colis remis à {name}',
    me2_report_problem: 'Signaler un problème',
    me2_status_new: 'nouveau',
    me2_status_pending: 'en attente',
    me2_status_declined: 'refusée',
    me2_decline: 'Refuser',
    me2_pay: 'Payer {amount}',
    me2_cancel_failed: 'Échec de l\'annulation. Réessayez.',
    me2_from_price: 'à partir de {amount}€',
    me2_cancel_trip: 'Annuler ce trajet',
    me2_cancel_trip_q: 'Annuler ce trajet ?',
    me2_checking_bookings: 'Vérification des réservations…',
    me2_one_booking_in_progress: '1 réservation est en cours sur ce trajet.',
    me2_n_bookings_in_progress: '{n} réservations sont en cours sur ce trajet.',
    me2_bookings_auto_cancel_before: 'Elles seront ',
    me2_bookings_auto_cancel_bold: 'automatiquement annulées',
    me2_bookings_auto_cancel_after: ' et les paiements autorisés seront libérés. Aucun débit ne sera effectué.',
    me2_cancel_trip_final: 'Cette action est définitive. Le trajet ne sera plus visible par les expéditeurs.',
    me2_keep_trip: 'Garder le trajet',
    me2_cancelling: 'Annulation…',
    me2_confirm_cancel: 'Confirmer l\'annulation',
    me2_my_proposals_sent: 'Mes propositions envoyées',
    me2_my_proposals_sent_subtitle: 'Demandes publiques sur lesquelles vous avez offert votre aide.',
    me2_requests_received: 'Demandes reçues',
    me2_requests_received_subtitle: 'Des expéditeurs aimeraient confier un objet à un de vos trajets.',
    me2_no_pending_requests: 'Aucune demande en attente pour le moment.',
    me2_to_deliver: 'À livrer',
    me2_history: 'Historique',
    me2_status_cashed_in: 'encaissé',
    me2_status_delivered: 'livré',
    me2_status_accepted: 'acceptée',
    me2_accept: 'Accepter',
    me2_open_conversation: 'Ouvrir la conversation',
    me2_messages: 'Messages',
    me2_i_delivered: 'J\'ai livré',
    me2_phone_hint: 'Utilisé pour vous joindre par WhatsApp ou téléphone après une réservation.',
    me2_city: 'Ville',
    me2_country: 'Pays',
    me2_saved: 'Sauvegardé',
    me2_verify_identity_title: 'Vérifier votre identité',
    me2_mandatory: 'Obligatoire',
    me2_verify_identity_desc: 'pour publier un trajet ou réserver un colis. Vérification gratuite et chiffrée par Stripe.',
    me2_id_verified_label: 'Pièce d\'identité vérifiée',
    me2_identity_verified: 'Identité vérifiée',
    me2_verify_start_failed: 'Échec du démarrage',
    me2_error_retry: 'Erreur — réessayez.',
    me2_verify_my_identity: 'Vérifier mon identité',
    me2_update_failed: 'Échec de la mise à jour. Contactez le support.',
    me2_confirm_and_pay: 'Confirmer et payer',
    me2_with_traveler: 'Avec {name}',
    me2_back: 'Retour',
    me2_my_packages: 'Mes colis',
    me2_publish_request: 'Publier une demande',
    me2_no_sends: 'Aucun envoi pour le moment. Publiez votre première demande.',
    me2_bucket_todo: 'À traiter',
    me2_bucket_in_progress: 'En cours',
    me2_bucket_searching: 'En recherche',
    me2_bucket_delivered: 'Livrés',
    me2_bucket_cancelled: 'Annulés',
    me2_select_send: 'Sélectionnez un envoi pour voir ses détails.',
    me2_sub_proposes: '{name} propose',
    me2_sub_delivered_by: 'Livré par {name}',
    me2_sub_to_confirm: 'à confirmer',
    me2_sub_in_transit: 'en transit',
    me2_sub_waiting_for: 'En attente de {name}',
    me2_sub_cancelled: 'Annulé',
    me2_before_date: 'Avant le {date}',
    me2_description: 'Description',
    me2_searching_traveler_title: 'Vous êtes en recherche de voyageur.',
    me2_searching_traveler_text: 'Nous vous notifierons dès qu\'une personne accepte votre colis.',
    me2_my_trips: 'Mes voyages',
    me2_publish_trip: 'Publier un trajet',
    me2_no_trips: 'Aucun voyage planifié. Publiez votre prochain vol pour proposer vos services.',
    me2_past_trips: 'Anciens voyages',
    me2_select_trip: 'Sélectionnez un voyage pour voir ses détails.',
    me2_packages_unit: 'colis',
    me2_flight: 'Vol {number}',
    me2_departure: 'Départ',
    me2_packages_unit_caps: 'Colis',
    me2_earnings_on_flight: 'de gains sur ce vol',
    me2_no_packages_on_flight: 'Aucun colis sur ce vol pour l\'instant.',
    me2_find_packages_on_route: 'Trouver des colis sur mon trajet',
    me2_pill_new_request: 'Nouvelle demande',
    me2_pill_delivery_confirmed: 'Livraison confirmée',
    me2_pill_delivered_give_code: 'Livré · code à donner',
    me2_pill_picked_up_to_deliver: 'Récupéré · à livrer',
    me2_pill_payment_held_to_pickup: 'Paiement réservé · à récupérer',
    me2_pill_to_deliver: 'À livrer',
    me2_i_picked_up: 'J\'ai récupéré',
    me2_view_delivery_code: 'Voir code livraison',
    me2_history_empty: 'Votre historique est vide. Acceptez votre première mission pour commencer.',
    me2_history_missions: 'Missions livrées ou refusées',
    me2_history_sends: 'Envois terminés',
    me2_history_proposals: 'Propositions terminées',
    me2_history_cancelled_trips: 'Trajets annulés',
    me2_cancelled_label: 'Annulé',

    // Pickup / proof modals
    pickup_close: 'Fermer',
    pickup_show_title_delivery: 'Livraison du colis',
    pickup_show_title_pickup: 'Remise du colis',
    pickup_show_body_delivery: 'Communiquez ce code à {name} sur place. Il devra le saisir dans son application pour confirmer la réception du colis et libérer le paiement.',
    pickup_show_body_pickup: 'Communiquez ce code à {name} sur place. Il devra le saisir dans son application pour confirmer qu\'il a bien récupéré votre colis.',
    pickup_show_code_label_delivery: 'Code de livraison',
    pickup_show_code_label_pickup: 'Code de remise',
    pickup_show_copied: 'Code copié',
    pickup_show_copy: 'Copier le code',
    pickup_show_warning_delivery: '🔒 Ne partagez ce code qu\'au moment de la livraison.',
    pickup_show_warning_pickup: '🔒 Ne partagez ce code qu\'au moment de la remise en main propre.',
    pickup_enter_title_delivery: 'Confirmer la réception',
    pickup_enter_title_pickup: 'Confirmer la remise',
    pickup_enter_err_too_many: 'Trop de tentatives. Réessayez dans quelques minutes.',
    pickup_enter_err_invalid_delivery: 'Code incorrect. Vérifiez avec le voyageur.',
    pickup_enter_err_invalid_pickup: 'Code incorrect. Vérifiez avec l\'expéditeur.',
    pickup_enter_err_already_delivery: 'La réception a déjà été confirmée.',
    pickup_enter_err_already_pickup: 'La remise a déjà été confirmée.',
    pickup_enter_err_not_traveler: 'Vous n\'êtes pas autorisé à confirmer cette remise.',
    pickup_enter_err_not_sender: 'Vous n\'êtes pas autorisé à confirmer cette réception.',
    pickup_enter_err_no_proof: 'Aucune preuve de livraison n\'a encore été déposée.',
    pickup_enter_err_generic: 'Une erreur est survenue. Réessayez.',
    pickup_enter_err_unexpected: 'Erreur inattendue',
    pickup_enter_body_delivery: 'Demandez à {name} le code de livraison qu\'il a affiché sur son application, puis saisissez-le ci-dessous.',
    pickup_enter_body_pickup: 'Demandez à {name} le code de remise affiché sur son application, puis saisissez-le ci-dessous.',
    pickup_enter_verifying: 'Vérification…',
    pickup_enter_auto_validate: 'Le code se valide automatiquement',
    pickup_enter_footer_delivery: 'En confirmant la réception, vous libérez le paiement vers le voyageur. Cette action est définitive.',
    pickup_enter_footer_pickup: 'En confirmant la remise, vous vous engagez à transporter ce colis et à le livrer à destination. Toute non-livraison peut entraîner des poursuites pour abus de confiance {article}.',
    pickup_enter_footer_pickup_article: '(art. 314-1 du Code pénal)',
    pickup_proof_err_photo_too_large: 'Photo trop volumineuse (max 8 Mo).',
    pickup_proof_err_no_photo: 'Ajoutez une photo de la remise',
    pickup_proof_err_no_name: 'Indiquez le nom de la personne qui a reçu le colis',
    pickup_proof_err_upload_failed: 'Échec du téléversement',
    pickup_proof_err_generic: 'Une erreur est survenue',
    pickup_proof_eyebrow: 'Preuve de livraison',
    pickup_proof_title: 'J\'ai livré le colis',
    pickup_proof_intro: 'Une photo + le nom de la personne suffisent. C\'est votre garantie en cas de problème.',
    pickup_proof_photo_label: 'Photo de la remise',
    pickup_proof_preview_alt: 'Aperçu',
    pickup_proof_remove_photo: 'Supprimer la photo',
    pickup_proof_photo_cta: 'Prendre / choisir une photo',
    pickup_proof_receiver_label: 'Nom de la personne qui a reçu',
    pickup_proof_receiver_placeholder: 'Ex: Mohammed (le père)',
    pickup_proof_receiver_hint: 'Ce nom sera comparé avec celui fourni par l\'expéditeur.',
    pickup_proof_note_label: 'Note (optionnel)',
    pickup_proof_note_placeholder: 'Ex: Remis à l\'aéroport de Casablanca',
    pickup_proof_cancel: 'Annuler',
    pickup_proof_submitting: 'Téléversement…',
    pickup_proof_submit: 'Confirmer la livraison',

    // Review / dispute / respond modals
    rev_close: 'Fermer',
    rev_cancel: 'Annuler',
    rev_sending: 'Envoi…',
    rev_review_eyebrow: 'Votre avis',
    rev_review_title: 'Noter {name}',
    rev_review_subtitle_traveler: 'Comment s\'est passée la livraison ?',
    rev_review_subtitle_sender: 'Comment s\'est passé l\'envoi ?',
    rev_review_placeholder_traveler: 'Sympa, ponctuel·le, soigneux·se… (optionnel)',
    rev_review_placeholder_sender: 'Clair·e, fiable, sympathique… (optionnel)',
    rev_rating_1: 'Très décevant',
    rev_rating_2: 'Pas top',
    rev_rating_3: 'Correct',
    rev_rating_4: 'Très bien',
    rev_rating_5: 'Parfait',
    rev_select_rating: 'Sélectionnez une note',
    rev_stars_singular: '{count} étoile',
    rev_stars_plural: '{count} étoiles',
    rev_comment_label: 'Votre commentaire (optionnel)',
    rev_submit_review: 'Envoyer ma note',
    rev_err_already_reviewed: 'Vous avez déjà noté cet envoi.',
    rev_err_cannot_review_yet: 'Vous ne pouvez pas encore noter cet envoi.',
    rev_err_save_failed: 'Échec de l\'enregistrement. Réessayez.',
    rev_dispute_title: 'Signaler un problème',
    rev_dispute_intro_before: 'Cette action signale un problème concernant',
    rev_dispute_intro_after: '. Notre équipe sera notifiée immédiatement et traitera le litige sous 48h.',
    rev_dispute_cat_not_delivered: 'Colis non livré',
    rev_dispute_cat_not_delivered_desc: 'Le voyageur n\'a pas livré mon colis',
    rev_dispute_cat_damaged: 'Colis abîmé',
    rev_dispute_cat_damaged_desc: 'Le colis est arrivé endommagé',
    rev_dispute_cat_wrong_item: 'Mauvais objet',
    rev_dispute_cat_wrong_item_desc: 'L\'objet livré n\'est pas le mien',
    rev_dispute_cat_late: 'Très en retard',
    rev_dispute_cat_late_desc: 'La livraison est largement hors délai',
    rev_dispute_cat_other: 'Autre problème',
    rev_dispute_cat_other_desc: 'Je veux décrire un autre problème',
    rev_dispute_cat_mismatch: 'Le colis ne correspond pas',
    rev_dispute_cat_mismatch_desc: 'L\'objet ne correspond pas à la description',
    rev_dispute_cat_no_confirm: 'Le destinataire refuse de confirmer',
    rev_dispute_cat_no_confirm_desc: 'J\'ai livré mais la réception n\'est pas confirmée',
    rev_dispute_desc_label: 'Description détaillée',
    rev_dispute_desc_placeholder: 'Décrivez ce qu\'il s\'est passé, les dates, les échanges, et tout ce qui peut nous aider à trancher…',
    rev_dispute_submit: 'Envoyer le signalement',
    rev_dispute_abuse_warning: 'Les signalements abusifs peuvent entraîner la suspension de votre propre compte.',
    rev_dispute_err_no_category: 'Sélectionnez une catégorie',
    rev_dispute_err_short_desc: 'Décrivez le problème en quelques mots (10 caractères minimum)',
    rev_dispute_err_submit_failed: 'Impossible d\'envoyer le signalement',
    rev_respond_sender_fallback: 'L\'expéditeur',
    rev_respond_err_failed: 'Échec de la proposition. Réessayez.',
    rev_respond_eyebrow: 'Proposer mon aide',
    rev_respond_sender_role: 'Expéditeur',
    rev_respond_category: 'Catégorie',
    rev_respond_before_date: 'Avant le',
    rev_respond_which_flight: 'Sur quel vol allez-vous le transporter ?',
    rev_respond_loading_flights: 'Chargement de vos vols…',
    rev_respond_new_flight: 'Nouveau vol',
    rev_respond_flight_date: 'Date du vol',
    rev_respond_flight_saved_note: 'Votre vol sera enregistré et visible dans "Mes transports".',
    rev_respond_if_accepted: 'Si l\'expéditeur accepte',
    rev_respond_you_receive: 'Vous recevrez',
    rev_respond_jibly_protection: 'Protection Jibly (15%)',
    rev_respond_message_label: 'Message à l\'expéditeur (optionnel)',
    rev_respond_message_placeholder: 'Ex: Je peux passer chercher l\'item à votre adresse.',
    rev_respond_reassurance: 'Aucune carte n\'est demandée à ce stade. S\'il accepte, vous serez notifié·e.',
    rev_respond_submit: 'Envoyer ma proposition',

    // Secondary pages
    sec_back_to_space: 'Retour à mon espace',
    sec_login: 'Se connecter',
    sec_loading: 'Chargement…',
    sec_load_more: 'Charger plus',
    sec_load_error: 'Erreur de chargement',
    sec_user_fallback: 'Utilisateur',
    sec_notif_title: 'Notifications',
    sec_notif_subtitle: 'Toute l\'activité sur vos colis et vos voyages.',
    sec_notif_mark_all_read: 'Tout marquer lu',
    sec_notif_empty_title: 'Aucune notification',
    sec_notif_empty_body: 'Quand quelqu\'un acceptera votre colis ou proposera un trajet, vous serez prévenu ici.',
    sec_msg_title: 'Messages',
    sec_msg_subtitle: 'Vos conversations avec voyageurs et expéditeurs.',
    sec_msg_login_prompt: 'Connectez-vous pour voir vos messages.',
    sec_msg_empty_title: 'Aucun message',
    sec_msg_empty_body: 'Vos conversations apparaîtront ici dès qu\'un voyage est confirmé.',
    sec_msg_you_prefix: 'Vous : {body}',
    sec_msg_no_message: 'Pas encore de message',
    sec_hist_title: 'Historique',
    sec_hist_subtitle: 'Vos missions et envois terminés ou annulés.',
    sec_hist_login_prompt: 'Connectez-vous pour voir votre historique.',
    sec_hist_tab_transports: 'Transports',
    sec_hist_tab_envois: 'Envois',
    sec_hist_empty_title: 'Rien dans l\'historique',
    sec_hist_empty_transports: 'Vos missions terminées apparaîtront ici.',
    sec_hist_empty_envois: 'Vos envois terminés apparaîtront ici.',
    sec_hist_status_cancelled_trip: '✕ annulé',
    sec_hist_status_declined: '✕ refusée',
    sec_hist_status_delivered: '📸 livré',
    sec_hist_status_confirmed: '✓ confirmé',
    sec_hist_view_proof: 'Voir la preuve',
    sec_wallet_title: 'Mon portefeuille',
    sec_wallet_subtitle: 'Vos gains de voyageur, en un coup d\'œil.',
    sec_wallet_available: 'Disponible',
    sec_wallet_balance_label: 'Solde disponible',
    sec_wallet_tx_count_singular: '{count} transaction encaissée',
    sec_wallet_tx_count_plural: '{count} transactions encaissées',
    sec_wallet_withdraw: 'Retirer mes gains',
    sec_wallet_coming_soon: 'Bientôt disponible',
    sec_wallet_account_holder: 'Titulaire du compte',
    sec_wallet_account_holder_placeholder: 'Prénom Nom',
    sec_wallet_withdraw_note_before: 'Les retraits bancaires arrivent bientôt. En attendant, contactez-nous à',
    sec_wallet_withdraw_note_after: 'pour recevoir vos gains.',
    sec_wallet_pending: 'En attente',
    sec_wallet_no_pending: 'Aucun paiement en attente.',
    sec_wallet_to_receive: 'À recevoir après livraison',
    sec_wallet_history: 'Historique',
    sec_wallet_empty_title: 'Votre portefeuille est vide',
    sec_wallet_empty_body: 'Publiez un trajet ou répondez à une demande de transport pour commencer à gagner.',
    sec_wallet_publish_trip: 'Publier un trajet',
    sec_wallet_sender_fallback: 'Expéditeur',
    sec_wallet_status_captured: 'Encaissé',
    sec_wallet_status_pending: 'En attente',
    sec_wallet_status_cancelled: 'Annulé',
  },

  en: {
    nav_send: 'I need a traveler',
    nav_travel: 'I can carry',
    nav_discover: 'Discover',
    nav_trust: 'Trust',
    nav_my_space: 'My Space',
    nav_start: 'Sign up',
    nav_wallet_title: 'My wallet',
    nav_wallet_label: 'Wallet',
    nav_notifications: 'Notifications',
    nav_menu: 'Menu',

    hero_badge: 'Verified traveler community',
    hero_title_1: 'Someone is already going',
    hero_title_2: 'your way.',
    hero_subtitle: 'Send your stuff with a traveler. Simple, human, worldwide.',
    hero_search_from: 'Departure city',
    hero_search_to: 'Arrival city',
    hero_search_button: 'Find a traveler',
    hero_social_proof: '+2,000 travelers',
    search_label_from: 'From',
    search_label_to: 'To',
    search_label_before: 'Before',
    search_button: 'Search',
    search_filters_show: 'Advanced filters',
    search_filters_hide: 'Hide filters',
    search_label_flight_date: 'Flight date',
    login_session_reset_title: 'Your session has been reset.',
    login_session_reset_text: 'Sign back in to continue.',
    login_submit: 'Sign in',
    login_reset_link: 'Trouble signing in? Reset',
    signup_name_placeholder: 'Jane Doe',
    sec_wallet_withdraw_subject: 'Withdrawal of my earnings',
    footer_allowed_items: 'Allowed items',
    footer_terms: 'Terms',
    pay_security_note: 'Secure payment by Stripe. Your card is authorized but not charged. The amount is only taken if the traveler accepts. If they decline, the authorization is released.',
    pay_submitting: 'Confirming…',
    pay_submit: 'Confirm payment',
    bt_step_booked_short: 'Booked',
    bt_step_handover_short: 'Handed over',
    bt_step_transit_short: 'In transit',
    bt_step_delivered_short: 'Delivered',
    bt_step_paid_short: 'Paid',
    bt_payment_safety: '🔒 Your payment is held securely until delivery is confirmed.',
    disc_clear: 'Clear',
    disc_filter_budget: 'Max budget',
    disc_filter_trust: 'Trust',
    disc_filter_verified_only: 'Verified identity only',
    disc_tab_travelers: 'Travelers',
    disc_tab_requests: 'Requests',
    disc_heading_travelers: 'Available travelers',
    disc_heading_requests: 'Delivery requests',
    disc_publish_request: 'Post my request',
    disc_publish_trip: 'Post my trip',
    disc_trips_count: 'trips',
    disc_price_from: 'From',
    disc_protection_included: 'Jibly protection included',
    disc_empty_travelers_route: 'No traveler on this route',
    disc_empty_requests_route: 'No request on this route',
    disc_empty_travelers: 'No traveler yet',
    disc_empty_requests: 'No request yet',
    disc_empty_hint_search: 'Try widening your criteria.',
    disc_empty_hint_travelers: 'Post your request — we’ll let you know as soon as a traveler comes your way.',
    disc_empty_hint_requests: 'Post your trip — senders will find you.',
    disc_clear_search: 'Clear search',
    disc_age_today: 'Today',
    disc_age_yesterday: 'Yesterday',
    disc_age_days_ago: '{n} days ago',
    disc_you_receive: 'You’ll receive',
    disc_on_paid: 'of {total} paid',
    disc_i_can_do_it: 'I can do it',

    how_title: 'How it works',
    how_subtitle: 'Three steps, that\'s it.',
    how_step1_title: 'Post',
    how_step1_text: 'Describe what you want to send.',
    how_step2_title: 'Match',
    how_step2_text: 'Pick a verified traveler.',
    how_step3_title: 'Receive',
    how_step3_text: 'Track your delivery end-to-end.',

    travelers_title: 'Travelers ready to help',
    travelers_subtitle: 'Real, verified, well-rated.',
    travelers_see_all: 'See all',
    travelers_trips: 'trips',

    trust_identity: 'Verified identity',
    trust_data: 'Protected data',
    trust_messaging: 'Secure messaging',
    trust_support: '7/7 support',
    home_trust_title: 'Four pillars, one simple promise.',

    testimonial_quote: 'I sent my mum\'s papers from Brussels. Received in 36h. Pure magic.',
    testimonial_author: 'Salma — Casablanca',

    cta_ready: 'Ready to start?',
    cta_subtitle: 'Post your request in 2 minutes.',
    cta_send_btn: 'Send something',
    cta_travel_btn: 'I\'m traveling soon',

    send_title: 'Send something',
    send_subtitle: 'Takes 2 minutes.',
    send_step_route: 'Route',
    send_step_item: 'Item',
    send_step_details: 'Details',
    send_step_confirm: 'Confirm',
    send_route_title: 'From where to where?',
    send_label_from: 'From',
    send_label_to: 'To',
    send_placeholder_from: 'Pick departure city',
    send_placeholder_to: 'Pick arrival city',
    send_label_date: 'Preferred date',
    send_item_title: 'What are you sending?',
    send_label_description: 'Description',
    send_placeholder_description: 'E.g. birth certificate, in a sealed envelope',
    send_prescription_required: 'Prescription required',
    send_upload_prescription: 'Upload prescription',
    send_forbidden_title: 'Forbidden items',
    send_details_title: 'When and how much?',
    send_label_urgency: 'Urgency',
    send_label_budget: 'Proposed budget',
    send_confirm_title: 'All good?',
    send_recap_route: 'Route',
    send_recap_date: 'Date',
    send_recap_item: 'Item',
    send_recap_urgency: 'Urgency',
    send_recap_budget: 'Budget',
    send_terms: 'I understand Jibly is a matching platform. I\'m responsible for verifying my item is allowed.',
    send_publish: 'Publish',
    send_success_title: 'It\'s live!',
    send_success_text: 'We\'ll let you know as soon as a traveler matches your route.',
    send_success_see_travelers: 'See travelers',
    send_success_back: 'Back to home',

    trip_title: 'I\'m traveling soon',
    trip_subtitle: 'Help someone, earn a bit along the way.',
    trip_step_route: 'Route',
    trip_step_space: 'Space',
    trip_step_identity: 'Identity',
    trip_step_validation: 'Validation',
    trip_route_title: 'Your trip',
    trip_label_time: 'Time (optional)',
    trip_space_title: 'What can you carry?',
    trip_label_min_comp: 'Minimum compensation accepted',
    trip_min_comp_hint: 'Most travelers set their price around €50. You\'ll receive exactly this amount.',
    trip_accepted_categories_label: 'What you\'re willing to carry',
    trip_accepted_categories_hint: 'Pick what you\'re comfortable with. You can always decline at handover.',
    trip_identity_title: 'Verify your identity',
    trip_identity_subtitle: 'Optional but recommended. Verified profiles get 3× more requests.',
    trip_identity_benefit_1: '"Verified" badge on your profile',
    trip_identity_benefit_2: 'More visibility',
    trip_identity_benefit_3: 'A more confident community',
    trip_upload_id: 'Upload ID document',
    trip_validation_title: 'Your commitments',
    trip_engagement_1: 'I only carry allowed items',
    trip_engagement_2: 'I check the contents before departure',
    trip_engagement_3: 'I handle items with care and confidentiality',
    trip_engagement_4: 'I hand the item to the right person',
    trip_engagement_terms: 'I commit to these rules and accept Jibly\'s terms of use.',
    trip_publish: 'Publish my trip',
    trip_success_title: 'Safe travels ✈️',
    trip_success_text: 'Your trip is live. We\'ll let you know if someone wants to send something.',

    matches_title: 'Available travelers',
    matches_subtitle: 'people ready to help.',
    matches_empty_title: 'No travelers right now',
    matches_empty_text: 'Post your request — we\'ll notify you as soon as someone matches.',
    matches_empty_filtered: 'No traveler matches these filters. Try widening them.',
    matches_total: 'total',
    matches_filters: 'Filters',
    matches_filter_from: 'From',
    matches_filter_to: 'To',
    matches_filter_before: 'Before',
    matches_filter_max_price: 'Max budget',
    matches_filter_verified: 'Verified ID',
    matches_filter_clear: 'Clear filters',
    matches_publish_btn: 'Post my request',
    matches_from: 'From',
    matches_to: 'To',
    matches_contact: 'Contact',
    matches_min: 'From',

    trust_eyebrow: 'Safety & trust',
    trust_hero_title: 'Travel safely, send confidently',
    trust_hero_subtitle: 'Jibly helps trusted travelers and senders connect for small personal item deliveries.',
    trust_intent_title: 'A platform, not a carrier',
    trust_intent_text: 'Jibly does not move anything physically. We make the connection happen. Travelers decide, in conscience, what they\'re willing to carry.',
    trust_faq_title: 'Your questions, answered',

    trust_q1_question: 'What can I send?',
    trust_q1_intro: 'Jibly is designed for small personal items:',
    trust_q1_item_1: 'Administrative documents',
    trust_q1_item_2: 'Forgotten keys',
    trust_q1_item_3: 'Personal belongings left behind',
    trust_q1_item_4: 'Small everyday items',
    trust_q1_note: 'Anything illegal, dangerous, suspicious, or prohibited by law is strictly off-limits.',

    trust_q2_question: 'Does the traveler verify the item?',
    trust_q2_text: 'Yes — always. Before accepting a delivery, the traveler should see and inspect what they\'re about to carry. No traveler should ever accept a sealed package or one whose contents aren\'t clear.',

    trust_q3_question: 'Who is responsible for the transported item?',
    trust_q3_text: 'The sender and the traveler are both responsible for the exchange. They must comply with airline, airport, customs, and local rules. Jibly is a matching platform — we do not physically transport anything.',

    trust_q4_question: 'Can I transport medication?',
    trust_q4_text: 'Some medications are regulated depending on the country. A traveler should only accept medication when it\'s legally authorized and comes with a valid prescription or proper documentation.',

    trust_q5_question: 'How does Jibly build trust?',
    trust_q5_intro: 'A few simple things, designed to reassure you:',
    trust_q5_item_1: 'Verified profiles (email, identity)',
    trust_q5_item_2: 'Full trip history',
    trust_q5_item_3: 'Ratings and reviews after every exchange',
    trust_q5_item_4: 'A responsible, supportive community',

    trust_q6_question: 'What items are forbidden?',
    trust_q6_intro: 'For everyone\'s safety, the following don\'t belong on Jibly:',
    trust_q6_item_1: 'Illegal substances',
    trust_q6_item_2: 'Weapons or dangerous items',
    trust_q6_item_3: 'Flammable or toxic products',
    trust_q6_item_4: 'Unidentified or unexplained sealed packages',
    trust_q6_item_5: 'Counterfeit goods',
    trust_q6_item_6: 'Anything prohibited by customs or airlines',

    trust_footer_title: 'A question before you start?',
    trust_footer_text: 'Our team replies within 24h. And you can report any behavior at any time.',
    trust_footer_cta: 'Post a request',

    me_title: 'My Space',
    me_tab_overview: 'Overview',
    me_tab_requests: 'My sends',
    me_tab_trips: 'My trips',
    me_tab_matches: 'Matches',
    me_tab_profile: 'Profile',
    me_stats_active: 'Active requests',
    me_stats_pending: 'Pending',
    me_stats_earned: 'Earned',
    me_stats_completed: 'Deliveries',
    me_section_my_requests: 'My posted sends',
    me_section_my_trips: 'My posted trips',
    me_section_pending_matches: 'Pending requests',
    me_section_active: 'Active deliveries',
    me_section_completed: 'Completed deliveries',
    me_section_profile: 'My profile',
    me_empty_requests: 'No sends yet.',
    me_empty_trips: 'No trips yet.',
    me_empty_matches: 'No pending matches.',
    me_new_request: 'New send',
    me_new_trip: 'New trip',
    me_status_pending: 'Pending',
    me_status_open: 'Open',
    me_status_matched: 'Matched',
    me_status_in_transit: 'In transit',
    me_status_completed: 'Completed',
    me_status_cancelled: 'Cancelled',
    me_payment_pending: 'Payment pending',
    me_payment_held: 'Held',
    me_payment_released: 'Released',
    me_profile_name: 'Full name',
    me_profile_email: 'Email',
    me_profile_phone: 'Phone',
    me_profile_verification: 'Verification',
    me_profile_verify_now: 'Verify my identity',

    common_back: 'Back',
    common_next: 'Next',
    common_cancel: 'Cancel',
    common_close: 'Close',
    gate_identity_required:
      'Verify your identity to continue. Required before publishing a trip, booking, or proposing help. Verification is free and encrypted by Stripe.',
    common_save: 'Save',
    common_loading: 'Loading...',
    common_optional: 'optional',
    common_eur: '€',
    common_message: 'Message',
    common_search_placeholder: 'Search a city or country...',
    common_no_results: 'No city found',
    common_clear: 'Clear',

    picker_country_placeholder: 'Country',
    picker_city_placeholder: 'City',
    picker_country_input_placeholder: 'Type the country…',
    picker_city_input_placeholder: 'Type the city…',
    picker_search_country: 'Search a country…',
    picker_search_city: 'Search a city…',
    picker_locate: 'Use my location',
    picker_locating: 'Locating…',
    picker_other_country: 'Other country — type manually',
    picker_other_city: 'Other city — type manually',
    picker_geo_unavailable: 'Geolocation unavailable.',
    picker_geo_denied: 'Location denied. Pick your country manually.',
    picker_back_countries: 'Back to country list',
    picker_back_cities: 'Back to city list',
    error_same_route: 'Departure and arrival must be different.',

   cat_documents: 'Documents',
    cat_documents_desc: 'Papers, contracts, certificates',
    cat_keys: 'Keys',
    cat_keys_desc: 'Home, car',
    cat_small: 'Small items',
    cat_small_desc: 'Glasses, book, keepsakes',
    cat_clothes: 'Clothing',
    cat_clothes_desc: 'Clothes, accessories, shoes',
    cat_electronics: 'Light electronics',
    cat_electronics_desc: 'Chargers, cables, earphones',
    cat_otc: 'Over-the-counter medication',
    cat_otc_desc: 'Paracetamol, vitamins (no prescription)',
    send_certify_label: 'I certify the described content is accurate and contains no prohibited item.',
    send_certify_otc_disclaimer: 'Medications must be over-the-counter, in sealed original packaging, max 2 units. I assume legal responsibility for the content.',
    trip_verify_content_label: 'I have verified the content before accepting to carry it.',
    urgency_standard: 'Standard',
    urgency_standard_hint: '2 weeks',
    urgency_fast: 'Fast',
    urgency_fast_hint: '7 days',
    urgency_urgent: 'Urgent',
    urgency_urgent_hint: '48-72h',

    space_envelope: 'Envelope',
    space_envelope_size: 'up to 200g',
    space_pouch: 'Pouch',
    space_pouch_size: 'up to 500g',
    space_bag: 'Small bag',
    space_bag_size: 'up to 1.5 kg',

    verif_trusted: 'Trusted member',
    verif_id: 'Verified identity',
    verif_email: 'Email confirmed',
    verif_none: 'Not verified',

    footer_tagline: 'A verified traveler community, worldwide.',
    footer_platform: 'Platform',
    footer_trust: 'Trust',
    footer_community: 'Community',
    footer_made_with: 'Made with',

    admin_badge: 'Admin',
    admin_title: 'Moderation',
    admin_tab_overview: 'Overview',
    admin_tab_requests: 'Requests',
    admin_tab_trips: 'Trips',
    admin_tab_reports: 'Reports',
    admin_tab_users: 'Users',
    admin_tab_matches: 'Matches',
    admin_kpi_active_requests: 'Active requests',
    admin_kpi_weekly_trips: 'Trips this week',
    admin_kpi_matches: 'Successful matches',
    admin_kpi_open_reports: 'Open reports',
    admin_recent_activity: 'Recent activity',
    admin_queue: 'Queue',
    admin_col_sender: 'Sender',
    admin_col_traveler: 'Traveler',
    admin_col_route: 'Route',
    admin_col_category: 'Category',
    admin_col_date: 'Date',
    admin_col_action: 'Action',
    admin_col_space: 'Space',
    admin_col_compensation: 'Compensation',
    admin_col_status: 'Status',
    admin_col_amount: 'Amount',
    admin_action_approve: 'Approve',
    admin_action_reject: 'Reject',
    admin_action_review: 'Review',
    admin_action_ignore: 'Ignore',
    admin_status_accepted: 'accepted',
    admin_status_in_progress: 'in progress',
    admin_status_delivered: 'delivered',
    admin_report_by: 'By',
    admin_report_concerns: 'concerns',
    admin_severity_high: 'high',
    admin_severity_medium: 'medium',
    admin_trips_count: 'trips',
    admin_starts_at: 'from',
    admin_ago_min: '{n} min ago',
    admin_ago_hour: '{n}h ago',
    admin_activity_trip_validated: 'Yasmine B. — trip validated',
    admin_activity_new_request: 'New request from Lila M.',
    admin_activity_report: 'Report #4821',
    admin_activity_id_verified: 'Karim T. — ID verified',

    auth_login_title: 'Welcome back.',
    auth_login_subtitle: 'Sign in to manage your trips and shipments.',
    auth_signup_title: 'Create your account.',
    auth_signup_subtitle: 'A few seconds and you\'re in.',
    auth_email: 'Email',
    auth_password: 'Password',
    auth_password_hint: '8 characters minimum.',
    auth_full_name: 'Full name',
    auth_login_btn: 'Sign in',
    auth_signup_btn: 'Create account',
    auth_send_magic: 'Send magic link',
    auth_tab_password: 'Password',
    auth_tab_magic: 'Magic link',
    auth_magic_sent_title: 'Link sent.',
    auth_magic_sent_text: 'Check your inbox. Link sent to',
    auth_check_email_title: 'Confirm your email.',
    auth_check_email_text: 'A confirmation email has been sent to',
    auth_no_account: 'No account yet?',
    auth_has_account: 'Already registered?',
    auth_signup_link: 'Create account',
    auth_login_link: 'Sign in',
    auth_logout: 'Sign out',
    account_danger_zone: 'Danger zone',
    account_delete_title: 'Delete my account',
    account_delete_text: 'This is permanent. Your trips, requests and messages will be removed.',
    account_delete_btn: 'Delete my account',
    account_delete_confirm_title: 'Really delete your account?',
    account_delete_confirm_text: 'To confirm, type',
    account_delete_confirm_btn: 'Yes, delete permanently',
    account_delete_cancel: 'Cancel',
    account_delete_typing_label: 'Type the word above to confirm',
    account_delete_typing_placeholder: 'delete',
    auth_error_generic: 'Something went wrong. Try again.',
    auth_login_required: 'Sign in to access this page.',
    loading: 'Loading…',
    empty_my_requests: 'No shipments yet.',
    empty_my_trips: 'No trips yet.',
    empty_open_trips: 'No travelers available for this route.',

    // Notifications dropdown
    notif_mark_all_read: 'Mark all read',
    notif_empty: 'No notifications yet.',
    notif_see_all: 'See all notifications',
    notif_my_messages: 'My messages',
    notif_time_now: 'just now',
    notif_time_min: '{n} min ago',
    notif_time_hour: '{n}h ago',
    notif_time_day: '{n}d ago',

    // Chat
    chat_qr_address_label: '📍 Address',
    chat_qr_address_text: 'Here is the address: ',
    chat_qr_parcel_label: '📦 The parcel',
    chat_qr_parcel_text: 'About the parcel: ',
    chat_qr_arriving_label: '🕐 Almost there',
    chat_qr_arriving_text: 'Almost there 🙂',
    chat_qr_code_label: '🔑 Pickup code',
    chat_qr_code_text: 'What is the pickup code?',
    chat_traceability_notice:
      'Keep your exchanges on Jibly: it lets us track the parcel and protect you in case of a dispute.',
    chat_empty_line1: 'No messages yet.',
    chat_empty_line2: 'Say hi to {name} 👋',
    chat_input_placeholder: 'Message {name}…',
    chat_load_error: 'Failed to load',
    chat_send_error: 'Failed to send',
    chat_send_error_retry: 'Failed to send. Try again.',
    chat_close: 'Close',
    chat_send: 'Send',
    chat_hide: 'Hide',

    // Trust / FAQ page
    tp_hero_badge: 'Peace of mind with Jibly',
    tp_hero_title: 'Send and travel',
    tp_hero_title_accent: 'with total peace of mind.',
    tp_hero_subtitle: 'Jibly isn\'t a courier like DHL. It\'s a platform that connects everyday people to each other — with all the safeguards of a real marketplace.',
    tp_how_eyebrow: 'How it works',
    tp_how_title: 'Three simple steps',
    tp_how_step1_title: 'Find a traveler',
    tp_how_step1_body: 'Post your request or reach out directly to a traveler whose trip matches what you need.',
    tp_how_step2_title: 'Book with confidence',
    tp_how_step2_body: 'Your payment is held safely on the platform. The traveler only gets paid once delivery is confirmed.',
    tp_how_step3_title: 'Get your parcel',
    tp_how_step3_body: 'The traveler hands it over in person. You confirm receipt with a unique code — and that\'s what releases the payment.',
    tp_pay_eyebrow: 'Secure payment',
    tp_pay_title: 'Your money stays',
    tp_pay_title_line2: 'safe and sound.',
    tp_pay_body: 'Your payment is held on the platform the moment you book. The traveler only receives the money once you\'ve confirmed delivery yourself, using a unique 6-digit code.',
    tp_pay_stripe_badge: 'Powered by Stripe — the global leader in payments',
    tp_pay_step1: 'Booking confirmed',
    tp_pay_step2: 'Handed over in person',
    tp_pay_step3: 'In transit',
    tp_pay_step4: 'Delivery confirmed',
    tp_pay_step5: 'Payment released',
    tp_pay_footnote: '🔒 Your payment is held safely until delivery is confirmed.',
    tp_pillars_eyebrow: 'Our safeguards',
    tp_pillars_title: 'Four pillars of safety',
    tp_pillar1_title: 'Verified identities',
    tp_pillar1_body: 'Photo ID and a biometric selfie via Stripe Identity. Every traveler is accounted for.',
    tp_pillar2_title: 'Payment held in escrow',
    tp_pillar2_body: 'Your money stays in escrow with Stripe until delivery is confirmed.',
    tp_pillar3_title: 'Double confirmation',
    tp_pillar3_body: 'Unique 6-digit codes for handover and delivery. No room for doubt.',
    tp_pillar4_title: 'Disputes handled within 48h',
    tp_pillar4_body: 'Our team steps in when something goes wrong. Automatic suspension for proven abuse.',
    tp_allowed_title: 'Not everything can be sent.',
    tp_allowed_body: 'To protect our travelers and stay fully within the law, certain categories of items are strictly forbidden (cash, weapons, valuables, and more).',
    tp_allowed_cta: 'See the full list',
    tp_faq_eyebrow: 'Frequently asked questions',
    tp_faq_title: 'Your questions, answered',
    tp_faq_q1: 'Does Jibly carry the parcels itself?',
    tp_faq_a1: 'No. Jibly is a platform that connects everyday people. We don\'t carry anything ourselves — it\'s travelers already making the trip who agree to bring your parcel along.',
    tp_faq_q2: 'How am I protected?',
    tp_faq_a2: 'Your payment is held safely by our banking provider (Stripe) until you confirm you\'ve received the parcel. The traveler only gets paid at that point. If something goes wrong, you can open a dispute right from your account.',
    tp_faq_q3: 'What happens if someone doesn\'t keep their commitment?',
    tp_faq_a3: 'Accounts that fail to honor their commitments are automatically restricted, then suspended if it happens again. Every user\'s identity is verified through Stripe Identity (photo ID + selfie), which lets us take action against abusive behavior.',
    tp_faq_q4: 'Can I send anything I want?',
    tp_faq_a4: 'No. For everyone\'s safety, certain categories of items are forbidden (cash, jewelry, weapons, hazardous goods, and so on). Check our "Allowed items" page for the full list.',
    tp_faq_q5: 'Can I send something valuable?',
    tp_faq_a5: 'Jibly is built for everyday items: documents, keys, prescription medication, small personal belongings. Items worth more than €500 aren\'t allowed on the platform.',
    tp_contact_title: 'Still have a question?',
    tp_contact_body_before: 'Drop us a line at',
    tp_contact_body_after: '— we reply within 24h on weekdays.',
    tp_cta_title: 'Ready to give it a try?',
    tp_cta_body: 'Join the Jibly community of travelers and senders. Your first delivery is free, so you can try it out risk-free.',
    tp_cta_send: 'Send a parcel',
    tp_cta_travel: 'Offer a trip',

    // CGU + objets-autorises
    cgu_back_home: 'Back to home',
    cgu_badge: 'Terms of Service',
    cgu_title: 'Jibly Terms of Service',
    cgu_last_updated: 'Last updated: {date}',
    cgu_review_note: 'English translation provided for convenience. Please have it reviewed by a legal professional before relying on it.',
    cgu_intro: 'Welcome to Jibly. By using our platform, you accept the terms set out below. We have tried to make them as short and clear as possible, but reading them is important to understand your rights and responsibilities.',
    cgu_s1_title: 'Nature of the platform',
    cgu_s1_p1: 'Jibly is a matchmaking platform connecting travelers (occasional carriers) with senders who wish to send a personal item. Jibly is not a carrier, does not physically handle any parcel, and assumes no liability for the transport itself.',
    cgu_s1_p2: 'The transport agreement is concluded directly between the sender and the traveler. Jibly facilitates their connection, secures the payment, and provides communication tools, but is not a party to the transport agreement.',
    cgu_s2_title: 'Registration and account',
    cgu_s2_p1: 'Registration is free and reserved for adults. You agree to provide accurate information (name, email, phone). Identity verification may be required for certain features.',
    cgu_s2_p2: 'You are responsible for keeping your credentials confidential. Any use of your account is presumed to be made by you.',
    cgu_s3_title: 'Allowed and forbidden items',
    cgu_s3_p1: 'Jibly operates on the principle of a positive list: only the explicitly authorized categories of items may be transported. Any other item is forbidden by default.',
    cgu_s3_p2: 'The authorized categories are: documents, keys, personal items, clothing, light electronics, and over-the-counter medication (without prescription, in its sealed original packaging, max. 2 units).',
    cgu_s3_p3: 'The following are strictly forbidden, without exception and without being an exhaustive list: cash, prescription medication, drugs and narcotics, weapons, counterfeit goods, jewelry and luxury items (value > €500), hazardous products, alcohol, tobacco and regulated products, and any item prohibited by customs or by the laws of the country of departure or arrival.',
    cgu_s3_p4_pre: 'The full, illustrated list is available on',
    cgu_s3_p4_link: 'the Allowed Items page',
    cgu_s3_p4_post: '.',
    cgu_s4_title: 'Dual declaration of contents',
    cgu_s4_p1: 'Before any transport, the sender and the traveler must each certify the contents of the parcel:',
    cgu_s4_li1: 'The sender certifies that the described contents are accurate and contain no forbidden product.',
    cgu_s4_li2: 'The traveler inspects the contents before agreeing to carry them and remains free to refuse at any time.',
    cgu_s4_p2: 'Any false declaration engages the personal liability of its author, including under criminal and customs law.',
    cgu_s5_title: 'Payment and compensation',
    cgu_s5_p1: 'Payment is made via Stripe at the time of booking and held in escrow by Jibly. The traveler receives their compensation only after the sender confirms delivery using the delivery code.',
    cgu_s5_p2: 'Jibly charges a commission on each successful transaction. The price breakdown is displayed before each party confirms.',
    cgu_s6_title: 'Handover and delivery codes',
    cgu_s6_p1: 'Each booking generates two confidential 6-digit codes: a handover code (held by the sender) and a delivery code (held by the traveler). These codes must never be shared outside the moment of the in-person meeting. The release of payment depends on their correct entry by the receiving party.',
    cgu_s7_title: 'Prohibited conduct and exclusion',
    cgu_s7_p1: 'The following conduct results in the permanent suspension of the account, without notice or refund:',
    cgu_s7_li1: 'Transporting a forbidden item (see article 3)',
    cgu_s7_li2: 'False declaration of contents',
    cgu_s7_li3: 'Attempting to pay outside the platform',
    cgu_s7_li4: 'Identity theft or fraudulent multiple accounts',
    cgu_s7_li5: 'Harassment, threats, or discrimination toward another user',
    cgu_s7_li6: 'Attempting to circumvent the handover / delivery codes',
    cgu_s7_p2: 'In the event of a violation, Jibly reserves the right to:',
    cgu_s7_li7: 'Permanently suspend the account',
    cgu_s7_li8: 'Retain evidence (messages, photos, account data) for legal purposes',
    cgu_s7_li9: 'Transmit information to the competent authorities (police, customs, courts)',
    cgu_s7_li10: 'Refuse any refund of amounts paid',
    cgu_s8_title: 'Reporting',
    cgu_s8_p1: 'Any user can report suspicious conduct, a non-compliant parcel, or a violation of these terms via the "Report" button available in the app. Reports are handled as promptly as possible and confidentially.',
    cgu_s9_title: 'Limitation of liability',
    cgu_s9_p1: 'Jibly makes its best efforts to facilitate a safe experience but cannot guarantee the outcome of every transport. Jibly\'s liability is limited to the services it provides directly (matchmaking, escrow, messaging).',
    cgu_s9_p2: 'In the event of a dispute between a sender and a traveler, Jibly may act as a mediator via the Dispute feature, but does not replace a court of law. Final responsibility for the transport, the items carried, and compliance with local laws lies with the users.',
    cgu_s10_title: 'Personal data',
    cgu_s10_p1: 'Your data is processed in accordance with the GDPR. You can export or delete your data at any time from your personal account. Conversations, transactions, and reports may be retained for up to 5 years for legal and security reasons.',
    cgu_s11_title: 'Changes to the terms',
    cgu_s11_p1: 'Jibly may update these Terms. Users will be notified by email in the event of a substantial change. Continued use after notification constitutes acceptance.',
    cgu_s12_title: 'Governing law and jurisdiction',
    cgu_s12_p1: 'These terms are governed by French law. In the event of a dispute and failing an amicable settlement, the French courts have sole jurisdiction, subject to the mandatory provisions applicable to consumers.',
    cgu_callouts_title: 'The 4 key points',
    cgu_callout1_title: 'Dual declaration',
    cgu_callout1_body: 'Sender and traveler each certify the contents before transport.',
    cgu_callout2_title: 'Permanent suspension',
    cgu_callout2_body: 'Any false declaration or forbidden item leads to permanent exclusion.',
    cgu_callout3_title: 'Cooperation with authorities',
    cgu_callout3_body: 'Jibly retains evidence and cooperates with police and customs.',
    cgu_callout4_title: 'Reporting',
    cgu_callout4_body: 'Any user can report suspicious conduct at any time.',
    cgu_cta_text: 'A question before you get started?',
    cgu_cta_button: 'See our Peace-of-Mind FAQ',
    oa_badge: 'Usage policy',
    oa_hero_title: 'What can you carry on Jibly?',
    oa_hero_subtitle: 'For everyone\'s safety, Jibly limits shipments to a specific list of categories. Any other type of item is forbidden.',
    oa_allowed_eyebrow: 'Allowed — Exhaustive list',
    oa_allowed_heading: 'The only transportable categories',
    oa_allowed1_label: 'Documents',
    oa_allowed1_examples: 'Administrative papers, mail, certificates, contracts',
    oa_allowed2_label: 'Keys',
    oa_allowed2_examples: 'Forgotten keys, spares, professional keys',
    oa_allowed3_label: 'Personal items',
    oa_allowed3_examples: 'Souvenirs, books, small non-valuable gifts',
    oa_allowed4_label: 'Clothing',
    oa_allowed4_examples: 'Clothes, textile accessories, shoes',
    oa_allowed5_label: 'Light electronics',
    oa_allowed5_examples: 'Chargers, cables, earphones, small accessories',
    oa_allowed6_label: 'Over-the-counter medication',
    oa_allowed6_examples: 'Doliprane, vitamins, parapharmacy — see conditions below',
    oa_otc_title: 'Over-the-counter medication — strict conditions',
    oa_otc_p1: 'Only medication available without a prescription and legally available in both countries is accepted (Doliprane, Efferalgan, vitamins, parapharmacy).',
    oa_otc_p2: 'Maximum quantity: 2 units per product, in their sealed original packaging. The sender declares and assumes legal responsibility for the contents.',
    oa_otc_p2_emphasis: 'Prescription medication remains strictly forbidden.',
    oa_forbidden_eyebrow: 'Forbidden',
    oa_forbidden_heading: 'Examples of forbidden items',
    oa_forbidden_subtitle: 'Non-exhaustive list. By default, anything not in the list of authorized categories is forbidden.',
    oa_forbidden_tag: 'Forbidden',
    oa_forbidden1_label: 'Cash',
    oa_forbidden1_reason: 'No amount, in any currency.',
    oa_forbidden2_label: 'Prescription medication',
    oa_forbidden2_reason: 'A prescription is personal. Transport prohibited by law.',
    oa_forbidden3_label: 'Drugs and narcotics',
    oa_forbidden3_reason: 'Any illicit substance, without exception.',
    oa_forbidden4_label: 'Weapons',
    oa_forbidden4_reason: 'All categories, including replicas and bladed weapons.',
    oa_forbidden5_label: 'Counterfeit goods',
    oa_forbidden5_reason: 'Products infringing intellectual property rights.',
    oa_forbidden6_label: 'Jewelry and luxury items',
    oa_forbidden6_reason: 'Jewelry, watches, designer bags, items > €500.',
    oa_forbidden7_label: 'Hazardous products',
    oa_forbidden7_reason: 'Flammable liquids, gases, unprotected lithium batteries.',
    oa_forbidden8_label: 'Regulated products',
    oa_forbidden8_reason: 'Alcohol, tobacco, goods subject to customs restrictions.',
    oa_consequences_title: 'Consequences of a violation',
    oa_consequences_p1: 'Any parcel containing a forbidden item leads to the',
    oa_consequences_strong1: 'permanent suspension',
    oa_consequences_p2: 'of the sender\'s and the traveler\'s accounts, the',
    oa_consequences_strong2: 'retention of evidence',
    oa_consequences_p3: 'for legal purposes, and the',
    oa_consequences_strong3: 'transmission to the authorities',
    oa_consequences_p4: 'concerned where necessary.',
    oa_dd_eyebrow: 'Dual declaration',
    oa_dd_title: 'A two-step verification',
    oa_dd_subtitle: 'For a shipment to be accepted, the sender and the traveler must each confirm the contents.',
    oa_dd_card1_title: 'The sender certifies the contents',
    oa_dd_card1_quote: '"I certify that the described contents are accurate and that they contain no forbidden product."',
    oa_dd_card2_title: 'The traveler inspects before accepting',
    oa_dd_card2_quote: '"I have inspected the contents before agreeing to carry them."',
    oa_dd_card3_title: 'Reporting and right of exclusion',
    oa_dd_card3_body: 'Any user can report a suspicious parcel. The traveler can refuse without penalty. Jibly reserves the right to suspend any account in the event of a violation.',
    oa_cta_title: 'Learn more about Jibly safety',
    oa_cta_subtitle: 'Discover how we protect your payment, verify identities, and handle disputes.',
    oa_cta_button: 'Read our trust policy',

    // My Space dashboard
    me2_role_sender: 'Sender',
    me2_role_sender_lc: 'the sender',
    me2_role_traveler: 'Traveler',
    me2_role_traveler_lc: 'the traveler',
    me2_role_someone: 'Someone',
    me2_tab_trips: 'My trips',
    me2_tab_sends: 'My shipments',
    me2_delivery_code_unavailable: 'Delivery code unavailable. Please reload the page or contact support.',
    me2_pickup_code_unavailable: 'Code unavailable. Please reload the page or contact support.',
    me2_receipt_recorded_transfer_pending: 'Your receipt was recorded, but the transfer to the traveler is still pending. We\'re on it.',
    me2_wallet_label: 'My wallet',
    me2_wallet_total_received: 'Total payments received for packages you\'ve carried.',
    me2_wallet_empty_hint: 'Your earnings will show up here as soon as you accept your first request.',
    me2_withdraw_earnings: 'Withdraw my earnings',
    me2_coming_soon: 'Coming soon',
    me2_withdraw_modal_title: 'Withdrawals are coming soon',
    me2_withdraw_modal_text: 'We\'re setting up secure bank transfers. In the meantime, your earnings are safely held on Jibly and we\'ll reach out to you directly to send them your way.',
    me2_your_balance: 'Your balance',
    me2_withdraw_question: 'Have a question? Write to us at',
    me2_got_it: 'Got it',
    me2_my_reservations: 'My reservations',
    me2_my_reservations_subtitle: 'Trips you\'ve booked directly with a traveler.',
    me2_delivered_confirmed: 'delivered and confirmed',
    me2_delivered_to_confirm: 'delivered · to confirm',
    me2_view_proof: 'View proof',
    me2_i_received: 'I received it',
    me2_rate: 'Rate',
    me2_you_rated: 'You rated',
    me2_x_rated_you: '{name} rated you',
    me2_x_accepted: '{name} accepted!',
    me2_arrange_transport_details: 'You can now sort out the details of the handover.',
    me2_delivery_proof: 'Proof of delivery',
    me2_handed_to: 'Handed to:',
    me2_note_label: 'Note:',
    me2_uploaded_on: 'Uploaded on {date}',
    me2_how_to_contact: 'How to reach them',
    me2_message: 'Message',
    me2_call: 'Call',
    me2_whatsapp_not_provided: 'WhatsApp not provided',
    me2_handoff_code_title: 'Package handoff code',
    me2_handoff_code_desc: 'Give it to {name} in person. They\'ll enter it in their app to confirm the handover.',
    me2_view_code: 'View code',
    me2_package_handed_to: 'Package handed to {name}',
    me2_report_problem: 'Report a problem',
    me2_status_new: 'new',
    me2_status_pending: 'pending',
    me2_status_declined: 'declined',
    me2_decline: 'Decline',
    me2_pay: 'Pay {amount}',
    me2_cancel_failed: 'Couldn\'t cancel. Please try again.',
    me2_from_price: 'from {amount}€',
    me2_cancel_trip: 'Cancel this trip',
    me2_cancel_trip_q: 'Cancel this trip?',
    me2_checking_bookings: 'Checking bookings…',
    me2_one_booking_in_progress: '1 booking is active on this trip.',
    me2_n_bookings_in_progress: '{n} bookings are active on this trip.',
    me2_bookings_auto_cancel_before: 'They\'ll be ',
    me2_bookings_auto_cancel_bold: 'automatically cancelled',
    me2_bookings_auto_cancel_after: ' and any authorized payments will be released. No charge will be made.',
    me2_cancel_trip_final: 'This action is permanent. The trip will no longer be visible to senders.',
    me2_keep_trip: 'Keep the trip',
    me2_cancelling: 'Cancelling…',
    me2_confirm_cancel: 'Confirm cancellation',
    me2_my_proposals_sent: 'My proposals sent',
    me2_my_proposals_sent_subtitle: 'Public requests you\'ve offered to help with.',
    me2_requests_received: 'Requests received',
    me2_requests_received_subtitle: 'Senders would like to entrust an item to one of your trips.',
    me2_no_pending_requests: 'No pending requests right now.',
    me2_to_deliver: 'To deliver',
    me2_history: 'History',
    me2_status_cashed_in: 'paid out',
    me2_status_delivered: 'delivered',
    me2_status_accepted: 'accepted',
    me2_accept: 'Accept',
    me2_open_conversation: 'Open conversation',
    me2_messages: 'Messages',
    me2_i_delivered: 'I delivered it',
    me2_phone_hint: 'Used to reach you via WhatsApp or phone after a booking.',
    me2_city: 'City',
    me2_country: 'Country',
    me2_saved: 'Saved',
    me2_verify_identity_title: 'Verify your identity',
    me2_mandatory: 'Required',
    me2_verify_identity_desc: 'to publish a trip or book a package. Verification is free and encrypted by Stripe.',
    me2_id_verified_label: 'ID verified',
    me2_identity_verified: 'Identity verified',
    me2_verify_start_failed: 'Couldn\'t get started',
    me2_error_retry: 'Something went wrong — please try again.',
    me2_verify_my_identity: 'Verify my identity',
    me2_update_failed: 'Update failed. Please contact support.',
    me2_confirm_and_pay: 'Confirm and pay',
    me2_with_traveler: 'With {name}',
    me2_back: 'Back',
    me2_my_packages: 'My packages',
    me2_publish_request: 'Post a request',
    me2_no_sends: 'No shipments yet. Post your first request.',
    me2_bucket_todo: 'To do',
    me2_bucket_in_progress: 'In progress',
    me2_bucket_searching: 'Searching',
    me2_bucket_delivered: 'Delivered',
    me2_bucket_cancelled: 'Cancelled',
    me2_select_send: 'Select a shipment to see its details.',
    me2_sub_proposes: '{name} is offering',
    me2_sub_delivered_by: 'Delivered by {name}',
    me2_sub_to_confirm: 'to confirm',
    me2_sub_in_transit: 'in transit',
    me2_sub_waiting_for: 'Waiting for {name}',
    me2_sub_cancelled: 'Cancelled',
    me2_before_date: 'By {date}',
    me2_description: 'Description',
    me2_searching_traveler_title: 'You\'re looking for a traveler.',
    me2_searching_traveler_text: 'We\'ll let you know as soon as someone accepts your package.',
    me2_my_trips: 'My trips',
    me2_publish_trip: 'Post a trip',
    me2_no_trips: 'No trips planned. Post your next flight to offer your services.',
    me2_past_trips: 'Past trips',
    me2_select_trip: 'Select a trip to see its details.',
    me2_packages_unit: 'packages',
    me2_flight: 'Flight {number}',
    me2_departure: 'Departure',
    me2_packages_unit_caps: 'Packages',
    me2_earnings_on_flight: 'earned on this flight',
    me2_no_packages_on_flight: 'No packages on this flight yet.',
    me2_find_packages_on_route: 'Find packages along my route',
    me2_pill_new_request: 'New request',
    me2_pill_delivery_confirmed: 'Delivery confirmed',
    me2_pill_delivered_give_code: 'Delivered · code to give',
    me2_pill_picked_up_to_deliver: 'Picked up · to deliver',
    me2_pill_payment_held_to_pickup: 'Payment held · to pick up',
    me2_pill_to_deliver: 'To deliver',
    me2_i_picked_up: 'I picked it up',
    me2_view_delivery_code: 'View delivery code',
    me2_history_empty: 'Your history is empty. Accept your first mission to get started.',
    me2_history_missions: 'Missions delivered or declined',
    me2_history_sends: 'Completed shipments',
    me2_history_proposals: 'Completed proposals',
    me2_history_cancelled_trips: 'Cancelled trips',
    me2_cancelled_label: 'Cancelled',

    // Pickup / proof modals
    pickup_close: 'Close',
    pickup_show_title_delivery: 'Package delivery',
    pickup_show_title_pickup: 'Package handover',
    pickup_show_body_delivery: 'Share this code with {name} in person. They\'ll need to enter it in their app to confirm they received the package and release the payment.',
    pickup_show_body_pickup: 'Share this code with {name} in person. They\'ll need to enter it in their app to confirm they\'ve picked up your package.',
    pickup_show_code_label_delivery: 'Delivery code',
    pickup_show_code_label_pickup: 'Handover code',
    pickup_show_copied: 'Code copied',
    pickup_show_copy: 'Copy code',
    pickup_show_warning_delivery: '🔒 Only share this code at the moment of delivery.',
    pickup_show_warning_pickup: '🔒 Only share this code at the moment of the in-person handover.',
    pickup_enter_title_delivery: 'Confirm receipt',
    pickup_enter_title_pickup: 'Confirm handover',
    pickup_enter_err_too_many: 'Too many attempts. Please try again in a few minutes.',
    pickup_enter_err_invalid_delivery: 'Incorrect code. Please check with the traveler.',
    pickup_enter_err_invalid_pickup: 'Incorrect code. Please check with the sender.',
    pickup_enter_err_already_delivery: 'Receipt has already been confirmed.',
    pickup_enter_err_already_pickup: 'The handover has already been confirmed.',
    pickup_enter_err_not_traveler: 'You\'re not authorized to confirm this handover.',
    pickup_enter_err_not_sender: 'You\'re not authorized to confirm this receipt.',
    pickup_enter_err_no_proof: 'No proof of delivery has been submitted yet.',
    pickup_enter_err_generic: 'Something went wrong. Please try again.',
    pickup_enter_err_unexpected: 'Unexpected error',
    pickup_enter_body_delivery: 'Ask {name} for the delivery code shown in their app, then enter it below.',
    pickup_enter_body_pickup: 'Ask {name} for the handover code shown in their app, then enter it below.',
    pickup_enter_verifying: 'Verifying…',
    pickup_enter_auto_validate: 'The code validates automatically',
    pickup_enter_footer_delivery: 'By confirming receipt, you release the payment to the traveler. This action is final.',
    pickup_enter_footer_pickup: 'By confirming the handover, you agree to carry this package and deliver it to its destination. Any failure to deliver may lead to prosecution for breach of trust {article}.',
    pickup_enter_footer_pickup_article: '(art. 314-1 of the French Penal Code)',
    pickup_proof_err_photo_too_large: 'Photo too large (max 8 MB).',
    pickup_proof_err_no_photo: 'Please add a photo of the handover',
    pickup_proof_err_no_name: 'Please enter the name of the person who received the package',
    pickup_proof_err_upload_failed: 'Upload failed',
    pickup_proof_err_generic: 'Something went wrong',
    pickup_proof_eyebrow: 'Proof of delivery',
    pickup_proof_title: 'I delivered the package',
    pickup_proof_intro: 'A photo + the recipient\'s name is all it takes. It\'s your safeguard if anything goes wrong.',
    pickup_proof_photo_label: 'Handover photo',
    pickup_proof_preview_alt: 'Preview',
    pickup_proof_remove_photo: 'Remove photo',
    pickup_proof_photo_cta: 'Take / choose a photo',
    pickup_proof_receiver_label: 'Name of the person who received it',
    pickup_proof_receiver_placeholder: 'e.g. Mohammed (the father)',
    pickup_proof_receiver_hint: 'This name will be compared with the one provided by the sender.',
    pickup_proof_note_label: 'Note (optional)',
    pickup_proof_note_placeholder: 'e.g. Handed over at Casablanca airport',
    pickup_proof_cancel: 'Cancel',
    pickup_proof_submitting: 'Uploading…',
    pickup_proof_submit: 'Confirm delivery',

    // Review / dispute / respond modals
    rev_close: 'Close',
    rev_cancel: 'Cancel',
    rev_sending: 'Sending…',
    rev_review_eyebrow: 'Your review',
    rev_review_title: 'Rate {name}',
    rev_review_subtitle_traveler: 'How did the delivery go?',
    rev_review_subtitle_sender: 'How did the shipment go?',
    rev_review_placeholder_traveler: 'Friendly, on time, careful… (optional)',
    rev_review_placeholder_sender: 'Clear, reliable, easygoing… (optional)',
    rev_rating_1: 'Very disappointing',
    rev_rating_2: 'Not great',
    rev_rating_3: 'Okay',
    rev_rating_4: 'Very good',
    rev_rating_5: 'Perfect',
    rev_select_rating: 'Pick a rating',
    rev_stars_singular: '{count} star',
    rev_stars_plural: '{count} stars',
    rev_comment_label: 'Your comment (optional)',
    rev_submit_review: 'Submit my rating',
    rev_err_already_reviewed: 'You\'ve already rated this shipment.',
    rev_err_cannot_review_yet: 'You can\'t rate this shipment yet.',
    rev_err_save_failed: 'Couldn\'t save. Please try again.',
    rev_dispute_title: 'Report a problem',
    rev_dispute_intro_before: 'This reports a problem involving',
    rev_dispute_intro_after: '. Our team will be notified right away and will handle the dispute within 48h.',
    rev_dispute_cat_not_delivered: 'Package not delivered',
    rev_dispute_cat_not_delivered_desc: 'The traveler didn\'t deliver my package',
    rev_dispute_cat_damaged: 'Damaged package',
    rev_dispute_cat_damaged_desc: 'The package arrived damaged',
    rev_dispute_cat_wrong_item: 'Wrong item',
    rev_dispute_cat_wrong_item_desc: 'The item delivered isn\'t mine',
    rev_dispute_cat_late: 'Very late',
    rev_dispute_cat_late_desc: 'The delivery is well past the deadline',
    rev_dispute_cat_other: 'Other problem',
    rev_dispute_cat_other_desc: 'I want to describe another problem',
    rev_dispute_cat_mismatch: 'The package doesn\'t match',
    rev_dispute_cat_mismatch_desc: 'The item doesn\'t match the description',
    rev_dispute_cat_no_confirm: 'The recipient won\'t confirm',
    rev_dispute_cat_no_confirm_desc: 'I delivered it but receipt isn\'t confirmed',
    rev_dispute_desc_label: 'Detailed description',
    rev_dispute_desc_placeholder: 'Describe what happened, the dates, the exchanges, and anything that can help us decide…',
    rev_dispute_submit: 'Submit report',
    rev_dispute_abuse_warning: 'Abusive reports may lead to the suspension of your own account.',
    rev_dispute_err_no_category: 'Please select a category',
    rev_dispute_err_short_desc: 'Describe the problem in a few words (10 characters minimum)',
    rev_dispute_err_submit_failed: 'Couldn\'t submit the report',
    rev_respond_sender_fallback: 'The sender',
    rev_respond_err_failed: 'Proposal failed. Please try again.',
    rev_respond_eyebrow: 'Offer my help',
    rev_respond_sender_role: 'Sender',
    rev_respond_category: 'Category',
    rev_respond_before_date: 'By',
    rev_respond_which_flight: 'Which flight will you carry it on?',
    rev_respond_loading_flights: 'Loading your flights…',
    rev_respond_new_flight: 'New flight',
    rev_respond_flight_date: 'Flight date',
    rev_respond_flight_saved_note: 'Your flight will be saved and shown in "My trips".',
    rev_respond_if_accepted: 'If the sender accepts',
    rev_respond_you_receive: 'You\'ll receive',
    rev_respond_jibly_protection: 'Jibly protection (15%)',
    rev_respond_message_label: 'Message to the sender (optional)',
    rev_respond_message_placeholder: 'E.g. I can come pick up the item at your address.',
    rev_respond_reassurance: 'No card is required at this stage. If they accept, you\'ll be notified.',
    rev_respond_submit: 'Send my proposal',

    // Secondary pages
    sec_back_to_space: 'Back to my space',
    sec_login: 'Log in',
    sec_loading: 'Loading…',
    sec_load_more: 'Load more',
    sec_load_error: 'Failed to load',
    sec_user_fallback: 'User',
    sec_notif_title: 'Notifications',
    sec_notif_subtitle: 'Everything happening with your parcels and trips.',
    sec_notif_mark_all_read: 'Mark all as read',
    sec_notif_empty_title: 'No notifications',
    sec_notif_empty_body: 'When someone accepts your parcel or offers a trip, you\'ll be notified here.',
    sec_msg_title: 'Messages',
    sec_msg_subtitle: 'Your conversations with travelers and senders.',
    sec_msg_login_prompt: 'Log in to see your messages.',
    sec_msg_empty_title: 'No messages',
    sec_msg_empty_body: 'Your conversations will appear here as soon as a trip is confirmed.',
    sec_msg_you_prefix: 'You: {body}',
    sec_msg_no_message: 'No messages yet',
    sec_hist_title: 'History',
    sec_hist_subtitle: 'Your completed or cancelled trips and shipments.',
    sec_hist_login_prompt: 'Log in to see your history.',
    sec_hist_tab_transports: 'Trips',
    sec_hist_tab_envois: 'Shipments',
    sec_hist_empty_title: 'Nothing in your history',
    sec_hist_empty_transports: 'Your completed trips will appear here.',
    sec_hist_empty_envois: 'Your completed shipments will appear here.',
    sec_hist_status_cancelled_trip: '✕ cancelled',
    sec_hist_status_declined: '✕ declined',
    sec_hist_status_delivered: '📸 delivered',
    sec_hist_status_confirmed: '✓ confirmed',
    sec_hist_view_proof: 'View proof',
    sec_wallet_title: 'My wallet',
    sec_wallet_subtitle: 'Your traveler earnings, at a glance.',
    sec_wallet_available: 'Available',
    sec_wallet_balance_label: 'Available balance',
    sec_wallet_tx_count_singular: '{count} transaction collected',
    sec_wallet_tx_count_plural: '{count} transactions collected',
    sec_wallet_withdraw: 'Withdraw my earnings',
    sec_wallet_coming_soon: 'Coming soon',
    sec_wallet_account_holder: 'Account holder',
    sec_wallet_account_holder_placeholder: 'First name Last name',
    sec_wallet_withdraw_note_before: 'Bank withdrawals are coming soon. In the meantime, reach out to us at',
    sec_wallet_withdraw_note_after: 'to receive your earnings.',
    sec_wallet_pending: 'Pending',
    sec_wallet_no_pending: 'No pending payments.',
    sec_wallet_to_receive: 'To receive after delivery',
    sec_wallet_history: 'History',
    sec_wallet_empty_title: 'Your wallet is empty',
    sec_wallet_empty_body: 'Post a trip or respond to a delivery request to start earning.',
    sec_wallet_publish_trip: 'Post a trip',
    sec_wallet_sender_fallback: 'Sender',
    sec_wallet_status_captured: 'Collected',
    sec_wallet_status_pending: 'Pending',
    sec_wallet_status_cancelled: 'Cancelled',
  },
};
