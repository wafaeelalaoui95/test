# Supabase auth email templates

Supabase sends the signup confirmation and password reset itself, so these
cannot live in `lib/email/templates.ts` with the rest. They are pasted into
**Supabase → Authentication → Email Templates**, one per tab.

Kept here so they are versioned alongside the templates they imitate: same
wrapper, same palette, same voice. If `BRAND` in `templates.ts` changes, change
it here too — nothing enforces that automatically, which is the price of the
templates living in someone else's dashboard.

**Bilingual on purpose.** Supabase picks no language: it has one template per
event, and no idea who it is writing to. Every other Jibly email is French-only
for the same reason (there is no `locale` on `profiles` yet), but these two
reach people who have never signed in and may not read French at all. French
first, English under a rule.

**The links are built by hand, NOT with `{{ .ConfirmationURL }}`.** That one
produces a PKCE link, which needs a `code_verifier` cookie left in the browser
that started the signup. Open the email anywhere else — Gmail's in-app browser,
a private tab, a laptop when you signed up on your phone — and the first click
fails; clicking again from the right browser works. That was the "you have to
do it twice" both Wafae and her brother hit.

`{{ .TokenHash }}` carries the whole proof in the URL, so the link works from
any browser on any device, first time. `/auth/callback` accepts both.

Leave the `{{ ... }}` exactly as written, spaces inside the braces included.

---

## 1. Confirm signup

**Subject:** `Bienvenue sur Jibly {{ .Data.full_name }}`

`.Data` is the user metadata from `signUp({ options: { data } })`, so
`full_name` is there because the signup page sends it. It is title-cased before
it leaves, so a hurried "yassine" arrives as "Yassine".

The name goes at the END on purpose. Supabase renders nothing for a missing
key rather than erroring, so a subject built as `{{ .Data.full_name }},
confirmez…` becomes `, confirmez…` for any account created without one — via
the dashboard, a future OAuth provider, a seed. At the end it simply reads
"Bienvenue sur Jibly", which is a fine subject line on its own.

Say it in the body too, where the same rule applies:
`Bonjour {{ .Data.full_name }},` sits on its own line and degrades to
"Bonjour," — awkward. Prefer weaving it in after a word that stands alone.

```html
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0;padding:0;background:#FFF8F0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#1A1614;">
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:#FFF8F0;">
    <tr>
      <td align="center" style="padding:40px 20px;">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="560" style="max-width:560px;background:#ffffff;border-radius:16px;overflow:hidden;">
          <tr>
            <td style="padding:32px 32px 24px;">
              <a href="https://jibly.io" style="text-decoration:none;color:#1A1614;font-size:22px;font-weight:700;letter-spacing:-0.02em;">Jibly</a>
            </td>
          </tr>
          <tr>
            <td style="padding:0 32px 32px;">
              <p style="margin:0 0 8px;font-size:13px;color:#7C6FD9;font-weight:600;letter-spacing:0.05em;text-transform:uppercase;">Bienvenue</p>
              <h1 style="margin:0 0 16px;font-size:24px;font-weight:700;color:#1A1614;letter-spacing:-0.01em;line-height:1.3;">
                Confirmez votre adresse
              </h1>
              <p style="margin:0 0 24px;font-size:15px;color:#5A524A;line-height:1.6;">
                Ravis de vous compter parmi nous {{ .Data.full_name }}. Un dernier clic et votre compte est prêt : ce lien expire dans 24&nbsp;heures.
              </p>
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" align="center">
                <tr>
                  <td style="background:#1A1614;border-radius:999px;">
                    <a href="{{ .SiteURL }}/auth/callback?token_hash={{ .TokenHash }}&type=email&next=/me" style="display:inline-block;padding:14px 28px;font-size:15px;font-weight:600;color:#ffffff;text-decoration:none;">
                      Confirmer mon adresse
                    </a>
                  </td>
                </tr>
              </table>
              <p style="margin:24px 0 0;font-size:13px;color:#9A9189;line-height:1.6;">
                Si vous n'êtes pas à l'origine de cette inscription, ignorez cet email : aucun compte ne sera créé.
              </p>
              <hr style="border:none;border-top:1px solid #EFE9E2;margin:24px 0;">
              <p style="margin:0;font-size:13px;color:#9A9189;line-height:1.6;">
                <strong style="color:#5A524A;">In English —</strong> one last click and your account is ready. The link above expires in 24 hours. If you did not sign up, ignore this email and no account will be created.
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding:24px 32px;border-top:1px solid #EFE9E2;">
              <p style="margin:0;font-size:12px;color:#9A9189;line-height:1.6;">
                Jibly · <a href="https://jibly.io" style="color:#5A524A;text-decoration:underline;">jibly.io</a>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
```

---

## 2. Reset password

**Subject:** `Réinitialisez votre mot de passe · Reset your password`

```html
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0;padding:0;background:#FFF8F0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#1A1614;">
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:#FFF8F0;">
    <tr>
      <td align="center" style="padding:40px 20px;">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="560" style="max-width:560px;background:#ffffff;border-radius:16px;overflow:hidden;">
          <tr>
            <td style="padding:32px 32px 24px;">
              <a href="https://jibly.io" style="text-decoration:none;color:#1A1614;font-size:22px;font-weight:700;letter-spacing:-0.02em;">Jibly</a>
            </td>
          </tr>
          <tr>
            <td style="padding:0 32px 32px;">
              <p style="margin:0 0 8px;font-size:13px;color:#7C6FD9;font-weight:600;letter-spacing:0.05em;text-transform:uppercase;">Mot de passe</p>
              <h1 style="margin:0 0 16px;font-size:24px;font-weight:700;color:#1A1614;letter-spacing:-0.01em;line-height:1.3;">
                Choisissez un nouveau mot de passe
              </h1>
              <p style="margin:0 0 24px;font-size:15px;color:#5A524A;line-height:1.6;">
                Ce lien vous emmène directement sur la page où le définir. Il expire dans une heure.
              </p>
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" align="center">
                <tr>
                  <td style="background:#1A1614;border-radius:999px;">
                    <a href="{{ .SiteURL }}/auth/callback?token_hash={{ .TokenHash }}&type=recovery&next=/reset-password/update" style="display:inline-block;padding:14px 28px;font-size:15px;font-weight:600;color:#ffffff;text-decoration:none;">
                      Réinitialiser mon mot de passe
                    </a>
                  </td>
                </tr>
              </table>
              <p style="margin:24px 0 0;font-size:13px;color:#9A9189;line-height:1.6;">
                Vous n'avez rien demandé ? Ignorez cet email, votre mot de passe actuel reste valable.
              </p>
              <hr style="border:none;border-top:1px solid #EFE9E2;margin:24px 0;">
              <p style="margin:0;font-size:13px;color:#9A9189;line-height:1.6;">
                <strong style="color:#5A524A;">In English —</strong> the link above takes you straight to the page where you can set a new password. It expires in one hour. If you did not ask for this, ignore this email: your current password still works.
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding:24px 32px;border-top:1px solid #EFE9E2;">
              <p style="margin:0;font-size:12px;color:#9A9189;line-height:1.6;">
                Jibly · <a href="https://jibly.io" style="color:#5A524A;text-decoration:underline;">jibly.io</a>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
```

---

## Before pasting

- Set the **subject** on each tab too. Supabase keeps its own default otherwise,
  and a branded body under "Confirm Your Signup" is half the job.
- Check **Authentication → URL Configuration**: Site URL must be
  `https://jibly.io` and Redirect URLs must include `https://jibly.io/auth/callback`,
  or the button lands on an auth error.
- Send yourself one of each afterwards. The Supabase preview does not
  substitute `{{ .ConfirmationURL }}`, so a broken link only shows up for real.
