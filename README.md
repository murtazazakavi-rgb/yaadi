# Yaadi

Remember every special date.

Yaadi is a premium, private family reminder app for Gregorian birthdays, Hijri Birthday (Waras), and Anniversary of their passing reminders.

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
EXPO_PUBLIC_SUPABASE_ANON_KEY=
```

## Calendar Source Of Truth

Yaadi uses the Mumineen Calendar repo as the source of truth for Dawoodi Bohra Hijri/Gregorian conversion behavior:

https://github.com/mygulamali/mumineen_calendar_js

See:

- `docs/calendar-extraction-plan.md`
- `THIRD_PARTY_NOTICES.md`
- `src/lib/calendar/NOTICE.md`

## Current App Flow

Add Person -> Add Birthday / Hijri Birthday (Waras) / Anniversary of their passing -> Set reminder days -> View upcoming reminders.

The app intentionally avoids a calendar-first flow.
