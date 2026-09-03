# Supabase auth email templates

Supabase sends the signup confirmation and password reset itself, so these
cannot live in `lib/email/templates.ts` with the rest. They are pasted into
**Supabase → Authentication → Emails**, one per tab.

Kept here so they are versioned alongside the templates they imitate: same
wrapper, same palette. If `BRAND` in `templates.ts` changes, change it here
too — nothing enforces that, which is the price of half the emails living in
someone else's dashboard.

**English only, and deliberately.** Every other Jibly email is French, because
by then we know who we are writing to. These two reach someone who has never
signed in and whose language we have no way of knowing, so rather than guess
wrong they use the one most people can read. There is no `locale` on `profiles`
to consult even if we wanted to.

**The links are built by hand, NOT with `{{ .ConfirmationURL }}`.** That one
produces a PKCE link, which needs a `code_verifier` cookie left in the browser
that started the signup. Open the email anywhere else — Gmail's in-app browser,
a private tab, a laptop when you signed up on your phone — and the first click
fails while a second one from the right browser works. That was the "you have
to do it twice" both Wafae and her brother hit.

`{{ .TokenHash }}` carries the whole proof in the URL, so the link works from
any browser on any device, first time. `/auth/callback` accepts both.

Leave the `{{ ... }}` exactly as written, spaces inside the braces included.

---

## 1. Confirm signup

**Subject:** `Welcome to Jibly {{ .Data.full_name }}`

`.Data` is the user metadata from `signUp({ options: { data } })`, so
`full_name` is there because the signup page sends it, title-cased.

The name goes at the END on purpose. Supabase renders nothing for a missing key
rather than erroring, so `{{ .Data.full_name }}, confirm your email` would read
`, confirm your email` for any account created without one — through the
dashboard, a future OAuth provider, a seed. At the end it degrades to "Welcome
to Jibly", which is a fine subject line on its own.

```html
<!DOCTYPE html>
<html lang="en">
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
              <p style="margin:0 0 8px;font-size:13px;color:#7C6FD9;font-weight:600;letter-spacing:0.05em;text-transform:uppercase;">Welcome</p>
              <h1 style="margin:0 0 16px;font-size:24px;font-weight:700;color:#1A1614;letter-spacing:-0.01em;line-height:1.3;">
                Confirm your email
              </h1>
              <p style="margin:0 0 24px;font-size:15px;color:#5A524A;line-height:1.6;">
                Glad to have you with us {{ .Data.full_name }}. One last click and your account is ready — this link expires in 24 hours.
              </p>
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" align="center">
                <tr>
                  <td style="background:#1A1614;border-radius:999px;">
                    <a href="{{ .SiteURL }}/auth/callback?token_hash={{ .TokenHash }}&type=email&next=/me" style="display:inline-block;padding:14px 28px;font-size:15px;font-weight:600;color:#ffffff;text-decoration:none;">
                      Confirm my email
                    </a>
                  </td>
                </tr>
              </table>
              <p style="margin:24px 0 0;font-size:13px;color:#9A9189;line-height:1.6;">
                If you didn't sign up, ignore this email and no account will be created.
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

**Subject:** `Reset your Jibly password`

```html
<!DOCTYPE html>
<html lang="en">
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
              <p style="margin:0 0 8px;font-size:13px;color:#7C6FD9;font-weight:600;letter-spacing:0.05em;text-transform:uppercase;">Password</p>
              <h1 style="margin:0 0 16px;font-size:24px;font-weight:700;color:#1A1614;letter-spacing:-0.01em;line-height:1.3;">
                Choose a new password
              </h1>
              <p style="margin:0 0 24px;font-size:15px;color:#5A524A;line-height:1.6;">
                This link takes you straight to the page where you can set it. It expires in one hour.
              </p>
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" align="center">
                <tr>
                  <td style="background:#1A1614;border-radius:999px;">
                    <a href="{{ .SiteURL }}/auth/callback?token_hash={{ .TokenHash }}&type=recovery&next=/reset-password/update" style="display:inline-block;padding:14px 28px;font-size:15px;font-weight:600;color:#ffffff;text-decoration:none;">
                      Reset my password
                    </a>
                  </td>
                </tr>
              </table>
              <p style="margin:24px 0 0;font-size:13px;color:#9A9189;line-height:1.6;">
                Didn't ask for this? Ignore this email — your current password still works.
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

- Set the **subject** on each tab too. Supabase keeps its own default
  otherwise, and a branded body under "Confirm Your Signup" is half the job.
- Check **Authentication → URL Configuration**: Site URL must be
  `https://jibly.io`. It is what replaces `{{ .SiteURL }}` in the links above,
  so a stale vercel.app value sends every new user there.
- Send yourself one of each afterwards, using a `+suffix` address. The Supabase
  preview does not substitute the variables, so a broken link only shows up for
  real. Open it on a different device than the one you signed up on — that is
  the case that used to fail.
