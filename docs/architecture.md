# Yaadi Technical Architecture

Yaadi is a mobile-first, private family reminder SaaS. The product model is person-first:

Add Person -> Add Birthday / Hijri Birthday (Waras) / Anniversary of their passing -> Set reminder days -> View upcoming reminders.

## Mobile App

- Expo + React Native + TypeScript
- React Navigation native stack and bottom tabs
- NativeWind styling
- Zustand for lightweight client state
- Supabase client for auth and data access

## Domain Modules

- `src/lib/calendar`: Mumineen Calendar TypeScript port and Yaadi recurrence helpers.
- `src/lib/reminders`: pure reminder engine that can run in tests or Supabase Edge Functions.
- `src/lib/subscriptions`: workspace subscription enforcement.
- `src/lib/notifications`: provider boundary for push, email, WhatsApp, and SMS.
- `src/lib/payments`: Razorpay boundary for server-side Edge Function implementation.

## Backend

Supabase stores all family data in workspace-scoped tables. Every tenant-owned table includes `workspace_id`. Row Level Security policies allow:

- Super admins to manage all data.
- Family admins to manage their own workspaces.
- Viewers to read workspace records when invited.
- Non-members to see nothing.

## Reminder Flow

1. Scheduled job loads active workspaces.
2. Subscription gate confirms trial or active state.
3. Important dates are converted to their next occurrence.
4. The engine checks `7, 5, 2, 1, 0` day offsets.
5. `reminder_logs` prevents duplicates.
6. Notification providers send push/email in v1.

## Subscription Flow

Subscriptions belong to `family_workspaces`, not individual users. Razorpay IDs are stored on `subscriptions` and `payments`.

Trial behavior:

- 14 days.
- Up to 10 people.
- App/email reminders allowed.
- After expiry, users can log in and view existing data, but cannot add people and reminders stop.
