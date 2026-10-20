-- Aktifkan ekstensi PostGIS untuk data geografis
create extension if not exists "postgis";

-- Tipe Enum
create type user_role as enum ('donor', 'volunteer', 'admin');
create type disaster_severity as enum ('low', 'medium', 'critical');
create type disaster_status as enum ('pending', 'verified', 'rejected', 'resolved');
create type disaster_type_enum as enum ('flood', 'earthquake', 'landslide', 'wildfire', 'other');
create type campaign_status as enum ('draft', 'pending', 'active', 'completed', 'rejected', 'cancelled');
create type donation_status as enum ('pending', 'paid', 'failed', 'expired', 'refunded');
create type volunteer_status as enum ('pending', 'approved', 'rejected', 'withdrawn');

-- 1. PROFILES
create table public.profiles (
    id uuid references auth.users on delete cascade primary key,
    full_name text not null,
    email text unique not null,
    phone text,
    avatar_url text,
    role user_role not null default 'donor',
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 2. DISASTER REPORTS (GIS)
create table public.disaster_reports (
    id uuid default gen_random_uuid() primary key,
    title text not null,
    description text not null,
    disaster_type disaster_type_enum not null,
    severity disaster_severity not null default 'medium',
    status disaster_status not null default 'pending',
    location_name text not null,
    location geography(Point, 4326) not null,
    reported_by uuid references public.profiles(id) on delete set null,
    verified_by uuid references public.profiles(id) on delete set null,
    verified_at timestamp with time zone,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create index disaster_reports_geo_idx on public.disaster_reports using gist (location);

-- 3. CAMPAIGNS
create table public.campaigns (
    id uuid default gen_random_uuid() primary key,
    disaster_report_id uuid references public.disaster_reports(id) on delete cascade,
    title text not null,
    slug text unique not null,
    description text not null,
    category text not null,
    target_amount numeric(15,2) not null,
    collected_amount numeric(15,2) not null default 0.00,
    status campaign_status not null default 'pending',
    start_at timestamp with time zone not null,
    end_at timestamp with time zone not null,
    created_by uuid references public.profiles(id) on delete set null,
    verified_by uuid references public.profiles(id) on delete set null,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 4. DONATIONS
create table public.donations (
    id uuid default gen_random_uuid() primary key,
    campaign_id uuid references public.campaigns(id) on delete cascade,
    donor_id uuid references public.profiles(id) on delete set null,
    amount numeric(15,2) not null,
    is_anonymous boolean not null default false,
    donor_message text,
    status donation_status not null default 'pending',
    payment_reference text unique,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Trigger Profil Otomatis
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, full_name, email, role)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', 'User BANTUYUK'), new.email, 'donor');
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Aktifkan RLS
alter table public.profiles enable row level security;
alter table public.disaster_reports enable row level security;
alter table public.campaigns enable row level security;
alter table public.donations enable row level security;