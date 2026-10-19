-- Stylista schema. Run once in the Supabase SQL editor (or `supabase db push`).

create table public.profiles (
  user_id uuid primary key references auth.users on delete cascade,
  name text not null default '',
  body_type text not null default '',
  best_shapes text not null default '',
  fabric_loves text not null default '',
  fabric_avoids text not null default '',
  style_notes text not null default '',
  style_dna text not null default '',
  -- Seven DayRoutine objects, Sunday first.
  week jsonb not null default '[
    {"work":"off","activities":"","afterWork":""},
    {"work":"wfh","activities":"","afterWork":""},
    {"work":"wfh","activities":"","afterWork":""},
    {"work":"wfh","activities":"","afterWork":""},
    {"work":"wfh","activities":"","afterWork":""},
    {"work":"wfh","activities":"","afterWork":""},
    {"work":"off","activities":"","afterWork":""}
  ]'::jsonb,
  gaps jsonb not null default '[]'::jsonb,
  home_place jsonb,  -- {label, lat, lon}
  work_place jsonb,
  timezone text not null default 'America/Los_Angeles',
  notify_time text not null default '07:30', -- HH:MM local
  calendar_urls text[] not null default '{}',
  phone text not null default '',
  notify_push boolean not null default true,
  notify_sms boolean not null default false,
  last_laundry date,
  last_notified_on date,
  created_at timestamptz not null default now()
);

create table public.items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade default auth.uid(),
  name text not null default '',
  brand text not null default '',
  category text not null default 'top',
  color text not null default '',
  fabric text not null default '',
  notes text not null default '',
  photo_url text not null default '',
  clean boolean not null default true,
  last_worn date,
  created_at timestamptz not null default now()
);
create index items_user on public.items (user_id);

create table public.inspirations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade default auth.uid(),
  photo_url text not null,
  note text not null default '',
  created_at timestamptz not null default now()
);
create index inspirations_user on public.inspirations (user_id);

create table public.events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade default auth.uid(),
  title text not null,
  date date,
  weekday smallint check (weekday between 0 and 6),
  notes text not null default '',
  created_at timestamptz not null default now()
);
create index events_user on public.events (user_id);

create table public.day_plans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  date date not null,
  plan jsonb not null,
  created_at timestamptz not null default now(),
  unique (user_id, date)
);

create table public.push_subscriptions (
  endpoint text primary key,
  user_id uuid not null references auth.users on delete cascade default auth.uid(),
  keys jsonb not null,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;
alter table public.items enable row level security;
alter table public.inspirations enable row level security;
alter table public.events enable row level security;
alter table public.day_plans enable row level security;
alter table public.push_subscriptions enable row level security;

create policy "own profile" on public.profiles for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "own items" on public.items for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "own inspirations" on public.inspirations for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "own events" on public.events for all using (user_id = auth.uid()) with check (user_id = auth.uid());
-- Plans are written by the server; people read theirs.
create policy "read own plans" on public.day_plans for select using (user_id = auth.uid());
create policy "own push subscriptions" on public.push_subscriptions for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Create a profile row for every new account.
create function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (user_id) values (new.id);
  return new;
end;
$$;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- Photos: public-read bucket with unguessable paths, each person writes under their own folder.
insert into storage.buckets (id, name, public) values ('photos', 'photos', true);
create policy "upload own photos" on storage.objects for insert to authenticated
  with check (bucket_id = 'photos' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "delete own photos" on storage.objects for delete to authenticated
  using (bucket_id = 'photos' and (storage.foldername(name))[1] = auth.uid()::text);

-- Saved go-to outfits ("standbys").
create table public.outfits (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade default auth.uid(),
  name text not null default '',
  item_ids uuid[] not null default '{}',
  notes text not null default '',
  created_at timestamptz not null default now()
);
create index outfits_user on public.outfits (user_id);
alter table public.outfits enable row level security;
create policy "own outfits" on public.outfits for all using (user_id = auth.uid()) with check (user_id = auth.uid());
