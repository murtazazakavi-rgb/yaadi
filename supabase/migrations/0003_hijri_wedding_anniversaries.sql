alter table public.important_dates
  drop constraint if exists important_dates_required_fields;

alter table public.important_dates
  add constraint important_dates_required_fields check (
    (type = 'birthday' and gregorian_date is not null)
    or (type = 'hijri_birthday_waras' and hijri_day is not null and hijri_month is not null)
    or (type = 'passing_anniversary' and (gregorian_date is not null or (hijri_day is not null and hijri_month is not null)))
    or (type = 'wedding_anniversary' and (gregorian_date is not null or (hijri_day is not null and hijri_month is not null)))
  );
