-- Storage for decoration photos. Run once in the Supabase SQL editor (after schema.sql).

insert into storage.buckets (id, name, public)
values ('decoration-images', 'decoration-images', true)
on conflict (id) do update set public = true;

drop policy if exists "decoration images public read" on storage.objects;
create policy "decoration images public read" on storage.objects
  for select using (bucket_id = 'decoration-images');

drop policy if exists "decoration images anon upload" on storage.objects;
create policy "decoration images anon upload" on storage.objects
  for insert to anon, authenticated with check (bucket_id = 'decoration-images');

drop policy if exists "decoration images anon update" on storage.objects;
create policy "decoration images anon update" on storage.objects
  for update to anon, authenticated
  using (bucket_id = 'decoration-images') with check (bucket_id = 'decoration-images');

-- Decorations belong to a company. Older schemas lack these columns, which made every save fail.
alter table public.decorations add column if not exists company_id text;
alter table public.decorations add column if not exists company_name text;

-- Quotations/clients remember which enquiry and company they belong to (needed so a company sees its own quotations).
alter table public.booked_clients add column if not exists enquiry_id text;
alter table public.booked_clients add column if not exists company_id text;
