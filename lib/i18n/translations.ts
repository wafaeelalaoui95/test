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

  // Hero / Landing
  hero_badge: string;
  hero_title_1: string;
  hero_title_2: string;
  hero_subtitle: string;
  hero_search_from: string;
  hero_search_to: string;
  hero_search_button: string;
  hero_social_proof: string;

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
  common_save: string;
  common_loading: string;
  common_optional: string;
  common_eur: string;
  common_message: string;
  common_search_placeholder: string;
  common_no_results: string;
  common_clear: string;

  // Item categories
  cat_documents: string;
  cat_documents_desc: string;
  cat_keys: string;
  cat_keys_desc: string;
  cat_medication: string;
  cat_medication_desc: string;
  cat_small: string;
  cat_small_desc: string;

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
};

export const translations: Record<Locale, Translations> = {
  fr: {
    nav_send: 'Je cherche un voyageur',
    nav_travel: 'Je peux transporter',
    nav_discover: 'Découvrir',
    nav_trust: 'Confiance',
    nav_my_space: 'Mon espace',
    nav_start: 'Commencer',

    hero_badge: 'Communauté de voyageurs vérifiés',
    hero_title_1: 'Quelqu\'un voyage déjà',
    hero_title_2: 'dans votre direction.',
    hero_subtitle: 'Envoyez vos affaires avec un voyageur. Simple, humain, partout dans le monde.',
    hero_search_from: 'Ville de départ',
    hero_search_to: 'Ville d\'arrivée',
    hero_search_button: 'Trouver un voyageur',
    hero_social_proof: '+2 000 voyageurs',

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
    common_save: 'Enregistrer',
    common_loading: 'Chargement...',
    common_optional: 'optionnel',
    common_eur: '€',
    common_message: 'Message',
    common_search_placeholder: 'Rechercher une ville ou un pays...',
    common_no_results: 'Aucune ville trouvée',
    common_clear: 'Effacer',

    cat_documents: 'Documents',
    cat_documents_desc: 'Papiers, contrats, attestations',
    cat_keys: 'Clés',
    cat_keys_desc: 'Logement, voiture',
    cat_medication: 'Médicaments',
    cat_medication_desc: 'Sur ordonnance uniquement',
    cat_small: 'Petits objets',
    cat_small_desc: 'Lunettes, livre, souvenirs',

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
    footer_trust: 'Confiance',
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
  },

  en: {
    nav_send: 'I need a traveler',
    nav_travel: 'I can carry',
    nav_discover: 'Discover',
    nav_trust: 'Trust',
    nav_my_space: 'My Space',
    nav_start: 'Get Started',

    hero_badge: 'Verified traveler community',
    hero_title_1: 'Someone is already going',
    hero_title_2: 'your way.',
    hero_subtitle: 'Send your stuff with a traveler. Simple, human, worldwide.',
    hero_search_from: 'Departure city',
    hero_search_to: 'Arrival city',
    hero_search_button: 'Find a traveler',
    hero_social_proof: '+2,000 travelers',

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
    common_save: 'Save',
    common_loading: 'Loading...',
    common_optional: 'optional',
    common_eur: '€',
    common_message: 'Message',
    common_search_placeholder: 'Search a city or country...',
    common_no_results: 'No city found',
    common_clear: 'Clear',

    cat_documents: 'Documents',
    cat_documents_desc: 'Papers, contracts, certificates',
    cat_keys: 'Keys',
    cat_keys_desc: 'Home, car',
    cat_medication: 'Medication',
    cat_medication_desc: 'Prescription only',
    cat_small: 'Small items',
    cat_small_desc: 'Glasses, book, keepsakes',

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
  },
};
