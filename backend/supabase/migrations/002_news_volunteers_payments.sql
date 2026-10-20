-- BANTUYUK migrasi 002: berita, notifikasi, relawan, transaksi pembayaran, kebijakan RLS

create table if not exists public.news (
  id uuid default gen_random_uuid() primary key,
  title text not null,
  body text not null,
  category text not null default 'Pengumuman',
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

-- Notifikasi dibuat otomatis oleh trigger saat berita ditambah (1 baris broadcast, dibaca semua user)
create table if not exists public.notifications (
  id uuid default gen_random_uuid() primary key,
  news_id uuid references public.news(id) on delete cascade,
  title text not null,
  body text not null,
  created_at timestamptz not null default now()
);

create or replace function public.notify_on_news() returns trigger as $$
begin
  insert into public.notifications (news_id, title, body) values (new.id, new.title, left(new.body, 120));
  return new;
end; $$ language plpgsql security definer;

drop trigger if exists on_news_created on public.news;
create trigger on_news_created after insert on public.news for each row execute procedure public.notify_on_news();

create table if not exists public.volunteer_events (
  id uuid default gen_random_uuid() primary key,
  title text not null,
  category text not null,
  location_name text not null,
  schedule text not null,
  slots int not null check (slots > 0),
  taken int not null default 0,
  description text not null,
  image_url text,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.volunteer_registrations (
  id uuid default gen_random_uuid() primary key,
  event_id uuid not null references public.volunteer_events(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  status volunteer_status not null default 'approved',
  created_at timestamptz not null default now(),
  unique (event_id, user_id)
);

-- Daftar relawan atomik (cek kuota + cegah dobel)
create or replace function public.register_volunteer(p_event uuid) returns void as $$
begin
  update public.volunteer_events set taken = taken + 1 where id = p_event and taken < slots;
  if not found then raise exception 'Kuota penuh atau kegiatan tidak ditemukan'; end if;
  insert into public.volunteer_registrations (event_id, user_id) values (p_event, auth.uid());
end; $$ language plpgsql security definer;

-- Dipakai route /api/payments/create (tabel ini sebelumnya belum ada)
create table if not exists public.payment_transactions (
  id uuid default gen_random_uuid() primary key,
  donation_id uuid not null references public.donations(id) on delete cascade,
  provider text not null check (provider in ('qris_dana','transfer_number')),
  provider_transaction_id text,
  amount numeric(15,2) not null,
  status text not null default 'pending',
  paid_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.news enable row level security;
alter table public.notifications enable row level security;
alter table public.volunteer_events enable row level security;
alter table public.volunteer_registrations enable row level security;
alter table public.payment_transactions enable row level security;

create or replace function public.is_admin() returns boolean as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'admin');
$$ language sql stable security definer;

create policy "berita publik" on public.news for select using (true);
create policy "admin kelola berita" on public.news for all using (public.is_admin()) with check (public.is_admin());
create policy "notif dibaca semua" on public.notifications for select using (true);
create policy "relawan event publik" on public.volunteer_events for select using (true);
create policy "admin kelola event" on public.volunteer_events for all using (public.is_admin()) with check (public.is_admin());
create policy "lihat pendaftaran sendiri/admin" on public.volunteer_registrations for select using (user_id = auth.uid() or public.is_admin());
create policy "kampanye aktif publik" on public.campaigns for select using (status = 'active' or public.is_admin());
create policy "laporan terverifikasi publik" on public.disaster_reports for select using (status = 'verified' or public.is_admin());
create policy "donasi paid publik / milik sendiri" on public.donations for select using (status = 'paid' or donor_id = auth.uid() or public.is_admin());
create policy "profil sendiri" on public.profiles for select using (id = auth.uid() or public.is_admin());

-- Aktifkan Supabase Realtime agar notifikasi tampil instan lintas perangkat
alter publication supabase_realtime add table public.notifications;
alter publication supabase_realtime add table public.news;
