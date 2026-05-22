alter type public.important_date_type add value if not exists 'wedding_anniversary';

create type public.public_submission_status as enum ('pending', 'approved', 'rejected');
create type public.workspace_invitation_status as enum ('pending', 'accepted', 'revoked', 'expired');

alter table public.family_workspaces
  add column if not exists timezone text not null default 'Asia/Kolkata',
  add column if not exists reminder_send_time time not null default '09:00';

alter table public.important_dates
  drop constraint if exists important_dates_required_fields;

alter table public.important_dates
  add constraint important_dates_required_fields check (
    (type = 'birthday' and gregorian_date is not null)
    or (type = 'hijri_birthday_waras' and hijri_day is not null and hijri_month is not null)
    or (type = 'passing_anniversary' and (gregorian_date is not null or (hijri_day is not null and hijri_month is not null)))
    or (type = 'wedding_anniversary' and gregorian_date is not null)
  );

create table public.important_date_participants (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.family_workspaces(id) on delete cascade,
  important_date_id uuid not null references public.important_dates(id) on delete cascade,
  person_id uuid not null references public.people(id) on delete cascade,
  participant_role text not null default 'subject',
  created_at timestamptz not null default now(),
  unique (important_date_id, person_id)
);

create table public.workspace_share_links (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null unique references public.family_workspaces(id) on delete cascade,
  token text not null unique default encode(gen_random_bytes(18), 'hex'),
  enabled boolean not null default true,
  replaced_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.public_family_submissions (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.family_workspaces(id) on delete cascade,
  share_link_id uuid not null references public.workspace_share_links(id) on delete restrict,
  submitter_name text not null,
  submitter_email text,
  submitter_mobile text,
  payload jsonb not null,
  status public.public_submission_status not null default 'pending',
  reviewed_by uuid references public.users(id) on delete set null,
  reviewed_at timestamptz,
  review_notes text,
  created_at timestamptz not null default now(),
  check (jsonb_typeof(payload) = 'object')
);

create table public.workspace_invitations (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.family_workspaces(id) on delete cascade,
  email text not null,
  role public.workspace_member_role not null default 'admin',
  token text not null unique default encode(gen_random_bytes(18), 'hex'),
  status public.workspace_invitation_status not null default 'pending',
  invited_by uuid not null references public.users(id) on delete cascade,
  accepted_by uuid references public.users(id) on delete set null,
  accepted_at timestamptz,
  expires_at timestamptz not null default (now() + interval '14 days'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (role in ('owner', 'admin'))
);

insert into public.workspace_share_links (workspace_id)
select id from public.family_workspaces
on conflict (workspace_id) do nothing;

create index important_date_participants_workspace_idx on public.important_date_participants(workspace_id, important_date_id);
create index public_family_submissions_workspace_idx on public.public_family_submissions(workspace_id, status, created_at desc);
create index workspace_invitations_workspace_idx on public.workspace_invitations(workspace_id, status);

create trigger workspace_share_links_touch_updated_at before update on public.workspace_share_links for each row execute function public.touch_updated_at();
create trigger workspace_invitations_touch_updated_at before update on public.workspace_invitations for each row execute function public.touch_updated_at();

create or replace function public.enforce_workspace_people_limit()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  target_workspace public.family_workspaces;
  plan_limit int;
  current_people int;
begin
  select * into target_workspace from public.family_workspaces where id = new.workspace_id;

  if target_workspace.status <> 'active' then
    raise exception 'This family workspace is inactive';
  end if;

  if target_workspace.subscription_status = 'trial' then
    if target_workspace.trial_ends_at < now() then
      raise exception 'Your trial has ended';
    end if;
    select count(*) into current_people from public.people where workspace_id = new.workspace_id;
    if current_people >= 10 then
      raise exception 'The free trial is limited to 10 people';
    end if;
    return new;
  end if;

  if target_workspace.subscription_status <> 'active' then
    raise exception 'Upgrade to add people';
  end if;

  select max_people into plan_limit from public.plans where id = target_workspace.plan_id;
  select count(*) into current_people from public.people where workspace_id = new.workspace_id;
  if plan_limit is null or current_people >= plan_limit then
    raise exception 'This plan has reached its people limit';
  end if;

  return new;
end;
$$;

create trigger people_enforce_workspace_limit
before insert on public.people
for each row execute function public.enforce_workspace_people_limit();

create or replace function public.enforce_workspace_admin_limit()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  target_workspace public.family_workspaces;
  plan_limit int;
  current_admins int;
begin
  if new.role not in ('owner', 'admin') then
    return new;
  end if;

  select * into target_workspace from public.family_workspaces where id = new.workspace_id;
  select count(*) into current_admins
  from public.workspace_members
  where workspace_id = new.workspace_id
    and role in ('owner', 'admin')
    and id <> coalesce(new.id, gen_random_uuid());

  if target_workspace.subscription_status = 'trial' and current_admins >= 1 then
    raise exception 'The free trial includes one workspace admin';
  end if;

  if target_workspace.subscription_status = 'active' then
    select max_admins into plan_limit from public.plans where id = target_workspace.plan_id;
    if plan_limit is null or current_admins >= plan_limit then
      raise exception 'This plan has reached its admin limit';
    end if;
  end if;

  return new;
end;
$$;

create trigger workspace_members_enforce_admin_limit
before insert or update of role on public.workspace_members
for each row execute function public.enforce_workspace_admin_limit();

alter table public.important_date_participants enable row level security;
alter table public.workspace_share_links enable row level security;
alter table public.public_family_submissions enable row level security;
alter table public.workspace_invitations enable row level security;

create policy "members view important date participants"
on public.important_date_participants for select
using (public.is_super_admin() or public.is_workspace_member(workspace_id));

create policy "admins manage important date participants"
on public.important_date_participants for all
using (public.can_edit_workspace(workspace_id))
with check (public.can_edit_workspace(workspace_id));

create policy "admins view workspace share links"
on public.workspace_share_links for select
using (public.can_edit_workspace(workspace_id));

create policy "admins manage workspace share links"
on public.workspace_share_links for all
using (public.can_edit_workspace(workspace_id))
with check (public.can_edit_workspace(workspace_id));

create policy "admins view public submissions"
on public.public_family_submissions for select
using (public.can_edit_workspace(workspace_id));

create policy "admins review public submissions"
on public.public_family_submissions for update
using (public.can_edit_workspace(workspace_id))
with check (public.can_edit_workspace(workspace_id));

create policy "admins view invitations"
on public.workspace_invitations for select
using (public.can_edit_workspace(workspace_id));

create policy "admins manage invitations"
on public.workspace_invitations for all
using (public.can_edit_workspace(workspace_id))
with check (public.can_edit_workspace(workspace_id));

create policy "workspace members can view member profiles"
on public.users for select
using (
  public.is_super_admin()
  or id = auth.uid()
  or exists (
    select 1
    from public.workspace_members viewer_membership
    join public.workspace_members target_membership
      on target_membership.workspace_id = viewer_membership.workspace_id
    where viewer_membership.user_id = auth.uid()
      and target_membership.user_id = public.users.id
  )
);

create or replace function public.create_profile_for_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.users (id, email, first_name, last_name)
  values (
    new.id,
    new.email,
    nullif(new.raw_user_meta_data ->> 'first_name', ''),
    nullif(new.raw_user_meta_data ->> 'last_name', '')
  )
  on conflict (id) do update set email = excluded.email;

  return new;
end;
$$;

drop trigger if exists auth_user_create_yaadi_profile on auth.users;
create trigger auth_user_create_yaadi_profile
after insert on auth.users
for each row execute function public.create_profile_for_auth_user();

create or replace function public.sync_current_user_profile()
returns public.users
language plpgsql
security definer
set search_path = public
as $$
declare
  auth_email text;
  profile public.users;
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  select email into auth_email from auth.users where id = auth.uid();

  insert into public.users (id, email)
  values (auth.uid(), auth_email)
  on conflict (id) do update set email = excluded.email
  returning * into profile;

  return profile;
end;
$$;

create or replace function public.create_family_workspace(workspace_name text)
returns public.family_workspaces
language plpgsql
security definer
set search_path = public
as $$
declare
  created_workspace public.family_workspaces;
  default_plan uuid;
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  if nullif(trim(workspace_name), '') is null then
    raise exception 'Workspace name is required';
  end if;

  perform public.sync_current_user_profile();
  select id into default_plan from public.plans where name = 'Family Plus' limit 1;

  insert into public.family_workspaces (name, owner_user_id, plan_id, subscription_status, trial_ends_at)
  values (trim(workspace_name), auth.uid(), default_plan, 'trial', now() + interval '14 days')
  returning * into created_workspace;

  insert into public.workspace_members (workspace_id, user_id, role)
  values (created_workspace.id, auth.uid(), 'owner');

  insert into public.reminder_settings (workspace_id)
  values (created_workspace.id);

  insert into public.workspace_share_links (workspace_id)
  values (created_workspace.id);

  return created_workspace;
end;
$$;

create or replace function public.replace_workspace_share_link(target_workspace_id uuid)
returns public.workspace_share_links
language plpgsql
security definer
set search_path = public
as $$
declare
  link public.workspace_share_links;
begin
  if not public.can_edit_workspace(target_workspace_id) then
    raise exception 'Workspace admin access required';
  end if;

  update public.workspace_share_links
  set token = encode(gen_random_bytes(18), 'hex'),
      enabled = true,
      replaced_at = now()
  where workspace_id = target_workspace_id
  returning * into link;

  if link.id is null then
    insert into public.workspace_share_links (workspace_id)
    values (target_workspace_id)
    returning * into link;
  end if;

  return link;
end;
$$;

create or replace function public.get_public_family_form(link_token text)
returns table (workspace_name text, enabled boolean)
language sql
security definer
set search_path = public
as $$
  select family_workspaces.name, workspace_share_links.enabled
  from public.workspace_share_links
  join public.family_workspaces on family_workspaces.id = workspace_share_links.workspace_id
  where workspace_share_links.token = link_token
    and family_workspaces.status = 'active'
  limit 1;
$$;

create or replace function public.submit_public_family_details(
  link_token text,
  submitter_name text,
  submitter_email text,
  submitter_mobile text,
  submission_payload jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  link public.workspace_share_links;
  submission_id uuid;
begin
  if nullif(trim(submitter_name), '') is null then
    raise exception 'Submitter name is required';
  end if;

  if jsonb_typeof(submission_payload) <> 'object' then
    raise exception 'Submission payload must be an object';
  end if;

  select * into link
  from public.workspace_share_links
  where token = link_token
    and enabled = true;

  if link.id is null then
    raise exception 'This family form link is unavailable';
  end if;

  insert into public.public_family_submissions (
    workspace_id,
    share_link_id,
    submitter_name,
    submitter_email,
    submitter_mobile,
    payload
  )
  values (
    link.workspace_id,
    link.id,
    trim(submitter_name),
    nullif(trim(submitter_email), ''),
    nullif(trim(submitter_mobile), ''),
    submission_payload
  )
  returning id into submission_id;

  return submission_id;
end;
$$;

create or replace function public.accept_workspace_invitation(invitation_token text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  invite public.workspace_invitations;
  current_email text;
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  perform public.sync_current_user_profile();
  select lower(email) into current_email from auth.users where id = auth.uid();
  select * into invite from public.workspace_invitations where token = invitation_token;

  if invite.id is null or invite.status <> 'pending' or invite.expires_at < now() then
    raise exception 'Invitation is unavailable';
  end if;

  if lower(invite.email) <> current_email then
    raise exception 'Sign in with the invited email address';
  end if;

  insert into public.workspace_members (workspace_id, user_id, role)
  values (invite.workspace_id, auth.uid(), invite.role)
  on conflict (workspace_id, user_id) do update set role = excluded.role;

  update public.workspace_invitations
  set status = 'accepted',
      accepted_by = auth.uid(),
      accepted_at = now()
  where id = invite.id;

  return invite.workspace_id;
end;
$$;

create or replace function public.remove_workspace_admin(target_member_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  target_member public.workspace_members;
begin
  select * into target_member
  from public.workspace_members
  where id = target_member_id;

  if target_member.id is null then
    raise exception 'Workspace member not found';
  end if;

  if not public.can_edit_workspace(target_member.workspace_id) then
    raise exception 'Workspace admin access required';
  end if;

  if target_member.role <> 'admin' then
    raise exception 'Only admin members can be removed here';
  end if;

  delete from public.workspace_members where id = target_member.id;
end;
$$;

grant execute on function public.sync_current_user_profile() to authenticated;
grant execute on function public.create_family_workspace(text) to authenticated;
grant execute on function public.replace_workspace_share_link(uuid) to authenticated;
grant execute on function public.accept_workspace_invitation(text) to authenticated;
grant execute on function public.remove_workspace_admin(uuid) to authenticated;
grant execute on function public.get_public_family_form(text) to anon, authenticated;
grant execute on function public.submit_public_family_details(text, text, text, text, jsonb) to anon, authenticated;
