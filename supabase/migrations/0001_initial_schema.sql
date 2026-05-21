create extension if not exists "pgcrypto";

create type public.user_role as enum ('super_admin', 'family_admin');
create type public.workspace_member_role as enum ('owner', 'admin', 'viewer');
create type public.workspace_status as enum ('active', 'inactive');
create type public.subscription_status as enum ('trial', 'active', 'past_due', 'cancelled', 'expired');
create type public.living_status as enum ('living', 'deceased');
create type public.important_date_type as enum ('birthday', 'hijri_birthday_waras', 'passing_anniversary');
create type public.date_source as enum ('confirmed', 'calculated', 'approximate', 'not_sure');
create type public.tree_mapping as enum ('parent', 'child', 'spouse', 'sibling', 'none');
create type public.reminder_channel as enum ('app', 'email', 'whatsapp', 'sms');
create type public.reminder_status as enum ('pending', 'sent', 'failed', 'skipped');

create table public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  first_name text,
  last_name text,
  email text unique,
  mobile text,
  role public.user_role not null default 'family_admin',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.plans (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  price_monthly int not null,
  price_yearly int not null,
  max_people int not null,
  max_admins int not null,
  whatsapp_enabled boolean not null default false,
  export_enabled boolean not null default false,
  future_tree_enabled boolean not null default false,
  created_at timestamptz not null default now()
);

create table public.family_workspaces (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  owner_user_id uuid not null references public.users(id) on delete restrict,
  status public.workspace_status not null default 'active',
  plan_id uuid references public.plans(id),
  subscription_status public.subscription_status not null default 'trial',
  trial_ends_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.workspace_members (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.family_workspaces(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  role public.workspace_member_role not null default 'viewer',
  created_at timestamptz not null default now(),
  unique (workspace_id, user_id)
);

create table public.people (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.family_workspaces(id) on delete cascade,
  first_name text not null,
  middle_name text,
  last_name text,
  display_name text,
  gender text,
  living_status public.living_status not null default 'living',
  mobile text,
  email text,
  family_group text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.important_dates (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.family_workspaces(id) on delete cascade,
  person_id uuid not null references public.people(id) on delete cascade,
  type public.important_date_type not null,
  gregorian_date date,
  hijri_day int check (hijri_day between 1 and 30),
  hijri_month int check (hijri_month between 1 and 12),
  hijri_year int,
  show_year boolean not null default false,
  date_source public.date_source,
  reminder_days_before int[] not null default array[7, 5, 2, 1, 0],
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint important_dates_required_fields check (
    (type = 'birthday' and gregorian_date is not null)
    or (type = 'hijri_birthday_waras' and hijri_day is not null and hijri_month is not null)
    or (type = 'passing_anniversary' and (gregorian_date is not null or (hijri_day is not null and hijri_month is not null)))
  )
);

create table public.relationship_types (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid references public.family_workspaces(id) on delete cascade,
  name text not null,
  category text not null,
  inverse_name text,
  tree_mapping public.tree_mapping not null default 'none',
  is_system_default boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (workspace_id, name)
);

create table public.person_relationships (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.family_workspaces(id) on delete cascade,
  person_id uuid not null references public.people(id) on delete cascade,
  related_person_id uuid not null references public.people(id) on delete cascade,
  relationship_type_id uuid not null references public.relationship_types(id) on delete restrict,
  core_tree_relationship public.tree_mapping not null default 'none',
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (person_id <> related_person_id)
);

create table public.reminder_settings (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.family_workspaces(id) on delete cascade,
  user_id uuid references public.users(id) on delete cascade,
  channels public.reminder_channel[] not null default array['app', 'email']::public.reminder_channel[],
  default_days_before int[] not null default array[7, 5, 2, 1, 0],
  quiet_hours_start time,
  quiet_hours_end time,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.reminder_logs (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.family_workspaces(id) on delete cascade,
  important_date_id uuid not null references public.important_dates(id) on delete cascade,
  reminder_for_date date not null,
  reminder_days_before int not null,
  channel public.reminder_channel not null,
  status public.reminder_status not null default 'pending',
  sent_at timestamptz,
  error_message text,
  created_at timestamptz not null default now(),
  unique (workspace_id, important_date_id, reminder_for_date, reminder_days_before, channel)
);

create table public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.family_workspaces(id) on delete cascade,
  plan_id uuid not null references public.plans(id) on delete restrict,
  razorpay_customer_id text,
  razorpay_subscription_id text,
  status text not null,
  current_period_start timestamptz,
  current_period_end timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.payments (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.family_workspaces(id) on delete cascade,
  subscription_id uuid references public.subscriptions(id) on delete set null,
  razorpay_payment_id text,
  amount int not null,
  currency text not null default 'INR',
  status text not null,
  paid_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.notification_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  workspace_id uuid not null references public.family_workspaces(id) on delete cascade,
  token text not null,
  platform text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, workspace_id, token)
);

create index people_workspace_id_idx on public.people(workspace_id);
create index important_dates_workspace_person_idx on public.important_dates(workspace_id, person_id);
create index relationship_types_workspace_idx on public.relationship_types(workspace_id);
create index person_relationships_workspace_idx on public.person_relationships(workspace_id);
create index reminder_logs_workspace_date_idx on public.reminder_logs(workspace_id, reminder_for_date);
create index subscriptions_workspace_idx on public.subscriptions(workspace_id);
create index payments_workspace_idx on public.payments(workspace_id);
create index notification_tokens_workspace_idx on public.notification_tokens(workspace_id);

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger users_touch_updated_at before update on public.users for each row execute function public.touch_updated_at();
create trigger family_workspaces_touch_updated_at before update on public.family_workspaces for each row execute function public.touch_updated_at();
create trigger people_touch_updated_at before update on public.people for each row execute function public.touch_updated_at();
create trigger important_dates_touch_updated_at before update on public.important_dates for each row execute function public.touch_updated_at();
create trigger relationship_types_touch_updated_at before update on public.relationship_types for each row execute function public.touch_updated_at();
create trigger person_relationships_touch_updated_at before update on public.person_relationships for each row execute function public.touch_updated_at();
create trigger reminder_settings_touch_updated_at before update on public.reminder_settings for each row execute function public.touch_updated_at();
create trigger subscriptions_touch_updated_at before update on public.subscriptions for each row execute function public.touch_updated_at();
create trigger notification_tokens_touch_updated_at before update on public.notification_tokens for each row execute function public.touch_updated_at();

create or replace function public.is_super_admin()
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.users
    where id = auth.uid()
      and role = 'super_admin'
  );
$$;

create or replace function public.is_workspace_member(target_workspace_id uuid)
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.workspace_members
    where workspace_id = target_workspace_id
      and user_id = auth.uid()
  );
$$;

create or replace function public.can_edit_workspace(target_workspace_id uuid)
returns boolean
language sql
security definer
set search_path = public
as $$
  select public.is_super_admin()
    or exists (
      select 1 from public.workspace_members
      where workspace_id = target_workspace_id
        and user_id = auth.uid()
        and role in ('owner', 'admin')
    );
$$;

alter table public.users enable row level security;
alter table public.family_workspaces enable row level security;
alter table public.workspace_members enable row level security;
alter table public.people enable row level security;
alter table public.important_dates enable row level security;
alter table public.relationship_types enable row level security;
alter table public.person_relationships enable row level security;
alter table public.reminder_settings enable row level security;
alter table public.reminder_logs enable row level security;
alter table public.plans enable row level security;
alter table public.subscriptions enable row level security;
alter table public.payments enable row level security;
alter table public.notification_tokens enable row level security;

create policy "users can view themselves or super admins can view all"
on public.users for select
using (id = auth.uid() or public.is_super_admin());

create policy "users can update themselves"
on public.users for update
using (id = auth.uid() or public.is_super_admin())
with check (id = auth.uid() or public.is_super_admin());

create policy "plans are visible to authenticated users"
on public.plans for select
to authenticated
using (true);

create policy "super admins manage plans"
on public.plans for all
using (public.is_super_admin())
with check (public.is_super_admin());

create policy "members view their workspaces"
on public.family_workspaces for select
using (public.is_super_admin() or public.is_workspace_member(id));

create policy "owners create workspaces"
on public.family_workspaces for insert
with check (owner_user_id = auth.uid() or public.is_super_admin());

create policy "admins update their workspaces"
on public.family_workspaces for update
using (public.can_edit_workspace(id))
with check (public.can_edit_workspace(id));

create policy "members view workspace membership"
on public.workspace_members for select
using (public.is_super_admin() or public.is_workspace_member(workspace_id));

create policy "admins manage workspace membership"
on public.workspace_members for all
using (public.can_edit_workspace(workspace_id))
with check (public.can_edit_workspace(workspace_id));

create policy "members view people"
on public.people for select
using (public.is_super_admin() or public.is_workspace_member(workspace_id));

create policy "admins manage people"
on public.people for all
using (public.can_edit_workspace(workspace_id))
with check (public.can_edit_workspace(workspace_id));

create policy "members view important dates"
on public.important_dates for select
using (public.is_super_admin() or public.is_workspace_member(workspace_id));

create policy "admins manage important dates"
on public.important_dates for all
using (public.can_edit_workspace(workspace_id))
with check (public.can_edit_workspace(workspace_id));

create policy "members view relationship types"
on public.relationship_types for select
using (is_system_default = true or public.is_super_admin() or public.is_workspace_member(workspace_id));

create policy "admins manage custom relationship types"
on public.relationship_types for all
using (workspace_id is not null and public.can_edit_workspace(workspace_id))
with check (workspace_id is not null and public.can_edit_workspace(workspace_id));

create policy "members view person relationships"
on public.person_relationships for select
using (public.is_super_admin() or public.is_workspace_member(workspace_id));

create policy "admins manage person relationships"
on public.person_relationships for all
using (public.can_edit_workspace(workspace_id))
with check (public.can_edit_workspace(workspace_id));

create policy "members view reminder settings"
on public.reminder_settings for select
using (public.is_super_admin() or public.is_workspace_member(workspace_id));

create policy "admins manage reminder settings"
on public.reminder_settings for all
using (public.can_edit_workspace(workspace_id))
with check (public.can_edit_workspace(workspace_id));

create policy "members view reminder logs"
on public.reminder_logs for select
using (public.is_super_admin() or public.is_workspace_member(workspace_id));

create policy "admins manage reminder logs"
on public.reminder_logs for all
using (public.can_edit_workspace(workspace_id))
with check (public.can_edit_workspace(workspace_id));

create policy "members view subscriptions"
on public.subscriptions for select
using (public.is_super_admin() or public.is_workspace_member(workspace_id));

create policy "admins manage subscriptions"
on public.subscriptions for all
using (public.can_edit_workspace(workspace_id))
with check (public.can_edit_workspace(workspace_id));

create policy "members view payments"
on public.payments for select
using (public.is_super_admin() or public.is_workspace_member(workspace_id));

create policy "admins manage payments"
on public.payments for all
using (public.can_edit_workspace(workspace_id))
with check (public.can_edit_workspace(workspace_id));

create policy "members view notification tokens"
on public.notification_tokens for select
using (public.is_super_admin() or public.is_workspace_member(workspace_id));

create policy "users manage their notification tokens"
on public.notification_tokens for all
using (user_id = auth.uid() and public.is_workspace_member(workspace_id))
with check (user_id = auth.uid() and public.is_workspace_member(workspace_id));
