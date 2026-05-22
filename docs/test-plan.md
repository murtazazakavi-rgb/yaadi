# Test Plan

## Calendar

- Gregorian to Hijri conversion from Mumineen Calendar specs.
- Hijri to Gregorian conversion from Mumineen Calendar specs.
- AJD conversion parity.
- Kabisa year and month length behavior.
- Round-trip conversion where possible.
- Next Gregorian birthday occurrence.
- Next Hijri Birthday (Waras) occurrence.
- Missing Hijri birth year returns `null` Hijri age.
- Anniversary of their passing by Gregorian date.
- Anniversary of their passing by Hijri date.
- Next Wedding Anniversary occurrence and years married.

## Reminder Engine

- Offsets: `7`, `5`, `2`, `1`, `0` days.
- Duplicate reminder prevention via `reminder_logs`.
- Expired trials stop reminder creation.
- Inactive workspaces are skipped.
- Push/email channels are logged separately.
- Birthday reminder age is sent when the date of birth year exists.
- Wedding Anniversary messages include both people and years married.

## Supabase

- RLS: member can read workspace data.
- RLS: Family Admin can mutate workspace data.
- RLS: Viewer is read-only.
- RLS: Super Admin can access all workspaces.
- Plan limits are enforced before add/invite actions.
- Public family form tokens can be disabled or replaced.
- Public submissions cannot read or mutate live workspace records.

## Mobile

- Splash -> Auth -> Create workspace -> Dashboard.
- Permanent `/family/:token` form accepts a batch and review inbox approves it.
- Dashboard quick actions navigate to person-first flows.
- Add Person precedes date entry.
- UI uses "Hijri Birthday (Waras)" everywhere.
- UI uses "Anniversary of their passing" and "Date of Passing".
- Bottom navigation remains thumb-friendly on small screens.
