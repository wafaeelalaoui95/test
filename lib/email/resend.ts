import { Resend } from 'resend';

// Lazy singleton so we don't crash at build time if the env var is missing.
let _resend: Resend | null = null;

export function getResend(): Resend {
  if (!_resend) {
    const key = process.env.RESEND_API_KEY;
    if (!key) {
      throw new Error('RESEND_API_KEY is not configured');
    }
    _resend = new Resend(key);
  }
  return _resend;
}

// Default sender for all transactional emails. Override via env if needed.
export const FROM_EMAIL = process.env.RESEND_FROM_EMAIL || 'Jibly <hello@jibly.com>';
