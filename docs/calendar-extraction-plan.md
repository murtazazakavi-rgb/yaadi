# Calendar Extraction Plan

Yaadi uses the Mumineen Calendar repository as the source of truth for Dawoodi Bohra Hijri/Gregorian conversion behavior:

https://github.com/mygulamali/mumineen_calendar_js

Inspected upstream commit: `fd6612c Update copyright date in footer`.

## Source Files

- `source/assets/javascripts/_lib/hijri_date.js`
- `source/assets/javascripts/_lib/hijri_calendar.js`
- `spec/javascripts/lib/hijri_date_spec.js`
- `spec/javascripts/lib/hijri_calendar_spec.js`
- `source/data/miqaats.json` for future event support

## Porting Rules

- Preserve conversion behavior exactly, even if generic Hijri libraries disagree.
- Keep upstream algorithm semantics testable.
- Expose Yaadi-facing Hijri months as `1-12`.
- Keep the internal calendar implementation compatible with the upstream zero-based month model.
- Do not copy Middleman, Ruby, Sass, or old React UI code.
- Preserve MIT attribution in `THIRD_PARTY_NOTICES.md` and `src/lib/calendar/NOTICE.md`.

## Current Port

- `src/lib/calendar/hijriDate.ts`
- `src/lib/calendar/hijriCalendar.ts`
- `src/lib/calendar/hijriMonths.ts`
- `src/lib/calendar/dateConversion.ts`
- `src/lib/calendar/__tests__/hijriCalendar.test.ts`

The first known source-of-truth conversion is:

- Gregorian `25 March 2011`
- Hijri `20 Rabi al-Aakhar 1432H`
- AJD `2455645.5`
