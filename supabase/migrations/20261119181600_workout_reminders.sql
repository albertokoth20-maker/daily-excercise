create table public.profiles (
  user_id uuid primary key references auth.users (id) on delete cascade,
  email text not null,
  updated_at timestamptz not null default now()
);

create or replace function public.sync_auth_user_profile()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (user_id, email, updated_at)
  values (new.id, new.email, now())
  on conflict (user_id) do update
    set email = excluded.email,
        updated_at = now();
  return new;
end;
$$;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.sync_auth_user_profile();

create trigger on_auth_user_email_updated
after update of email on auth.users
for each row
when (old.email is distinct from new.email)
execute function public.sync_auth_user_profile();

insert into public.profiles (user_id, email)
select id, email
from auth.users
where email is not null
on conflict (user_id) do update
  set email = excluded.email,
      updated_at = now();

create table public.workout_reminders (
  user_id uuid primary key constraint workout_reminders_user_id_fkey
    references public.profiles (user_id) on delete cascade,
  enabled boolean not null default false,
  local_time time not null default '18:00',
  timezone text not null default 'UTC',
  email_enabled boolean not null default true,
  push_enabled boolean not null default false,
  last_email_sent_date date,
  last_push_sent_date date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (user_id) on delete cascade,
  endpoint text not null unique,
  subscription jsonb not null,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;
alter table public.workout_reminders enable row level security;
alter table public.push_subscriptions enable row level security;

create policy "Users can read their own profile"
on public.profiles for select to authenticated
using ((select auth.uid()) = user_id);

create policy "Users can manage their own reminders"
on public.workout_reminders for all to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create policy "Users can manage their own push subscriptions"
on public.push_subscriptions for all to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

grant select on public.profiles to authenticated;
grant select, insert, update, delete on public.workout_reminders to authenticated;
grant select, insert, update, delete on public.push_subscriptions to authenticated;
