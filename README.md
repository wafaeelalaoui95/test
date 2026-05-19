# Jibly — Peer-to-peer item delivery MVP

Next.js 14 + Supabase + Tailwind. Editorial design, English/French.

## Quick start

```bash
npm install
cp .env.local.example .env.local
# fill in NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY
npm run dev
```

## Required manual Supabase setup

You MUST do these steps before the app works end-to-end.

### 1. Run the SQL schema

In the Supabase dashboard → SQL Editor → New query → paste the entire content of
`lib/supabase/schema.sql` → Run.

This creates: `profiles`, `traveler_trips`, `shipping_requests`, `matches`,
`messages`, `reviews`, `reports` + RLS policies + an auto-profile trigger.

It is idempotent — safe to re-run.

### 2. Configure Auth in Supabase

Dashboard → Authentication → Providers:

- **Email**: enabled (default). For development you can disable "Confirm email"
  so signup is instant. For production, leave it on.
- **Magic link**: works out of the box once Email is enabled.
- **Google** (optional, can add later): toggle on, paste Google OAuth client ID
  and secret. Set redirect URL to `https://your-domain.com/auth/callback`.

### 3. Add redirect URLs

Dashboard → Authentication → URL Configuration → Redirect URLs:

```
http://localhost:3000/auth/callback
https://your-vercel-domain.vercel.app/auth/callback
https://your-custom-domain.com/auth/callback
```

Site URL: `https://your-production-domain.com` (or `http://localhost:3000` for dev).

### 4. Environment variables on Vercel

Settings → Environment Variables → add:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

Both for Production, Preview, and Development. Redeploy after adding.

## What's connected to Supabase

| Page | Reads | Writes | Notes |
|---|---|---|---|
| `/` (home) | open trips | — | Falls back to empty state if no trips |
| `/matches` | open trips + traveler profile | — | Live list, filterable |
| `/envoyer` | — | `shipping_requests` | Requires auth |
| `/voyager` | — | `traveler_trips` | Requires auth |
| `/me` | own requests, trips, matches, profile | profile updates | Login wall |
| `/login`, `/signup`, `/auth/callback` | — | `auth.users` (via Supabase) | |
| `/admin` | DEMO data | — | Back-office, not production-ready, stays mocked |

## Messaging

The schema includes a `messages` table and RLS. UI for messaging is **not yet
implemented** in this iteration — the "contact" button on matches is a
placeholder. Wire it up next by:

1. Creating `/messages` or `/me?tab=messages` page
2. Using `browser.listMessagesForMatch(matchId)` and `browser.sendMessage(...)`
3. Optionally: subscribe to realtime via `supabase.channel(...)` for live updates

## Folder structure

```
app/
  ├── page.tsx              landing (real trips)
  ├── login/                email+password + magic link
  ├── signup/               account creation
  ├── auth/
  │   ├── callback/         OAuth + magic link return handler
  │   └── sign-out/         POST sign out
  ├── envoyer/              create shipping_request
  ├── voyager/              create traveler_trip
  ├── matches/              list open trips
  ├── me/                   user dashboard (5 tabs)
  ├── admin/                back-office (still uses DEMO data)
  └── trust/                static trust page

components/
  ├── layout/               Navbar, Footer
  ├── ui/                   Button, Badge, Form, Stepper, LocationSelector, LanguageSwitcher
  └── illustrations/        Logo, HeroScene

lib/
  ├── supabase/
  │   ├── client.ts         browser client (memoized)
  │   ├── server.ts         server-component client
  │   ├── middleware.ts     session refresher + protected routes
  │   ├── auth-provider.tsx <AuthProvider> React context
  │   ├── queries.ts        getProfile, listMyTrips, createTrip, …
  │   ├── types.ts          row types
  │   └── schema.sql        full SQL + RLS
  ├── i18n/                 translations + provider (FR / EN)
  ├── constants.ts          item categories, urgency, space options
  ├── countries.ts          countries dataset for the location picker
  ├── types/                domain types (legacy, mostly redundant with supabase/types)
  └── utils.ts              cn + date helpers

middleware.ts               Next.js middleware (calls lib/supabase/middleware)
```

## Row Level Security summary

- **profiles**: readable by all (so traveler names show up on matches); only
  the user can update their own row.
- **traveler_trips** / **shipping_requests**: open ones are public-readable;
  owners can read all states; only owners can insert/update/delete their own.
- **matches**: visible only to the two parties (request owner & trip owner).
- **messages**: visible only to sender + receiver.
- **reviews**: public read, only reviewer can write.
- **reports**: writable by any authenticated user, readable only by the reporter
  themselves (admin moderation should use service role key in a separate tool).

The `handle_new_user()` trigger auto-creates a `profiles` row when someone
signs up, so the app never has to "create profile after signup" manually.

## Validation

The schema has CHECK constraints on enums (status, urgency, space) and integer
bounds (rating 0-5, compensation_min ≥ 0). Form-side validation is enforced
via React state + button `disabled` attributes (no library needed for MVP).

Client-side `zod` is already in the dependencies if you want to add stricter
validation later.

## Deployment to Vercel

1. Push to GitHub. Vercel auto-deploys when env vars are set.
2. **First deploy**: ensure both env vars are configured BEFORE first deploy.
3. The middleware runs on every request and refreshes the Supabase session
   cookie automatically.

## Known limitations (for next iteration)

- **Messaging UI**: schema exists, UI doesn't. The most useful thing to add next.
- **Reviews UI**: same — table exists, no UI yet.
- **Admin page**: still uses hardcoded demo data. Wire it up later or gate it
  behind a `service_role` server-side admin tool.
- **File uploads**: `prescription_url` and `avatar_url` columns exist but no
  upload UI. See the commented section at the bottom of `schema.sql` for
  Storage bucket creation.
- **Google OAuth**: ready in code (the auth callback handles `code`), just
  needs the provider toggled on in Supabase.
- **Realtime**: Supabase Realtime not wired. Add a `supabase.channel()`
  subscription in `/me` to make match/message arrivals push live.
