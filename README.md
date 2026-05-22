# Yaadi

Remember every special date.

Yaadi is a premium, private family reminder app for Gregorian birthdays, Hijri Birthday (Waras), Wedding Anniversary, and Anniversary of their passing reminders.

## Stack

- Expo + React Native + TypeScript
- React Navigation
- NativeWind
- Zustand
- Supabase/PostgreSQL/Auth/RLS
- Razorpay-ready workspace subscriptions

## Setup

```bash
npm install
npm run start
```

For tests:

```bash
npm run test
npm run typecheck
```

## Supabase

Apply the schema:

```bash
supabase db push
```

Seed plans and relationship defaults:

```bash
supabase db execute --file supabase/seed/0001_seed_plans_relationships.sql
```

Required Expo environment variables:

```bash
EXPO_PUBLIC_SUPABASE_URL=
EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
EXPO_PUBLIC_APP_URL=https://your-yaadi-web-domain.example
EXPO_PUBLIC_EAS_PROJECT_ID=
```

`EXPO_PUBLIC_SUPABASE_ANON_KEY` remains accepted as a fallback for older Supabase projects.

## Functional V1

The app now includes:

- Supabase email/password auth and workspace onboarding.
- People and important-date forms for Birthday, Hijri Birthday (Waras), Wedding Anniversary, and Anniversary of their passing.
- Permanent workspace family form links at `/family/:token`.
- A review inbox so public submissions do not write directly into live family records.
- Admin invitations and workspace member removal for admins.
- Supabase Edge Function scaffolding for scheduled Gmail test email and Expo push reminders.

## Reminder Delivery

Deploy Edge Functions:

```bash
supabase functions deploy run-reminders
supabase functions deploy send-test-reminder
```

Set Edge Function secrets:

```bash
supabase secrets set \
  SUPABASE_SERVICE_ROLE_KEY= \
  REMINDER_RUNNER_SECRET= \
  GMAIL_SENDER_EMAIL= \
  GOOGLE_CLIENT_ID= \
  GOOGLE_CLIENT_SECRET= \
  GMAIL_REFRESH_TOKEN=
```

`send-test-reminder` is invoked by the Reminder Settings screen for an authenticated workspace owner/admin. `run-reminders` is meant for a Supabase Cron HTTP invocation and sends only to workspace owners/admins. Gmail is the early test sender behind a provider boundary; move to a transactional provider before broad production sending.

## Calendar Source Of Truth

Yaadi uses the Mumineen Calendar repo as the source of truth for Dawoodi Bohra Hijri/Gregorian conversion behavior:

https://github.com/mygulamali/mumineen_calendar_js

See:

- `docs/calendar-extraction-plan.md`
- `THIRD_PARTY_NOTICES.md`
- `src/lib/calendar/NOTICE.md`

## Current App Flow

Add Person -> Add Birthday / Hijri Birthday (Waras) / Wedding Anniversary / Anniversary of their passing -> Set reminder days -> View upcoming reminders.

The app intentionally avoids a calendar-first flow.
