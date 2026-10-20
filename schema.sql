-- GolfMatch: spillepartnere. Kjør i Supabase (SQL Editor). Velg EU-region for prosjektet.
-- Prinsipper: ingen ser andres rådata, posisjon lagres bare avrundet (ca. 5 km),
-- alle kan blokkere og rapportere, og kontoen kan slettes fra appen.

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null check (char_length(display_name) between 2 and 30),
  bio text check (char_length(bio) <= 200),
  hcp numeric(3,1) check (hcp between -10 and 54),         -- null = oppgir ikke
  level text not null check (level in ('nybegynner','middels','erfaren')),
  home_club text check (char_length(home_club) <= 60),
  lat_r numeric(6,3), lon_r numeric(6,3),                  -- avrundes av trigger under
  radius_km int not null default 30 check (radius_km between 5 and 200),
  adult_confirmed boolean not null default false check (adult_confirmed),  -- kun 18+
  visible boolean not null default true,
  created_at timestamptz not null default now()
);

create function public.round_location() returns trigger language plpgsql as $$
begin
  new.lat_r := round(new.lat_r * 20) / 20;   -- 0,05 grader ≈ 5 km
  new.lon_r := round(new.lon_r * 20) / 20;
  return new;
end $$;
create trigger profiles_round before insert or update on public.profiles
  for each row execute function public.round_location();

create table public.blocks (
  blocker uuid not null references public.profiles(id) on delete cascade,
  blocked uuid not null references public.profiles(id) on delete cascade,
  primary key (blocker, blocked)
);

create table public.reports (
  id bigint generated always as identity primary key,
  reporter uuid references public.profiles(id) on delete set null,
  reported uuid not null references public.profiles(id) on delete cascade,
  reason text not null check (char_length(reason) <= 500),
  created_at timestamptz not null default now()
);

create table public.invites (
  id bigint generated always as identity primary key,
  from_id uuid not null references public.profiles(id) on delete cascade,
  to_id uuid not null references public.profiles(id) on delete cascade,
  message text check (char_length(message) <= 300),
  status text not null default 'sendt' check (status in ('sendt','akseptert','avslått')),
  contact text check (char_length(contact) <= 100),        -- mottakeren velger selv hva som deles ved aksept
  created_at timestamptz not null default now(),
  unique (from_id, to_id),
  check (from_id <> to_id)
);

alter table public.profiles enable row level security;
alter table public.blocks   enable row level security;
alter table public.reports  enable row level security;
alter table public.invites  enable row level security;

-- Andres profiler leses kun via nearby_players() under.
create policy own_profile on public.profiles for all
  using (id = auth.uid()) with check (id = auth.uid());
create policy own_blocks on public.blocks for all
  using (blocker = auth.uid()) with check (blocker = auth.uid());
create policy send_report on public.reports for insert
  with check (reporter = auth.uid());                       -- ingen select: kun du som drifter leser dem

create policy see_invites on public.invites for select
  using (from_id = auth.uid() or to_id = auth.uid());
create policy send_invite on public.invites for insert
  with check (from_id = auth.uid() and status = 'sendt'
    and not exists (
      select 1 from public.blocks b
      where (b.blocker = from_id and b.blocked = to_id) or (b.blocker = to_id and b.blocked = from_id))
    and (select count(*) from public.invites i
         where i.from_id = auth.uid() and i.created_at > now() - interval '1 day') < 20);   -- maks 20 per døgn
create policy answer_invite on public.invites for update
  using (to_id = auth.uid() and status = 'sendt') with check (to_id = auth.uid());
revoke update on public.invites from authenticated;
grant update (status, contact) on public.invites to authenticated;   -- mottaker kan bare svare

create function public.nearby_players(max_hcp_diff numeric default 54)
returns table (id uuid, display_name text, bio text, hcp numeric, level text,
               home_club text, distance_km numeric)
language sql stable security definer set search_path = public as $$
  with me as (select * from profiles where id = auth.uid()),
  d as (
    select p.*, 6371 * acos(least(1, greatest(-1,
             cos(radians(me.lat_r)) * cos(radians(p.lat_r)) * cos(radians(p.lon_r) - radians(me.lon_r))
           + sin(radians(me.lat_r)) * sin(radians(p.lat_r))))) as km,
           me.id as me_id, me.hcp as me_hcp, me.radius_km as me_radius
    from profiles p, me
    where p.id <> me.id and p.visible and p.lat_r is not null and me.lat_r is not null
  )
  select d.id, d.display_name, d.bio, d.hcp, d.level, d.home_club, round(d.km::numeric, 0)
  from d
  where d.km <= d.me_radius
    and (d.me_hcp is null or d.hcp is null or abs(d.hcp - d.me_hcp) <= max_hcp_diff)
    and not exists (select 1 from blocks b
      where (b.blocker = d.me_id and b.blocked = d.id) or (b.blocker = d.id and b.blocked = d.me_id))
  order by d.km, abs(coalesce(d.hcp, 0) - coalesce(d.me_hcp, 0))
  limit 50;
$$;
revoke all on function public.nearby_players(numeric) from public, anon;
grant execute on function public.nearby_players(numeric) to authenticated;

-- Kontosletting fra appen (Apple krever dette). Kaskaderer til profil, blokkeringer og invitasjoner.
create function public.delete_my_account() returns void
language sql security definer set search_path = public, auth as $$
  delete from auth.users where id = auth.uid();
$$;
revoke all on function public.delete_my_account() from public, anon;
grant execute on function public.delete_my_account() to authenticated;

-- Invitasjoner med navn på den andre parten (andres profiler kan ikke leses direkte).
-- Kontaktinfo vises først når invitasjonen er akseptert.
create function public.my_invites()
returns table (id bigint, direction text, other_name text, message text, status text,
               contact text, created_at timestamptz)
language sql stable security definer set search_path = public as $$
  select i.id, case when i.to_id = auth.uid() then 'mottatt' else 'sendt' end,
         p.display_name, i.message, i.status,
         case when i.status = 'akseptert' then i.contact end, i.created_at
  from invites i
  join profiles p on p.id = case when i.to_id = auth.uid() then i.from_id else i.to_id end
  where (i.from_id = auth.uid() or i.to_id = auth.uid())
    and not exists (select 1 from blocks b
      where (b.blocker = auth.uid() and b.blocked = p.id) or (b.blocker = p.id and b.blocked = auth.uid()))
  order by i.created_at desc limit 100;
$$;
revoke all on function public.my_invites() from public, anon;
grant execute on function public.my_invites() to authenticated;
