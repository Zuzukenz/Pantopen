-- Donasi tamu: tanpa akun, dilacak lewat guest_id acak yang disimpan di browser
alter table public.donations add column if not exists donor_name text;
alter table public.donations add column if not exists guest_id text;
create index if not exists donations_guest_idx on public.donations (guest_id);
